import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { matchesSearch, sortRows, type SortDir } from '../cohorts/list-model.js';

// Pure view-models for the Fee Information screens rebuilt in Naji's design
// (TTII 2026-10-12): Course Fee Structure, Fee Summary and Fee Installments.
// LAYOUT ONLY — every number is read exactly as the server sent it; nothing
// here recomputes a fee, a balance or GST. Each screen keeps the money format
// its old page used (Fee Structure up to 2 decimals, Fee Summary whole rupees,
// Installments always 2 decimals).

export type { SortDir } from '../cohorts/list-model.js';
export const FEE_PAGE_SIZE = 10;

/** null for a missing / blank / non-numeric value, else the number. */
export function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** ₹ with up to `maxDigits` decimals; '—' when there is no amount. */
export function inr(value: number | null, maxDigits: number): string {
  if (value === null) return '—';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: maxDigits })}`;
}

/** ₹ with exactly two decimals (the old formatCurrency; a blank reads ₹0.00). */
export function inr2(value: unknown): string {
  return `₹${asNumber(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Zero-padded running row number for a paged table. */
export function rowNo(page: number, pageSize: number, index: number): string {
  return String((page - 1) * pageSize + index + 1).padStart(2, '0');
}

/** Distinct non-empty values, sorted. */
export function distinct(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─── Course Fee Structure ──────────────────────────────────────────────

export interface FeeStructureRow {
  id: string;
  course: string;
  offering: string;
  packageCode: string;
  type: 'Paid' | 'Free';
  baseFee: number | null;
  discount: number | null;
  beforeTax: number | null;
  /** The GST percent shown, or null for "—" (combination has GST off). */
  gstPercent: number | null;
  gstLabel: string;
  incTax: number | null;
  status: string;
}

export function toFeeStructureRows(raw: Record<string, unknown>[]): FeeStructureRow[] {
  return raw.map((r, i) => {
    // Same rule as the old page: no GST when the combination switches it off,
    // otherwise the server's percent (18 when it sent none).
    const pctRaw = r.gst_percent;
    const pct = typeof pctRaw === 'number' || typeof pctRaw === 'string' ? String(pctRaw) : '18';
    const gstOn = Boolean(r.gst_applicable);
    return {
      id: asString(r.row_id) || `${asString(r.offering_id)}-${asString(r.combination_id)}-${i}`,
      course: asString(r.course_title),
      offering: asString(r.offering_title) || asString(r.offering_code),
      packageCode: asString(r.combination_code),
      type: asString(r.fee_category) === 'free' ? 'Free' : 'Paid',
      baseFee: numOrNull(r.base_fee),
      discount: numOrNull(r.discount),
      beforeTax: numOrNull(r.final_before_tax),
      gstPercent: gstOn ? numOrNull(pct) : null,
      gstLabel: gstOn ? `${pct}%` : '—',
      incTax: numOrNull(r.fee_inc_tax),
      status: asString(r.status) || 'draft',
    };
  });
}

export interface FeeStructureFilters {
  search: string;
  status: string;
  course: string;
  offering: string;
  type: string;
}

export const EMPTY_FEE_STRUCTURE_FILTERS: FeeStructureFilters = { search: '', status: 'all', course: '', offering: '', type: '' };

export function filterFeeStructure(rows: FeeStructureRow[], f: FeeStructureFilters): FeeStructureRow[] {
  return rows.filter((r) => {
    if (f.status !== 'all' && r.status.toLowerCase() !== f.status.toLowerCase()) return false;
    if (f.course && r.course !== f.course) return false;
    if (f.offering && r.offering !== f.offering) return false;
    if (f.type && r.type !== f.type) return false;
    return matchesSearch(f.search, [r.course, r.offering, r.packageCode]);
  });
}

export type FeeStructureSortKey = 'course' | 'offering' | 'type' | 'baseFee' | 'discount' | 'beforeTax' | 'gst' | 'incTax' | 'status';

export function sortFeeStructure(rows: FeeStructureRow[], key: FeeStructureSortKey, dir: SortDir): FeeStructureRow[] {
  const num = (n: number | null) => n ?? -1;
  const pick: Record<FeeStructureSortKey, (r: FeeStructureRow) => string | number> = {
    course: (r) => r.course,
    offering: (r) => `${r.offering} ${r.packageCode}`,
    type: (r) => r.type,
    baseFee: (r) => num(r.baseFee),
    discount: (r) => num(r.discount),
    beforeTax: (r) => num(r.beforeTax),
    gst: (r) => num(r.gstPercent),
    incTax: (r) => num(r.incTax),
    status: (r) => r.status,
  };
  return sortRows(rows, pick[key], dir);
}

/** Status pill counts: All + every status present, known ones first. */
export function statusCounts(statuses: string[], order: string[]): Array<{ id: string; count: number }> {
  const counts = new Map<string, number>();
  for (const s of statuses) counts.set(s, (counts.get(s) ?? 0) + 1);
  const known = order.filter((s) => counts.has(s));
  const rest = [...counts.keys()].filter((s) => !order.includes(s)).sort();
  return [{ id: 'all', count: statuses.length }, ...[...known, ...rest].map((id) => ({ id, count: counts.get(id) ?? 0 }))];
}

export function feeStructureCsvRows(rows: FeeStructureRow[]): Array<Array<string | number>> {
  const cell = (n: number | null) => (n === null ? '' : n);
  return [
    ['Course', 'Course Offering', 'Package', 'Type', 'Base Fee', 'Discount', 'Fee (Before Tax)', 'GST', 'Fee Inc. Tax', 'Status'],
    ...rows.map((r) => [r.course, r.offering, r.packageCode, r.type, cell(r.baseFee), cell(r.discount), cell(r.beforeTax), r.gstLabel === '—' ? '' : r.gstLabel, cell(r.incTax), r.status]),
  ];
}

// ─── Fee Summary ───────────────────────────────────────────────────────

export interface FeeSummaryRow {
  id: string;
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  course: string;
  offering: string;
  combination: string;
  fee: number;
  paid: number;
  balance: number;
  due: number;
  /** enrolment status as shown — a blank reads "Active", as before. */
  status: string;
}

export function toFeeSummaryRows(raw: Record<string, unknown>[]): FeeSummaryRow[] {
  return raw.map((r, i) => ({
    id: asString(r.enrol_id) || `${asString(r.user_id)}-${asString(r.course_id)}-${i}`,
    enrollmentId: asString(r.enrollment_id),
    userId: asString(r.user_id),
    name: asString(r.student_name),
    email: asString(r.email),
    course: asString(r.course_title),
    offering: asString(r.offering_title),
    combination: asString(r.combination_title),
    fee: asNumber(r.course_fee_inc_gst),
    paid: asNumber(r.fee_paid),
    balance: asNumber(r.balance_fee),
    due: asNumber(r.fee_due),
    status: asString(r.course_status) || 'Active',
  }));
}

/** The old page's "Status" dropdown, kept as the Fee filter. */
export type FeeState = '' | 'has_balance' | 'has_due' | 'cleared';

export interface FeeSummaryFilters {
  search: string;
  status: string;
  course: string;
  offering: string;
  feeState: FeeState;
}

export const EMPTY_FEE_SUMMARY_FILTERS: FeeSummaryFilters = { search: '', status: 'all', course: '', offering: '', feeState: '' };

export function filterFeeSummary(rows: FeeSummaryRow[], f: FeeSummaryFilters): FeeSummaryRow[] {
  return rows.filter((r) => {
    if (f.status !== 'all' && r.status.toLowerCase() !== f.status.toLowerCase()) return false;
    if (f.course && r.course !== f.course) return false;
    if (f.offering && r.offering !== f.offering) return false;
    if (f.feeState === 'has_balance' && r.balance === 0) return false;
    if (f.feeState === 'has_due' && r.due === 0) return false;
    if (f.feeState === 'cleared' && r.balance > 0) return false;
    return matchesSearch(f.search, [r.name, r.enrollmentId, r.email, r.course, r.offering, r.combination]);
  });
}

export type FeeSummarySortKey = 'enrollmentId' | 'name' | 'course' | 'offering' | 'combination' | 'fee' | 'paid' | 'balance' | 'due' | 'status';

export function sortFeeSummary(rows: FeeSummaryRow[], key: FeeSummarySortKey, dir: SortDir): FeeSummaryRow[] {
  return sortRows(rows, (r) => r[key], dir);
}

export function feeSummaryTotals(rows: FeeSummaryRow[]): { fee: number; paid: number; balance: number; due: number } {
  return rows.reduce(
    (t, r) => ({ fee: t.fee + r.fee, paid: t.paid + r.paid, balance: t.balance + r.balance, due: t.due + r.due }),
    { fee: 0, paid: 0, balance: 0, due: 0 },
  );
}

export function feeSummaryCsvRows(rows: FeeSummaryRow[]): Array<Array<string | number>> {
  return [
    ['Enrollment ID', 'Student', 'Email', 'Course', 'Offering', 'Combination', 'Course Fee (Inc GST)', 'Fee Paid', 'Balance Fee', 'Fee Due', 'Course Status'],
    ...rows.map((r) => [r.enrollmentId, r.name, r.email, r.course, r.offering, r.combination, r.fee, r.paid, r.balance, r.due, r.status]),
  ];
}

// ─── Fee Installments ──────────────────────────────────────────────────

export interface InstallmentRow {
  id: string;
  /** Where "View Installments" goes: the student's page (Payment History tab). */
  viewId: string;
  studentId: string;
  name: string;
  details: string;
  courses: string[];
  courseText: string;
  totalFee: number;
  planStatus: string;
}

export function toInstallmentRows(raw: Record<string, unknown>[]): InstallmentRow[] {
  return raw.map((r, i) => {
    const courseText = asString(r.course_title);
    return {
      id: asString(r.id) || asString(r.user_id) || String(i),
      viewId: asString(r.user_id) || asString(r.student_course_id) || asString(r.id),
      studentId: asString(r.student_id),
      name: asString(r.student_name),
      details: asString(r.installment_details),
      courses: courseText.split(',').map((s) => s.trim()).filter(Boolean),
      courseText,
      totalFee: asNumber(r.total_fee),
      planStatus: asString(r.fee_plan_status),
    };
  });
}

export type InstallmentSortKey = 'studentId' | 'name' | 'details' | 'course' | 'totalFee';

export function sortInstallments(rows: InstallmentRow[], key: InstallmentSortKey, dir: SortDir): InstallmentRow[] {
  const pick: Record<InstallmentSortKey, (r: InstallmentRow) => string | number> = {
    studentId: (r) => r.studentId,
    name: (r) => r.name,
    details: (r) => r.details,
    course: (r) => r.courseText,
    totalFee: (r) => r.totalFee,
  };
  return sortRows(rows, pick[key], dir);
}

export function searchInstallments(rows: InstallmentRow[], query: string): InstallmentRow[] {
  return rows.filter((r) => matchesSearch(query, [r.studentId, r.name, r.details, r.courseText]));
}

export function installmentCsvRows(rows: InstallmentRow[]): Array<Array<string | number>> {
  return [
    ['Student ID', 'Name', 'Installment Details', 'Enrolled Course(s)', 'Total Courses Fee'],
    ...rows.map((r) => [r.studentId, r.name, r.details, r.courseText, r.totalFee]),
  ];
}
