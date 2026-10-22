import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import {
  cohortStatus, dayOf, hhmm, httpLink, istToday, plainText, platformLabel, sessionState,
  type CohortStatus, type SessionState,
} from './centre-portal-cohort-model.js';
import { NO_CENTRE, ok, positiveInt, refuse, type Outcome } from './centre-portal-money-model.js';

// Centre portal → Cohorts (Naji's centre login design, 2026-10-22). READ-ONLY
// companions of the existing /centre/cohorts/* and /centre/live_class/* routes:
//  - options: what the Add Cohort form may pick (the centre's own courses —
//    centre_course_plans —, their subjects, TTII instructors, languages);
//  - view: one cohort of the caller's centre with its learners, live classes,
//    assignments and SENT announcements.
// Every read is scoped to the caller's centre (users.centre_id of the logged-in
// centre user); a cohort of another centre answers "not found".

const CENTRE_ROLE_ID = 7;
const INSTRUCTOR_ROLE_ID = 3;

export interface Option { id: number; title: string }
export interface SubjectOption extends Option { courseIds: number[] }

export interface CohortOptions {
  courses: Option[];
  subjects: SubjectOption[];
  instructors: Option[];
  languages: Option[];
}

export interface CohortLearner { id: number; name: string; studentCode: string }

export interface CohortLiveClass {
  id: number;
  title: string;
  dateYmd: string;
  from: string;
  to: string;
  platform: string;
  joinUrl: string;
  hostEmail: string;
  state: SessionState;
  hasRecording: boolean;
}

export interface CohortAssignment {
  id: number;
  title: string;
  description: string;
  totalMarks: number | null;
  dueYmd: string;
  submissions: number;
}

export interface CohortAnnouncement { id: number; title: string; content: string; sentYmd: string }

export interface CohortView {
  today: string;
  cohort: {
    id: number;
    /** "C75" — the same id the admin Cohorts list shows. */
    cid: string;
    code: string;
    title: string;
    courses: string[];
    subject: string;
    language: string;
    instructor: string;
    hasInstructor: boolean;
    startYmd: string;
    endYmd: string;
    status: CohortStatus;
  };
  learners: CohortLearner[];
  liveClasses: CohortLiveClass[];
  assignments: CohortAssignment[];
  announcements: CohortAnnouncement[];
}


const byTitle = (a: Option, b: Option) => a.title.localeCompare(b.title);

export class CentrePortalCohortService {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;

  constructor(deps: { prisma?: PrismaClient; now?: () => Date } = {}) {
    this.prisma = deps.prisma ?? getPrismaClient();
    this.now = deps.now ?? (() => new Date());
  }

  /** centres.id of the caller (a live role-7 user), or null. */
  async centreIdOf(actorUserId: number | null): Promise<number | null> {
    if (!actorUserId) return null;
    const user = await this.prisma.users.findFirst({
      where: { id: actorUserId, role_id: CENTRE_ROLE_ID, deleted_at: null },
      select: { centre_id: true },
    });
    const centreId = positiveInt(user?.centre_id);
    if (!centreId) return null;
    const centre = await this.prisma.centres.findFirst({ where: { id: centreId, deleted_at: null }, select: { id: true } });
    return centre ? centre.id : null;
  }

  async options(actorUserId: number | null): Promise<Outcome<CohortOptions>> {
    const centreId = await this.centreIdOf(actorUserId);
    if (!centreId) return refuse(NO_CENTRE);
    const plans = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: centreId, deleted_at: null },
      select: { course_id: true },
    });
    const courseIds = [...new Set(plans.map((p) => p.course_id).filter((id) => id > 0))];
    const [courses, links, legacySubjects, instructors, languages] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds }, deleted_at: null }, select: { id: true, title: true } })
        : [],
      courseIds.length > 0
        ? this.prisma.course_subject.findMany({ where: { course_id: { in: courseIds }, deleted_at: null }, select: { course_id: true, subject_id: true } })
        : [],
      courseIds.length > 0
        ? this.prisma.subject.findMany({ where: { course_id: { in: courseIds }, deleted_at: null }, select: { id: true, course_id: true } })
        : [],
      this.prisma.users.findMany({
        where: { role_id: INSTRUCTOR_ROLE_ID, deleted_at: null, disabled_at: null },
        select: { id: true, name: true },
      }),
      this.prisma.languages.findMany({ where: { deleted_at: null }, select: { id: true, title: true } }),
    ]);
    const liveCourses = new Set(courses.map((c) => c.id));
    const subjectCourses = new Map<number, Set<number>>();
    const link = (subjectId: number, courseId: number | null) => {
      if (!courseId || !liveCourses.has(courseId)) return;
      const set = subjectCourses.get(subjectId) ?? new Set<number>();
      set.add(courseId);
      subjectCourses.set(subjectId, set);
    };
    for (const l of links) link(l.subject_id, l.course_id);
    for (const s of legacySubjects) link(s.id, s.course_id);
    const subjectIds = [...subjectCourses.keys()];
    const subjects = subjectIds.length > 0
      ? await this.prisma.subject.findMany({ where: { id: { in: subjectIds }, deleted_at: null }, select: { id: true, title: true } })
      : [];
    return ok({
      courses: courses.map((c) => ({ id: c.id, title: (c.title ?? '').trim() })).filter((c) => c.title).sort(byTitle),
      subjects: subjects
        .map((s) => ({ id: s.id, title: (s.title ?? '').trim(), courseIds: [...(subjectCourses.get(s.id) ?? [])].sort((a, b) => a - b) }))
        .filter((s) => s.title)
        .sort(byTitle),
      instructors: instructors.map((i) => ({ id: i.id, title: (i.name ?? '').trim() })).filter((i) => i.title).sort(byTitle),
      languages: languages.map((l) => ({ id: l.id, title: (l.title ?? '').trim() })).filter((l) => l.title).sort(byTitle),
    });
  }

  async view(actorUserId: number | null, cohortIdValue: unknown): Promise<Outcome<CohortView>> {
    const cohortId = positiveInt(cohortIdValue);
    if (!cohortId) return refuse('Cohort not found.');
    const centreId = await this.centreIdOf(actorUserId);
    if (!centreId) return refuse(NO_CENTRE);
    const cohort = await this.prisma.cohorts.findFirst({ where: { id: cohortId, centre_id: centreId, deleted_at: null } });
    if (!cohort) return refuse('Cohort not found.');

    const now = this.now();
    const today = istToday(now);
    const keys = [String(cohort.id), ...(cohort.cohort_id && cohort.cohort_id.trim() ? [cohort.cohort_id.trim()] : [])];
    const [courseLinks, subject, language, instructor, members, lives, assignments, announcements] = await Promise.all([
      this.prisma.cohort_courses.findMany({ where: { cohort_id: cohort.id }, select: { course_id: true } }),
      cohort.subject_id ? this.prisma.subject.findFirst({ where: { id: cohort.subject_id }, select: { title: true } }) : null,
      cohort.language_id ? this.prisma.languages.findFirst({ where: { id: cohort.language_id }, select: { title: true } }) : null,
      cohort.instructor_id ? this.prisma.users.findFirst({ where: { id: cohort.instructor_id }, select: { name: true } }) : null,
      this.prisma.cohort_students.findMany({ where: { cohort_id: { in: keys }, deleted_at: null }, select: { user_id: true } }),
      this.prisma.live_class.findMany({
        where: { cohort_id: cohort.id, deleted_at: null },
        select: {
          id: true, title: true, date: true, fromTime: true, toTime: true, platform: true, join_url: true,
          host_email: true, recording_url: true,
        },
        orderBy: [{ date: 'asc' }, { fromTime: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.assignment.findMany({
        where: { cohort_id: cohort.id, deleted_at: null },
        select: { id: true, title: true, description: true, total_marks: true, due_date: true },
        orderBy: [{ due_date: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.cohort_announcements.findMany({
        where: { cohort_id: cohort.id, deleted_at: null, status: 'sent' },
        select: { id: true, title: true, content: true, sent_at: true, created_at: true },
        orderBy: { id: 'desc' },
      }),
    ]);

    const courseIds = [...new Set([...courseLinks.map((c) => c.course_id), ...(cohort.course_id ? [cohort.course_id] : [])])];
    const userIds = [...new Set(members.map((m) => m.user_id).filter((id): id is number => typeof id === 'number' && id > 0))];
    const assignmentIds = assignments.map((a) => a.id);
    const [courses, users, submissions] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      userIds.length > 0
        // Learners are the centre's OWN students only: a cohort's code is free text, so
        // the code key in cohort_students can match another centre's cohort.
        ? this.prisma.users.findMany({
          where: { id: { in: userIds }, role_id: 2, added_under_centre: centreId, deleted_at: null },
          select: { id: true, name: true, student_id: true },
        })
        : [],
      assignmentIds.length > 0
        ? this.prisma.assignment_submissions.groupBy({ by: ['assignment_id'], where: { assignment_id: { in: assignmentIds }, deleted_at: null }, _count: { id: true } })
        : [],
    ]);
    const courseTitle = new Map(courses.map((c) => [c.id, (c.title ?? '').trim()]));
    // Primary course first, then the other programs the cohort serves.
    const orderedCourses = [
      ...(cohort.course_id ? [cohort.course_id] : []),
      ...courseIds.filter((id) => id !== cohort.course_id).sort((a, b) => a - b),
    ].map((id) => courseTitle.get(id) ?? '').filter(Boolean);
    const submissionCount = new Map(submissions.map((s) => [s.assignment_id, s._count?.id ?? 0]));
    const nowMs = now.getTime();
    const startYmd = dayOf(cohort.start_date);
    const endYmd = dayOf(cohort.end_date);

    return ok({
      today,
      cohort: {
        id: cohort.id,
        cid: `C${cohort.id}`,
        code: (cohort.cohort_id ?? '').trim(),
        title: (cohort.title ?? '').trim(),
        courses: orderedCourses,
        subject: (subject?.title ?? '').trim(),
        language: (language?.title ?? '').trim(),
        instructor: (instructor?.name ?? '').trim(),
        hasInstructor: !!cohort.instructor_id,
        startYmd,
        endYmd,
        status: cohortStatus(startYmd, endYmd, today),
      },
      learners: users
        .map((u) => ({ id: u.id, name: (u.name ?? '').trim(), studentCode: (u.student_id ?? '').trim() }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      liveClasses: lives.map((l) => {
        const dateYmd = dayOf(l.date);
        const from = hhmm(l.fromTime);
        const to = hhmm(l.toTime);
        return {
          id: l.id,
          title: l.title.trim(),
          dateYmd,
          from,
          to,
          platform: platformLabel(l.platform, l.join_url),
          joinUrl: httpLink(l.join_url),
          hostEmail: (l.host_email ?? '').trim(),
          state: sessionState(dateYmd, to, from, nowMs),
          hasRecording: !!(l.recording_url ?? '').trim(),
        };
      }),
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title.trim(),
        description: plainText(a.description),
        totalMarks: typeof a.total_marks === 'number' ? a.total_marks : null,
        dueYmd: dayOf(a.due_date),
        submissions: submissionCount.get(a.id) ?? 0,
      })),
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title.trim(),
        content: plainText(a.content),
        sentYmd: istToday(a.sent_at ?? a.created_at ?? new Date(Number.NaN)),
      })),
    });
  }
}
