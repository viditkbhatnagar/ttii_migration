// Centre portal v2 (Naji 2026-10-22) — pure rules for the centre's OWN shell,
// dashboard and profile (the "Centre login", role 7). No database access here:
// centre-portal-dashboard-service.ts and centre-portal-profile-service.ts load
// the rows, these helpers decide dates, buckets, statuses and document rows so
// the rules are testable on their own.
//
// Dates: "today" and month buckets are IST calendar days; DATETIME columns are
// instants (→ IST day); @db.Date columns are read with UTC getters;
// centres.date_of_expiry is free text.

import { env } from '../env.js';
import {
  affiliationState, daysBetween, istYmd, laterYmd, type AffiliationState, type TrendMonth,
} from './centre-dashboard-model.js';

/** The Centre login. Associates (role 10) share the /centre/* surface but never see centre money or KYC. */
export const CENTRE_OWNER_ROLE_ID = 7;

export interface CentreActor {
  userId: number;
  roleId: number;
}

export function isCentreOwner(actor: CentreActor): boolean {
  return actor.roleId === CENTRE_OWNER_ROLE_ID;
}

// ─── Affiliation ────────────────────────────────────────────────────────────

export interface AffiliationSummary {
  /** YYYY-MM-DD, '' when no expiry is recorded anywhere. */
  expiry: string;
  daysLeft: number | null;
  /** valid | due_soon (≤ 60 days) | expired | not_set */
  state: AffiliationState;
}

/**
 * The centre's affiliation expiry: the LATER of centres.date_of_expiry (legacy
 * text) and the newest live centre_agreements.expiry_date — the same rule as
 * the admin Centre Dashboard.
 */
export function affiliationSummary(legacyExpiryYmd: string, agreementExpiryYmds: readonly string[], todayYmd: string): AffiliationSummary {
  const expiry = agreementExpiryYmds.reduce((acc, ymd) => laterYmd(acc, ymd), legacyExpiryYmd);
  const daysLeft = expiry ? daysBetween(todayYmd, expiry) : null;
  return { expiry, daysLeft, state: affiliationState(daysLeft) };
}

// ─── Cohorts ────────────────────────────────────────────────────────────────

export type CohortPhase = 'upcoming' | 'running' | 'completed';

/** Upcoming before its start day, Completed after its end day, Running otherwise (open-ended dates count as running). */
export function cohortPhase(startYmd: string, endYmd: string, todayYmd: string): CohortPhase {
  if (startYmd && startYmd > todayYmd) return 'upcoming';
  if (endYmd && endYmd < todayYmd) return 'completed';
  return 'running';
}

// ─── Months ─────────────────────────────────────────────────────────────────

/** How many instants fall in each IST month (YYYY-MM) of `months`. */
export function countByMonth(instants: ReadonlyArray<Date | null | undefined>, months: readonly TrendMonth[]): number[] {
  const counts = new Map<string, number>(months.map((m) => [m.month, 0]));
  for (const at of instants) {
    const month = istYmd(at ?? null).slice(0, 7);
    if (counts.has(month)) counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return months.map((m) => counts.get(m.month) ?? 0);
}

/** The IST month (YYYY-MM) before `month`. */
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 2, 1));
  return d.toISOString().slice(0, 7);
}

/** Instants in the current IST month and in the month before it. */
export function thisAndLastMonth(instants: ReadonlyArray<Date | null | undefined>, now: Date): { thisMonth: number; lastMonth: number } {
  const current = istYmd(now).slice(0, 7);
  const prior = previousMonth(current);
  let thisMonth = 0;
  let lastMonth = 0;
  for (const at of instants) {
    const month = istYmd(at ?? null).slice(0, 7);
    if (month === current) thisMonth += 1;
    else if (month === prior) lastMonth += 1;
  }
  return { thisMonth, lastMonth };
}

// ─── Courses ────────────────────────────────────────────────────────────────

export interface CourseCount {
  courseId: number;
  title: string;
  shortName: string;
  applications: number;
  enrolments: number;
}

export const COURSES_SHOWN = 6;

/**
 * Applications and enrolments per course, busiest first (ties A–Z). An
 * enrolment is one (student, course) pair: the student's enrol rows, or their
 * users.course_id when they have none. Rows with no course are left out.
 */
export function courseBreakdown(input: {
  applicationCourseIds: ReadonlyArray<number | null>;
  students: ReadonlyArray<{ id: number; course_id: number | null }>;
  enrolments: ReadonlyArray<{ user_id: number | null; course_id: number | null }>;
  titles: ReadonlyMap<number, { title: string; shortName: string }>;
}, limit = COURSES_SHOWN): CourseCount[] {
  const apps = new Map<number, number>();
  for (const id of input.applicationCourseIds) if (id && id > 0) apps.set(id, (apps.get(id) ?? 0) + 1);
  const pairs = new Set<string>();
  const enrolledUsers = new Set<number>();
  const studentIds = new Set(input.students.map((s) => s.id));
  for (const e of input.enrolments) {
    if (!e.user_id || !e.course_id || !studentIds.has(e.user_id)) continue;
    pairs.add(`${e.user_id}|${e.course_id}`);
    enrolledUsers.add(e.user_id);
  }
  for (const s of input.students) if (!enrolledUsers.has(s.id) && s.course_id && s.course_id > 0) pairs.add(`${s.id}|${s.course_id}`);
  const enrols = new Map<number, number>();
  for (const pair of pairs) {
    const courseId = Number(pair.split('|')[1]);
    enrols.set(courseId, (enrols.get(courseId) ?? 0) + 1);
  }
  const ids = new Set([...apps.keys(), ...enrols.keys()]);
  return [...ids]
    .map((courseId) => ({
      courseId,
      title: input.titles.get(courseId)?.title || `Course #${courseId}`,
      shortName: input.titles.get(courseId)?.shortName ?? '',
      applications: apps.get(courseId) ?? 0,
      enrolments: enrols.get(courseId) ?? 0,
    }))
    .sort((a, b) => (b.enrolments + b.applications) - (a.enrolments + a.applications) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

// ─── Documents ──────────────────────────────────────────────────────────────

/** What a centre may file its own upload as (the prototype's KYC checklist + "Other"). */
export const CENTRE_DOC_TYPES = [
  'Registration Certificate', 'Aadhaar / Passport', 'PAN Card', 'GST Registration', 'Bank Proof', 'Other Document',
] as const;
export type CentreDocType = (typeof CENTRE_DOC_TYPES)[number];

export function isCentreDocType(value: string): value is CentreDocType {
  return (CENTRE_DOC_TYPES as readonly string[]).includes(value);
}

const CENTRE_UPLOAD_KEY = /\/public\/uploads\/\d{10,16}-[a-z0-9]{1,16}\.(pdf|png|jpe?g|webp|gif)$/i;

export interface UploadStorageConfig {
  provider: 'local' | 's3';
  bucket?: string | undefined;
  region: string;
  endpoint?: string | undefined;
  forcePathStyle: boolean;
  publicBaseUrl?: string | undefined;
}

/**
 * Where /centre/upload files are served from, mirroring how the storage provider
 * builds the `location` it returns: the public base URL when set, else the bucket
 * URL (path- or host-style); the local provider answers file:// locations.
 * Returns origins ("https://host"), plus the literal "file:" for local storage.
 */
export function uploadOriginsOf(cfg: UploadStorageConfig): string[] {
  if (cfg.provider === 'local') return ['file:'];
  try {
    if (cfg.publicBaseUrl) return [new URL(cfg.publicBaseUrl).origin];
    const endpoint = new URL(cfg.endpoint?.trim() || `https://s3.${cfg.region}.amazonaws.com`);
    if (cfg.forcePathStyle || !cfg.bucket) return [endpoint.origin];
    return [`${endpoint.protocol}//${cfg.bucket}.${endpoint.host}`];
  } catch {
    return [];
  }
}

function defaultUploadOrigins(): string[] {
  return uploadOriginsOf({
    provider: env.STORAGE_PROVIDER,
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    publicBaseUrl: env.S3_PUBLIC_BASE_URL,
  });
}

/**
 * True when `url` is a file /centre/upload stored: served from the storage
 * provider's own origin and shaped public/uploads/{ms}-{random}.{pdf|png|jpg|jpeg|
 * webp|gif} — never a javascript:/data: link, another host, or an arbitrary page
 * that would later open inside the admin Centre Profile / Wallet pages.
 */
export function isCentreUploadUrl(url: string, allowedOrigins: readonly string[] = defaultUploadOrigins()): boolean {
  if (url.length === 0 || url.length > 500 || /\s/.test(url)) return false;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.protocol === 'file:') {
    if (!allowedOrigins.includes('file:')) return false;
  } else if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
    if (!allowedOrigins.includes(parsed.origin)) return false;
  } else {
    return false;
  }
  return CENTRE_UPLOAD_KEY.test(parsed.pathname);
}

/** The last path segment of a file URL, for the Documents tab. */
export function fileNameOf(url: string): string {
  const clean = url.split(/[?#]/)[0] ?? '';
  const last = clean.split('/').filter(Boolean).pop() ?? '';
  try { return decodeURIComponent(last); } catch { return last; }
}

export type DocumentSource = 'centre' | 'kyc' | 'uploaded' | 'agreement' | 'certificate' | 'legacy_affiliation';

export interface DocumentRow {
  key: string;
  /** The checklist row this is ('' for an extra document). */
  checklist: string;
  type: string;
  name: string;
  url: string;
  /** YYYY-MM-DD ('' when unknown). */
  date: string;
  source: DocumentSource;
  onFile: boolean;
  /** The centre may add a file for this row (its own centre_documents). */
  uploadable: boolean;
}

export interface DocumentInputs {
  registrationDoc: string;
  idDoc: string;
  panDoc: string;
  legacyAffiliationDoc: string;
  uploaded: ReadonlyArray<{ id: number; title: string; docType: string; url: string; date: string }>;
  agreements: ReadonlyArray<{ id: number; agreementNo: string; url: string; date: string }>;
  certificates: ReadonlyArray<{ id: number; certificateNo: string; url: string; date: string }>;
}

const CHECKLIST: ReadonlyArray<{ key: string; type: CentreDocType; label: string; core: 'registrationDoc' | 'idDoc' | 'panDoc' | null }> = [
  { key: 'registration', type: 'Registration Certificate', label: 'Registration / Incorporation Certificate', core: 'registrationDoc' },
  { key: 'id', type: 'Aadhaar / Passport', label: 'Aadhaar / Passport of Authorised Person', core: 'idDoc' },
  { key: 'pan', type: 'PAN Card', label: 'PAN Card', core: 'panDoc' },
  { key: 'gst', type: 'GST Registration', label: 'GST Registration', core: null },
  { key: 'bank', type: 'Bank Proof', label: 'Cancelled Cheque / Bank Proof', core: null },
];

/**
 * The Documents tab: the prototype's KYC checklist on real files, then every
 * other real document. A checklist row is on file from TTII's record of the
 * centre (centres / centre_kyc) or, failing that, from the newest file the
 * centre uploaded with that type. The affiliation agreement is TTII's record
 * (agreements, else the legacy affiliation document) — never centre-uploaded.
 */
export function buildDocumentRows(input: DocumentInputs): DocumentRow[] {
  const usedUploads = new Set<number>();
  const rows: DocumentRow[] = CHECKLIST.map((item) => {
    const coreUrl = item.core ? input[item.core] : '';
    if (coreUrl) {
      return { key: item.key, checklist: item.key, type: item.label, name: fileNameOf(coreUrl) || item.label, url: coreUrl, date: '', source: item.core === 'registrationDoc' ? 'centre' : 'kyc', onFile: true, uploadable: false };
    }
    const upload = input.uploaded.find((u) => u.docType === item.type);
    if (upload) usedUploads.add(upload.id);
    return upload
      ? { key: item.key, checklist: item.key, type: item.label, name: upload.title, url: upload.url, date: upload.date, source: 'uploaded', onFile: true, uploadable: true }
      : { key: item.key, checklist: item.key, type: item.label, name: '', url: '', date: '', source: 'uploaded', onFile: false, uploadable: true };
  });
  const [latestAgreement, ...olderAgreements] = input.agreements;
  rows.push(latestAgreement
    ? { key: 'agreement', checklist: 'agreement', type: 'Signed Affiliation Agreement', name: `Agreement ${latestAgreement.agreementNo}`, url: latestAgreement.url, date: latestAgreement.date, source: 'agreement', onFile: Boolean(latestAgreement.url), uploadable: false }
    : { key: 'agreement', checklist: 'agreement', type: 'Signed Affiliation Agreement', name: input.legacyAffiliationDoc ? fileNameOf(input.legacyAffiliationDoc) : '', url: input.legacyAffiliationDoc, date: '', source: 'legacy_affiliation', onFile: Boolean(input.legacyAffiliationDoc), uploadable: false });
  for (const a of olderAgreements) {
    rows.push({ key: `agr-${a.id}`, checklist: '', type: 'Affiliation Agreement', name: `Agreement ${a.agreementNo}`, url: a.url, date: a.date, source: 'agreement', onFile: Boolean(a.url), uploadable: false });
  }
  if (latestAgreement && input.legacyAffiliationDoc) {
    rows.push({ key: 'legacy-affiliation', checklist: '', type: 'Affiliation Document', name: fileNameOf(input.legacyAffiliationDoc), url: input.legacyAffiliationDoc, date: '', source: 'legacy_affiliation', onFile: true, uploadable: false });
  }
  for (const c of input.certificates) {
    rows.push({ key: `cert-${c.id}`, checklist: '', type: 'Affiliation Certificate', name: `Certificate ${c.certificateNo}`, url: c.url, date: c.date, source: 'certificate', onFile: Boolean(c.url), uploadable: false });
  }
  for (const u of input.uploaded) {
    if (usedUploads.has(u.id)) continue;
    rows.push({ key: `doc-${u.id}`, checklist: '', type: u.docType || 'Other Document', name: u.title, url: u.url, date: u.date, source: 'uploaded', onFile: true, uploadable: false });
  }
  return rows;
}
