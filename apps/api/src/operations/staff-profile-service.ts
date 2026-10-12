import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';

// Counsellor / Associate profile in Naji's design (TTII 2026-10-12,
// CounsellorProfile + AssociateProfile). The directory rows only carry two
// lifetime counts; the profile tabs need the person's applications, the
// students they converted, a monthly trend and recent activity. This is a
// READ-ONLY side-car, scoped exactly like the existing counsellor dashboard:
//   - applications: applications.pipeline_user = the person, live rows only;
//   - enrolled:     stage 'enrolled' OR is_converted = 1 (dashboard rule);
//   - rejected:     stage 'rejected'; pending = everything else;
//   - dropouts:     students (role 2) with drop_out_at whose counsellor_id /
//                   referred_by / created_by / pipeline_user is the person;
//   - trend:        last 12 IST calendar months — applications by created_at,
//                   enrolments by converted_at (created_at when unset);
//   - activity:     the latest application_events on those applications.
// Nothing here writes.

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
  studentId: string;
  /** IST calendar day the application was created (YYYY-MM-DD). */
  created: string;
  /** IST calendar day of conversion (YYYY-MM-DD), '' when not converted. */
  converted: string;
}

export interface StaffProfileTrendPoint {
  month: string;
  label: string;
  applications: number;
  enrollments: number;
}

export interface StaffProfileActivity {
  id: string;
  type: string;
  title: string;
  student: string;
  at: string;
}

export interface StaffProfile {
  kpis: { applications: number; pending: number; enrolled: number; rejected: number; dropouts: number };
  trend: StaffProfileTrendPoint[];
  applications: StaffProfileApplication[];
  activity: StaffProfileActivity[];
}

const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const STAFF_PROFILE_TREND_MONTHS = 12;
export const STAFF_PROFILE_ACTIVITY_LIMIT = 20;

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
  student_id: number | null;
  created_at: Date | null;
  converted_at: Date | null;
}

export interface StaffEventRow {
  id: number;
  application_id: number;
  event_type: string | null;
  description: string | null;
  created_at: Date | null;
}

const isEnrolled = (a: { stage: string | null; is_converted: number | null }): boolean =>
  a.stage === 'enrolled' || a.is_converted === 1;

export function buildStaffProfile(input: {
  apps: StaffAppRow[];
  courses: Array<{ id: number; title: string | null }>;
  events: StaffEventRow[];
  dropouts: number;
  now: Date;
}): StaffProfile {
  const courseTitle = new Map(input.courses.map((c) => [c.id, (c.title ?? '').trim() || `Course #${c.id}`]));
  const applications: StaffProfileApplication[] = input.apps.map((a) => {
    const enrolled = isEnrolled(a);
    return {
      id: String(a.id),
      applicationId: (a.application_id ?? '').trim() || `#${a.id}`,
      name: (a.name ?? '').trim(),
      phone: (a.phone ?? '').trim(),
      email: (a.email ?? '').trim(),
      course: a.course_id != null ? courseTitle.get(a.course_id) ?? `Course #${a.course_id}` : '',
      stage: (a.stage ?? '').trim() || 'lead',
      enrolled,
      enrollmentStatus: enrolled ? (a.enrollment_status ?? '').trim() : '',
      paymentStatus: (a.payment_status ?? '').trim(),
      studentId: a.student_id ? String(a.student_id) : '',
      created: istYmd(a.created_at),
      converted: enrolled ? istYmd(a.converted_at) : '',
    };
  });

  const enrolled = input.apps.filter(isEnrolled).length;
  const rejected = input.apps.filter((a) => !isEnrolled(a) && a.stage === 'rejected').length;

  const keys = istMonthKeys(input.now, STAFF_PROFILE_TREND_MONTHS);
  const trend: StaffProfileTrendPoint[] = keys.map((month) => ({
    month,
    label: `${MONTH_LABELS[Number(month.slice(5, 7)) - 1] ?? ''} ${month.slice(2, 4)}`,
    applications: 0,
    enrollments: 0,
  }));
  const index = new Map(keys.map((k, i) => [k, i]));
  for (const a of input.apps) {
    const created = index.get(istYmd(a.created_at).slice(0, 7));
    if (created !== undefined && trend[created]) trend[created].applications += 1;
    if (!isEnrolled(a)) continue;
    const enrolledOn = index.get(istYmd(a.converted_at ?? a.created_at).slice(0, 7));
    if (enrolledOn !== undefined && trend[enrolledOn]) trend[enrolledOn].enrollments += 1;
  }

  const nameByApp = new Map(input.apps.map((a) => [a.id, (a.name ?? '').trim()]));
  const activity: StaffProfileActivity[] = input.events.map((e) => ({
    id: String(e.id),
    type: (e.event_type ?? '').trim() || 'event',
    title: (e.description ?? '').trim() || (e.event_type ?? '').trim() || 'Activity',
    student: nameByApp.get(e.application_id) ?? '',
    at: e.created_at instanceof Date && !Number.isNaN(e.created_at.getTime()) ? e.created_at.toISOString() : '',
  }));

  return {
    kpis: {
      applications: input.apps.length,
      pending: input.apps.length - enrolled - rejected,
      enrolled,
      rejected,
      dropouts: input.dropouts,
    },
    trend,
    applications,
    activity,
  };
}

export class StaffProfileNotFoundError extends Error {}

export class StaffProfileService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async profile(userId: number, roleId: StaffRole, now: Date = new Date()): Promise<StaffProfile> {
    const person = Number.isInteger(userId) && userId > 0
      ? await this.prisma.users.findFirst({ where: { id: userId, role_id: roleId, deleted_at: null }, select: { id: true } })
      : null;
    if (!person) throw new StaffProfileNotFoundError(roleId === 9 ? 'Counsellor not found.' : 'Associate not found.');

    const [apps, dropouts] = await Promise.all([
      this.prisma.applications.findMany({
        where: { pipeline_user: userId, deleted_at: null },
        select: {
          id: true, application_id: true, name: true, phone: true, email: true, course_id: true, stage: true,
          is_converted: true, enrollment_status: true, payment_status: true, student_id: true,
          created_at: true, converted_at: true,
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.users.count({
        where: {
          role_id: 2,
          deleted_at: null,
          drop_out_at: { not: null },
          OR: [{ counsellor_id: userId }, { referred_by: userId }, { created_by: userId }, { pipeline_user: userId }],
        },
      }),
    ]);

    const courseIds = [...new Set(apps.map((a) => a.course_id).filter((x): x is number => x != null))];
    const appIds = apps.map((a) => a.id);
    const [courses, events] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      appIds.length > 0
        ? this.prisma.application_events.findMany({
            where: { application_id: { in: appIds } },
            orderBy: { created_at: 'desc' },
            take: STAFF_PROFILE_ACTIVITY_LIMIT,
            select: { id: true, application_id: true, event_type: true, description: true, created_at: true },
          })
        : Promise.resolve([]),
    ]);

    return buildStaffProfile({ apps, courses, events, dropouts, now });
  }
}
