import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';
import { dmy, matchesSearch, sortRows, ymdOf, type SortDir } from '../cohorts/list-model.js';

// Centre Payments view model (TTII 2026-10-12, Naji's CentrePaymentsModule).
// Rows come from GET /admin/centres/centre_payments (listAdminCentrePayments):
// `fund_requests` (centre_fund_requests) and `wallet_transactions`. Filters run
// here on the loaded rows so both tab counts follow them live; the status
// filter applies to fund requests only, as it did on the server.

export type FundStatus = 'pending' | 'approved' | 'rejected';

export interface FundRequestRow {
  id: string;
  centreId: string;
  centre: string;
  user: string;
  /** transaction_receipt, else the request id (what the old page showed). */
  txnNo: string;
  amount: number;
  /** centre_fund_requests.date (@db.Date) as YYYY-MM-DD. */
  ymd: string;
  /** Lower-cased status; anything unexpected is kept so it still renders. */
  status: string;
  /** '' when there is no file or the value is not a safe link. */
  attachment: string;
  description: string;
}

export interface WalletTxnRow {
  id: string;
  centreId: string;
  centre: string;
  /** 'credit' | 'debit' (lower-cased transaction_type). */
  type: string;
  amount: number;
  /** created_at as the IST calendar date YYYY-MM-DD. */
  ymd: string;
  /** created_at as an epoch for sorting (0 when missing). */
  at: number;
  remarks: string;
}

export interface PaymentFilters {
  search: string;
  from: string;
  to: string;
  status: '' | FundStatus;
}

export const EMPTY_PAYMENT_FILTERS: PaymentFilters = { search: '', from: '', to: '', status: '' };

export type FundSortKey = 'centre' | 'user' | 'txnNo' | 'amount' | 'date' | 'status';
export type WalletSortKey = 'centre' | 'txnNo' | 'type' | 'amount' | 'date';

export const FUND_STATUS_TONE: Record<string, Tone> = { pending: 'amber', approved: 'emerald', rejected: 'rose' };

export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** A link a browser may follow: never javascript:, data: or vbscript:. */
export function safeHref(value: unknown): string {
  const url = asString(value);
  if (!url) return '';
  return /^(javascript|data|vbscript):/i.test(url.replace(/\s+/g, '')) ? '' : url;
}

const IST_OFFSET_MS = 330 * 60 * 1000;

/** The IST calendar date (YYYY-MM-DD) of a timestamp, or '' when it does not parse. */
export function istYmdOf(value: unknown): string {
  const ms = Date.parse(asString(value));
  return Number.isNaN(ms) ? '' : new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The status named by a "Fund request is already approved" reply, or null. */
export function alreadyStatusOf(message: string): FundStatus | null {
  const m = /already (approved|rejected|pending)\b/i.exec(message);
  return m ? (m[1]!.toLowerCase() as FundStatus) : null;
}

/** Rows with any locally-settled status applied (until the refetch lands). */
export function withSettledStatus(rows: FundRequestRow[], settled: (id: string) => string | undefined): FundRequestRow[] {
  return rows.map((r) => {
    const status = settled(r.id);
    return status && status !== r.status ? { ...r, status } : r;
  });
}

export function toFundRequestRows(data: Record<string, unknown>[]): FundRequestRow[] {
  return data
    .map((r) => {
      const id = asString(r.id);
      return {
        id,
        centreId: asString(r.centre_id),
        centre: asString(r.centre_name),
        user: asString(r.user_name),
        txnNo: asString(r.transaction_receipt) || id,
        amount: asNumber(r.amount),
        ymd: ymdOf(asString(r.date)),
        status: asString(r.status).toLowerCase(),
        attachment: safeHref(r.attachment_file),
        description: asString(r.description),
      };
    })
    .filter((r) => r.id);
}

export function toWalletTxnRows(data: Record<string, unknown>[]): WalletTxnRow[] {
  return data
    .map((r) => {
      const created = asString(r.created_at);
      const at = Date.parse(created);
      return {
        id: asString(r.id),
        centreId: asString(r.centre_id),
        centre: asString(r.centre_name),
        type: asString(r.transaction_type).toLowerCase(),
        amount: asNumber(r.amount),
        ymd: istYmdOf(created),
        at: Number.isNaN(at) ? 0 : at,
        remarks: asString(r.remarks),
      };
    })
    .filter((r) => r.id);
}

/** Inclusive YYYY-MM-DD window; an undated row only passes when no window is set. */
function inWindow(ymd: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!ymd) return false;
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

export function filterFundRequests(rows: FundRequestRow[], f: PaymentFilters): FundRequestRow[] {
  return rows.filter((r) => {
    if (!inWindow(r.ymd, f.from, f.to)) return false;
    if (f.status && r.status !== f.status) return false;
    return matchesSearch(f.search, [r.centre, r.user, r.txnNo, r.description]);
  });
}

export function filterWalletTxns(rows: WalletTxnRow[], f: PaymentFilters): WalletTxnRow[] {
  return rows.filter((r) => inWindow(r.ymd, f.from, f.to) && matchesSearch(f.search, [r.centre, r.id, r.remarks, r.type]));
}

export function sortFundRequests(rows: FundRequestRow[], key: FundSortKey, dir: SortDir): FundRequestRow[] {
  const pick = (r: FundRequestRow): string | number => {
    if (key === 'date') return `${r.ymd}#${r.id.padStart(10, '0')}`;
    return r[key];
  };
  return sortRows(rows, pick, dir);
}

export function sortWalletTxns(rows: WalletTxnRow[], key: WalletSortKey, dir: SortDir): WalletTxnRow[] {
  const pick = (r: WalletTxnRow): string | number => {
    if (key === 'date') return r.at;
    if (key === 'txnNo') return Number(r.id) || 0;
    return r[key];
  };
  return sortRows(rows, pick, dir);
}

export function fundRequestCsvRows(rows: FundRequestRow[]): Array<Array<string | number>> {
  return [
    ['Centre', 'User', 'Transaction No', 'Amount', 'Date', 'Status', 'Attachment', 'Description'],
    ...rows.map((r) => [r.centre, r.user, r.txnNo, r.amount, dmy(r.ymd), titleCase(r.status), r.attachment, r.description]),
  ];
}

export function walletTxnCsvRows(rows: WalletTxnRow[]): Array<Array<string | number>> {
  return [
    ['Centre', 'Transaction No', 'Type', 'Amount', 'Date', 'Description'],
    ...rows.map((r) => [r.centre, r.id, titleCase(r.type), r.amount, dmy(r.ymd), r.remarks]),
  ];
}
