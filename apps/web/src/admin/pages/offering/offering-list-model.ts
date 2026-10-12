import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { dmy, matchesSearch, sortRows, ymdOf, type SortDir } from '../cohorts/list-model.js';

// Pure view-model for Courses → Course Offerings in Naji's design
// (TTII 2026-10-12). Rows are /admin/offerings as returned; dates are
// @db.Date values read from their leading YYYY-MM-DD (no timezone shift).

export const DELIVERY_MODE_LABEL: Record<string, string> = { self_paced: 'Self-Paced', cohort: 'Cohort' };
export const OFFERING_STATUS_ORDER = ['active', 'published', 'draft', 'completed', 'inactive', 'archived'];

export interface OfferingRow {
  id: string;
  title: string;
  code: string;
  courseId: string;
  course: string;
  mode: string;
  modeLabel: string;
  academicYear: string;
  startYmd: string;
  endYmd: string;
  enrolStartYmd: string;
  enrolEndYmd: string;
  pricing: 'Paid' | 'Free';
  enrolled: number;
  maxEnrollment: number;
  publishType: string;
  releaseStrategy: string;
  completionPolicy: string;
  certificateTemplate: string;
  language: string;
  cohortCount: number;
  expiryDays: number;
  status: string;
}

export function toOfferingRows(raw: Record<string, unknown>[]): OfferingRow[] {
  return raw.map((r) => {
    const mode = asString(r.delivery_mode);
    return {
      id: asString(r.id),
      title: asString(r.title),
      code: asString(r.offering_code),
      courseId: asString(r.course_id),
      course: asString(r.course_title),
      mode,
      modeLabel: DELIVERY_MODE_LABEL[mode] ?? mode,
      academicYear: asString(r.academic_year),
      startYmd: ymdOf(r.start_date),
      endYmd: ymdOf(r.end_date),
      enrolStartYmd: ymdOf(r.enrollment_start),
      enrolEndYmd: ymdOf(r.enrollment_end),
      pricing: asString(r.fee_category) === 'free' ? 'Free' : 'Paid',
      enrolled: asNumber(r.enrolled_count),
      maxEnrollment: asNumber(r.max_enrollment),
      publishType: asString(r.publish_type),
      releaseStrategy: asString(r.content_release_strategy),
      completionPolicy: asString(r.completion_policy_title),
      certificateTemplate: asString(r.certificate_template_title),
      language: asString(r.language_title),
      cohortCount: asNumber(r.cohort_count),
      expiryDays: asNumber(r.course_expiry_days),
      status: asString(r.status) || 'draft',
    };
  });
}

export interface OfferingFilters {
  search: string;
  status: string;
  courseId: string;
  mode: string;
  pricing: string;
}

export const EMPTY_OFFERING_FILTERS: OfferingFilters = { search: '', status: 'all', courseId: '', mode: '', pricing: '' };

export function filterOfferings(rows: OfferingRow[], f: OfferingFilters): OfferingRow[] {
  return rows.filter((r) => {
    if (f.status !== 'all' && r.status !== f.status) return false;
    if (f.courseId && r.courseId !== f.courseId) return false;
    if (f.mode && r.mode !== f.mode) return false;
    if (f.pricing && r.pricing !== f.pricing) return false;
    return matchesSearch(f.search, [r.title, r.code, r.course]);
  });
}

export type OfferingSortKey = 'title' | 'course' | 'mode' | 'start' | 'end' | 'enrolEnd' | 'pricing' | 'enrolled' | 'status';

export function sortOfferings(rows: OfferingRow[], key: OfferingSortKey, dir: SortDir): OfferingRow[] {
  const pick: Record<OfferingSortKey, (r: OfferingRow) => string | number> = {
    title: (r) => r.title,
    course: (r) => r.course,
    mode: (r) => r.modeLabel,
    start: (r) => r.startYmd,
    end: (r) => r.endYmd,
    enrolEnd: (r) => r.enrolEndYmd,
    pricing: (r) => r.pricing,
    enrolled: (r) => r.enrolled,
    status: (r) => r.status,
  };
  return sortRows(rows, pick[key], dir);
}

export function offeringTotals(rows: OfferingRow[]): { total: number; active: number; enrolled: number } {
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    enrolled: rows.reduce((sum, r) => sum + r.enrolled, 0),
  };
}

/** Delivery modes present in the data, for the Mode filter. */
export function modeOptions(rows: OfferingRow[]): Array<{ value: string; label: string }> {
  const seen = new Map<string, string>();
  for (const r of rows) if (r.mode && !seen.has(r.mode)) seen.set(r.mode, r.modeLabel);
  return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

export function offeringCsvRows(rows: OfferingRow[]): Array<Array<string | number>> {
  return [
    ['Offering', 'Code', 'Course', 'Mode', 'Start Date', 'End Date', 'Enrolments Ends', 'Pricing Type', 'Enrollments', 'Status'],
    ...rows.map((r) => [r.title, r.code, r.course, r.modeLabel, dmy(r.startYmd), dmy(r.endYmd), dmy(r.enrolEndYmd), r.pricing, r.enrolled, r.status]),
  ];
}
