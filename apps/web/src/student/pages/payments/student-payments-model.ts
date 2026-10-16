import { asNumber, asString } from '../../../admin/shared/utils/admin-data-utils.js';

// Student Payments & Billing — the page's pure logic, lifted from
// StudentPaymentsPage so the fee rules are unit-tested. Unchanged except the
// Free rule (TTII 2026-10-16): a course used to read "Free / No Payment
// Required" whenever its total was zero, so a PAID course added through Add
// Enrolment, whose fee was not set up yet, was shown as free. Free now comes
// only from the API's fee_status ('free' = a free offering); a paid course
// with no fee yet is `feePending` — "Fee details will be shared soon", no Pay
// Now.

export interface CourseInstallment {
  id: string;
  no: number;
  details: string;
  amount: number;
  dueDate: string;
  status: string;
  paid: boolean;
}

export interface CourseAccount {
  courseId: string;
  title: string;
  enrolledOn: string;
  totalFee: number;
  amountPaid: number;
  balance: number;
  percentPaid: number;
  status: string;
  isFree: boolean;
  /** A paid course whose fee and schedule are not set up yet. */
  feePending: boolean;
  installments: CourseInstallment[];
  paidCount: number;
  pendingCount: number;
  nextDue: CourseInstallment | null;
}

export type CourseTab = 'all' | 'paid' | 'free' | 'active' | 'completed';

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function normalizeInstallment(raw: Record<string, unknown>, index: number): CourseInstallment {
  const status = asString(raw.status);
  return {
    id: asString(raw.id) || `inst-${index}`,
    no: asNumber(raw.installment_no) || index + 1,
    details: asString(raw.installment_details) || `Installment ${index + 1}`,
    amount: asNumber(raw.amount),
    dueDate: asString(raw.due_date),
    status,
    paid: status.toLowerCase() === 'paid',
  };
}

export function normalizeCourse(raw: Record<string, unknown>): CourseAccount {
  const courseId = asString(raw.course_id) || asString(raw.id);
  const totalFee = asNumber(raw.total_fee) || asNumber(raw.total_amount);
  const amountPaid = asNumber(raw.amount_paid);
  const balance = asNumber(raw.balance);
  const rawInstallments = Array.isArray(raw.installments) ? raw.installments : [];
  const installments = rawInstallments.map((entry, i) => normalizeInstallment(toRecord(entry), i));
  const paidCount = installments.filter((inst) => inst.paid).length;
  const unpaidSorted = installments
    .filter((inst) => !inst.paid)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  // The API decides; without its fee_status a zero total is treated as not
  // set up yet — never as free.
  const feeStatus = asString(raw.fee_status);
  const isFree = feeStatus === 'free';
  const feePending = feeStatus ? feeStatus === 'pending' : totalFee <= 0;
  return {
    courseId,
    title: asString(raw.title) || `Course ${courseId}`,
    enrolledOn: asString(raw.enroled_on) || asString(raw.enrolled_on),
    totalFee,
    amountPaid,
    balance,
    percentPaid: asNumber(raw.payment_percentage) || (totalFee > 0 ? Math.round((amountPaid / totalFee) * 100) : 0),
    status: asString(raw.status),
    isFree,
    feePending,
    installments,
    paidCount,
    pendingCount: installments.length - paidCount,
    nextDue: unpaidSorted[0] ?? null,
  };
}

export type StatusPillTone = 'muted' | 'success' | 'danger';

export function courseStatusPill(acc: CourseAccount): { label: string; tone: StatusPillTone } {
  if (acc.isFree) return { label: 'N/A', tone: 'muted' };
  if (acc.feePending) return { label: 'Awaiting fee', tone: 'muted' };
  if (acc.balance <= 0) return { label: 'Cleared', tone: 'success' };
  if (acc.status.toLowerCase() === 'overdue') return { label: 'Overdue', tone: 'danger' };
  return { label: 'On Track', tone: 'success' };
}

/** Pay Now only for a priced course with something left to pay. */
export function canPayCourse(acc: CourseAccount): boolean {
  return !acc.isFree && !acc.feePending && acc.balance > 0;
}

export function filterAccounts(accounts: CourseAccount[], tab: CourseTab, search: string): CourseAccount[] {
  const q = search.trim().toLowerCase();
  return accounts.filter((acc) => {
    if (tab === 'paid' && acc.isFree) return false;
    if (tab === 'free' && !acc.isFree) return false;
    if (tab === 'active' && acc.balance <= 0) return false;
    // A course still waiting for its fee is not "completed".
    if (tab === 'completed' && (acc.balance > 0 || acc.feePending)) return false;
    if (q && !acc.title.toLowerCase().includes(q)) return false;
    return true;
  });
}
