import {
  matchesQuery, moneyOrNull, num, records, sortBy, str, type SortDir,
} from '../list-kit/list-kit-model.js';

// Centre portal → Courses & Fees (Naji 2026-10-22) on real data: the centre's
// assigned courses (centre_course_plans) with "Centre fee (set by TTII)" =
// the assigned amount, validity dates, a status derived from them, and each
// course's real certificate combinations. Per-combination fee / discount /
// GST are NOT shown (pending product decision).

export type PlanStatus = 'active' | 'upcoming' | 'expired';

export const PLAN_STATUS: Record<PlanStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'bg-success-soft text-success' },
  upcoming: { label: 'Upcoming', tone: 'bg-warning-soft text-warning-foreground' },
  expired: { label: 'Expired', tone: 'bg-muted text-muted-foreground' },
};

export interface Combination { id: string; code: string; partners: string[] }

export interface CourseRow {
  planId: string;
  courseId: string;
  course: string;
  shortName: string;
  code: string;
  category: string;
  duration: string;
  centreFee: number | null;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  combinations: Combination[];
  openOfferings: number;
}

function statusOf(value: unknown): PlanStatus {
  const s = str(value);
  return s === 'upcoming' || s === 'expired' ? s : 'active';
}

function combinationsOf(value: unknown): Combination[] {
  return records(value).map((c) => ({
    id: str(c.id),
    code: str(c.code),
    partners: Array.isArray(c.partners) ? c.partners.map(str).filter(Boolean) : [],
  }));
}

export function parseCourseRow(r: Record<string, unknown>): CourseRow {
  return {
    planId: str(r.planId),
    courseId: str(r.courseId),
    course: str(r.course),
    shortName: str(r.shortName),
    code: str(r.code),
    category: str(r.category),
    duration: str(r.duration),
    centreFee: moneyOrNull(r.centreFee),
    startDate: str(r.startDate),
    endDate: str(r.endDate),
    status: statusOf(r.status),
    combinations: combinationsOf(r.combinations),
    openOfferings: num(r.openOfferings),
  };
}

export function parseCourseBoard(data: Record<string, unknown>): CourseRow[] {
  return records(data.rows).map(parseCourseRow).filter((r) => r.courseId !== '');
}

export type CourseSortKey = 'category' | 'course' | 'duration' | 'combinations' | 'centreFee' | 'startDate' | 'endDate' | 'status';

export function filterCourses(rows: readonly CourseRow[], query: string, category: string, status: 'all' | PlanStatus): CourseRow[] {
  return rows.filter((r) =>
    (category === 'all' || r.category === category)
    && (status === 'all' || r.status === status)
    && matchesQuery(query, r.course, r.shortName, r.code, ...r.combinations.map((c) => c.code)));
}

export function sortCourses(rows: readonly CourseRow[], key: CourseSortKey | null, dir: SortDir): CourseRow[] {
  if (!key) return [...rows];
  const value = (r: CourseRow): string | number | null => {
    switch (key) {
      case 'category': return r.category;
      case 'course': return r.course;
      case 'duration': return r.duration;
      case 'combinations': return r.combinations.length;
      case 'centreFee': return r.centreFee;
      case 'startDate': return r.startDate;
      case 'endDate': return r.endDate;
      case 'status': return r.status;
    }
  };
  return sortBy(rows, value, dir);
}

export function categoryOptions(rows: readonly CourseRow[]): string[] {
  return [...new Set(rows.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// ─── Detail ────────────────────────────────────────────────────────────────

export interface CourseOffering {
  id: string;
  title: string;
  code: string;
  mode: string;
  startDate: string;
  endDate: string;
  enrolmentEnd: string;
  capacity: number | null;
  open: boolean;
  combinations: Combination[];
}

export interface CoursePlan { planId: string; centreFee: number | null; startDate: string; endDate: string; status: PlanStatus }

export interface CourseDetail extends CourseRow {
  level: string;
  language: string;
  summary: string;
  description: string;
  plans: CoursePlan[];
  offerings: CourseOffering[];
  enrolledStudents: number;
  pendingApplications: number;
}

export function parseCourseDetail(data: Record<string, unknown>): CourseDetail | null {
  const base = parseCourseRow(data);
  if (!base.courseId) return null;
  return {
    ...base,
    status: statusOf(data.planStatus),
    level: str(data.level),
    language: str(data.language),
    summary: str(data.summary),
    description: str(data.description),
    plans: records(data.plans).map((p) => ({
      planId: str(p.planId), centreFee: moneyOrNull(p.centreFee), startDate: str(p.startDate), endDate: str(p.endDate), status: statusOf(p.status),
    })),
    offerings: records(data.offerings).map((o) => {
      const capacity = num(o.capacity);
      return {
        id: str(o.id), title: str(o.title), code: str(o.code), mode: str(o.mode), startDate: str(o.startDate), endDate: str(o.endDate),
        enrolmentEnd: str(o.enrolmentEnd), capacity: capacity > 0 ? capacity : null, open: o.open === true, combinations: combinationsOf(o.combinations),
      };
    }),
    enrolledStudents: num(data.enrolledStudents),
    pendingApplications: num(data.pendingApplications),
  };
}

/** Partners joined for display ("Cambridge + MSU"); '' when none. */
export function partnersLabel(c: Combination): string {
  return c.partners.join(' + ');
}

