import type { Prisma, PrismaClient } from '@prisma/client';

import { toLegacyFileUrl } from '../data/legacy-asset-url.js';
import { getPrismaClient } from '../data/prisma-client.js';
import {
  ASSOCIATE_ROLE_ID, ASSOCIATE_STUDENT_TABS, DASHBOARD_TREND_MONTHS, buildTopPerformers, buildTrend, countByOwner,
  displayEmail, isoOrEmpty, istMonthWindow, istYmd, tabCounts, toPositiveInt,
  type AssociateStudentTab, type TopPerformer, type TrendPoint,
} from './associate-admin-model.js';
import { SIGN_IN_EVENTS } from './people-admin-service.js';
import { trendWindowStart } from './staff-profile-service.js';

// Admin → Associate Management (Naji's design, TTII 2026-10-12): Dashboard,
// Associate Students, Onboarding and the Commissions basis. READ-ONLY — every
// read is a Prisma query builder call; nothing here writes. The scoping rules
// are documented in associate-admin-model.ts.

export interface AssociateDashboard {
  kpis: { total: number; active: number; leadsThisMonth: number; enrolments: number; enrolmentsThisMonth: number };
  trend: TrendPoint[];
  top: TopPerformer[];
}

export interface AssociateStudentRow {
  id: number;
  applicationId: string;
  name: string;
  phone: string;
  email: string;
  associateId: number;
  associateName: string;
  course: string;
  stage: string;
  enrolled: boolean;
  enrollmentStatus: string;
  /** IST day the lead was created (YYYY-MM-DD). */
  leadDate: string;
  /** IST day of conversion (YYYY-MM-DD), '' when not enrolled. */
  enrolledDate: string;
  /** applications.application_final_fee, null when not set. */
  fee: number | null;
  /** applications.payment_status as stored ('paid', 'pending_approval', 'sent' or ''). */
  paymentStatus: string;
  /** users.id of the converted student, null when not linked. */
  studentUserId: number | null;
}

export interface AssociateStudentQuery {
  associateId?: number | undefined;
  courseId?: number | undefined;
  tab?: AssociateStudentTab | undefined;
  /** YYYY-MM (IST) the lead was created in (or, with monthBy 'enrolled', converted in). */
  month?: string | undefined;
  monthBy?: 'lead' | 'enrolled' | undefined;
  search?: string | undefined;
  sort?: 'lead' | 'name' | 'enrolled' | undefined;
  dir?: 'asc' | 'desc' | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  /** Export: every matching row (up to STUDENT_EXPORT_CAP), ignoring page. */
  all?: boolean | undefined;
}

export interface AssociateStudentPage {
  rows: AssociateStudentRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<AssociateStudentTab, number>;
  options: { associates: Array<{ id: number; name: string }>; courses: Array<{ id: number; title: string }> };
}

export interface AssociateOnboardingRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  centre: string;
  /** IST day the account was created (YYYY-MM-DD). */
  createdAt: string;
  isActive: boolean;
  loginDisabled: boolean;
  /** ISO instant of the first / newest real sign-in, '' when none is on record. */
  firstSignIn: string;
  lastSignIn: string;
}

export const STUDENT_PAGE_SIZE = 25;
export const STUDENT_PAGE_SIZE_MAX = 100;
export const STUDENT_EXPORT_CAP = 5000;

const studentSelect = {
  id: true, application_id: true, name: true, phone: true, email: true, user_email: true, pipeline_user: true,
  course_id: true, stage: true, is_converted: true, enrollment_status: true, created_at: true, converted_at: true,
  application_final_fee: true, payment_status: true, student_id: true,
} as const;

const NOT_CONVERTED: Prisma.applicationsWhereInput = { OR: [{ is_converted: null }, { is_converted: { not: 1 } }] };

/** The Prisma filter for one Associate Students tab (mirrors classifyApplication). */
export function tabWhere(tab: AssociateStudentTab): Prisma.applicationsWhereInput {
  switch (tab) {
    case 'enrolled': return { is_converted: 1 };
    case 'lead': return { AND: [NOT_CONVERTED, { OR: [{ stage: null }, { stage: '' }, { stage: 'lead' }] }] };
    case 'rejected': return { AND: [NOT_CONVERTED, { stage: 'rejected' }] };
    case 'applied': return { AND: [NOT_CONVERTED, { stage: { notIn: ['', 'lead', 'rejected'] } }] };
    default: return {};
  }
}

const text = (v: string | null | undefined): string => (v ?? '').trim();

export class AssociateAdminService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private liveAssociates() {
    return this.prisma.users.findMany({
      where: { role_id: ASSOCIATE_ROLE_ID, deleted_at: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, status: true, image: true, profile_picture: true },
    });
  }

  async dashboard(now: Date = new Date()): Promise<AssociateDashboard> {
    const associates = await this.liveAssociates();
    const ids = associates.map((a) => a.id);
    const empty = buildTrend([], now);
    if (ids.length === 0) {
      return { kpis: { total: 0, active: 0, leadsThisMonth: 0, enrolments: 0, enrolmentsThisMonth: 0 }, trend: empty, top: [] };
    }
    const mine = { pipeline_user: { in: ids }, deleted_at: null };
    const since = trendWindowStart(now, DASHBOARD_TREND_MONTHS);
    const [referred, converted, trendRows] = await Promise.all([
      this.prisma.applications.groupBy({ by: ['pipeline_user'], where: mine, _count: { id: true } }),
      this.prisma.applications.groupBy({ by: ['pipeline_user'], where: { ...mine, is_converted: 1 }, _count: { id: true } }),
      this.prisma.applications.findMany({
        where: { ...mine, OR: [{ created_at: { gte: since } }, { converted_at: { gte: since } }] },
        select: { is_converted: true, created_at: true, converted_at: true },
      }),
    ]);
    const referredBy = countByOwner(referred);
    const convertedBy = countByOwner(converted);
    const trend = buildTrend(trendRows, now);
    const thisMonth = trend[trend.length - 1];
    const people = associates.map((a) => ({
      id: a.id,
      name: text(a.name) || `Associate #${a.id}`,
      photo: toLegacyFileUrl(a.image) || toLegacyFileUrl(a.profile_picture),
    }));
    return {
      kpis: {
        total: associates.length,
        // The directory's "Active" pill: users.status = 1.
        active: associates.filter((a) => a.status === 1).length,
        leadsThisMonth: thisMonth?.leads ?? 0,
        enrolments: [...convertedBy.values()].reduce((s, n) => s + n, 0),
        enrolmentsThisMonth: thisMonth?.enrolments ?? 0,
      },
      trend,
      top: buildTopPerformers(people, referredBy, convertedBy),
    };
  }

  async students(query: AssociateStudentQuery = {}): Promise<AssociateStudentPage> {
    const associates = await this.liveAssociates();
    const ids = associates.map((a) => a.id);
    const nameById = new Map(associates.map((a) => [a.id, text(a.name) || `Associate #${a.id}`]));
    const tab: AssociateStudentTab = query.tab && ASSOCIATE_STUDENT_TABS.includes(query.tab) ? query.tab : 'all';
    const pageSize = Math.min(STUDENT_PAGE_SIZE_MAX, Math.max(1, query.pageSize ?? STUDENT_PAGE_SIZE));
    const page = Math.max(1, query.page ?? 1);
    const zeroCounts = tabCounts([]);
    const associateOptions = associates.map((a) => ({ id: a.id, name: nameById.get(a.id) ?? '' }));
    if (ids.length === 0) {
      return { rows: [], total: 0, page: 1, pageSize, counts: zeroCounts, options: { associates: [], courses: [] } };
    }

    const scope: Prisma.applicationsWhereInput = {
      deleted_at: null,
      pipeline_user: query.associateId && ids.includes(query.associateId) ? query.associateId : { in: ids },
    };
    if (query.associateId && !ids.includes(query.associateId)) {
      return { rows: [], total: 0, page: 1, pageSize, counts: zeroCounts, options: { associates: associateOptions, courses: [] } };
    }
    const filters: Prisma.applicationsWhereInput[] = [scope];
    if (query.courseId) filters.push({ course_id: query.courseId });
    const window = query.month ? istMonthWindow(query.month) : null;
    if (window) {
      filters.push(query.monthBy === 'enrolled'
        ? { converted_at: { gte: window.gte, lt: window.lt } }
        : { created_at: { gte: window.gte, lt: window.lt } });
    }
    const q = (query.search ?? '').trim().slice(0, 100);
    if (q) {
      filters.push({
        OR: [
          { name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } },
          { user_email: { contains: q } }, { application_id: { contains: q } },
        ],
      });
    }
    const filtered: Prisma.applicationsWhereInput = { AND: filters };
    const listed: Prisma.applicationsWhereInput = { AND: [...filters, tabWhere(tab)] };
    const dir = query.dir === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.applicationsOrderByWithRelationInput[] =
      query.sort === 'name' ? [{ name: dir }, { id: dir }]
        : query.sort === 'enrolled' ? [{ converted_at: dir }, { id: dir }]
          : [{ created_at: dir }, { id: dir }];

    const [groups, total, apps, courseGroups] = await Promise.all([
      this.prisma.applications.groupBy({ by: ['stage', 'is_converted'], where: filtered, _count: { id: true } }),
      this.prisma.applications.count({ where: listed }),
      this.prisma.applications.findMany({
        where: listed,
        select: studentSelect,
        orderBy,
        skip: query.all ? 0 : (page - 1) * pageSize,
        take: query.all ? STUDENT_EXPORT_CAP : pageSize,
      }),
      this.prisma.applications.groupBy({ by: ['course_id'], where: scope, _count: { id: true } }),
    ]);

    const courseIds = [...new Set([
      ...courseGroups.map((g) => g.course_id),
      ...apps.map((a) => a.course_id),
    ].filter((x): x is number => x != null && x > 0))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
      : [];
    const courseTitle = new Map(courses.map((c) => [c.id, text(c.title) || `Course #${c.id}`]));

    const rows: AssociateStudentRow[] = apps.map((a) => {
      const enrolled = a.is_converted === 1;
      const fee = a.application_final_fee == null ? null : Number(a.application_final_fee);
      return {
        id: a.id,
        applicationId: text(a.application_id) || `#${a.id}`,
        name: text(a.name),
        phone: text(a.phone),
        email: displayEmail(a.user_email, a.email),
        associateId: a.pipeline_user ?? 0,
        associateName: nameById.get(a.pipeline_user ?? 0) ?? '',
        course: a.course_id ? courseTitle.get(a.course_id) ?? `Course #${a.course_id}` : '',
        stage: text(a.stage) || 'lead',
        enrolled,
        enrollmentStatus: enrolled ? text(a.enrollment_status) : '',
        leadDate: istYmd(a.created_at),
        enrolledDate: enrolled ? istYmd(a.converted_at) : '',
        fee: fee != null && Number.isFinite(fee) ? fee : null,
        paymentStatus: text(a.payment_status),
        studentUserId: enrolled && a.student_id && a.student_id > 0 ? a.student_id : null,
      };
    });

    return {
      rows,
      total,
      page,
      pageSize,
      counts: tabCounts(groups.map((g) => ({ stage: g.stage, is_converted: g.is_converted, count: g._count?.id ?? 0 }))),
      options: {
        associates: associateOptions,
        courses: courseGroups
          .map((g) => g.course_id)
          .filter((id): id is number => id != null && id > 0)
          .map((id) => ({ id, title: courseTitle.get(id) ?? `Course #${id}` }))
          .sort((a, b) => a.title.localeCompare(b.title)),
      },
    };
  }

  /** Every associate account with its creation day, status and first / latest real sign-in. */
  async onboarding(): Promise<AssociateOnboardingRow[]> {
    const people = await this.prisma.users.findMany({
      where: { role_id: ASSOCIATE_ROLE_ID, deleted_at: null },
      orderBy: { id: 'desc' },
      select: {
        id: true, name: true, user_email: true, email: true, phone: true, centre_id: true,
        status: true, disabled_at: true, created_at: true,
      },
    });
    if (people.length === 0) return [];
    const centreIds = [...new Set(people.map((p) => toPositiveInt(p.centre_id)).filter((n) => n > 0))];
    const [signIns, centres] = await Promise.all([
      this.prisma.auth_audit_log.groupBy({
        by: ['user_id'],
        where: { user_id: { in: people.map((p) => p.id) }, event: { in: [...SIGN_IN_EVENTS] }, success: 1 },
        _min: { created_at: true },
        _max: { created_at: true },
      }),
      centreIds.length > 0
        ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } })
        : Promise.resolve([]),
    ]);
    const signInBy = new Map(signIns.map((s) => [s.user_id, s]));
    const centreName = new Map(centres.map((c) => [c.id, text(c.centre_name)]));
    return people.map((p) => {
      const s = signInBy.get(p.id);
      return {
        id: p.id,
        name: text(p.name),
        email: displayEmail(p.user_email, p.email),
        phone: text(p.phone),
        centre: centreName.get(toPositiveInt(p.centre_id)) ?? '',
        createdAt: istYmd(p.created_at),
        isActive: p.status === 1,
        loginDisabled: p.disabled_at !== null,
        firstSignIn: isoOrEmpty(s?._min?.created_at),
        lastSignIn: isoOrEmpty(s?._max?.created_at),
      };
    });
  }
}
