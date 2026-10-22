import { dateYmd, fundRequestNo, istYmd, money, roundMoney } from './centre-dashboard-model.js';

// Centre portal → Wallet & Payment (Naji's centre login design, 2026-10-22).
// Pure view-model builders for the money endpoints in
// centre-portal-money-service.ts. Nothing here reads the database.
//
// Honesty rules (the prototype fabricated all of this):
//  - the ledger shows a running balance ONLY when the centre's credits minus
//    debits equal centres.wallet_balance; otherwise every balance is null and
//    the page says the two do not reconcile;
//  - money columns are VarChar ("3,201", "₹ 500"), always read with money();
//  - an instalment is "overdue" exactly when Fees → Payment Status says so
//    (computed_status 'overdue': due in an earlier calendar month, unpaid).

/** Result of a centre-scoped read: status 0 carries a message the page shows. */
export interface Outcome<T> {
  status: 0 | 1;
  message: string;
  data?: T;
}

export const ok = <T>(data: T): Outcome<T> => ({ status: 1, message: 'success', data });
export const refuse = <T>(message: string): Outcome<T> => ({ status: 0, message });

export const NO_CENTRE = 'Your login is not linked to a centre. Please contact TTII support.';

/** A positive integer id from a number or a numeric string (users.centre_id is a VarChar), else null. */
export function positiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value.trim(), 10) : Number.NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Half a paisa: below this, two rupee totals are the same amount. */
export const RECONCILE_TOLERANCE = 0.005;

// ─── Wallet ledger ──────────────────────────────────────────────────────────

export type LedgerType = 'credit' | 'debit' | 'other';

export interface WalletTxnInput {
  id: number;
  transaction_type: string | null;
  amount: string | null;
  remarks: string | null;
  created_at: Date | null;
}

export interface LedgerEntry {
  id: number;
  /** "WTX-12". */
  txnNo: string;
  type: LedgerType;
  amount: number;
  description: string;
  /** created_at as ISO ('' when missing). */
  at: string;
  /** created_at as the IST calendar day. */
  ymd: string;
  /** Balance after this entry — null unless the ledger reconciles with the balance on record. */
  balance: number | null;
}

export interface WalletLedger {
  balance: number;
  totalCredits: number;
  totalDebits: number;
  /** Credits minus debits over every entry. */
  net: number;
  /** True when `net` equals the balance on record and every entry is a credit or a debit. */
  reconciled: boolean;
  /** Newest first. */
  entries: LedgerEntry[];
}

export function ledgerType(value: string | null | undefined): LedgerType {
  const t = (value ?? '').trim().toLowerCase();
  return t === 'credit' || t === 'debit' ? t : 'other';
}

/**
 * The centre's wallet_transactions as a ledger. Rows are replayed in id order
 * (the order they were written; created_at can be back-dated). A running
 * balance is shown only when the replay ends exactly on centres.wallet_balance
 * — a centre whose balance was set or edited outside the ledger, or that has an
 * entry of an unknown type, gets null balances rather than invented ones.
 */
export function buildLedger(txns: WalletTxnInput[], walletBalance: unknown): WalletLedger {
  const balance = roundMoney(money(walletBalance));
  const chronological = [...txns].sort((a, b) => a.id - b.id);
  let running = 0;
  let credits = 0;
  let debits = 0;
  let unknownType = false;
  const replayed = chronological.map((t) => {
    const type = ledgerType(t.transaction_type);
    const amount = roundMoney(money(t.amount));
    if (type === 'credit') { credits += amount; running += amount; }
    else if (type === 'debit') { debits += amount; running -= amount; }
    else unknownType = true;
    return {
      id: t.id,
      txnNo: `WTX-${t.id}`,
      type,
      amount,
      description: (t.remarks ?? '').trim(),
      at: t.created_at instanceof Date && !Number.isNaN(t.created_at.getTime()) ? t.created_at.toISOString() : '',
      ymd: istYmd(t.created_at),
      running: roundMoney(running),
    };
  });
  const net = roundMoney(credits - debits);
  const reconciled = !unknownType && Math.abs(net - balance) < RECONCILE_TOLERANCE;
  const entries: LedgerEntry[] = replayed
    .map(({ running: after, ...e }) => ({ ...e, balance: reconciled ? after : null }))
    .reverse();
  return { balance, totalCredits: roundMoney(credits), totalDebits: roundMoney(debits), net, reconciled, entries };
}

// ─── Fund requests (wallet top-ups) ─────────────────────────────────────────

export interface FundRequestInput {
  id: number;
  amount: string | null;
  date: Date | null;
  transaction_receipt: string | null;
  description: string | null;
  attachment_file: string | null;
  status: string | null;
  created_at: Date | null;
}

export interface FundRequestView {
  id: number;
  /** "FR-12" — the same number the admin side shows. */
  reqNo: string;
  /** The date the centre entered (YYYY-MM-DD). */
  ymd: string;
  amount: number;
  reference: string;
  description: string;
  /** A safe http(s) link to the proof, or ''. */
  attachment: string;
  status: string;
}

/** Only http(s) links reach the page (never javascript:, data:, relative paths). */
export function safeLink(value: string | null | undefined): string {
  const url = (value ?? '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

export function toFundRequestView(r: FundRequestInput): FundRequestView {
  return {
    id: r.id,
    reqNo: fundRequestNo(r.id),
    ymd: dateYmd(r.date) || istYmd(r.created_at),
    amount: roundMoney(money(r.amount)),
    reference: (r.transaction_receipt ?? '').trim(),
    description: (r.description ?? '').trim(),
    attachment: safeLink(r.attachment_file),
    status: (r.status ?? '').trim().toLowerCase() || 'pending',
  };
}

export function pendingTopUps(requests: FundRequestView[]): { count: number; amount: number } {
  const pending = requests.filter((r) => r.status === 'pending');
  return { count: pending.length, amount: roundMoney(pending.reduce((s, r) => s + r.amount, 0)) };
}

// ─── Student fee collections ────────────────────────────────────────────────

export type InstalmentState = 'paid' | 'overdue' | 'due' | 'upcoming';
export type CollectionStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'no_plan';

export interface CollectionInstalment {
  id: string;
  label: string;
  /** YYYY-MM-DD, '' when the instalment has no due date. */
  dueYmd: string;
  amount: number;
  status: InstalmentState;
  /** YYYY-MM-DD, '' when not recorded. */
  paidYmd: string;
  mode: string;
  reference: string;
  /** A safe http(s) link, or ''. */
  receiptUrl: string;
}

export interface CollectionRow {
  key: string;
  applicationId: string;
  studentName: string;
  studentCode: string;
  course: string;
  fee: number;
  paid: number;
  balance: number;
  /** Unpaid instalments Payment Status marks overdue. */
  overdue: number;
  status: CollectionStatus;
  /** Earliest unpaid due date, '' when nothing is due. */
  nextDueYmd: string;
  /** Before enrolment (the application's plan) or after (the student's ledger). */
  source: 'application' | 'enrolment';
  /** IST day the application / student was created. */
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

/** A Payment Status date (a Date at UTC midnight, or a 'YYYY-MM-DD…' string) as YYYY-MM-DD. */
export function ymdOf(value: unknown): string {
  if (value instanceof Date) return dateYmd(value);
  if (typeof value === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return m ? m[1] ?? '' : '';
  }
  return '';
}

function instalmentState(value: unknown): InstalmentState {
  return value === 'paid' || value === 'overdue' || value === 'due' ? value : 'upcoming';
}

export function toInstalment(r: Record<string, unknown>, extra?: { reference?: string | null; receipt?: string | null }): CollectionInstalment {
  const status = instalmentState(r.computed_status);
  const label = typeof r.installment_details === 'string' ? r.installment_details.trim() : '';
  return {
    id: typeof r.id === 'number' || typeof r.id === 'string' ? String(r.id) : '',
    label: label || 'Instalment',
    dueYmd: ymdOf(r.due_date),
    amount: roundMoney(money(r.amount)),
    status,
    paidYmd: status === 'paid' ? ymdOf(r.paid_date) : '',
    mode: status === 'paid' && typeof r.payment_mode === 'string' ? r.payment_mode.trim() : '',
    reference: (extra?.reference ?? '').trim(),
    receiptUrl: safeLink(extra?.receipt),
  };
}

/** Instalments in due-date order (undated last), then by id. */
export function sortInstalments(list: CollectionInstalment[]): CollectionInstalment[] {
  return [...list].sort((a, b) => {
    if (a.dueYmd !== b.dueYmd) {
      if (!a.dueYmd) return 1;
      if (!b.dueYmd) return -1;
      return a.dueYmd < b.dueYmd ? -1 : 1;
    }
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}

export function collectionStatus(fee: number, paid: number, overdue: number): CollectionStatus {
  if (fee <= 0) return paid > 0 ? 'paid' : 'no_plan';
  if (paid >= fee) return 'paid';
  if (overdue > 0) return 'overdue';
  return paid > 0 ? 'partial' : 'pending';
}

/** The Wallet & Payment row of one application / student, from its fee row and its instalments. */
export function toCollectionRow(
  row: { key: string; applicationId: string; studentName: string; studentCode: string; course: string; fee: number; paid: number; balance: number; source: 'application' | 'enrolment'; date: string },
  instalments: CollectionInstalment[],
): CollectionRow {
  const unpaid = instalments.filter((i) => i.status !== 'paid');
  const overdue = roundMoney(unpaid.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0));
  const nextDueYmd = sortInstalments(unpaid).find((i) => i.dueYmd)?.dueYmd ?? '';
  return {
    key: row.key,
    applicationId: row.applicationId,
    studentName: row.studentName,
    studentCode: row.studentCode,
    course: row.course,
    fee: row.fee,
    paid: row.paid,
    balance: row.balance,
    overdue,
    status: collectionStatus(row.fee, row.paid, overdue),
    nextDueYmd,
    source: row.source,
    date: row.date,
  };
}

export function collectionTotals(rows: CollectionRow[]): CollectionTotals {
  return {
    rows: rows.length,
    fee: roundMoney(rows.reduce((s, r) => s + r.fee, 0)),
    received: roundMoney(rows.reduce((s, r) => s + r.paid, 0)),
    pending: roundMoney(rows.reduce((s, r) => s + r.balance, 0)),
    overdue: roundMoney(rows.reduce((s, r) => s + r.overdue, 0)),
    overdueRows: rows.filter((r) => r.status === 'overdue').length,
  };
}

/** "app-12" or "user-5-9" — anything else is not a collection key. */
export function isCollectionKey(value: string): boolean {
  return /^(app-\d+|user-\d+-\d+)$/.test(value);
}
