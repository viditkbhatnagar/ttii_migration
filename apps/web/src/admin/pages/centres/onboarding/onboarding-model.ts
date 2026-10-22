import {
  CENTRE_LEAD_SOURCES, ONBOARDING_STAGE_LABEL, VERIFICATION_SECTIONS, daysBetweenYmd, isOnboardingStage, isValidEmail,
  isValidMobile, isValidYmd, istYmdOf, normaliseCentreApplication,
  type AgreementStatus, type CentreApplication, type CertificateStatus, type OnboardingStage, type VerificationSection,
} from '@ttii/shared-types';

import type { Tone } from '../../../shared/components/ui-tones.js';

// Centres v2 — Centre Onboarding view model (Naji 2026-10-22,
// CentreOnboardingModule + centre-onboarding-store). Pure: the server payloads
// in, list / detail / dialog state out. Labels follow Naji's prototype.

export type Stage = OnboardingStage;
export type StageTab = Stage | 'all';
export type SortDir = 'asc' | 'desc';

function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}
function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(str(value));
  return Number.isFinite(n) ? n : 0;
}
function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function recs(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(rec) : [];
}

// ── List ────────────────────────────────────────────────────────────────────

export interface OnbRow {
  id: string;
  refNo: string;
  centreName: string;
  contactName: string;
  mobile: string;
  email: string;
  country: string;
  state: string;
  district: string;
  source: string;
  notes: string;
  stage: Stage;
  /** ISO instants. */
  stageSince: string;
  createdAt: string;
  linkSentAt: string;
  linkExpired: boolean;
  formSubmittedAt: string;
  centreCode: string;
  centreId: string;
}

export interface OnbList {
  ready: boolean;
  message: string;
  today: string;
  records: OnbRow[];
}

export function toOnbRow(raw: Record<string, unknown>): OnbRow {
  const stage = isOnboardingStage(raw.stage) ? raw.stage : 'lead';
  return {
    id: str(raw.id),
    refNo: str(raw.refNo),
    centreName: str(raw.centreName),
    contactName: str(raw.contactName),
    mobile: str(raw.mobile),
    email: str(raw.email),
    country: str(raw.country),
    state: str(raw.state),
    district: str(raw.district),
    source: str(raw.source),
    notes: str(raw.notes),
    stage,
    stageSince: str(raw.stageSince),
    createdAt: str(raw.createdAt),
    linkSentAt: str(raw.linkSentAt),
    linkExpired: raw.linkExpired === true,
    formSubmittedAt: str(raw.formSubmittedAt),
    centreCode: str(raw.centreCode),
    centreId: raw.centreId === null || raw.centreId === undefined ? '' : str(raw.centreId),
  };
}

export function toOnboardingList(raw: Record<string, unknown>): OnbList {
  return {
    ready: raw.ready !== false,
    message: str(raw.message),
    today: str(raw.today),
    records: recs(raw.records).map(toOnbRow).filter((r) => r.id !== ''),
  };
}

/** "Form Sent" is a lead whose form link went out; the stored stage stays "lead". */
export function stageLabel(r: Pick<OnbRow, 'stage' | 'linkSentAt'>): string {
  return r.stage === 'lead' && r.linkSentAt ? 'Form Sent' : ONBOARDING_STAGE_LABEL[r.stage];
}

export function stageTone(r: Pick<OnbRow, 'stage' | 'linkSentAt'>): Tone {
  if (r.stage === 'lead') return r.linkSentAt ? 'primary' : 'blue';
  if (r.stage === 'under_review') return 'amber';
  if (r.stage === 'onboarded') return 'emerald';
  if (r.stage === 'rejected') return 'rose';
  return 'primary';
}

export const STAGE_TABS: Array<{ id: StageTab; label: string }> = [
  { id: 'lead', label: 'Lead' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'agreement_pending', label: 'Agreement Pending' },
  { id: 'certificate_pending', label: 'Certificate Pending' },
  { id: 'onboarded', label: 'Onboarded' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

/** Counts per pill, from ALL records (filters do not change them, as in the prototype). */
export function stageCounts(records: OnbRow[]): Record<StageTab, number> {
  const out: Record<StageTab, number> = { lead: 0, under_review: 0, agreement_pending: 0, certificate_pending: 0, onboarded: 0, rejected: 0, all: records.length };
  for (const r of records) out[r.stage] += 1;
  return out;
}

export interface OnbKpis {
  leads: number;
  awaitingForm: number;
  underReview: number;
  awaitingAgreement: number;
  onboardedThisMonth: number;
}

export function onboardingKpis(records: OnbRow[], today: string): OnbKpis {
  const month = today.slice(0, 7);
  return {
    leads: records.filter((r) => r.stage === 'lead').length,
    awaitingForm: records.filter((r) => r.stage === 'lead' && r.linkSentAt !== '').length,
    underReview: records.filter((r) => r.stage === 'under_review').length,
    awaitingAgreement: records.filter((r) => r.stage === 'agreement_pending').length,
    onboardedThisMonth: records.filter((r) => r.stage === 'onboarded' && istYmdOf(r.stageSince).startsWith(month)).length,
  };
}

export interface OnbFilters {
  tab: StageTab;
  search: string;
  state: string;
  source: string;
}

export const DEFAULT_ONB_FILTERS: OnbFilters = { tab: 'lead', search: '', state: '', source: '' };

export function filterOnboarding(records: OnbRow[], f: OnbFilters): OnbRow[] {
  const q = f.search.trim().toLowerCase();
  return records.filter((r) =>
    (f.tab === 'all' || r.stage === f.tab)
    && (!f.state || r.state === f.state)
    && (!f.source || r.source === f.source)
    && (!q || [r.refNo, r.centreName, r.contactName, r.email, r.mobile, r.district, r.centreCode].join(' ').toLowerCase().includes(q)));
}

export function stateOptions(records: OnbRow[]): Array<{ value: string; label: string }> {
  return [...new Set(records.map((r) => r.state).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((s) => ({ value: s, label: s }));
}

export const SOURCE_OPTIONS = CENTRE_LEAD_SOURCES.map((s) => ({ value: s, label: s }));

/** Whole IST days in the current stage; null for Onboarded / Rejected (the prototype shows "—"). */
export function ageingDays(r: Pick<OnbRow, 'stage' | 'stageSince'>, today: string): number | null {
  if (r.stage === 'onboarded' || r.stage === 'rejected') return null;
  const since = istYmdOf(r.stageSince);
  const days = since && today ? daysBetweenYmd(since, today) : Number.NaN;
  return Number.isNaN(days) ? null : Math.max(0, days);
}

export function ageingTone(days: number): Tone {
  if (days > 10) return 'rose';
  if (days > 5) return 'amber';
  return 'slate';
}

export type OnbSortKey = 'ref' | 'centre' | 'contact' | 'location' | 'source' | 'created' | 'stage' | 'age';

function sortValue(r: OnbRow, key: OnbSortKey, today: string): string | number {
  switch (key) {
    case 'ref': return Number(r.id) || 0;
    case 'centre': return r.centreName;
    case 'contact': return r.contactName;
    case 'location': return `${r.district} ${r.state}`;
    case 'source': return r.source;
    case 'created': return r.createdAt;
    case 'stage': return stageLabel(r);
    case 'age': return ageingDays(r, today) ?? -1;
    default: return '';
  }
}

export function sortOnboarding(rows: OnbRow[], key: OnbSortKey, dir: SortDir, today: string): OnbRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(a, key, today);
    const y = sortValue(b, key, today);
    const c = typeof x === 'number' && typeof y === 'number'
      ? x - y
      : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
    return c !== 0 ? sign * c : (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

export type RowAction = 'send' | 'resend' | 'agreement' | 'certificate' | 'reopen';

/** The stage action in the ⋮ menu (Under Review and Onboarded have none — View covers them). */
export function rowStageAction(r: Pick<OnbRow, 'stage' | 'linkSentAt'>): { action: RowAction; label: string } | null {
  switch (r.stage) {
    case 'lead': return r.linkSentAt ? { action: 'resend', label: 'Resend Link' } : { action: 'send', label: 'Send Form Link' };
    case 'agreement_pending': return { action: 'agreement', label: 'Upload Signed Agreement' };
    case 'certificate_pending': return { action: 'certificate', label: 'Generate Certificate' };
    case 'rejected': return { action: 'reopen', label: 'Reopen as Lead' };
    default: return null;
  }
}

// ── Detail ──────────────────────────────────────────────────────────────────

export type Verification = Partial<Record<VerificationSection, 'verified' | 'flagged'>>;

export interface AgreementView {
  id: string;
  agreementNo: string;
  effectiveDate: string;
  termYears: number;
  expiryDate: string;
  signedOn: string;
  ttiiSignatory: string;
  centreSignatory: string;
  fileUrl: string;
  fileName: string;
  feeAmount: number;
  feePaid: boolean;
  feePaidOn: string;
  notes: string;
  status: AgreementStatus;
}

export interface CertificateView {
  id: string;
  certificateNo: string;
  validFrom: string;
  validTo: string;
  fileUrl: string;
  status: CertificateStatus;
}

export interface EventView {
  id: string;
  type: string;
  message: string;
  at: string;
  by: string;
}

export interface DuplicateView {
  field: 'GSTIN' | 'Email' | 'Mobile';
  kind: 'centre' | 'lead' | 'login';
  name: string;
}

export interface OnbDetail {
  ready: true;
  today: string;
  record: OnbRow & { remarks: string; rejectReason: string; rejectedAt: string; verification: Verification };
  form: CentreApplication | null;
  link: { url: string; open: boolean; expiresAt: string } | null;
  agreement: AgreementView | null;
  certificate: CertificateView | null;
  events: EventView[];
  duplicates: DuplicateView[];
  loginClash: string;
}

function toVerification(raw: unknown): Verification {
  const r = rec(raw);
  const out: Verification = {};
  for (const s of VERIFICATION_SECTIONS) {
    const v = r[s];
    if (v === 'verified' || v === 'flagged') out[s] = v;
  }
  return out;
}

export function toAgreementView(raw: Record<string, unknown>): AgreementView {
  const status = str(raw.status);
  return {
    id: str(raw.id),
    agreementNo: str(raw.agreementNo),
    effectiveDate: str(raw.effectiveDate),
    termYears: num(raw.termYears),
    expiryDate: str(raw.expiryDate),
    signedOn: str(raw.signedOn),
    ttiiSignatory: str(raw.ttiiSignatory),
    centreSignatory: str(raw.centreSignatory),
    fileUrl: str(raw.fileUrl),
    fileName: str(raw.fileName),
    feeAmount: num(raw.feeAmount),
    feePaid: raw.feePaid === true,
    feePaidOn: str(raw.feePaidOn),
    notes: str(raw.notes),
    status: status === 'Expired' || status === 'Pending Renewal' ? status : 'Active',
  };
}

export function toCertificateView(raw: Record<string, unknown>): CertificateView {
  const status = str(raw.status);
  return {
    id: str(raw.id),
    certificateNo: str(raw.certificateNo),
    validFrom: str(raw.validFrom),
    validTo: str(raw.validTo),
    fileUrl: str(raw.fileUrl),
    status: status === 'Expired' || status === 'Revoked' ? status : 'Valid',
  };
}

export function toOnboardingDetail(raw: Record<string, unknown>): OnbDetail | { ready: false; message: string } {
  if (raw.ready === false) return { ready: false, message: str(raw.message) };
  const record = rec(raw.record);
  const link = raw.link ? rec(raw.link) : null;
  const dupKinds = new Set(['centre', 'lead', 'login']);
  return {
    ready: true,
    today: str(raw.today),
    record: {
      ...toOnbRow(record),
      remarks: str(record.remarks),
      rejectReason: str(record.rejectReason),
      rejectedAt: str(record.rejectedAt),
      verification: toVerification(record.verification),
    },
    form: raw.form ? normaliseCentreApplication(raw.form) : null,
    link: link ? { url: str(link.url), open: link.open === true, expiresAt: str(link.expiresAt) } : null,
    agreement: raw.agreement ? toAgreementView(rec(raw.agreement)) : null,
    certificate: raw.certificate ? toCertificateView(rec(raw.certificate)) : null,
    events: recs(raw.events).map((e) => ({ id: str(e.id), type: str(e.type), message: str(e.message), at: str(e.at), by: str(e.by) })),
    duplicates: recs(raw.duplicates)
      .filter((d) => ['GSTIN', 'Email', 'Mobile'].includes(str(d.field)) && dupKinds.has(str(d.kind)))
      .map((d) => ({ field: str(d.field) as DuplicateView['field'], kind: str(d.kind) as DuplicateView['kind'], name: str(d.name) })),
    loginClash: str(raw.loginClash),
  };
}

export interface SectionField {
  label: string;
  key: keyof CentreApplication;
  doc?: boolean;
}

/** The five sections an admin verifies (prototype SECTIONS; Address and Contact also show where and who). */
export const SECTIONS: Array<{ key: VerificationSection; title: string; fields: SectionField[] }> = [
  { key: 'entity', title: 'Entity', fields: [{ label: 'Legal Entity Name', key: 'legalEntity' }, { label: 'Entity Type', key: 'entityType' }, { label: 'Registration Document', key: 'registrationDoc', doc: true }] },
  { key: 'address', title: 'Address', fields: [{ label: 'Address', key: 'address1' }, { label: 'City', key: 'city' }, { label: 'District', key: 'district' }, { label: 'State', key: 'state' }, { label: 'Country', key: 'country' }, { label: 'PIN', key: 'pin' }] },
  { key: 'contact', title: 'Contact', fields: [{ label: 'Contact Name', key: 'contactName' }, { label: 'Designation', key: 'designation' }, { label: 'Mobile', key: 'mobile' }, { label: 'Email', key: 'email' }] },
  { key: 'legal', title: 'Legal & Identity', fields: [{ label: 'GSTIN', key: 'gstin' }, { label: 'PAN', key: 'pan' }, { label: 'Aadhaar / Passport', key: 'idNumber' }, { label: 'ID Document', key: 'idDoc', doc: true }, { label: 'PAN Document', key: 'panDoc', doc: true }] },
  { key: 'bank', title: 'Bank Details', fields: [{ label: 'Account Name', key: 'accountName' }, { label: 'Account Number', key: 'accountNumber' }, { label: 'IFSC', key: 'ifsc' }, { label: 'Bank', key: 'bank' }, { label: 'Branch', key: 'branch' }] },
];

export function verifiedCount(v: Verification): number {
  return VERIFICATION_SECTIONS.filter((s) => v[s] === 'verified').length;
}

export const FLOW: Stage[] = ['lead', 'under_review', 'agreement_pending', 'certificate_pending', 'onboarded'];

const STEP_EVENTS: Record<Exclude<Stage, 'rejected'>, string[]> = {
  lead: ['link_sent', 'link_resent'],
  under_review: ['form_submitted'],
  agreement_pending: ['approved'],
  certificate_pending: ['agreement_uploaded'],
  onboarded: ['certificate_issued'],
};

export interface TrackerStep {
  stage: Stage;
  label: string;
  state: 'done' | 'current' | 'todo';
  /** "22 Oct 2026 · Anita" or "—". */
  note: string;
}

/** The 5-step tracker: each step dated by the event that reached it (newest wins), the lead step by the first link sent. */
export function stepTracker(d: Pick<OnbDetail, 'record' | 'events'>): TrackerStep[] {
  const idx = FLOW.indexOf(d.record.stage);
  const done = d.record.stage === 'onboarded';
  return FLOW.map((stage, i) => {
    const state: TrackerStep['state'] = done || (idx >= 0 && i < idx) ? 'done' : idx === i ? 'current' : 'todo';
    const types = STEP_EVENTS[stage as Exclude<Stage, 'rejected'>];
    const matching = d.events.filter((e) => types.includes(e.type));
    // Events arrive newest first: the lead step shows the FIRST link sent, the others the latest.
    const e = stage === 'lead' ? (matching.at(-1) ?? d.events.find((x) => x.type === 'lead_added')) : matching[0];
    return { stage, label: ONBOARDING_STAGE_LABEL[stage], state, note: e && state !== 'todo' ? `${fmtDate(e.at)} · ${e.by}` : '—' };
  });
}

/** The warnings on the Submitted Application card. */
export function duplicateMessages(d: Pick<OnbDetail, 'duplicates' | 'loginClash' | 'record'>): string[] {
  const out = d.duplicates.map((x) => {
    if (x.field === 'GSTIN' && x.kind === 'centre') return `GSTIN matches an existing centre: ${x.name}`;
    return `${x.field} matches ${x.kind === 'centre' ? 'an existing centre' : 'another lead'}: ${x.name}`;
  });
  if (d.loginClash) {
    out.push(`${d.record.email} is already the email of an LMS login (${d.loginClash}). Change the email with Edit before completing onboarding.`);
  }
  return out;
}

// ── Formatting ──────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "22 Oct 2026" for a calendar day (YYYY-MM-DD) or an instant (its IST day); "—" when empty. */
export function fmtDate(value: string): string {
  if (!value) return '—';
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : istYmdOf(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}` : '—';
}

/** ₹ in Indian grouping, no decimals unless there are paise. */
export function inr(amount: number): string {
  const paise = Math.round(amount * 100) % 100 !== 0;
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: paise ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function locationOf(r: Pick<OnbRow, 'district' | 'state'>): string {
  return [r.district, r.state].filter(Boolean).join(', ');
}

// ── Add / Edit Centre Lead ──────────────────────────────────────────────────

export interface LeadForm {
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

export type LeadErrors = Partial<Record<keyof LeadForm, string | undefined>>;

export function leadFormOf(r?: OnbRow | null): LeadForm {
  return {
    centreName: r?.centreName ?? '',
    contactName: r?.contactName ?? '',
    email: r?.email ?? '',
    mobile: r?.mobile ?? '',
    country: r?.country || 'India',
    state: r?.state ?? '',
    district: r?.district ?? '',
    source: r?.source ?? '',
    notes: r?.notes ?? '',
  };
}

/** Same rules as the server (centre-onboarding-model parseLeadInput). */
export function validateLeadForm(f: LeadForm): LeadErrors {
  const e: LeadErrors = {};
  for (const k of ['centreName', 'contactName', 'email', 'country', 'state', 'source'] as const) {
    if (!f[k].trim()) e[k] = 'Required';
  }
  if (f.email.trim() && !isValidEmail(f.email)) e.email = 'Invalid email';
  else if (f.email.trim().length > 50) e.email = 'Must be 50 characters or fewer';
  if (f.mobile.trim() && !isValidMobile(f.mobile)) e.mobile = 'Enter a valid mobile number';
  if (f.notes.length > 2000) e.notes = 'Must be 2000 characters or fewer';
  return e;
}

export function leadPayload(f: LeadForm): Record<string, string> {
  return {
    centre_name: f.centreName.trim(),
    contact_name: f.contactName.trim(),
    email: f.email.trim(),
    mobile: f.mobile.trim(),
    country: f.country.trim(),
    state: f.state.trim(),
    district: f.district.trim(),
    source: f.source,
    notes: f.notes.trim(),
  };
}

// ── Upload Signed Agreement ─────────────────────────────────────────────────

export interface AgreementForm {
  effectiveDate: string;
  term: string;
  signedOn: string;
  ttiiSignatory: string;
  centreSignatory: string;
  fee: string;
  feePaid: boolean;
  feePaidOn: string;
  notes: string;
  fileUrl: string;
  fileName: string;
  /** The server's signature for the uploaded file (sent back with the save). */
  fileSig: string;
}

export type AgreementErrors = Partial<Record<keyof AgreementForm | 'file', string | undefined>>;

export function emptyAgreementForm(today: string, centreSignatory = ''): AgreementForm {
  return { effectiveDate: today, term: '3', signedOn: '', ttiiSignatory: '', centreSignatory, fee: '', feePaid: false, feePaidOn: today, notes: '', fileUrl: '', fileName: '', fileSig: '' };
}

export function validateAgreementForm(f: AgreementForm, today: string): AgreementErrors {
  const e: AgreementErrors = {};
  if (!isValidYmd(f.effectiveDate)) e.effectiveDate = 'Required';
  if (!f.fee.trim()) e.fee = 'Required';
  else if (!Number.isFinite(Number(f.fee)) || Number(f.fee) < 0) e.fee = 'Enter an amount';
  if (f.signedOn && !isValidYmd(f.signedOn)) e.signedOn = 'Enter a valid date';
  else if (f.signedOn && f.signedOn > today) e.signedOn = 'Cannot be in the future';
  if (f.feePaid && !isValidYmd(f.feePaidOn)) e.feePaidOn = 'Required';
  else if (f.feePaid && f.feePaidOn > today) e.feePaidOn = 'Cannot be in the future';
  if (!f.fileUrl) e.file = 'Upload the signed PDF';
  return e;
}

export function agreementPayload(onboardingId: string, f: AgreementForm): Record<string, unknown> {
  return {
    id: onboardingId,
    effective_date: f.effectiveDate,
    term_years: f.term,
    signed_on: f.signedOn,
    ttii_signatory: f.ttiiSignatory.trim(),
    centre_signatory: f.centreSignatory.trim(),
    fee_amount: f.fee.trim(),
    fee_paid: f.feePaid,
    fee_paid_on: f.feePaid ? f.feePaidOn : '',
    notes: f.notes.trim(),
    file_url: f.fileUrl,
    file_sig: f.fileSig,
  };
}

/** Client-side check before uploading the signed agreement (the server checks the content again). */
export function agreementFileError(file: { type: string; size: number; name: string }): string {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) return 'PDF only';
  if (file.size > 10 * 1024 * 1024) return 'Max 10 MB';
  return '';
}
