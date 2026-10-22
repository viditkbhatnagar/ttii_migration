import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  CENTRE_FORM_LINK_TTL_DAYS, CENTRE_LEAD_SOURCES, VERIFICATION_SECTIONS, isValidEmail, isValidMobile, istTodayYmd,
  type VerificationSection, type VerificationState,
} from '@ttii/shared-types';

import { COUNTRY_DIAL_CODES } from './country-dial-codes.js';

// Centres v2 — Centre Onboarding (Naji 2026-10-22). Pure rules shared by the
// onboarding, affiliation and public-form services and their tests.
//
// Stage machine (centre_onboarding.stage). Every transition is CLAIM-FIRST: a
// guarded updateMany on the expected stage, and the dependent writes only run
// when exactly one row was claimed.
//
//   lead ──(centre submits the form)──▶ under_review ──approve──▶ agreement_pending
//     ▲                                    │   │                       │
//     └──────────── request changes ───────┘   └─reject─▶ rejected     └─upload signed agreement─▶ certificate_pending
//     └──────────── reopen ─────────────────────────────── rejected            │
//                                                        issue certificate ──▶ onboarded
//
// "Form Sent" is a lead with link_sent_at set — a display label, not a stage.

export const NOT_SET_UP_MESSAGE =
  'Centre onboarding is not set up yet: the database migration 2026-10-22-centre-onboarding-affiliation.sql has not been run.';
export const CHANGED_MESSAGE = 'This centre was changed by someone else at the same moment. Reload and try again.';

/** The public form lives on the learner host, like the student application form (/apply/{token}). */
export const CENTRE_FORM_BASE_URL = 'https://learn.teachersindia.in/centre-form/';

export interface Outcome<T = undefined> {
  status: 0 | 1;
  message: string;
  data?: T;
}

export const ok = <T>(message: string, data?: T): Outcome<T> => (data === undefined ? { status: 1, message } : { status: 1, message, data });
export const fail = (message: string): Outcome<never> => ({ status: 0, message });

function prismaCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

/** Prisma P2021: a table of the 2026-10-22 migration does not exist yet. */
export function isMissingTable(error: unknown): boolean {
  return prismaCode(error) === 'P2021';
}

/** Prisma P2002: a unique index refused the write. */
export function isUniqueViolation(error: unknown): boolean {
  return prismaCode(error) === 'P2002';
}

/** Thrown inside a transaction to roll it back and answer with `message`. */
export class Refusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Refusal';
  }
}

export function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function intId(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(text(value), 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function iso(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : '';
}

/** "ONB-007" for onboarding record 7. */
export function onboardingRef(id: number): string {
  return `ONB-${String(id).padStart(3, '0')}`;
}

// ── Lead input ──────────────────────────────────────────────────────────────

export interface LeadInput {
  centreName: string;
  contactName: string;
  email: string;
  mobile: string;
  country: string;
  state: string;
  district: string;
  source: string;
  notes: string;
}

export const LEAD_MAX = { centreName: 250, contactName: 150, email: 50, mobile: 20, country: 80, state: 80, district: 80, notes: 2000 } as const;

/** Validate Add / Edit Centre Lead. Mobile and District are optional; Notes free text. */
export function parseLeadInput(p: Record<string, unknown>): { lead: LeadInput } | { errors: Record<string, string> } {
  const lead: LeadInput = {
    centreName: text(p.centre_name),
    contactName: text(p.contact_name),
    email: text(p.email).toLowerCase(),
    mobile: text(p.mobile),
    country: text(p.country) || 'India',
    state: text(p.state),
    district: text(p.district),
    source: text(p.source),
    notes: text(p.notes),
  };
  const errors: Record<string, string> = {};
  for (const k of ['centreName', 'contactName', 'email', 'country', 'state', 'source'] as const) {
    if (!lead[k]) errors[k] = 'Required';
  }
  for (const [k, max] of Object.entries(LEAD_MAX) as Array<[keyof typeof LEAD_MAX, number]>) {
    if (!errors[k] && lead[k].length > max) errors[k] = `Must be ${max} characters or fewer`;
  }
  if (lead.email && !errors.email && !isValidEmail(lead.email)) errors.email = 'Invalid email';
  if (lead.mobile && !errors.mobile && !isValidMobile(lead.mobile)) errors.mobile = 'Enter a valid mobile number';
  if (lead.source && !(CENTRE_LEAD_SOURCES as readonly string[]).includes(lead.source)) errors.source = 'Select a source';
  return Object.keys(errors).length > 0 ? { errors } : { lead };
}

/** One readable sentence for a refused lead form ("Email: Invalid email"). */
export function leadErrorMessage(errors: Record<string, string>): string {
  const labels: Record<string, string> = {
    centreName: 'Centre Name', contactName: 'Contact Name', email: 'Email', mobile: 'Mobile', country: 'Country',
    state: 'State', district: 'District', source: 'Source', notes: 'Notes',
  };
  return Object.entries(errors).map(([k, v]) => `${labels[k] ?? k}: ${v}`).join('; ');
}

// ── Form link token ─────────────────────────────────────────────────────────
//
// token = base64url(HMAC-SHA256(secret, "centre-form:{id}.{linkSentAtMs}")).
// Only sha256(token) is stored (link_token_hash). The token can always be
// recomputed from the stored link_sent_at ("Copy Link"), and sending a new link
// moves link_sent_at, which changes the token and kills the old link.
// link_sent_at is DATETIME(0): the instant is truncated to whole seconds BEFORE
// the token is computed, so the recomputation from the stored value matches.

/** Whole-second instant for link_sent_at, strictly after the previous one so a resend always changes the token. */
export function nextLinkSentAt(now: Date, previous: Date | null): Date {
  const whole = Math.floor(now.getTime() / 1000) * 1000;
  const floor = previous ? Math.floor(previous.getTime() / 1000) * 1000 + 1000 : 0;
  return new Date(Math.max(whole, floor));
}

export function formToken(secret: string, onboardingId: number, linkSentAt: Date): string {
  return createHmac('sha256', secret).update(`centre-form:${onboardingId}.${linkSentAt.getTime()}`).digest('base64url');
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** True when `token` is the one this record's link_sent_at produces (constant-time). */
export function tokenMatches(secret: string, onboardingId: number, linkSentAt: Date, token: string): boolean {
  const expected = Buffer.from(formToken(secret, onboardingId, linkSentAt));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** A plausible token: 43 base64url characters (256-bit HMAC). */
export function looksLikeToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function formLinkUrl(token: string): string {
  return `${CENTRE_FORM_BASE_URL}${token}`;
}

const IST_OFFSET_MS = 330 * 60 * 1000;

/** The form closes at the END of the IST day 30 days after the link went out (so the date shown is the last full day). */
export function linkExpiresAt(linkSentAt: Date): Date {
  const [y, m, d] = istTodayYmd(linkSentAt.getTime() + CENTRE_FORM_LINK_TTL_DAYS * 86_400_000).split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999) - IST_OFFSET_MS);
}

export interface LinkState {
  stage: string;
  link_sent_at: Date | null;
  link_expired: boolean;
}

/** The form link is usable: a lead, a link was sent, not marked expired and inside its 30 days. */
export function isLinkOpen(row: LinkState, now: Date): boolean {
  return row.stage === 'lead' && row.link_sent_at !== null && !row.link_expired && now.getTime() < linkExpiresAt(row.link_sent_at).getTime();
}

// ── Section verification ────────────────────────────────────────────────────

export type Verification = Partial<Record<VerificationSection, VerificationState>>;

export function parseVerification(json: string | null | undefined): Verification {
  if (!json) return {};
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Verification = {};
    for (const s of VERIFICATION_SECTIONS) {
      const v = (raw as Record<string, unknown>)[s];
      if (v === 'verified' || v === 'flagged') out[s] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function allSectionsVerified(v: Verification): boolean {
  return VERIFICATION_SECTIONS.every((s) => v[s] === 'verified');
}

export const SECTION_TITLE: Record<VerificationSection, string> = {
  entity: 'Entity', address: 'Address', contact: 'Contact', legal: 'Legal & Identity', bank: 'Bank Details',
};

// ── Agreement / certificate numbers ─────────────────────────────────────────

/** AGR-2026-007: one past the highest number already used for that year (never a count, so a gap is never refilled). */
export function nextSequenceNo(prefix: 'AGR' | 'AFC', year: number, existing: ReadonlyArray<string>): string {
  const head = `${prefix}-${year}-`;
  const highest = existing.reduce((max, no) => {
    if (!no.startsWith(head)) return max;
    const n = Number.parseInt(no.slice(head.length), 10);
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return `${head}${String(highest + 1).padStart(3, '0')}`;
}

// ── Mobile number → centres.country_code + centres.phone ────────────────────

const ALL_DIALS = [...new Set(Object.values(COUNTRY_DIAL_CODES))].sort((a, b) => b.length - a.length);

/**
 * Split a free-text mobile ("+91 98470 12345", "09847012345", "9847012345")
 * into a dial code ("+91") and the national number ("9847012345") for the
 * centres / users columns. The country picked on the form decides the code
 * when the number does not carry one.
 */
export function splitMobile(mobile: string, country: string): { countryCode: string; phone: string } {
  const own = COUNTRY_DIAL_CODES[country] ?? '91';
  const raw = mobile.trim();
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+') || digits.startsWith('00')) {
    if (digits.startsWith('00')) digits = digits.slice(2);
    const dial = digits.startsWith(own) ? own : ALL_DIALS.find((d) => digits.startsWith(d)) ?? own;
    return { countryCode: `+${dial}`, phone: digits.startsWith(dial) ? digits.slice(dial.length) : digits };
  }
  if (own === '91') {
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  }
  return { countryCode: `+${own}`, phone: digits };
}

// ── Uploaded documents ──────────────────────────────────────────────────────

/** Storage key folder for a lead's public-form uploads. */
export const formUploadFolder = (onboardingId: number): string => `centre-onboarding/${onboardingId}/`;
/** Storage key folder for a lead's signed agreement. */
export const agreementUploadFolder = (onboardingId: number): string => `centre-agreements/${onboardingId}/`;

/** True when `url` has the shape of a key our upload endpoint wrote under `folder` ({32 hex}-{safe name}). */
export function isOwnUpload(url: string, folder: string): boolean {
  if (url.length > 500 || /\s/.test(url)) return false;
  if (!/^(https?|file):\/\//i.test(url)) return false;
  const at = url.indexOf(`/${folder}`);
  return at > 0 && /^[0-9a-f]{32}-[A-Za-z0-9._-]+$/.test(url.slice(at + folder.length + 1));
}

/**
 * The upload endpoints sign every URL they hand out, so a submitted document
 * (or signed agreement) can only be a file this server stored for this record —
 * never an outside link that would later open inside the admin portal.
 */
export function uploadSignature(secret: string, onboardingId: number, url: string): string {
  return createHmac('sha256', secret).update(`centre-upload:${onboardingId}:${url}`).digest('base64url');
}

export function isSignedUpload(secret: string, onboardingId: number, folder: string, url: string, sig: string | undefined): boolean {
  if (!sig || !isOwnUpload(url, folder)) return false;
  const expected = Buffer.from(uploadSignature(secret, onboardingId, url));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** A storage-safe file name: letters, digits, dot, dash, underscore; at most 80 characters. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(-80) || 'file';
}

/** The display name of an uploaded file: its key's last segment without the random prefix. */
export function fileNameFromUrl(url: string): string {
  const last = url.split('/').pop() ?? '';
  return last.replace(/^[0-9a-f]{32}-/, '') || last;
}

/** Sniff the first bytes: PDF, PNG or JPEG. */
export function sniffFileType(head: Uint8Array): 'application/pdf' | 'image/png' | 'image/jpeg' | null {
  if (head.length >= 5 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d) return 'application/pdf';
  if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  return null;
}

// ── Duplicate checks ────────────────────────────────────────────────────────

export interface DuplicateHit {
  field: 'GSTIN' | 'Email' | 'Mobile';
  kind: 'centre' | 'lead' | 'login';
  name: string;
}

export interface DuplicateTarget {
  email: string;
  mobile: string;
  gstin: string;
}

export interface DuplicateSource {
  kind: 'centre' | 'lead';
  name: string;
  email: string;
  mobile: string;
  gstin: string;
}

/** Digits only, without a leading 91 / 0, so "+91 98470 12345" equals "9847012345". */
export function mobileKey(mobile: string): string {
  let d = mobile.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.length >= 7 ? d : '';
}

/** Every other lead / centre sharing the target's email, mobile or GSTIN (first match per field and kind). */
export function findDuplicates(target: DuplicateTarget, sources: ReadonlyArray<DuplicateSource>): DuplicateHit[] {
  const hits: DuplicateHit[] = [];
  const email = target.email.trim().toLowerCase();
  const mobile = mobileKey(target.mobile);
  const gstin = target.gstin.trim().toUpperCase();
  const add = (hit: DuplicateHit) => {
    if (!hits.some((h) => h.field === hit.field && h.kind === hit.kind)) hits.push(hit);
  };
  for (const s of sources) {
    if (gstin && s.gstin.trim().toUpperCase() === gstin) add({ field: 'GSTIN', kind: s.kind, name: s.name });
    if (email && s.email.trim().toLowerCase() === email) add({ field: 'Email', kind: s.kind, name: s.name });
    if (mobile && mobileKey(s.mobile) === mobile) add({ field: 'Mobile', kind: s.kind, name: s.name });
  }
  return hits;
}
