import { asNumber, asRecord, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';
import { STAGE_LABEL, STAGE_TONE } from '../applications/application-list-model.js';
import { toCohortRow, type CohortRow } from '../cohorts/cohort-list-model.js';
import { matchesSearch, sortRows, type SortDir } from '../cohorts/list-model.js';
import type { CentreStatus } from './centre-list-model.js';


// Centre Profile 360 view model (Naji 2026-10-22, CentreProfileModule +
// CentreProfileExtraTabs). Shapes GET /admin/centres/profile, which carries
// REAL data only: the prototype's generated fee packages, offerings, student
// certificates, progress bars and activity lines have no source and are not
// reproduced. Pure — the page and its tabs render what these helpers return.

const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ProfileCentre {
  id: string;
  code: string;
  name: string;
  status: CentreStatus;
  country: string;
  state: string;
  district: string;
  address: string;
  contactPerson: string;
  designation: string;
  countryCode: string;
  phone: string;
  email: string;
  affiliationExpiry: string;
  registrationDoc: string;
  affiliationDocument: string;
  walletBalance: number;
  createdAt: string;
}

export interface ProfileKyc {
  legalEntity: string;
  entityType: string;
  city: string;
  pin: string;
  gstin: string;
  pan: string;
  idNumber: string;
  idDoc: string;
  panDoc: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bank: string;
  branch: string;
  logo: string;
}

export interface PlanRow { id: string; course: string; amount: number; start: string; end: string; status: 'Active' | 'Inactive' }
export interface AppRow { id: string; appId: string; date: string; student: string; course: string; combination: string; fee: number | null; stage: string }
export interface StudentRow { id: string; roll: string; name: string; cohort: string; course: string; joined: string; status: string }
export interface WalletTxn { id: string; type: 'credit' | 'debit' | 'other'; amount: number; remarks: string; at: string }
export interface FundRequest { id: string; amount: number; date: string; status: string; description: string; at: string }
export interface DocRow { key: string; id: string; source: string; name: string; type: string; date: string; url: string; deletable: boolean }
export interface ActivityRow { kind: string; text: string; at: string }

export interface CentreProfile {
  kycReady: boolean;
  notice: string;
  centre: ProfileCentre;
  kyc: ProfileKyc | null;
  login: { userId: string; email: string; disabled: boolean } | null;
  plans: PlanRow[];
  applications: AppRow[];
  students: StudentRow[];
  cohorts: CohortRow[];
  walletBalance: number;
  transactions: WalletTxn[];
  fundRequests: FundRequest[];
  documents: DocRow[];
  activity: ActivityRow[];
}

const str = (r: Record<string, unknown> | null, k: string) => (r ? asString(r[k]) : '');

export function toProfile(data: Record<string, unknown>): CentreProfile {
  const c = asRecord(data.centre) ?? {};
  const k = asRecord(data.kyc);
  const login = asRecord(data.login);
  const wallet = asRecord(data.wallet) ?? {};
  return {
    kycReady: data.kyc_ready === true,
    notice: asString(data.notice),
    centre: {
      id: asString(c.id),
      code: asString(c.code),
      name: asString(c.name),
      status: asString(c.status) === 'inactive' ? 'inactive' : 'active',
      country: asString(c.country),
      state: asString(c.state),
      district: asString(c.district),
      address: asString(c.address),
      contactPerson: asString(c.contact_person),
      designation: asString(c.designation),
      countryCode: asString(c.country_code),
      phone: asString(c.phone),
      email: asString(c.email),
      affiliationExpiry: asString(c.affiliation_expiry),
      registrationDoc: asString(c.registration_doc),
      affiliationDocument: asString(c.affiliation_document),
      walletBalance: asNumber(c.wallet_balance),
      createdAt: asString(c.created_at),
    },
    kyc: k ? {
      legalEntity: str(k, 'legal_entity_name'), entityType: str(k, 'entity_type'), city: str(k, 'city'), pin: str(k, 'pincode'),
      gstin: str(k, 'gstin'), pan: str(k, 'pan'), idNumber: str(k, 'id_number'), idDoc: str(k, 'id_doc'), panDoc: str(k, 'pan_doc'),
      accountName: str(k, 'bank_account_name'), accountNumber: str(k, 'bank_account_number'), ifsc: str(k, 'bank_ifsc'),
      bank: str(k, 'bank_name'), branch: str(k, 'bank_branch'), logo: str(k, 'logo'),
    } : null,
    login: login ? { userId: asString(login.user_id), email: asString(login.email), disabled: login.disabled === true } : null,
    plans: toRecords(data.course_plans).map((p) => ({
      id: asString(p.id), course: asString(p.course), amount: asNumber(p.amount), start: asString(p.start), end: asString(p.end),
      status: asString(p.status) === 'Inactive' ? 'Inactive' : 'Active',
    })),
    applications: toRecords(data.applications).map((a) => ({
      id: asString(a.id), appId: asString(a.application_id), date: asString(a.date), student: asString(a.student),
      course: asString(a.course), combination: asString(a.combination),
      fee: a.fee === null || a.fee === undefined || a.fee === '' ? null : asNumber(a.fee), stage: asString(a.stage) || 'lead',
    })),
    students: toRecords(data.students).map((s) => ({
      id: asString(s.id), roll: asString(s.roll), name: asString(s.name), cohort: asString(s.cohort), course: asString(s.course),
      joined: asString(s.joined), status: asString(s.status) || 'Active',
    })),
    cohorts: toRecords(data.cohorts).map(toCohortRow).filter((r) => r.id),
    walletBalance: asNumber(wallet.balance),
    transactions: toRecords(wallet.transactions).map((t) => {
      const type = asString(t.type);
      return { id: asString(t.id), type: type === 'credit' || type === 'debit' ? type : 'other', amount: asNumber(t.amount), remarks: asString(t.remarks), at: asString(t.at) };
    }),
    fundRequests: toRecords(wallet.fund_requests).map((f) => ({
      id: asString(f.id), amount: asNumber(f.amount), date: asString(f.date), status: asString(f.status) || 'pending',
      description: asString(f.description), at: asString(f.at),
    })),
    documents: toRecords(data.documents).map((d) => ({
      key: asString(d.key), id: asString(d.id), source: asString(d.source), name: asString(d.name), type: asString(d.type),
      date: asString(d.date), url: asString(d.url), deletable: d.deletable === true,
    })),
    activity: toRecords(data.activity).map((a) => ({ kind: asString(a.kind), text: asString(a.text), at: asString(a.at) })),
  };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/** "₹75,000.00". */
export function inr2(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "₹75,000" — the hero stat tile (whole rupees). */
export function inr0(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** "₹35,400" or "₹35,400.5" — fee and plan amounts, paise only when there are any. */
export function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** "22 Oct 2026" for a YYYY-MM-DD value or an ISO instant (read as the IST calendar day); "—" when empty. */
export function fmtDay(value: string): string {
  let ymd = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  if (!ymd && value) {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) ymd = new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);
  }
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-');
  return `${d} ${MONTHS[Number(m) - 1] ?? ''} ${y}`;
}

/** The sortable day of a row value: YYYY-MM-DD, or an ISO instant's IST day. */
export function dayKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const t = Date.parse(value);
  return Number.isNaN(t) ? '' : new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The prototype's account-number mask: one dot per hidden character, then the
 * last 4 ("••••••••••5678"). Used for the bank account AND the Aadhaar /
 * Passport number. Values of 4 characters or fewer are fully dotted.
 */
export function maskTail(value: string, visible = 4): string {
  const v = value.trim();
  if (!v) return '';
  if (v.length <= visible) return '•'.repeat(v.length);
  return `${'•'.repeat(v.length - visible)}${v.slice(-visible)}`;
}

export function hasBankDetails(kyc: ProfileKyc | null): boolean {
  return !!kyc && [kyc.accountName, kyc.accountNumber, kyc.ifsc, kyc.bank, kyc.branch].some((v) => v.trim() !== '');
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase() || 'C';
}

/** "district, state, country" with the blanks dropped. */
export function locationLine(c: Pick<ProfileCentre, 'district' | 'state' | 'country'>): string {
  return [c.district, c.state, c.country].filter(Boolean).join(', ');
}

export function docsOnFile(docs: DocRow[]): number {
  return docs.filter((d) => d.url !== '').length;
}

// ─── Course & Fee Structure (centre_course_plans) ───────────────────────────

export type PlanStatusTab = 'all' | 'Active' | 'Inactive';
export type PlanSortKey = 'course' | 'amount' | 'start' | 'end' | 'status';

export function filterPlans(rows: PlanRow[], f: { status: PlanStatusTab; course: string; search: string }): PlanRow[] {
  return rows.filter((r) => (f.status === 'all' || r.status === f.status) && (!f.course || r.course === f.course) && matchesSearch(f.search, [r.course]));
}

export function sortPlans(rows: PlanRow[], key: PlanSortKey, dir: SortDir): PlanRow[] {
  return sortRows(rows, (r) => (key === 'amount' ? r.amount : key === 'start' || key === 'end' ? r[key] || '9999-12-31' : r[key]), dir);
}

// ─── Applications ───────────────────────────────────────────────────────────

/** Pills in pipeline order; Form Pending / Form Submitted only show when used. */
export const APP_STAGES = ['lead', 'payment_pending', 'paid', 'form_pending', 'form_submitted', 'approval_waiting', 'enrolled', 'rejected'] as const;
const ALWAYS_SHOWN_STAGES = new Set(['lead', 'payment_pending', 'paid', 'approval_waiting', 'enrolled', 'rejected']);

export function stageLabelOf(stage: string): string {
  return STAGE_LABEL[stage] ?? (stage ? stage.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'Lead');
}

export function stageToneOf(stage: string): Tone {
  return STAGE_TONE[stage] ?? 'slate';
}

/** The stage pills to show: the prototype's set, plus any other stage a row carries. */
export function stagePills(rows: AppRow[]): Array<{ stage: string; label: string; count: number }> {
  const known = APP_STAGES as readonly string[];
  const extra = [...new Set(rows.map((r) => r.stage).filter((s) => !known.includes(s)))];
  return [...known, ...extra]
    .map((stage) => ({ stage, label: stageLabelOf(stage), count: rows.filter((r) => r.stage === stage).length }))
    .filter((p) => ALWAYS_SHOWN_STAGES.has(p.stage) || p.count > 0);
}

export type AppSortKey = 'appId' | 'date' | 'student' | 'course' | 'combination' | 'fee' | 'stage';

export function filterApps(rows: AppRow[], f: { stage: string; course: string; combination: string; search: string }): AppRow[] {
  return rows.filter((r) => (f.stage === 'all' || r.stage === f.stage)
    && (!f.course || r.course === f.course)
    && (!f.combination || r.combination === f.combination)
    && matchesSearch(f.search, [r.appId, r.student, r.course]));
}

export function sortApps(rows: AppRow[], key: AppSortKey, dir: SortDir): AppRow[] {
  return sortRows(rows, (r) => (key === 'fee' ? r.fee ?? -1 : key === 'stage' ? stageLabelOf(r.stage) : r[key]), dir);
}

export function distinct(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// ─── Students ───────────────────────────────────────────────────────────────

export type StudentSortKey = 'roll' | 'name' | 'cohort' | 'course' | 'joined' | 'status';
export const STUDENT_PAGE_SIZE = 10;

export function filterStudents(rows: StudentRow[], search: string): StudentRow[] {
  return rows.filter((s) => matchesSearch(search, [s.roll, s.name, s.cohort, s.course, s.status]));
}

export function sortStudents(rows: StudentRow[], key: StudentSortKey, dir: SortDir): StudentRow[] {
  return sortRows(rows, (s) => s[key], dir);
}

export function studentTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s === 'active') return 'emerald';
  if (s === 'dropped') return 'rose';
  if (s === 'graduated') return 'primary';
  return 'slate';
}

// ─── Cohorts ────────────────────────────────────────────────────────────────

export type CohortTabSortKey = 'code' | 'course' | 'subject' | 'language' | 'instructor' | 'students' | 'liveClasses' | 'start' | 'status';

export function filterCohortRows(rows: CohortRow[], search: string): CohortRow[] {
  return rows.filter((c) => matchesSearch(search, [c.code, c.cohortId, c.title, c.subject, c.language, c.instructor, ...c.courses]));
}

export function sortCohortRows(rows: CohortRow[], key: CohortTabSortKey, dir: SortDir): CohortRow[] {
  return sortRows(rows, (c) => {
    switch (key) {
      case 'course': return c.courses.join(', ');
      case 'students': return c.students;
      case 'liveClasses': return c.liveClasses;
      case 'start': return c.startYmd || '9999-12-31';
      default: return c[key];
    }
  }, dir);
}

export function activeCohortCount(rows: CohortRow[]): number {
  return rows.filter((c) => c.status === 'active').length;
}

// ─── Wallet (wallet_transactions + centre_fund_requests) ────────────────────

export type LedgerCategory = 'Wallet Transaction' | 'Fund Request';

export interface LedgerRow {
  key: string;
  ref: string;
  category: LedgerCategory;
  type: 'Credit' | 'Debit' | 'Other' | 'Request';
  amount: number;
  /** Running balance after this transaction; null for requests, or when the ledger does not reconcile. */
  balance: number | null;
  /** YYYY-MM-DD (IST day) for sorting and display. */
  date: string;
  /** Exact instant when known, for ordering same-day rows. */
  at: string;
  status: string;
  description: string;
}

const CENTS = 0.005;

/**
 * Wallet transactions and fund requests in one list. The running balance is
 * shown ONLY when it reconciles honestly: replaying every credit and debit
 * from zero must land on centres.wallet_balance. Otherwise (opening balances
 * set outside the ledger, unknown transaction types) every balance is null and
 * renders "—" — never a number made to fit.
 */
export function buildLedger(txns: WalletTxn[], funds: FundRequest[], walletBalance: number): { rows: LedgerRow[]; reconciled: boolean } {
  const ordered = [...txns].sort((a, b) => (a.at === b.at ? Number(a.id) - Number(b.id) : a.at < b.at ? -1 : 1));
  let running = 0;
  const balances = new Map<string, number>();
  let known = true;
  for (const t of ordered) {
    if (t.type === 'other') { known = false; break; }
    running += t.type === 'credit' ? t.amount : -t.amount;
    balances.set(t.id, running);
  }
  const reconciled = known && Math.abs(running - walletBalance) < CENTS;
  const label = (status: string) => (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending');
  const rows: LedgerRow[] = [
    ...txns.map((t): LedgerRow => ({
      key: `w${t.id}`,
      ref: `TXN-${t.id}`,
      category: 'Wallet Transaction',
      type: t.type === 'credit' ? 'Credit' : t.type === 'debit' ? 'Debit' : 'Other',
      amount: t.amount,
      balance: reconciled ? balances.get(t.id) ?? null : null,
      date: dayKey(t.at),
      at: t.at,
      status: 'Completed',
      description: t.remarks,
    })),
    ...funds.map((f): LedgerRow => ({
      key: `f${f.id}`,
      ref: `FR-${f.id}`,
      category: 'Fund Request',
      type: 'Request',
      amount: f.amount,
      balance: null,
      date: f.date || dayKey(f.at),
      at: f.at,
      status: label(f.status),
      description: f.description,
    })),
  ];
  return { rows, reconciled };
}

export function walletTotals(txns: WalletTxn[]): { credits: number; debits: number } {
  return {
    credits: txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    debits: txns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
  };
}

export type LedgerSortKey = 'ref' | 'category' | 'type' | 'amount' | 'balance' | 'date' | 'status' | 'description';

export function filterLedger(rows: LedgerRow[], category: 'all' | LedgerCategory, search: string): LedgerRow[] {
  return rows.filter((r) => (category === 'all' || r.category === category)
    && matchesSearch(search, [r.ref, r.category, r.type, r.status, r.description, r.amount]));
}

export function sortLedger(rows: LedgerRow[], key: LedgerSortKey, dir: SortDir): LedgerRow[] {
  return sortRows(rows, (r) => {
    if (key === 'amount') return r.amount;
    if (key === 'balance') return r.balance ?? -1;
    if (key === 'date') return `${r.date}|${r.at}`;
    return r[key];
  }, dir);
}

export function ledgerTone(value: string): Tone {
  if (value === 'Credit' || value === 'Approved' || value === 'Completed') return 'emerald';
  if (value === 'Debit' || value === 'Rejected') return 'rose';
  if (value === 'Pending' || value === 'Request') return 'amber';
  return 'slate';
}

// ─── Documents ──────────────────────────────────────────────────────────────

export type DocSortKey = 'name' | 'type' | 'date' | 'status';

export function filterDocs(rows: DocRow[], search: string): DocRow[] {
  return rows.filter((d) => matchesSearch(search, [d.name, d.type]));
}

export function sortDocs(rows: DocRow[], key: DocSortKey, dir: SortDir): DocRow[] {
  return sortRows(rows, (d) => (key === 'status' ? (d.url ? 1 : 0) : key === 'date' ? d.date || '0000-00-00' : d[key]), dir);
}

/** A document opens inline unless it is an Office file (those only download). */
export function opensInline(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || !/\.(docx?|pptx?|xlsx?)($|\?)/i.test(url);
}
