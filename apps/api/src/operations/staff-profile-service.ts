import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';

// Counsellor / Associate profile in Naji's design (TTII 2026-10-12,
// CounsellorProfile + AssociateProfile). The directory rows only carry two
// lifetime counts; the profile tabs need the person's applications, the
// students they converted, a monthly trend and recent activity. READ-ONLY.
//   - scope:     applications.pipeline_user = the person, live rows only;
//   - enrolled:  is_converted = 1 — the SAME rule as the directory's
//                applications_converted (listCounsellors / listAssociates), so
//                the list and the profile always agree;
//   - rejected:  stage 'rejected' and not converted; pending = the rest;
//   - dropouts:  students (role 2) with drop_out_at whose counsellor_id /
//                referred_by / created_by / pipeline_user is the person —
//                exactly the counsellor dashboard's dropout scope
//                (operations-service getCounsellorDashboard);
//   - totals and the course mix are grouped counts, not loaded rows;
//   - the application list is the latest STAFF_PROFILE_APPLICATION_LIMIT;
//   - trend:     last 12 IST calendar months — applications by created_at,
//                enrolments by converted_at (created_at when unset);
//   - activity:  the latest application_events on the person's applications.

export type StaffRole = 9 | 10;

export interface StaffProfileApplication {
  id: string;
  applicationId: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  stage: string;
  enrolled: boolean;
  enrollmentStatus: string;
  paymentStatus: string;
  /** IST calendar day the application was created (YYYY-MM-DD). */
  created: string;
  /** IST calendar day of conversion (YYYY-MM-DD), '' when not converted. */
  converted: string;
}

export interface StaffProfileTrendPoint { month: string; label: string; applications: number; enrollments: number }
export interface StaffProfileActivity { id: string; type: string; title: string; student: string; at: string }
export interface StaffProfileCourseMix { course: string; applications: number; enrolled: number }

export interface StaffProfile {
  kpis: { applications: number; pending: number; enrolled: number; rejected: number; dropouts: number };
  trend: StaffProfileTrendPoint[];
  courseMix: StaffProfileCourseMix[];
  /** The latest applications (at most STAFF_PROFILE_APPLICATION_LIMIT). */
  applications: StaffProfileApplication[];
  activity: StaffProfileActivity[];
}

const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const STAFF_PROFILE_TREND_MONTHS = 12;
export const STAFF_PROFILE_ACTIVITY_LIMIT = 20;
export const STAFF_PROFILE_APPLICATION_LIMIT = 200;
export const STAFF_PROFILE_COURSE_MIX_LIMIT = 8;

/** A stored instant as the IST calendar day it fell on. */
function istYmd(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The last `count` IST months ending with the month `now` falls in, oldest first. */
export function istMonthKeys(now: Date, count: number): string[] {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(year, month - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** The instant the oldest trend month starts (IST midnight on its 1st). */
export function trendWindowStart(now: Date, count: number): Date {
  const first = istMonthKeys(now, count)[0] ?? '1970-01';
  return new Date(Date.UTC(Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1, 1) - IST_OFFSET_MS);
}

export interface StaffAppRow {
  id: number;
  application_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  course_id: number | null;
  stage: string | null;
  is_converted: number | null;
  enrollment_status: string | null;
  payment_status: string | null;
  created_at: Date | null;
  converted_at: Date | null;
}

export interface StaffTrendRow { is_converted: number | null; created_at: Date | null; converted_at: Date | null }
export interface StaffStageCount { stage: string | null; is_converted: number | null; count: number }
export interface StaffCourseCount { course_id: number | null; is_converted: number | null; count: number }
export interface StaffEventRow { id: number; application_id: number; event_type: string | null; description: string | null; created_at: Date | null }

const isConverted = (a: { is_converted: number | null }): boolean => a.is_converted === 1;

export function buildStaffProfile(input: {
  /** Latest applications for the list (already capped). */
  apps: StaffAppRow[];
  /** Grouped counts over ALL the person's live applications. */
  stageCounts: StaffStageCount[];
  courseCounts: StaffCourseCount[];
  /** Light rows created or converted inside the trend window. */
  trendRows: StaffTrendRow[];
  courses: Array<{ id: number; title: string | null }>;
  events: StaffEventRow[];
  /** application id → student name, for the activity rows. */
  eventNames: Array<{ id: number; name: string | null }>;
  dropouts: number;
  now: Date;
}): StaffProfile {
  const courseTitle = (id: number | null): string =>
    id == null ? '' : (input.courses.find((c) => c.id === id)?.title ?? '').trim() || `Course #${id}`;

  const applications: StaffProfileApplication[] = input.apps.map((a) => {
    const enrolled = isConverted(a);
    return {
      id: String(a.id),
      applicationId: (a.application_id ?? '').trim() || `#${a.id}`,
      name: (a.name ?? '').trim(),
      phone: (a.phone ?? '').trim(),
      email: (a.email ?? '').trim(),
      course: courseTitle(a.course_id),
      stage: (a.stage ?? '').trim() || 'lead',
      enrolled,
      enrollmentStatus: enrolled ? (a.enrollment_status ?? '').trim() : '',
      paymentStatus: (a.payment_status ?? '').trim(),
      created: istYmd(a.created_at),
      converted: enrolled ? istYmd(a.converted_at) : '',
    };
  });

  let total = 0;
  let enrolled = 0;
  let rejected = 0;
  for (const g of input.stageCounts) {
    total += g.count;
    if (isConverted(g)) enrolled += g.count;
    else if (g.stage === 'rejected') rejected += g.count;
  }

  const mix = new Map<string, StaffProfileCourseMix>();
  for (const g of input.courseCounts) {
    const course = courseTitle(g.course_id) || 'No course';
    const cur = mix.get(course) ?? { course, applications: 0, enrolled: 0 };
    mix.set(course, { course, applications: cur.applications + g.count, enrolled: cur.enrolled + (isConverted(g) ? g.count : 0) });
  }
  const courseMix = [...mix.values()]
    .sort((a, b) => b.applications - a.applications || a.course.localeCompare(b.course))
    .slice(0, STAFF_PROFILE_COURSE_MIX_LIMIT);

  const keys = istMonthKeys(input.now, STAFF_PROFILE_TREND_MONTHS);
  const trend: StaffProfileTrendPoint[] = keys.map((month) => ({
    month,
    label: `${MONTH_LABELS[Number(month.slice(5, 7)) - 1] ?? ''} ${month.slice(2, 4)}`,
    applications: 0,
    enrollments: 0,
  }));
  const index = new Map(keys.map((k, i) => [k, i]));
  for (const a of input.trendRows) {
    const created = index.get(istYmd(a.created_at).slice(0, 7));
    if (created !== undefined && trend[created]) trend[created].applications += 1;
    if (!isConverted(a)) continue;
    const enrolledOn = index.get(istYmd(a.converted_at ?? a.created_at).slice(0, 7));
    if (enrolledOn !== undefined && trend[enrolledOn]) trend[enrolledOn].enrollments += 1;
  }

  const nameByApp = new Map(input.eventNames.map((a) => [a.id, (a.name ?? '').trim()]));
  const activity: StaffProfileActivity[] = input.events.map((e) => ({
    id: String(e.id),
    type: (e.event_type ?? '').trim() || 'event',
    title: (e.description ?? '').trim() || (e.event_type ?? '').trim() || 'Activity',
    student: nameByApp.get(e.application_id) ?? '',
    at: e.created_at instanceof Date && !Number.isNaN(e.created_at.getTime()) ? e.created_at.toISOString() : '',
  }));

  return {
    kpis: { applications: total, pending: total - enrolled - rejected, enrolled, rejected, dropouts: input.dropouts },
    trend,
    courseMix,
    applications,
    activity,
  };
}

export class StaffProfileNotFoundError extends Error {}

const appListSelect = {
  id: true, application_id: true, name: true, phone: true, email: true, course_id: true, stage: true,
  is_converted: true, enrollment_status: true, payment_status: true, created_at: true, converted_at: true,
} as const;

export class StaffProfileService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async profile(userId: number, roleId: StaffRole, now: Date = new Date()): Promise<StaffProfile> {
    const person = Number.isInteger(userId) && userId > 0
      ? await this.prisma.users.findFirst({ where: { id: userId, role_id: roleId, deleted_at: null }, select: { id: true } })
      : null;
    if (!person) throw new StaffProfileNotFoundError(roleId === 9 ? 'Counsellor not found.' : 'Associate not found.');

    const mine = { pipeline_user: userId, deleted_at: null };
    const since = trendWindowStart(now, STAFF_PROFILE_TREND_MONTHS);
    const [apps, stageGroups, courseGroups, trendRows, appIds, dropouts] = await Promise.all([
      this.prisma.applications.findMany({ where: mine, select: appListSelect, orderBy: { id: 'desc' }, take: STAFF_PROFILE_APPLICATION_LIMIT }),
      this.prisma.applications.groupBy({ by: ['stage', 'is_converted'], where: mine, _count: { id: true } }),
      this.prisma.applications.groupBy({ by: ['course_id', 'is_converted'], where: mine, _count: { id: true } }),
      this.prisma.applications.findMany({
        where: { ...mine, OR: [{ created_at: { gte: since } }, { converted_at: { gte: since } }] },
        select: { is_converted: true, created_at: true, converted_at: true },
      }),
      this.prisma.applications.findMany({ where: mine, select: { id: true } }),
      // Same scope as the counsellor dashboard's "Dropouts" KPI.
      this.prisma.users.count({
        where: {
          role_id: 2,
          deleted_at: null,
          drop_out_at: { not: null },
          OR: [{ counsellor_id: userId }, { referred_by: userId }, { created_by: userId }, { pipeline_user: userId }],
        },
      }),
    ]);

    const courseIds = [...new Set([
      ...apps.map((a) => a.course_id),
      ...courseGroups.map((g) => g.course_id),
    ].filter((x): x is number => x != null))];
    const ids = appIds.map((a) => a.id);
    const [courses, events] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      ids.length > 0
        ? this.prisma.application_events.findMany({
            where: { application_id: { in: ids } },
            orderBy: { created_at: 'desc' },
            take: STAFF_PROFILE_ACTIVITY_LIMIT,
            select: { id: true, application_id: true, event_type: true, description: true, created_at: true },
          })
        : Promise.resolve([]),
    ]);
    const eventAppIds = [...new Set(events.map((e) => e.application_id))];
    const eventNames = eventAppIds.length > 0
      ? await this.prisma.applications.findMany({ where: { id: { in: eventAppIds } }, select: { id: true, name: true } })
      : [];

    return buildStaffProfile({
      apps,
      stageCounts: stageGroups.map((g) => ({ stage: g.stage, is_converted: g.is_converted, count: g._count?.id ?? 0 })),
      courseCounts: courseGroups.map((g) => ({ course_id: g.course_id, is_converted: g.is_converted, count: g._count?.id ?? 0 })),
      trendRows,
      courses,
      events,
      eventNames,
      dropouts,
      now,
    });
  }
}
