import { daysBetween, matchesQuery } from '../kit/format.js';

// Centre portal → Wallet & Payment view model (Naji's centre login design,
// 2026-10-22). Payloads come from GET /centre/wallet/ledger and
// /centre/wallet/collections(/view) — real data scoped server-side to the
// caller's centre. Everything here is pure so it is unit-tested.

export type WalletTab = 'overview' | 'collections' | 'ledger' | 'fund-requests';

export const WALLET_TABS: ReadonlyArray<{ value: WalletTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'collections', label: 'Student Fee Collections' },
  { value: 'ledger', label: 'Wallet Ledger' },
  { value: 'fund-requests', label: 'Fund Requests' },
];

/** ?tab= value → tab. Accepts the design's short names too ("funds", "payments"). */
export function parseWalletTab(value: string | null | undefined, fallback: WalletTab = 'overview'): WalletTab {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'overview' || v === 'collections' || v === 'ledger' || v === 'fund-requests') return v;
  if (v === 'funds' || v === 'fund_requests' || v === 'top-ups') return 'fund-requests';
  if (v === 'payments' || v === 'fees') return 'collections';
  return fallback;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(rec) : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

/**
 * A money amount from the API or a form ("3,201", "₹ 1,000.50", 250): commas,
 * spaces and the rupee sign are stripped. 0 for blanks and non-numbers.
 */
export function moneyOf(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[,\s₹]/g, '').replace(/^Rs\.?/i, '');
  if (cleaned === '') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** A link the browser may follow: http(s) only. */
export function safeHref(value: unknown): string {
  const url = str(value);
  return /^https?:\/\//i.test(url) ? url : '';
}

// ─── Ledger + fund requests ─────────────────────────────────────────────────

export type LedgerType = 'credit' | 'debit' | 'other';

export interface LedgerEntry {
  id: string;
  txnNo: string;
  type: LedgerType;
  amount: number;
  description: string;
  ymd: string;
  /** null when the ledger does not reconcile with the balance on record. */
  balance: number | null;
}

export type FundStatus = 'pending' | 'approved' | 'rejected';

export interface FundRequestRow {
  id: string;
  reqNo: string;
  ymd: string;
  amount: number;
  reference: string;
  description: string;
  attachment: string;
  /** Lower-cased; anything unexpected is kept so it still renders. */
  status: string;
}

export interface WalletLedgerView {
  centreName: string;
  centreCode: string;
  balance: number;
  totalCredits: number;
  totalDebits: number;
  net: number;
  reconciled: boolean;
  entries: LedgerEntry[];
  fundRequests: FundRequestRow[];
  pendingTopUps: { count: number; amount: number };
}

function ledgerTypeOf(value: unknown): LedgerType {
  const t = str(value).toLowerCase();
  return t === 'credit' || t === 'debit' ? t : 'other';
}

export function toWalletLedgerView(data: Record<string, unknown>): WalletLedgerView {
  const centre = rec(data.centre);
  const pending = rec(data.pendingTopUps);
  return {
    centreName: str(centre.name),
    centreCode: str(centre.code),
    balance: moneyOf(data.balance),
    totalCredits: moneyOf(data.totalCredits),
    totalDebits: moneyOf(data.totalDebits),
    net: moneyOf(data.net),
    reconciled: data.reconciled === true,
    entries: list(data.entries).map((e) => ({
      id: str(e.id),
      txnNo: str(e.txnNo) || `WTX-${str(e.id)}`,
      type: ledgerTypeOf(e.type),
      amount: moneyOf(e.amount),
      description: str(e.description),
      ymd: str(e.ymd),
      balance: typeof e.balance === 'number' && Number.isFinite(e.balance) ? e.balance : null,
    })).filter((e) => e.id),
    fundRequests: list(data.fundRequests).map((r) => ({
      id: str(r.id),
      reqNo: str(r.reqNo) || `FR-${str(r.id)}`,
      ymd: str(r.ymd),
      amount: moneyOf(r.amount),
      reference: str(r.reference),
      description: str(r.description),
      attachment: safeHref(r.attachment),
      status: str(r.status).toLowerCase() || 'pending',
    })).filter((r) => r.id),
    pendingTopUps: { count: Math.max(0, Math.trunc(moneyOf(pending.count))), amount: moneyOf(pending.amount) },
  };
}

export type LedgerFilter = 'all' | 'credit' | 'debit';

export function filterLedger(entries: LedgerEntry[], filter: LedgerFilter): LedgerEntry[] {
  return filter === 'all' ? entries : entries.filter((e) => e.type === filter);
}

export const FUND_STATUS_LABEL: Record<string, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
export const FUND_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-warning-soft text-warning-foreground border-transparent',
  approved: 'bg-success-soft text-success border-transparent',
  rejected: 'bg-destructive/10 text-destructive border-transparent',
};

export function fundStatusLabel(status: string): string {
  return FUND_STATUS_LABEL[status] ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending');
}

// ─── Request Funds form ─────────────────────────────────────────────────────

export interface FundRequestForm {
  amount: string;
  reference: string;
  description: string;
}

export const EMPTY_FUND_FORM: FundRequestForm = { amount: '', reference: '', description: '' };
export const MAX_TOP_UP = 10_000_000;

/** The first problem with the form, or null when it can be sent. */
export function fundRequestError(form: FundRequestForm): string | null {
  const raw = form.amount.trim();
  if (!raw) return 'Enter the amount you transferred.';
  const amount = moneyOf(raw);
  if (!/^[₹\s]*[\d,]+(\.\d{1,2})?\s*$/.test(raw) || amount <= 0) return 'Enter a valid amount, e.g. 25000 or 25,000.50.';
  if (amount > MAX_TOP_UP) return 'That amount is too large for one top-up request.';
  if (!form.reference.trim()) return 'Enter the transaction reference (UTR / cheque no.).';
  if (form.reference.trim().length > 255) return 'The transaction reference is too long.';
  return null;
}

/** Files /centre/upload accepts. */
const PROOF_EXT = /\.(png|jpe?g|webp|gif|pdf)$/i;
export const MAX_PROOF_BYTES = 20 * 1024 * 1024;

export function proofFileError(file: { name: string; size: number } | null): string | null {
  if (!file) return null;
  if (!PROOF_EXT.test(file.name)) return 'Payment proof must be an image (PNG, JPG, WEBP, GIF) or a PDF.';
  if (file.size > MAX_PROOF_BYTES) return 'Payment proof must be 20 MB or smaller.';
  return null;
}

// ─── Student fee collections ────────────────────────────────────────────────

export type CollectionStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'no_plan';

export interface CollectionRow {
  key: string;
  applicationId: string;
  studentName: string;
  studentCode: string;
  course: string;
  fee: number;
  paid: number;
  balance: number;
  overdue: number;
  status: CollectionStatus;
  nextDueYmd: string;
  source: 'application' | 'enrolment';
  date: string;
}

export interface CollectionTotals {
  rows: number;
  fee: number;
  received: number;
  pending: number;
  overdue: number;
  overdueRows: number;
}

export const COLLECTION_STATUS_LABEL: Record<CollectionStatus, string> = {
  paid: 'Paid', partial: 'Partial', pending: 'Pending', overdue: 'Overdue', no_plan: 'No plan',
};

export const COLLECTION_STATUS_STYLE: Record<CollectionStatus, string> = {
  paid: 'bg-success-soft text-success border-transparent',
  partial: 'bg-info-soft text-info border-transparent',
  pending: 'bg-warning-soft text-warning-foreground border-transparent',
  overdue: 'bg-destructive/10 text-destructive border-transparent',
  no_plan: 'bg-muted text-muted-foreground border-transparent',
};

function collectionStatusOf(value: unknown): CollectionStatus {
  const v = str(value);
  return v === 'paid' || v === 'partial' || v === 'overdue' || v === 'no_plan' ? v : 'pending';
}

export function toCollectionRow(r: Record<string, unknown>): CollectionRow {
  return {
    key: str(r.key),
    applicationId: str(r.applicationId),
    studentName: str(r.studentName),
    studentCode: str(r.studentCode),
    course: str(r.course),
    fee: moneyOf(r.fee),
    paid: moneyOf(r.paid),
    balance: moneyOf(r.balance),
    overdue: moneyOf(r.overdue),
    status: collectionStatusOf(r.status),
    nextDueYmd: str(r.nextDueYmd),
    source: str(r.source) === 'application' ? 'application' : 'enrolment',
    date: str(r.date),
  };
}

export function toCollectionsView(data: Record<string, unknown>): { rows: CollectionRow[]; totals: CollectionTotals } {
  const t = rec(data.totals);
  return {
    rows: list(data.rows).map(toCollectionRow).filter((r) => r.key),
    totals: {
      rows: moneyOf(t.rows),
      fee: moneyOf(t.fee),
      received: moneyOf(t.received),
      pending: moneyOf(t.pending),
      overdue: moneyOf(t.overdue),
      overdueRows: moneyOf(t.overdueRows),
    },
  };
}

/** The id shown under the student's name: the TTS code once enrolled, else the application id. */
export function collectionRef(row: CollectionRow): string {
  return row.studentCode || row.applicationId || '—';
}

export type DueRange = 'any' | 'overdue' | 'next7' | 'next30';

export const DUE_RANGES: ReadonlyArray<{ value: DueRange; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'next7', label: 'Next 7 days' },
  { value: 'next30', label: 'Next 30 days' },
];

export interface CollectionFilters {
  search: string;
  status: 'all' | CollectionStatus;
  course: string;
  due: DueRange;
}

export const EMPTY_COLLECTION_FILTERS: CollectionFilters = { search: '', status: 'all', course: 'all', due: 'any' };

export function filterCollections(rows: CollectionRow[], f: CollectionFilters, todayYmd: string): CollectionRow[] {
  return rows.filter((r) => {
    if (f.status !== 'all' && r.status !== f.status) return false;
    if (f.course !== 'all' && r.course !== f.course) return false;
    if (f.due === 'overdue' && r.overdue <= 0) return false;
    if (f.due === 'next7' || f.due === 'next30') {
      const days = daysBetween(todayYmd, r.nextDueYmd);
      if (days === null || days < 0 || days > (f.due === 'next7' ? 7 : 30)) return false;
    }
    return matchesQuery(f.search, [r.studentName, r.studentCode, r.applicationId, r.course]);
  });
}

export function collectionCourses(rows: CollectionRow[]): string[] {
  return [...new Set(rows.map((r) => r.course).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function statusCounts(rows: CollectionRow[]): Record<'all' | CollectionStatus, number> {
  const counts = { all: rows.length, paid: 0, partial: 0, pending: 0, overdue: 0, no_plan: 0 };
  for (const r of rows) counts[r.status] += 1;
  return counts;
}

/** 0–100, rounded down so a part-paid fee never shows 100%. */
export function paidPct(fee: number, paid: number): number {
  if (fee <= 0) return paid > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.floor((paid / fee) * 100)));
}

// ─── One student's payment view ─────────────────────────────────────────────

export type InstalmentState = 'paid' | 'overdue' | 'due' | 'upcoming';

export interface Instalment {
  id: string;
  label: string;
  dueYmd: string;
  amount: number;
  status: InstalmentState;
  paidYmd: string;
  mode: string;
  reference: string;
  receiptUrl: string;
}

export interface CollectionDetail {
  row: CollectionRow;
  email: string;
  phone: string;
  instalments: Instalment[];
}

export const INSTALMENT_LABEL: Record<InstalmentState, string> = { paid: 'Paid', overdue: 'Overdue', due: 'Due this month', upcoming: 'Upcoming' };
export const INSTALMENT_STYLE: Record<InstalmentState, string> = {
  paid: 'bg-success-soft text-success border-transparent',
  overdue: 'bg-destructive/10 text-destructive border-transparent',
  due: 'bg-warning-soft text-warning-foreground border-transparent',
  upcoming: 'bg-muted text-muted-foreground border-transparent',
};

function instalmentStateOf(value: unknown): InstalmentState {
  const v = str(value);
  return v === 'paid' || v === 'overdue' || v === 'due' ? v : 'upcoming';
}

export function toCollectionDetail(data: Record<string, unknown>): CollectionDetail {
  return {
    row: toCollectionRow(rec(data.row)),
    email: str(data.email),
    phone: str(data.phone),
    instalments: list(data.instalments).map((i) => ({
      id: str(i.id),
      label: str(i.label) || 'Instalment',
      dueYmd: str(i.dueYmd),
      amount: moneyOf(i.amount),
      status: instalmentStateOf(i.status),
      paidYmd: str(i.paidYmd),
      mode: str(i.mode),
      reference: str(i.reference),
      receiptUrl: safeHref(i.receiptUrl),
    })),
  };
}

/** Paid instalments, newest payment first (undated payments last). */
export function paymentHistory(instalments: Instalment[]): Instalment[] {
  return instalments
    .filter((i) => i.status === 'paid')
    .sort((a, b) => (a.paidYmd === b.paidYmd ? 0 : !a.paidYmd ? 1 : !b.paidYmd ? -1 : a.paidYmd < b.paidYmd ? 1 : -1));
}
