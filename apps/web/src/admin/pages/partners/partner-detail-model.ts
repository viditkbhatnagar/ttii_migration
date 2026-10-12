// Pure helpers for the partner page (Partner Management → Certification
// Partners → View), from GET /admin/certification_partners/:id/detail.

import { matchesSearch } from '../cohorts/list-model.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n : 0;
};
const records = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : [];

export interface PartnerCourse { id: string; title: string; students: number; type: string; combinations: Array<{ id: string; code: string }> }
export interface PartnerStudent {
  key: string;
  userId: string;
  name: string;
  email: string;
  image: string;
  studentId: string;
  enrollmentId: string;
  courseId: string;
  course: string;
  status: string;
  enrolledOn: string;
}

export function toPartnerCourses(raw: unknown): PartnerCourse[] {
  return records(raw).map((c) => ({
    id: str(c.id),
    title: str(c.title),
    students: num(c.student_count),
    // course_type 1 = cohort-based (as the old page read it).
    type: num(c.course_type) === 1 ? 'Cohort-based' : 'Self-study',
    combinations: records(c.combinations).map((x) => ({ id: str(x.id), code: str(x.code) })),
  }));
}

export function toPartnerStudents(raw: unknown): PartnerStudent[] {
  return records(raw).map((s, i) => ({
    key: str(s.enrolment_id) || String(i),
    userId: str(s.user_id),
    name: str(s.name),
    // users.email can hold a phone number in legacy rows — show it only when it is an address.
    email: str(s.email).includes('@') ? str(s.email) : '',
    image: str(s.image),
    studentId: str(s.student_id),
    enrollmentId: str(s.enrollment_id),
    courseId: str(s.course_id),
    course: str(s.course_title),
    status: str(s.enrollment_status) || 'Active',
    enrolledOn: str(s.enrollment_date),
  }));
}

/** Distinct combinations across the partner's courses. */
export function combinationCount(courses: PartnerCourse[]): number {
  return new Set(courses.flatMap((c) => c.combinations.map((x) => x.id))).size;
}

export interface StudentFilters { search: string; courseId: string; status: string }

export function filterPartnerStudents(rows: PartnerStudent[], f: StudentFilters): PartnerStudent[] {
  return rows.filter((r) =>
    (!f.courseId || r.courseId === f.courseId)
    && (!f.status || r.status.toLowerCase() === f.status.toLowerCase())
    && matchesSearch(f.search, [r.name, r.email, r.studentId, r.enrollmentId]));
}

export function studentStatuses(rows: PartnerStudent[]): string[] {
  const seen = new Map<string, string>();
  for (const r of rows) if (!seen.has(r.status.toLowerCase())) seen.set(r.status.toLowerCase(), r.status);
  return [...seen.values()].sort();
}

export function courseCsvRows(rows: PartnerCourse[]): Array<Array<string | number>> {
  return [['Course', 'Combinations', 'Students', 'Type'], ...rows.map((c) => [c.title, c.combinations.map((x) => x.code).join(', '), c.students, c.type])];
}

export function studentCsvRows(rows: PartnerStudent[], dmy: (v: string) => string): Array<Array<string | number>> {
  return [
    ['Student', 'Email', 'Student ID', 'Enrollment ID', 'Course', 'Status', 'Enrolled'],
    ...rows.map((s) => [s.name, s.email, s.studentId, s.enrollmentId, s.course, s.status, dmy(s.enrolledOn)]),
  ];
}
