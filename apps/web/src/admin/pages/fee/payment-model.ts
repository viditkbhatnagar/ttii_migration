import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { dmy, matchesSearch, sortRows, ymdOf, type SortDir } from '../cohorts/list-model.js';
import { numOrNull } from './fee-model.js';

// Pure view-models for Payment Status and Payment Approval in Naji's design
// (TTII 2026-10-12). LAYOUT ONLY: the rows, buckets (computed_status) and card
// totals are exactly what /admin/fee_management/payment_status and
// /payment_approvals return; nothing here decides whether money is paid.

// ─── Payment Status ────────────────────────────────────────────────────

export type PaymentBucket = 'overdue' | 'due' | 'upcoming' | 'paid';
export type PaymentTab = PaymentBucket | 'all';

/** Naji UAT 2026-05-14: Overdue → Due → Upcoming → Paid → All, opening on Overdue. */
export const PAYMENT_TABS: Array<{ id: PaymentTab; label: string }> = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'due', label: 'Due' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'paid', label: 'Paid' },
  { id: 'all', label: 'All' },
];

export const ENROLMENT_STATUS_OPTIONS = ['Active', 'On Hold', 'Completed', 'Graduated', 'Dropout', 'Application'];

export interface PaymentRow {
  id: string;
  /**
   * Set for rows synthesised from applications.payment_plan (id "app-{appId}-{idx}").
   * Those cannot be marked paid through student_payments — the row offers
   * "View Application" instead (Naji UAT 2026-05-14).
   */
  applicationId: string | null;
  enrolmentStatus: string;
  studentId: string;
  name: string;
  course: string;
  details: string;
  amount: number;
  dueYmd: string;
  paidYmd: string;
  status: string;
  mode: string;
  to: string;
}

/** The application id of a synthesised application-plan row, else null. */
export function applicationIdOf(id: string): string | null {
  const m = /^app-(\d+)-/.exec(id);
  return m ? (m[1] ?? '') : null;
}

export function toPaymentRows(raw: Record<string, unknown>[]): PaymentRow[] {
  return raw.map((r) => {
    const id = asString(r.id);
    return {
      id,
      applicationId: applicationIdOf(id),
      enrolmentStatus: asString(r.enrolment_status),
      studentId: asString(r.student_id),
      name: asString(r.user_name),
      course: asString(r.course_title),
      details: asString(r.installment_details) || `Installment ${asNumber(r.installment_no) || 1}`,
      amount: asNumber(r.amount),
      dueYmd: ymdOf(r.due_date),
      paidYmd: ymdOf(r.paid_date),
      status: asString(r.computed_status) || 'pending',
      mode: asString(r.payment_mode),
      to: asString(r.payment_to),
    };
  });
}

/** Rows of one tab, then the client-side Enrolment Status filter (as before). */
export function filterPayments(rows: PaymentRow[], tab: PaymentTab, enrolmentStatus: string): PaymentRow[] {
  return rows.filter((r) => {
    if (tab !== 'all' && r.status !== tab) return false;
    if (enrolmentStatus && r.enrolmentStatus !== enrolmentStatus) return false;
    return true;
  });
}

export type PaymentColumn =
  | 'enrolmentStatus' | 'studentId' | 'name' | 'course' | 'details' | 'amount'
  | 'dueDate' | 'paidDate' | 'mode' | 'status' | 'to' | 'action';

/**
 * Columns per tab (Naji UAT 2026-05-14): Paid drops To + the row action and
 * moves Mode before Payment Status; the open buckets drop Paid Date, Mode, To
 * and Remind; All keeps the full set.
 */
export function paymentColumns(tab: PaymentTab): PaymentColumn[] {
  const lead: PaymentColumn[] = ['enrolmentStatus', 'studentId', 'name', 'course', 'details', 'amount', 'dueDate'];
  if (tab === 'paid') return [...lead, 'paidDate', 'mode', 'status'];
  if (tab === 'all') return [...lead, 'paidDate', 'status', 'mode', 'to', 'action'];
  return [...lead, 'status', 'action'];
}

export type PaymentRowAction = 'view_application' | 'mark_paid' | 'mark_paid_and_remind' | 'none';

/** What the Action cell offers for a row on a tab — unchanged from the old page. */
export function paymentRowAction(row: PaymentRow, tab: PaymentTab): PaymentRowAction {
  if (row.applicationId) return 'view_application';
  if (tab === 'all') return row.status === 'paid' ? 'none' : 'mark_paid_and_remind';
  return 'mark_paid';
}

export type PaymentSortKey = Exclude<PaymentColumn, 'action'>;

export function sortPayments(rows: PaymentRow[], key: PaymentSortKey, dir: SortDir): PaymentRow[] {
  const pick: Record<PaymentSortKey, (r: PaymentRow) => string | number> = {
    enrolmentStatus: (r) => r.enrolmentStatus,
    studentId: (r) => r.studentId,
    name: (r) => r.name,
    course: (r) => r.course,
    details: (r) => r.details,
    amount: (r) => r.amount,
    dueDate: (r) => r.dueYmd,
    paidDate: (r) => r.paidYmd,
    mode: (r) => r.mode,
    status: (r) => r.status,
    to: (r) => r.to,
  };
  return sortRows(rows, pick[key], dir);
}

export function paymentCsvRows(rows: PaymentRow[]): Array<Array<string | number>> {
  return [
    ['Enrolment Status', 'Student ID', 'Name', 'Course', 'Installment Details', 'Amount', 'Due Date', 'Paid Date', 'Payment Status', 'Mode', 'To'],
    ...rows.map((r) => [r.enrolmentStatus, r.studentId, r.name, r.course, r.details, r.amount, dmy(r.dueYmd), dmy(r.paidYmd), r.status, r.mode, r.to]),
  ];
}

/** Today's LOCAL calendar date as YYYY-MM-DD (the Mark-Paid default). */
export function localTodayYmd(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

// ─── Payment Approval ──────────────────────────────────────────────────

export interface ApprovalRow {
  id: string;
  applicationCode: string;
  name: string;
  email: string;
  course: string;
  instalment: string;
  amount: number | null;
  paidYmd: string;
  mode: string;
  reference: string;
  receiptUrl: string;
  note: string;
  markedAt: string;
}

export function toApprovalRows(raw: Record<string, unknown>[]): ApprovalRow[] {
  return raw.map((r) => ({
    id: asString(r.id),
    applicationCode: asString(r.application_id),
    name: asString(r.name),
    email: asString(r.email),
    course: asString(r.course_title),
    instalment: asString(r.instalment),
    amount: numOrNull(r.amount),
    paidYmd: ymdOf(r.paid_date),
    mode: asString(r.mode),
    reference: asString(r.reference),
    receiptUrl: asString(r.receipt_url),
    note: asString(r.note),
    markedAt: asString(r.marked_at),
  }));
}

/** The approval queue's amount format (unchanged): ₹ en-IN, '—' when unknown. */
export function approvalAmount(amount: number | null): string {
  return amount === null ? '—' : `₹${amount.toLocaleString('en-IN')}`;
}

const IST_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
const IST_DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

/** dd/mm/yyyy of a timestamp in IST; a bare YYYY-MM-DD is split, never shifted. */
export function istDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return dmy(value);
  const t = Date.parse(value);
  return Number.isNaN(t) ? '' : IST_DATE.format(t);
}

/** dd/mm/yyyy, h:mm am of a timestamp in IST. */
export function istDateTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return dmy(value);
  const t = Date.parse(value);
  return Number.isNaN(t) ? '' : IST_DATE_TIME.format(t);
}

export interface ApprovalFilters {
  search: string;
  course: string;
  mode: string;
}

export const EMPTY_APPROVAL_FILTERS: ApprovalFilters = { search: '', course: '', mode: 'all' };

export function filterApprovals(rows: ApprovalRow[], f: ApprovalFilters): ApprovalRow[] {
  return rows.filter((r) => {
    if (f.course && r.course !== f.course) return false;
    if (f.mode !== 'all' && r.mode !== f.mode) return false;
    return matchesSearch(f.search, [r.name, r.email, r.applicationCode, r.course, r.reference, r.instalment]);
  });
}

export type ApprovalSortKey = 'name' | 'course' | 'instalment' | 'amount' | 'paidDate' | 'mode' | 'reference' | 'recorded';

export function sortApprovals(rows: ApprovalRow[], key: ApprovalSortKey, dir: SortDir): ApprovalRow[] {
  const pick: Record<ApprovalSortKey, (r: ApprovalRow) => string | number> = {
    name: (r) => r.name,
    course: (r) => r.course,
    instalment: (r) => r.instalment,
    amount: (r) => r.amount ?? -1,
    paidDate: (r) => r.paidYmd,
    mode: (r) => r.mode,
    reference: (r) => r.reference,
    recorded: (r) => r.markedAt,
  };
  return sortRows(rows, pick[key], dir);
}

export function approvalCsvRows(rows: ApprovalRow[]): Array<Array<string | number>> {
  return [
    ['Application ID', 'Student', 'Email', 'Course', 'Instalment', 'Amount', 'Date of Payment', 'Mode', 'Reference', 'Receipt', 'Recorded'],
    ...rows.map((r) => [
      r.applicationCode, r.name, r.email, r.course, r.instalment, r.amount ?? '', dmy(r.paidYmd), r.mode, r.reference, r.receiptUrl, istDate(r.markedAt),
    ]),
  ];
}
