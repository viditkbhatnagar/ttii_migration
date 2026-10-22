// Centres v2 — Centre Onboarding + Affiliation & Agreements (Naji 2026-10-22).
//
// The rules the API and the web app must agree on live here, the same way the
// live-class join window does: the public centre application form validates in
// the browser AND on the server with this one function, the agreement expiry
// the dialog previews is the one the server stores, and agreement / certificate
// statuses are DERIVED from dates (never stored) by the same helpers on both
// sides.
//
// Dates are calendar days ("YYYY-MM-DD") built and compared with Date.UTC, so
// no browser or server timezone can shift a day. "Today" is the IST calendar day.

export const CENTRE_ENTITY_TYPES = [
  'Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'Trust', 'Society', 'Other',
] as const;

export const CENTRE_LEAD_SOURCES = ['Meta Campaign', 'Website', 'Referral', 'Event', 'Cold Call', 'Other'] as const;

export const ONBOARDING_STAGES = [
  'lead', 'under_review', 'agreement_pending', 'certificate_pending', 'onboarded', 'rejected',
] as const;
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

export const ONBOARDING_STAGE_LABEL: Record<OnboardingStage, string> = {
  lead: 'Lead',
  under_review: 'Under Review',
  agreement_pending: 'Agreement Pending',
  certificate_pending: 'Certificate Pending',
  onboarded: 'Onboarded',
  rejected: 'Rejected',
};

export function isOnboardingStage(value: unknown): value is OnboardingStage {
  return typeof value === 'string' && (ONBOARDING_STAGES as readonly string[]).includes(value);
}

/** The five sections an admin verifies before approving a submitted application. */
export const VERIFICATION_SECTIONS = ['entity', 'address', 'contact', 'legal', 'bank'] as const;
export type VerificationSection = (typeof VERIFICATION_SECTIONS)[number];
export type VerificationState = 'verified' | 'flagged';

export const AGREEMENT_TERM_YEARS = [1, 2, 3, 5] as const;
/** An agreement is "Pending Renewal" when it expires within this many days. */
export const AGREEMENT_RENEWAL_WINDOW_DAYS = 60;
/** A form link stops working this many days after it was sent (Resend issues a fresh one). */
export const CENTRE_FORM_LINK_TTL_DAYS = 30;
/** Public form uploads: PDF, PNG or JPEG up to 5 MB. */
export const CENTRE_FORM_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const CENTRE_FORM_UPLOAD_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
/** The signed agreement: PDF up to 10 MB. */
export const AGREEMENT_FILE_MAX_BYTES = 10 * 1024 * 1024;

// ── The centre application form ──────────────────────────────────────────────

export interface CentreFormDoc {
  name: string;
  url: string;
  /** The server's signature over this upload (proves the file came from the form's own upload endpoint). */
  sig?: string;
}

export interface CentreApplicationValues {
  centreName: string;
  legalEntity: string;
  entityType: string;
  country: string;
  state: string;
  district: string;
  city: string;
  pin: string;
  address1: string;
  contactName: string;
  designation: string;
  mobile: string;
  email: string;
  idNumber: string;
  pan: string;
  gstin: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bank: string;
  branch: string;
}

export type CentreDocKey = 'registrationDoc' | 'idDoc' | 'panDoc';

export interface CentreApplication extends CentreApplicationValues {
  registrationDoc: CentreFormDoc | null;
  idDoc: CentreFormDoc | null;
  panDoc: CentreFormDoc | null;
}

export type CentreApplicationErrors = Partial<Record<keyof CentreApplication | 'declaration', string>>;

export const CENTRE_FORM_STEP_TITLES = ['Centre details', 'Address', 'Contact & identity', 'Bank details', 'Review'] as const;

/** Column limits the values must fit (centre_onboarding, centres, centre_kyc, users). */
export const CENTRE_FIELD_MAX: Record<keyof CentreApplicationValues, number> = {
  centreName: 250,
  legalEntity: 250,
  entityType: 40,
  country: 80,
  state: 80,
  district: 80,
  city: 120,
  pin: 12,
  address1: 1000,
  contactName: 150,
  designation: 250,
  mobile: 20,
  // users.user_email is VARCHAR(50): the centre login is created with this email.
  email: 50,
  idNumber: 40,
  pan: 12,
  gstin: 20,
  accountName: 150,
  accountNumber: 30,
  ifsc: 15,
  bank: 150,
  branch: 150,
};

const VALUE_KEYS = Object.keys(CENTRE_FIELD_MAX) as Array<keyof CentreApplicationValues>;
const UPPER_KEYS: ReadonlyArray<keyof CentreApplicationValues> = ['pan', 'gstin', 'ifsc'];

/** ONE address: no whitespace, commas or semicolons (SMTP fans a comma list out to every address), quotes or angle brackets. */
export const EMAIL_PATTERN = /^[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']+$/;
export const MOBILE_PATTERN = /^\+?[\d\s()-]{7,20}$/;
export const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/;

/** A mobile number in any of the accepted shapes with 7-15 digits (the E.164 maximum). */
export function isValidMobile(value: string): boolean {
  const v = value.trim();
  if (!MOBILE_PATTERN.test(v)) return false;
  const digits = v.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function emptyCentreApplication(): CentreApplication {
  const values = Object.fromEntries(VALUE_KEYS.map((k) => [k, ''])) as unknown as CentreApplicationValues;
  return { ...values, country: 'India', registrationDoc: null, idDoc: null, panDoc: null };
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function docOf(value: unknown): CentreFormDoc | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  const url = textOf(r.url);
  if (!url) return null;
  const doc: CentreFormDoc = { name: textOf(r.name).slice(0, 200) || url.split('/').pop() || 'Document', url: url.slice(0, 500) };
  const sig = textOf(r.sig);
  return sig ? { ...doc, sig: sig.slice(0, 64) } : doc;
}

/** Untrusted input (a request body, stored JSON) as a well-formed application: trimmed, PAN/GSTIN/IFSC upper-cased. */
export function normaliseCentreApplication(raw: unknown): CentreApplication {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = emptyCentreApplication();
  for (const k of VALUE_KEYS) {
    const v = textOf(r[k]);
    out[k] = UPPER_KEYS.includes(k) ? v.toUpperCase() : v;
  }
  if (!textOf(r.country)) out.country = 'India';
  out.registrationDoc = docOf(r.registrationDoc);
  out.idDoc = docOf(r.idDoc);
  out.panDoc = docOf(r.panDoc);
  return out;
}

const STEP_REQUIRED: ReadonlyArray<ReadonlyArray<keyof CentreApplicationValues>> = [
  ['centreName', 'legalEntity', 'entityType'],
  ['country', 'state', 'district', 'city', 'pin', 'address1'],
  ['contactName', 'designation', 'mobile', 'email', 'idNumber', 'pan'],
  [],
];
const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof CentreApplicationValues>> = [
  ['centreName', 'legalEntity', 'entityType'],
  ['country', 'state', 'district', 'city', 'pin', 'address1'],
  ['contactName', 'designation', 'mobile', 'email', 'idNumber', 'pan', 'gstin'],
  ['accountName', 'accountNumber', 'ifsc', 'bank', 'branch'],
];

/**
 * Errors for one wizard step (0-3; step 4 is the review + declaration). Labels
 * follow Naji's form: "Required", "Enter a 6-digit PIN", "Enter a valid mobile
 * number", "Enter a valid email", "Enter a valid PAN", "Upload the document".
 */
export function validateCentreApplicationStep(step: number, form: CentreApplication): CentreApplicationErrors {
  const e: CentreApplicationErrors = {};
  for (const k of STEP_FIELDS[step] ?? []) {
    if (form[k].length > CENTRE_FIELD_MAX[k]) e[k] = `Must be ${CENTRE_FIELD_MAX[k]} characters or fewer`;
  }
  for (const k of STEP_REQUIRED[step] ?? []) {
    if (!form[k].trim()) e[k] = 'Required';
  }
  if (step === 0 && form.entityType && !(CENTRE_ENTITY_TYPES as readonly string[]).includes(form.entityType)) {
    e.entityType = 'Select an entity type';
  }
  if (step === 1 && form.pin && !e.pin && form.country === 'India' && !/^\d{6}$/.test(form.pin)) e.pin = 'Enter a 6-digit PIN';
  if (step === 2) {
    if (form.email && !e.email && !isValidEmail(form.email)) e.email = 'Enter a valid email';
    if (form.mobile && !e.mobile && !isValidMobile(form.mobile)) e.mobile = 'Enter a valid mobile number';
    if (form.pan && !e.pan && !PAN_PATTERN.test(form.pan.toUpperCase())) e.pan = 'Enter a valid PAN';
    if (form.gstin && !e.gstin && !GSTIN_PATTERN.test(form.gstin.toUpperCase())) e.gstin = 'Enter a valid GSTIN';
    if (!form.idDoc) e.idDoc = 'Upload the document';
    if (!form.panDoc) e.panDoc = 'Upload the document';
  }
  if (step === 3) {
    if (form.accountNumber && !e.accountNumber && !ACCOUNT_NUMBER_PATTERN.test(form.accountNumber)) e.accountNumber = 'Enter 9–18 digits';
    if (form.ifsc && !e.ifsc && !IFSC_PATTERN.test(form.ifsc.toUpperCase())) e.ifsc = 'Enter a valid IFSC';
  }
  return e;
}

/** Every step plus the declaration — what the server checks on submit. */
export function validateCentreApplication(form: CentreApplication, declaration: boolean): CentreApplicationErrors {
  const e: CentreApplicationErrors = {};
  for (let step = 0; step < 4; step += 1) Object.assign(e, validateCentreApplicationStep(step, form));
  if (!declaration) e.declaration = 'Confirm the declaration to continue';
  return e;
}

/** The first wizard step (0-4) holding an error, or -1. */
export function firstStepWithError(errors: CentreApplicationErrors): number {
  const keys = Object.keys(errors);
  if (keys.length === 0) return -1;
  for (let step = 0; step < 4; step += 1) {
    const fields: string[] = [...(STEP_FIELDS[step] ?? [])];
    if (step === 0) fields.push('registrationDoc');
    if (step === 2) fields.push('idDoc', 'panDoc');
    if (keys.some((k) => fields.includes(k))) return step;
  }
  return 4;
}

// ── Calendar days ────────────────────────────────────────────────────────────

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 86_400_000;

/** Today's IST calendar day as YYYY-MM-DD. */
export function istTodayYmd(nowMs: number = Date.now()): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The IST calendar day an instant falls on ('' when unparseable). */
export function istYmdOf(value: Date | string | null | undefined): string {
  if (!value) return '';
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? '' : istTodayYmd(ms);
}

function ymdParts(ymd: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return [y, mo, d];
}

export function isValidYmd(ymd: string): boolean {
  return ymdParts(ymd) !== null;
}

/** UTC midnight of a calendar day, for a @db.Date column. Null when not a real date. */
export function ymdToUtcDate(ymd: string): Date | null {
  const p = ymdParts(ymd);
  return p ? new Date(Date.UTC(p[0], p[1] - 1, p[2])) : null;
}

/** The calendar day of a @db.Date value (read with UTC getters). */
export function utcDateToYmd(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return '';
  return value.toISOString().slice(0, 10);
}

/**
 * Agreement expiry: the effective date plus `years` years, minus one day —
 * a 3-year agreement effective 2026-10-22 expires 2029-10-21. A 29 February
 * start rolls to 1 March first (as the prototype's setFullYear did), so
 * 2024-02-29 + 1 year expires 2025-02-28.
 */
export function addAgreementTerm(effectiveYmd: string, years: number): string {
  const p = ymdParts(effectiveYmd);
  if (!p || !Number.isInteger(years) || years <= 0) return '';
  const anniversary = Date.UTC(p[0] + years, p[1] - 1, p[2]);
  return new Date(anniversary - DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `fromYmd` to `toYmd` (negative when `toYmd` is earlier). NaN for a bad date. */
export function daysBetweenYmd(fromYmd: string, toYmd: string): number {
  const a = ymdToUtcDate(fromYmd);
  const b = ymdToUtcDate(toYmd);
  if (!a || !b) return Number.NaN;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export type AgreementStatus = 'Active' | 'Pending Renewal' | 'Expired';
export type CertificateStatus = 'Valid' | 'Expired' | 'Revoked';

/** Expired once the expiry day has passed; Pending Renewal within 60 days of it; Active otherwise. */
export function agreementStatusOf(expiryYmd: string, todayYmd: string): AgreementStatus {
  const left = daysBetweenYmd(todayYmd, expiryYmd);
  if (Number.isNaN(left)) return 'Active';
  if (left < 0) return 'Expired';
  if (left <= AGREEMENT_RENEWAL_WINDOW_DAYS) return 'Pending Renewal';
  return 'Active';
}

/** Revoked when the stored status says so; Expired once valid_to has passed; Valid otherwise. */
export function certificateStatusOf(validToYmd: string, storedStatus: string, todayYmd: string): CertificateStatus {
  if (storedStatus.trim().toLowerCase() === 'revoked') return 'Revoked';
  const left = daysBetweenYmd(todayYmd, validToYmd);
  if (!Number.isNaN(left) && left < 0) return 'Expired';
  return 'Valid';
}
