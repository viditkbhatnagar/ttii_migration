import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';
import { compareValues, matchesSearch, sortRows, ymdOf, type SortDir } from '../cohorts/list-model.js';
import { centreStatusOf } from '../centres/centre-list-model.js';
import { titleCase, toFundRequestRows, type FundRequestRow } from '../centres/centre-payments-model.js';

// Wallet & Payment view model (Naji 2026-10-22, WalletStatusModule). Four
// ledgers on real data:
//  - Top-up Requests  ← centre_fund_requests (GET /admin/centres/centre_payments);
//  - Centre Wallets   ← centres + transaction counts (GET /admin/wallet/index);
//  - Application Payments ← the Fees → Payment Status computation per centre
//    application / student (GET /admin/centres/application_payments);
//  - Affiliation Fee Records ← centre_agreements (GET /admin/centres/affiliation_fees).
// Every filter, count and sort runs here on the loaded rows.

export type WalletTab = 'topups' | 'wallets' | 'applications' | 'affiliation';

export const WALLET_TABS: Array<{ id: WalletTab; label: string }> = [
  { id: 'topups', label: 'Top-up Requests' },
  { id: 'wallets', label: 'Centre Wallets' },
  { id: 'applications', label: 'Application Payments' },
  { id: 'affiliation', label: 'Affiliation Fee Records' },
];

export const PAGE_SIZE = 8;

/** Top-up request = a centre_fund_requests row (status lower-cased: pending / approved / rejected). */
export type TopUpRow = FundRequestRow;

export interface CentreWalletRow {
  id: string;
  code: string;
  name: string;
  balance: number;
  transactions: number;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
}

export interface AppPaymentRow {
  key: string;
  applicationId: string;
  student: string;
  studentCode: string;
  centre: string;
  course: string;
  fee: number;
  paid: number;
  balance: number;
  ymd: string;
  status: string;
}

export interface AffiliationFeeRow {
  id: string;
  recordNo: string;
  centre: string;
  onboarding: boolean;
  period: string;
  amount: number;
  dueYmd: string;
  paidYmd: string;
  status: string;
}

export interface AffiliationFeeList { ready: boolean; message: string; rows: AffiliationFeeRow[] }

// ─── Status words and tones (Naji's tone() map) ─────────────────────────────

const APP_STATUS: Record<string, string> = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid', no_plan: 'No plan' };
const FEE_STATUS: Record<string, string> = { paid: 'Paid', pending: 'Pending', due_soon: 'Due Soon', overdue: 'Overdue', no_fee: 'No fee' };

export const TOPUP_STATUSES = ['Pending', 'Approved', 'Rejected'];
export const WALLET_STATUSES = ['Active', 'Inactive'];
export const APP_PAYMENT_STATUSES = ['Paid', 'Partial', 'Unpaid', 'No plan'];
export const AFFILIATION_STATUSES = ['Paid', 'Pending', 'Due Soon', 'Overdue'];

/** Approved / Paid / Active good; Pending / Partial / Due Soon need a look; Rejected / Overdue / Unpaid / Inactive bad. */
export function statusTone(status: string): Tone {
  if (['Approved', 'Paid', 'Active'].includes(status)) return 'emerald';
  if (['Pending', 'Partial', 'Due Soon'].includes(status)) return 'amber';
  if (['Rejected', 'Overdue', 'Unpaid', 'Inactive'].includes(status)) return 'rose';
  return 'slate';
}

/** "FR-12". */
export function requestNo(id: string): string {
  return `FR-${id}`;
}

export function topUpStatus(row: TopUpRow): string {
  return titleCase(row.status);
}

// ─── Payload mapping ────────────────────────────────────────────────────────

export function toTopUpRows(fundRequests: Record<string, unknown>[]): TopUpRow[] {
  return toFundRequestRows(fundRequests);
}

export function toCentreWalletRows(data: unknown): CentreWalletRow[] {
  return toRecords(data)
    .map((r) => ({
      id: asString(r.id),
      code: asString(r.centre_id),
      name: asString(r.centre_name).trim(),
      balance: asNumber(r.wallet_balance),
      transactions: asNumber(r.transaction_count),
      phone: asString(r.phone),
      email: asString(r.email),
      status: centreStatusOf(r.status) === 'active' ? 'Active' as const : 'Inactive' as const,
    }))
    .filter((w) => w.id);
}

export function toAppPaymentRows(data: Record<string, unknown>): AppPaymentRow[] {
  return toRecords(data.rows)
    .map((r) => ({
      key: asString(r.key),
      applicationId: asString(r.applicationId),
      student: asString(r.studentName),
      studentCode: asString(r.studentCode),
      centre: asString(r.centreName),
      course: asString(r.course),
      fee: asNumber(r.fee),
      paid: asNumber(r.paid),
      balance: asNumber(r.balance),
      ymd: ymdOf(asString(r.date)),
      status: APP_STATUS[asString(r.status)] ?? titleCase(asString(r.status)),
    }))
    .filter((r) => r.key);
}

export function toAffiliationFees(data: Record<string, unknown>): AffiliationFeeList {
  const rows = toRecords(data.rows)
    .map((r) => ({
      id: asString(r.id),
      recordNo: asString(r.recordNo),
      centre: asString(r.centreName),
      onboarding: r.onboarding === true,
      period: asString(r.period),
      amount: asNumber(r.amount),
      dueYmd: ymdOf(asString(r.dueDate)),
      paidYmd: ymdOf(asString(r.paidOn)),
      status: FEE_STATUS[asString(r.status)] ?? titleCase(asString(r.status)),
    }))
    .filter((r) => r.id);
  return { ready: data.ready !== false, message: asString(data.message), rows };
}

// ─── Ledger filtering / sorting (the prototype's LedgerTable) ───────────────

export interface LedgerFilterDef<T> {
  key: string;
  /** Plural noun for the "All …" option: "Centres", "Courses", "Periods". */
  label: string;
  valueOf: (row: T) => string;
}

export interface LedgerQuery {
  /** '' = All. */
  status: string;
  search: string;
  /** filter key → chosen value ('' = all). */
  filters: Record<string, string>;
}

export interface LedgerSpec<T> {
  statusOf: (row: T) => string;
  searchFields: (row: T) => Array<string | number>;
  filters: Array<LedgerFilterDef<T>>;
}

export function filterLedger<T>(rows: T[], q: LedgerQuery, spec: LedgerSpec<T>): T[] {
  return rows.filter((r) => {
    if (q.status && spec.statusOf(r) !== q.status) return false;
    for (const f of spec.filters) {
      const chosen = q.filters[f.key];
      if (chosen && f.valueOf(r) !== chosen) return false;
    }
    return matchesSearch(q.search, spec.searchFields(r));
  });
}

export function sortLedger<T>(rows: T[], pick: (row: T) => string | number, dir: SortDir): T[] {
  return sortRows(rows, pick, dir);
}

/** The tab's statuses plus any other status its rows carry, each with its (unfiltered) count. */
export function statusPills<T>(rows: T[], statuses: string[], statusOf: (row: T) => string): Array<{ status: string; count: number }> {
  const extra = [...new Set(rows.map(statusOf).filter((s) => s && !statuses.includes(s)))].sort();
  return [...statuses, ...extra].map((status) => ({ status, count: rows.filter((r) => statusOf(r) === status).length }));
}

/** Distinct non-empty values for a filter select, A–Z. */
export function filterOptions<T>(rows: T[], valueOf: (row: T) => string): Array<{ value: string; label: string }> {
  return [...new Set(rows.map(valueOf).filter(Boolean))]
    .sort((a, b) => compareValues(a, b))
    .map((v) => ({ value: v, label: v }));
}

export function isLedgerFiltered(q: LedgerQuery): boolean {
  return q.search.trim() !== '' || q.status !== '' || Object.values(q.filters).some(Boolean);
}

// ─── Deep links (?tab=topups&status=Pending) from the Centre Dashboard ──────

export function parseWalletLink(search: string): { tab: WalletTab; status: string } {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const known = WALLET_TABS.find((t) => t.id === tab)?.id ?? 'topups';
  const status = params.get('status') ?? '';
  return { tab: known, status: /^[A-Za-z ]{1,20}$/.test(status) ? status : '' };
}
