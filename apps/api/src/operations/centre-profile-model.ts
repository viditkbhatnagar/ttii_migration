// Centre Directory + Centre Profile (Naji 2026-10-22, CentreDirectoryModule /
// AddCentreDialog / CentreProfileModule). Pure rules and shaping shared by
// centre-profile-service.ts and its tests. Nothing here touches the database.
//
// The Add / Edit Centre rules mirror the web form (centre-form-model.ts):
//  - PIN is 6 digits only when the country is India;
//  - the mobile is /^[6-9]\d{9}$/ only for +91, otherwise 7-15 digits;
//  - Aadhaar/Passport and PAN (numbers AND documents) are required on ADD and
//    optional on EDIT: the live centres have none, so their edits must not be
//    blocked on paperwork nobody collected.
// On EDIT a required field that arrives blank means "unchanged" (the old
// /admin/centres/edit blanked contact, phone and email when they came empty);
// an optional field that is present in the payload is written as sent, so an
// admin can clear it.

export const NOT_SET_UP_MESSAGE =
  'Centre details storage is not set up yet: the database migration 2026-10-22-centre-onboarding-affiliation.sql has not been run.';

export const ENTITY_TYPES = [
  'Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'Trust', 'Society', 'Other',
] as const;

export const DOC_TYPE_UPLOADED = 'Uploaded Document';

const IST_OFFSET_MS = 330 * 60 * 1000;

export interface Outcome<T = undefined> {
  status: 0 | 1;
  message: string;
  data?: T;
}

export const fail = (message: string): Outcome<never> => ({ status: 0, message });

/** A refusal that still carries data (the field errors of a rejected save). */
export const failWith = <T>(message: string, data: T): Outcome<T> => ({ status: 0, message, data });

function prismaCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

/** Prisma P2021: the table does not exist (the 2026-10-22 migration has not run). */
export function isMissingTable(error: unknown): boolean {
  return prismaCode(error) === 'P2021';
}

// ─── Small value helpers ────────────────────────────────────────────────────

export function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function intOf(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(typeof value === 'string' ? value : '', 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Money held in a VarChar column ("75000", "3201.5", "") as a number; 0 when unreadable. */
export function money(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  // Prisma Decimal (application_final_fee) converts through Number().
  if (value !== null && typeof value === 'object') {
    const n = Number((value as { valueOf: () => unknown }).valueOf());
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(text(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * A location NAME from the legacy Text columns country_id / state_id /
 * district_id. Legacy PHP rows hold numeric ids that name nothing: '' for those.
 */
export function locationName(value: unknown): string {
  const s = text(value);
  return s && !/^\d+$/.test(s) ? s : '';
}

export function iso(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : '';
}

/** A @db.Date value as YYYY-MM-DD, read with UTC getters (Prisma gives UTC midnight). */
export function ymdOfDate(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : '';
}

/** Today's IST calendar date. */
export function istToday(nowMs: number = Date.now()): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function validYmd(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * The calendar date held in a VarChar date column (centres.date_of_expiry):
 * "2026-12-31" or a legacy "31-12-2026" / "31/12/2026". '' when unreadable.
 */
export function ymdOfText(value: unknown): string {
  const s = text(value);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m && validYmd(Number(m[1]), Number(m[2]), Number(m[3]))) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(s);
  if (m && validYmd(Number(m[3]), Number(m[2]), Number(m[1]))) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}

/** "+91" from "91", "+91", " +971 "; '' when there are no digits. */
export function dialCode(value: unknown): string {
  const digits = text(value).replace(/\D/g, '');
  return digits ? `+${digits.slice(0, 4)}` : '';
}

export function digitsOnly(value: unknown): string {
  return text(value).replace(/\D/g, '');
}

export function isIndia(country: string): boolean {
  return country.trim().toLowerCase() === 'india';
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

// ─── Add / Edit Centre ──────────────────────────────────────────────────────

/** Every field of the Add / Edit Centre form, as the API receives it (snake_case). */
export const CENTRE_FIELDS = [
  'centre_code', 'centre_name', 'legal_entity_name', 'entity_type', 'registration_doc', 'affiliation_expiry',
  'address', 'country', 'state', 'district', 'city', 'pincode',
  'contact_person', 'designation', 'country_code', 'phone', 'email',
  'id_number', 'id_doc', 'pan', 'pan_doc', 'gstin',
  'bank_account_name', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
] as const;

export type CentreField = (typeof CENTRE_FIELDS)[number];
export type CentreValues = Record<CentreField, string>;
export type FieldErrors = Partial<Record<CentreField, string>>;

/** Upload links (http/https only — never javascript: or data:). */
export const FILE_FIELDS: readonly CentreField[] = ['registration_doc', 'id_doc', 'pan_doc'];

/** Fields stored in centre_kyc (need the 2026-10-22 migration). */
export const KYC_FIELDS: readonly CentreField[] = [
  'legal_entity_name', 'entity_type', 'city', 'pincode', 'gstin', 'pan', 'id_number', 'id_doc', 'pan_doc',
  'bank_account_name', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
];

/** Required in both modes (the prototype's REQUIRED list minus identity). */
export const ALWAYS_REQUIRED: readonly CentreField[] = [
  'centre_code', 'centre_name', 'legal_entity_name', 'entity_type', 'address', 'country', 'state', 'district',
  'city', 'pincode', 'contact_person', 'designation', 'phone', 'email',
];

/** Required on ADD only: the live centres have no identity paperwork on file. */
export const ADD_ONLY_REQUIRED: readonly CentreField[] = ['id_number', 'id_doc', 'pan', 'pan_doc'];

const UPPER_FIELDS: readonly CentreField[] = ['centre_code', 'pan', 'gstin', 'bank_ifsc'];

/** Column widths, so a long value is refused with a message instead of a 500. */
const MAX_LENGTH: Partial<Record<CentreField, number>> = {
  centre_code: 30, centre_name: 250, legal_entity_name: 250, entity_type: 40, registration_doc: 300,
  address: 2000, country: 80, state: 80, district: 80, city: 120, pincode: 12,
  contact_person: 250, designation: 250, phone: 15, email: 50,
  id_number: 40, id_doc: 500, pan_doc: 500, bank_account_name: 150, bank_name: 150, bank_branch: 150,
};

export const EMPTY_VALUES: CentreValues = Object.fromEntries(CENTRE_FIELDS.map((f) => [f, ''])) as CentreValues;

/** Normalise one submitted value (trim, upper-case codes, digits for the phone). */
export function normaliseField(field: CentreField, value: unknown): string {
  const raw = text(value);
  if (field === 'phone' || field === 'bank_account_number') return raw.replace(/[\s-]/g, '');
  if (field === 'country_code') return dialCode(raw);
  if (UPPER_FIELDS.includes(field)) return raw.toUpperCase().replace(/\s+/g, '');
  if (field === 'email') return raw.toLowerCase();
  return raw;
}

/** The submitted fields, normalised; a field missing from the payload is absent here. */
export function readSubmitted(payload: Record<string, unknown>): Partial<CentreValues> {
  const out: Partial<CentreValues> = {};
  for (const field of CENTRE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) out[field] = normaliseField(field, payload[field]);
  }
  return out;
}

/**
 * The values to validate and save. ADD: exactly what was sent. EDIT: a
 * required field sent blank (or not sent) keeps its stored value; an optional
 * field keeps its stored value only when it was not sent at all.
 */
export function mergeForSave(mode: 'add' | 'edit', submitted: Partial<CentreValues>, existing: CentreValues): CentreValues {
  const out = { ...EMPTY_VALUES };
  for (const field of CENTRE_FIELDS) {
    const sent = submitted[field];
    if (mode === 'add') { out[field] = sent ?? ''; continue; }
    if (ALWAYS_REQUIRED.includes(field) || field === 'country_code') out[field] = sent ? sent : existing[field];
    else out[field] = sent === undefined ? existing[field] : sent;
  }
  return out;
}

const PIN_INDIA = /^\d{6}$/;
const PIN_OTHER = /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/;
const MOBILE_INDIA = /^[6-9]\d{9}$/;
const MOBILE_OTHER = /^\d{7,15}$/;
const EMAIL = /^\S+@\S+\.\S+$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const ACCOUNT = /^\d{9,18}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export interface ValidateOptions {
  mode: 'add' | 'edit';
  /** false before the migration: the centre_kyc fields are neither required nor checked. */
  kycReady: boolean;
  /** EDIT: file fields left as stored — a legacy path is kept as it is, never re-checked. */
  unchangedFiles?: readonly CentreField[];
}

/** Field → message ('Required', 'Enter a 6-digit PIN', …), the prototype's texts. */
export function validateCentre(v: CentreValues, opts: ValidateOptions): FieldErrors {
  const e: FieldErrors = {};
  const required = opts.mode === 'add' ? [...ALWAYS_REQUIRED, ...ADD_ONLY_REQUIRED] : [...ALWAYS_REQUIRED];
  for (const field of required) {
    if (!opts.kycReady && KYC_FIELDS.includes(field)) continue;
    if (!v[field].trim()) e[field] = 'Required';
  }
  for (const [field, max] of Object.entries(MAX_LENGTH) as Array<[CentreField, number]>) {
    if (!e[field] && v[field].length > max) e[field] = `At most ${max} characters`;
  }
  if (v.entity_type && !(ENTITY_TYPES as readonly string[]).includes(v.entity_type) && !e.entity_type) e.entity_type = 'Select a valid type';
  if (v.affiliation_expiry && !ymdOfText(v.affiliation_expiry)) e.affiliation_expiry = 'Enter a valid date';
  if (v.pincode && !e.pincode) {
    if (isIndia(v.country) ? !PIN_INDIA.test(v.pincode) : !PIN_OTHER.test(v.pincode)) {
      e.pincode = isIndia(v.country) ? 'Enter a 6-digit PIN' : 'Enter a valid postal code';
    }
  }
  if (v.phone && !e.phone) {
    const india = v.country_code === '+91' || (!v.country_code && isIndia(v.country));
    if (india ? !MOBILE_INDIA.test(v.phone) : !MOBILE_OTHER.test(v.phone)) {
      e.phone = india ? 'Enter a valid 10-digit mobile' : 'Enter a valid mobile (7–15 digits)';
    }
  }
  if (v.phone && !v.country_code && !isIndia(v.country) && !e.phone) e.phone = 'Pick the country to set the dial code';
  if (v.email && !e.email && !EMAIL.test(v.email)) e.email = 'Enter a valid email';
  if (v.pan && !PAN.test(v.pan)) e.pan = 'Invalid PAN format';
  if (v.gstin && !GSTIN.test(v.gstin)) e.gstin = 'Invalid GSTIN format';
  if (v.bank_account_number && !ACCOUNT.test(v.bank_account_number)) e.bank_account_number = '9–18 digits';
  if (v.bank_ifsc && !IFSC.test(v.bank_ifsc)) e.bank_ifsc = 'Invalid IFSC format';
  for (const field of FILE_FIELDS) {
    if (opts.unchangedFiles?.includes(field)) continue;
    if (v[field] && !e[field] && !isHttpUrl(v[field])) e[field] = 'Upload the file again';
  }
  if (!opts.kycReady) for (const field of KYC_FIELDS) delete e[field];
  return e;
}

/** True when the submission carries a non-blank value for a centre_kyc field. */
export function hasKycInput(submitted: Partial<CentreValues>): boolean {
  return KYC_FIELDS.some((f) => (submitted[f] ?? '') !== '');
}

// ─── Application stage ──────────────────────────────────────────────────────

/**
 * The pipeline stage of a centre application, from the real columns: a
 * converted application (is_converted = 1 or status 'converted') is Enrolled,
 * a rejected one Rejected, otherwise applications.stage (default 'lead').
 */
export function applicationStage(row: { stage?: string | null; status?: string | null; is_converted?: number | null }): string {
  const status = text(row.status).toLowerCase();
  if (row.is_converted === 1 || status === 'converted') return 'enrolled';
  const stage = text(row.stage).toLowerCase();
  if (status === 'rejected' || stage === 'rejected') return 'rejected';
  return stage || 'lead';
}

/** Course plan status by its dates (IST today): Active inside [start, end], else Inactive. */
export function planStatus(startYmd: string, endYmd: string, today: string): 'Active' | 'Inactive' {
  if (startYmd && startYmd > today) return 'Inactive';
  if (endYmd && endYmd < today) return 'Inactive';
  return 'Active';
}

/** Student badge, same rules as the Students list: disabled login first, then users.status. */
export function studentStatus(row: { status?: number | null; disabled_at?: Date | null }): string {
  if (row.disabled_at) return 'Inactive';
  if (row.status === 2) return 'Graduated';
  if (row.status === 3) return 'Dropped';
  if (row.status === 0) return 'Inactive';
  return 'Active';
}

// ─── Activity ───────────────────────────────────────────────────────────────

export type ActivityKind = 'centre' | 'kyc' | 'fund_request' | 'wallet' | 'document' | 'agreement' | 'certificate';

export interface ActivityItem {
  kind: ActivityKind;
  text: string;
  /** ISO instant. */
  at: string;
}

export interface ActivitySources {
  centre: { code: string; created_at: Date | null };
  kyc: { created_at: Date | null; updated_at: Date | null } | null;
  fundRequests: Array<{ id: number; amount: string; status: string; created_at: Date | null; updated_at: Date | null }>;
  walletTransactions: Array<{ id: number; transaction_type: string; amount: string; remarks: string | null; created_at: Date | null }>;
  documents: Array<{ title: string; created_at: Date | null }>;
  agreements: Array<{ agreement_no: string; created_at: Date | null }>;
  certificates: Array<{ certificate_no: string; created_at: Date | null; revoked_at: Date | null }>;
}

export const ACTIVITY_LIMIT = 100;

function rupeeText(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Real events only, newest first. Nothing is inferred: an entry exists only
 * when a row with a timestamp records it. A KYC row only counts as "updated"
 * when updated_at is later than its creation.
 */
export function buildActivity(s: ActivitySources, limit = ACTIVITY_LIMIT): ActivityItem[] {
  const items: ActivityItem[] = [];
  const push = (kind: ActivityKind, at: Date | null | undefined, line: string) => {
    const when = iso(at);
    if (when) items.push({ kind, text: line, at: when });
  };
  push('centre', s.centre.created_at, `Centre record created${s.centre.code ? ` as ${s.centre.code}` : ''}`);
  if (s.kyc) {
    const created = s.kyc.created_at?.getTime() ?? 0;
    const updated = s.kyc.updated_at?.getTime() ?? 0;
    if (updated > created) push('kyc', s.kyc.updated_at, 'Centre legal, identity or bank details updated');
  }
  for (const fr of s.fundRequests) {
    push('fund_request', fr.created_at, `Fund request FR-${fr.id} raised for ${rupeeText(money(fr.amount))}`);
    const status = text(fr.status).toLowerCase();
    if ((status === 'approved' || status === 'rejected') && fr.updated_at) {
      push('fund_request', fr.updated_at, `Fund request FR-${fr.id} ${status}`);
    }
  }
  for (const t of s.walletTransactions) {
    const type = text(t.transaction_type).toLowerCase() === 'debit' ? 'Debit' : 'Credit';
    const note = text(t.remarks);
    push('wallet', t.created_at, `Wallet ${type.toLowerCase()} of ${rupeeText(money(t.amount))}${note ? ` · ${note}` : ''}`);
  }
  for (const d of s.documents) push('document', d.created_at, `Document uploaded: ${d.title}`);
  for (const a of s.agreements) push('agreement', a.created_at, `Affiliation agreement ${a.agreement_no} recorded`);
  for (const c of s.certificates) {
    push('certificate', c.created_at, `Affiliation certificate ${c.certificate_no} issued`);
    push('certificate', c.revoked_at, `Affiliation certificate ${c.certificate_no} revoked`);
  }
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
}
