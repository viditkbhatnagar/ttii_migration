import { Prisma, type PrismaClient } from '@prisma/client';

import { completionKind, isMaterialKind } from '../content/lesson-file-kind.js';
import { ExamResultsService, type CourseExamSheet } from './exam-results-service.js';
import type { ExamCell, RawLearnerFacts } from './credential-eligibility-model.js';

// Credential Manager — THE LMS data adapter. Every "where does this fact come
// from" decision lives in this one file (brief → Real-data decisions), so a
// change of mind is a change here. All reads are batched per request.
//
//  scope        offerings with credential_offering_settings.issued_by_ttii = 1
//  candidate    one per enrol row (enrol.id; enrolmentNo = enrol.enrollment_id) of a
//               role-2, non-deleted learner whose application (student_id, users.application_id,
//               or an enrolled email-only Add-Enrolment application — the loadCoursePricing rank)
//               for the enrol's course carries an in-scope offering_id
//  batchStart   the offering's start_date; completionDate = offering end_date, else the course's
//               latest exam sitting date; examSession = YYYY-MM of the learner's last scored sitting
//  Exams %      published sittings (computeExamResults via ExamResultsService.sheetsForCourses)
//  Assignments  evaluated marks / max marks of the assignments of the learner's cohorts in the course
//  Attendance   mean percent_attended over the synced Teams sessions of the learner's cohorts
//               (batched twin of CertificateService.aggregateStudentCohortAttendance)
//  Progress     (videos done + materials opened + practice submitted) / (videos + materials + practice
//               attempts) — batched twin of ContentService.calculateUserProgress
//  Fees cleared every student_payments row of (user, course) paid, and at least one row
//  Admission    the application is admin-approved, or its verification covers basic/qualification/documents
//  Not tracked  Internal assessment, Feedback submitted, Project/practicum approved (no data -> Unavailable)

export interface LmsCandidate {
  enrolId: number;
  userId: number;
  enrolmentNo: string;
  learnerName: string;
  email: string;
  offeringId: number;
  offeringTitle: string;
  courseId: number;
  courseTitle: string;
  lessonWise: boolean;
  batchStart: string;
  completionDate: string;
  examSession: string;
  centreId: number | null;
  centre: string;
  facts: RawLearnerFacts;
}

export interface CandidateFilter {
  offeringIds?: number[];
  enrolIds?: number[];
  userId?: number;
}

const ymd = (v: Date | null | undefined): string => (v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : '');
const STUDENT_ROLE = 2;
const SECTION_KEYS = ['basic', 'qualification', 'documents'];

export async function scopedOfferingIds(prisma: PrismaClient): Promise<number[]> {
  const rows = await prisma.credential_offering_settings.findMany({ where: { issued_by_ttii: true }, select: { offering_id: true } });
  return rows.map((r) => r.offering_id);
}

interface AppRow {
  id: number; student_id: number | null; course_id: number | null; offering_id: number | null;
  user_email: string | null; admin_approved_at: Date | null; verification: string | null;
}

function verifiedSections(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const v = (JSON.parse(raw) as { verified?: unknown }).verified;
    return Array.isArray(v) && SECTION_KEYS.every((k) => v.includes(k));
  } catch { return false; }
}

export async function loadCandidates(
  prisma: PrismaClient,
  filter: CandidateFilter = {},
  examService: Pick<ExamResultsService, 'sheetsForCourses'> = new ExamResultsService(prisma),
): Promise<LmsCandidate[]> {
  let scope = await scopedOfferingIds(prisma);
  if (filter.offeringIds) scope = scope.filter((id) => filter.offeringIds?.includes(id));
  if (scope.length === 0) return [];

  const apps: AppRow[] = await prisma.applications.findMany({
    where: { deleted_at: null, offering_id: { in: scope }, course_id: { not: null } },
    select: { id: true, student_id: true, course_id: true, offering_id: true, user_email: true, admin_approved_at: true, verification: true, stage: true, is_converted: true },
  });
  if (apps.length === 0) return [];
  const appIds = apps.map((a) => a.id);
  const emails = [...new Set(apps.filter((a) => a.student_id === null && a.user_email).map((a) => (a.user_email ?? '').trim()))].filter(Boolean);
  const studentIds = [...new Set(apps.map((a) => a.student_id).filter((v): v is number => v !== null))];

  const users = await prisma.users.findMany({
    where: {
      deleted_at: null, role_id: STUDENT_ROLE,
      ...(filter.userId ? { id: filter.userId } : {}),
      OR: [{ id: { in: studentIds } }, { application_id: { in: appIds } }, ...(emails.length > 0 ? [{ user_email: { in: emails } }] : [])],
    },
    select: { id: true, name: true, user_email: true, email: true, application_id: true, added_under_centre: true },
  });
  if (users.length === 0) return [];
  const userById = new Map(users.map((u) => [u.id, u]));
  const enrols = await prisma.enrol.findMany({
    where: { deleted_at: null, user_id: { in: users.map((u) => u.id) }, course_id: { not: null }, ...(filter.enrolIds ? { id: { in: filter.enrolIds } } : {}) },
    select: { id: true, user_id: true, course_id: true, enrollment_id: true },
    orderBy: { id: 'asc' },
  });

  // Rank the applications per (user, course) like loadCoursePricing: student_id, users.application_id, email.
  const rank = (a: AppRow, u: { id: number; application_id: number; user_email: string | null; email: string | null }): number => {
    if (a.student_id === u.id) return 0;
    if (a.id === u.application_id) return 1;
    const mail = (u.user_email ?? u.email ?? '').trim();
    return a.student_id === null && mail !== '' && (a.user_email ?? '').trim() === mail ? 2 : 9;
  };
  const picked: Array<{ enrol: (typeof enrols)[number]; app: AppRow }> = [];
  for (const e of enrols) {
    const u = e.user_id === null ? undefined : userById.get(e.user_id);
    if (!u || e.course_id === null) continue;
    const best = apps
      .filter((a) => a.course_id === e.course_id && rank(a, u) < 9)
      .sort((a, b) => rank(a, u) - rank(b, u) || b.id - a.id)[0];
    if (best?.offering_id) picked.push({ enrol: e, app: best });
  }
  if (picked.length === 0) return [];

  const courseIds = [...new Set(picked.map((p) => p.enrol.course_id as number))];
  const userIds = [...new Set(picked.map((p) => p.enrol.user_id as number))];
  const offeringIds = [...new Set(picked.map((p) => p.app.offering_id as number))];
  const centreIds = [...new Set(users.map((u) => u.added_under_centre).filter((v): v is number => !!v))];

  const [offerings, courses, centres, sheets] = await Promise.all([
    prisma.offerings.findMany({ where: { id: { in: offeringIds } }, select: { id: true, title: true, offering_code: true, start_date: true, end_date: true } }),
    prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, structure_type: true } }),
    centreIds.length > 0 ? prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } }) : Promise.resolve([]),
    examService.sheetsForCourses(courseIds),
  ]);
  const offeringById = new Map(offerings.map((o) => [o.id, o]));
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const centreById = new Map(centres.map((c) => [c.id, (c.centre_name ?? '').trim()]));

  const [attendance, progress, fees, assignmentPct] = await Promise.all([
    loadAttendance(prisma, userIds, courseIds, users),
    loadProgress(prisma, userIds, courseIds, picked.map(({ enrol }) => [enrol.user_id as number, enrol.course_id as number] as const)),
    loadFees(prisma, userIds),
    loadAssignments(prisma, userIds, courseIds),
  ]);

  return picked.flatMap(({ enrol, app }): LmsCandidate[] => {
    const user = userById.get(enrol.user_id as number);
    const offering = offeringById.get(app.offering_id as number);
    const courseId = enrol.course_id as number;
    const course = courseById.get(courseId);
    if (!user || !offering) return [];
    const key = `${user.id}:${courseId}`;
    const courseSheets = sheets.filter((s) => s.courseIds.includes(courseId));
    const { cells, included, published, lastDate, lastSat } = examFacts(courseSheets, user.id);
    const completionDate = ymd(offering.end_date) || courseSheets.flatMap((s) => s.sittings.map((t) => t.date)).filter(Boolean).sort().at(-1) || '';
    const payment = fees.get(key);
    return [{
      enrolId: enrol.id,
      userId: user.id,
      enrolmentNo: (enrol.enrollment_id ?? '').trim() || `ENR-${enrol.id}`,
      learnerName: (user.name ?? '').trim(),
      email: ((user.user_email ?? '').trim() || (user.email ?? '').trim()),
      offeringId: offering.id,
      offeringTitle: (offering.title ?? offering.offering_code ?? '').trim() || `Offering ${offering.id}`,
      courseId,
      courseTitle: (course?.title ?? '').trim(),
      lessonWise: course?.structure_type === 2,
      batchStart: ymd(offering.start_date),
      completionDate,
      examSession: lastSat ? lastSat.slice(0, 7) : lastDate ? lastDate.slice(0, 7) : '',
      centreId: user.added_under_centre ?? null,
      centre: user.added_under_centre ? centreById.get(user.added_under_centre) ?? '' : '',
      facts: {
        examCells: cells,
        examsIncluded: included,
        examsPublished: published,
        assignmentsPct: assignmentPct.get(key) ?? null,
        attendancePct: attendance.get(key) ?? null,
        progressPct: progress.get(key) ?? null,
        feesCleared: payment ? payment.total > 0 && payment.paid >= payment.total : false,
        admissionVerified: app.admin_approved_at !== null || verifiedSections(app.verification),
      },
    }];
  });
}

/** Published, scored sittings of the learner, plus included/published exam counts. */
function examFacts(sheets: CourseExamSheet[], userId: number): { cells: ExamCell[]; included: number; published: number; lastDate: string; lastSat: string } {
  const cells: ExamCell[] = [];
  let included = 0;
  let published = 0;
  let lastSat = '';
  for (const sheet of sheets) {
    const student = sheet.sheet.students.find((s) => s.userId === userId);
    if (!student) continue;
    included += 1;
    if (sheet.published) published += 1;
    student.sittings.forEach((cell, i) => {
      const sitting = sheet.sittings[i];
      if (!sitting || cell.score === null) return;
      if (sitting.date > lastSat) lastSat = sitting.date;
      if (!sheet.published) return;
      if (cell.status !== 'pass' && cell.status !== 'fail' && cell.status !== 'marks_only') return;
      cells.push({
        subjectKey: sitting.subjectTitle, code: '', title: sitting.subjectTitle, date: sitting.date,
        obtained: cell.score, total: cell.totalMarks || sitting.totalMarks, status: cell.status, order: sheet.examId * 1000 + i,
      });
    });
  }
  return { cells, included, published, lastDate: lastSat, lastSat };
}

type UserLite = { id: number; user_email: string | null; email: string | null };

/** Cohorts of the learner per course (cohort_students ∩ cohorts/cohort_courses of the course). */
async function cohortsByUserCourse(prisma: PrismaClient, userIds: number[], courseIds: number[]): Promise<Map<string, number[]>> {
  const [members, scalar, linked] = await Promise.all([
    prisma.cohort_students.findMany({ where: { user_id: { in: userIds }, deleted_at: null }, select: { user_id: true, cohort_id: true } }),
    prisma.cohorts.findMany({ where: { deleted_at: null, course_id: { in: courseIds } }, select: { id: true, course_id: true } }),
    prisma.cohort_courses.findMany({ where: { course_id: { in: courseIds } }, select: { cohort_id: true, course_id: true } }),
  ]);
  const coursesOfCohort = new Map<number, Set<number>>();
  for (const c of scalar) if (c.course_id !== null) coursesOfCohort.set(c.id, new Set([...(coursesOfCohort.get(c.id) ?? []), c.course_id]));
  for (const c of linked) coursesOfCohort.set(c.cohort_id, new Set([...(coursesOfCohort.get(c.cohort_id) ?? []), c.course_id]));
  const out = new Map<string, number[]>();
  for (const m of members) {
    const cohortId = Number(m.cohort_id);
    if (m.user_id === null || !Number.isFinite(cohortId)) continue;
    for (const courseId of coursesOfCohort.get(cohortId) ?? []) {
      const key = `${m.user_id}:${courseId}`;
      out.set(key, [...(out.get(key) ?? []), cohortId]);
    }
  }
  return out;
}

async function loadAttendance(prisma: PrismaClient, userIds: number[], courseIds: number[], users: UserLite[]): Promise<Map<string, number>> {
  const cohortsOf = await cohortsByUserCourse(prisma, userIds, courseIds);
  const cohortIds = [...new Set([...cohortsOf.values()].flat())];
  const out = new Map<string, number>();
  if (cohortIds.length === 0) return out;
  const sessions = await prisma.live_class.findMany({
    where: { cohort_id: { in: cohortIds }, platform: 'teams', attendance_fetched_at: { not: null }, deleted_at: null },
    select: { id: true, cohort_id: true },
  });
  if (sessions.length === 0) return out;
  const emailOf = new Map(users.map((u) => [u.id, ((u.user_email ?? '').trim() || (u.email ?? '').trim()).toLowerCase()]));
  const emails = [...new Set([...emailOf.values()].filter(Boolean))];
  const rows = await prisma.live_class_attendance.findMany({
    where: { live_class_id: { in: sessions.map((s) => s.id) }, OR: [{ user_id: { in: userIds } }, ...(emails.length > 0 ? [{ email: { in: emails } }] : [])] },
    select: { live_class_id: true, user_id: true, email: true, percent_attended: true },
  });
  // Indexed once (was sessions x attendance rows per learner + course).
  const best = new Map<string, number>();
  const bump = (k: string, v: number): void => { best.set(k, Math.max(best.get(k) ?? 0, v)); };
  for (const r of rows) {
    const pct = r.percent_attended === null ? 0 : Number(r.percent_attended);
    if (r.user_id !== null) bump(`${r.live_class_id}:u${r.user_id}`, pct);
    const mail = (r.email ?? '').toLowerCase();
    if (mail) bump(`${r.live_class_id}:e${mail}`, pct);
  }
  const sessionsOfCohort = new Map<number, number[]>();
  for (const s of sessions) {
    if (s.cohort_id === null) continue;
    sessionsOfCohort.set(s.cohort_id, [...(sessionsOfCohort.get(s.cohort_id) ?? []), s.id]);
  }
  for (const [key, cohorts] of cohortsOf) {
    const userId = Number(key.split(':')[0]);
    const mail = emailOf.get(userId) ?? '';
    const own = [...new Set(cohorts.flatMap((c) => sessionsOfCohort.get(c) ?? []))];
    if (own.length === 0) continue;
    const percents = own.map((id) => Math.max(best.get(`${id}:u${userId}`) ?? 0, mail ? best.get(`${id}:e${mail}`) ?? 0 : 0));
    out.set(key, Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 100) / 100);
  }
  return out;
}

async function loadProgress(prisma: PrismaClient, userIds: number[], courseIds: number[], pairs: ReadonlyArray<readonly [number, number]>): Promise<Map<string, number>> {
  const lessons = await prisma.lesson.findMany({ where: { course_id: { in: courseIds }, deleted_at: null }, select: { id: true, course_id: true } });
  const out = new Map<string, number>();
  if (lessons.length === 0) return out;
  const files = await prisma.lesson_files.findMany({
    where: { lesson_id: { in: lessons.map((l) => l.id) }, deleted_at: null },
    select: { id: true, lesson_id: true, lesson_type: true, attachment_type: true },
  });
  const courseOfLesson = new Map(lessons.map((l) => [l.id, l.course_id as number]));
  const videosOf = new Map<number, Set<number>>();
  const materialsOf = new Map<number, Set<number>>();
  const allFileIds = { video: [] as number[], material: [] as number[] };
  for (const f of files) {
    const courseId = courseOfLesson.get(f.lesson_id);
    if (courseId === undefined) continue;
    if ((f.lesson_type ?? '').trim().toLowerCase() === 'video') {
      if (!videosOf.has(courseId)) videosOf.set(courseId, new Set());
      videosOf.get(courseId)?.add(f.id);
      allFileIds.video.push(f.id);
    }
    if (isMaterialKind(completionKind(f))) {
      if (!materialsOf.has(courseId)) materialsOf.set(courseId, new Set());
      materialsOf.get(courseId)?.add(f.id);
      allFileIds.material.push(f.id);
    }
  }
  const lessonIdsStr = lessons.map((l) => String(l.id));
  const [videoDone, materialDone, practice] = await Promise.all([
    allFileIds.video.length > 0
      ? prisma.video_progress_status.findMany({ where: { user_id: { in: userIds }, status: 1, lesson_file_id: { in: allFileIds.video }, deleted_at: null }, select: { user_id: true, lesson_file_id: true }, distinct: ['user_id', 'lesson_file_id'] })
      : Promise.resolve([]),
    allFileIds.material.length > 0
      ? prisma.material_progress_status.findMany({ where: { user_id: { in: userIds }, lesson_file_id: { in: allFileIds.material }, deleted_at: null }, select: { user_id: true, lesson_file_id: true }, distinct: ['user_id', 'lesson_file_id'] })
      : Promise.resolve([]),
    prisma.practice_attempt.findMany({ where: { user_id: { in: userIds }, lesson_id: { in: lessonIdsStr }, deleted_at: null }, select: { user_id: true, lesson_id: true, submit_status: true } }),
  ]);
  const doneVideos = new Set(videoDone.map((r) => `${r.user_id}:${r.lesson_file_id}`));
  const doneMaterials = new Set(materialDone.map((r) => `${r.user_id}:${r.lesson_file_id}`));
  // Practice attempts grouped once by learner + course (was a filter per pair: O(users x courses x attempts)).
  const practiceOf = new Map<string, { total: number; submitted: number }>();
  for (const p of practice) {
    const courseId = courseOfLesson.get(Number(p.lesson_id));
    if (courseId === undefined) continue;
    const key = `${p.user_id}:${courseId}`;
    const agg = practiceOf.get(key) ?? { total: 0, submitted: 0 };
    practiceOf.set(key, { total: agg.total + 1, submitted: agg.submitted + (p.submit_status === true ? 1 : 0) });
  }
  // Only the real enrolment pairs, not the users x courses cross product.
  for (const [userId, courseId] of pairs) {
    const key = `${userId}:${courseId}`;
    if (out.has(key)) continue;
    const videos = videosOf.get(courseId) ?? new Set<number>();
    const materials = materialsOf.get(courseId) ?? new Set<number>();
    const own = practiceOf.get(key) ?? { total: 0, submitted: 0 };
    const total = videos.size + materials.size + own.total;
    if (total === 0) continue;
    let done = own.submitted;
    for (const f of videos) if (doneVideos.has(`${userId}:${f}`)) done += 1;
    for (const f of materials) if (doneMaterials.has(`${userId}:${f}`)) done += 1;
    out.set(key, Math.round((done / total) * 1000) / 10);
  }
  return out;
}

async function loadFees(prisma: PrismaClient, userIds: number[]): Promise<Map<string, { total: number; paid: number }>> {
  // NULLIF: legacy '0000-00-00' paid_date crashes Prisma's hydration (recurring-gotchas).
  const rows = await prisma.$queryRaw<Array<{ user_id: number; course_id: number; total: bigint | number; paid: bigint | number }>>`
    SELECT user_id, course_id, COUNT(*) AS total,
      SUM(CASE WHEN LOWER(status) = 'paid' OR NULLIF(paid_date, '0000-00-00') IS NOT NULL THEN 1 ELSE 0 END) AS paid
    FROM student_payments
    WHERE deleted_at IS NULL AND user_id IN (${Prisma.join(userIds)})
    GROUP BY user_id, course_id`;
  return new Map(rows.map((r) => [`${Number(r.user_id)}:${Number(r.course_id)}`, { total: Number(r.total), paid: Number(r.paid) }]));
}

async function loadAssignments(prisma: PrismaClient, userIds: number[], courseIds: number[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const assignments = await prisma.$queryRaw<Array<{ id: number; cohort_id: number; course_id: number; total_marks: number | null }>>`
    SELECT a.id, COALESCE(a.cohort_id, 0) AS cohort_id, m.course_id, a.total_marks
    FROM assignment a
    JOIN cohorts c ON c.id = a.cohort_id
    JOIN (
      SELECT id AS cohort_id, course_id FROM cohorts WHERE course_id IS NOT NULL
      UNION
      SELECT cohort_id, course_id FROM cohort_courses
    ) m ON m.cohort_id = c.id
    WHERE m.course_id IN (${Prisma.join(courseIds)}) AND a.deleted_at IS NULL`;
  if (assignments.length === 0) return out;
  const cohortsOf = await cohortsByUserCourse(prisma, userIds, courseIds);
  const submissions = await prisma.assignment_submissions.findMany({
    where: { deleted_at: null, user_id: { in: userIds }, assignment_id: { in: assignments.map((a) => Number(a.id)) } },
    select: { user_id: true, assignment_id: true, marks: true },
  });
  const marksOf = new Map<string, number>();
  for (const s of submissions) {
    const text = (s.marks ?? '').trim();
    const value = Number(text);
    if (text !== '' && Number.isFinite(value)) marksOf.set(`${s.user_id}:${s.assignment_id}`, Math.max(marksOf.get(`${s.user_id}:${s.assignment_id}`) ?? 0, value));
  }
  for (const [key, cohorts] of cohortsOf) {
    const [userId, courseId] = key.split(':').map(Number);
    const required = assignments.filter((a) => Number(a.course_id) === courseId && cohorts.includes(Number(a.cohort_id)));
    const max = required.reduce((s, a) => s + (a.total_marks ?? 0), 0);
    if (required.length === 0 || max <= 0) continue;
    const got = required.reduce((s, a) => s + Math.min(marksOf.get(`${userId}:${Number(a.id)}`) ?? 0, a.total_marks ?? 0), 0);
    out.set(key, Math.round((got / max) * 1000) / 10);
  }
  return out;
}
