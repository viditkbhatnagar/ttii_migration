import type { PrismaClient } from '@prisma/client';

import {
  COUNSELLOR_ROLE, ORG_APPLICATION_LIMIT, ORG_TREND_MONTHS,
  buildTrend, istDay, kpisByCounsellor, personName,
  type Kpis, type PersonRow, type TrendPoint,
} from './counsellor-teams-model.js';
import { trendWindowStart } from './staff-profile-service.js';

// Shared reads for Counsellor Teams and Groups: people by id, application KPIs
// per counsellor, the IST monthly trend and the latest applications — all
// scoped by applications.pipeline_user, live rows only. Batch queries + Maps,
// never one query per row.

export interface OrgApplication {
  id: string;
  applicationId: string;
  name: string;
  phone: string;
  course: string;
  counsellorId: string;
  counsellor: string;
  stage: string;
  enrolled: boolean;
  /** IST calendar day created (YYYY-MM-DD). */
  created: string;
  /** IST calendar day converted, '' when not converted. */
  converted: string;
}

const personSelect = { id: true, name: true, email: true, phone: true, role_id: true, deleted_at: true, disabled_at: true } as const;

export async function loadPeople(prisma: PrismaClient, ids: number[]): Promise<Map<number, PersonRow>> {
  const unique = [...new Set(ids.filter((id) => id > 0))];
  if (unique.length === 0) return new Map();
  const rows = await prisma.users.findMany({ where: { id: { in: unique } }, select: personSelect });
  return new Map(rows.map((r) => [r.id, r]));
}

/** Every live counsellor (role 9), for pickers and totals. */
export async function loadLiveCounsellors(prisma: PrismaClient): Promise<PersonRow[]> {
  return prisma.users.findMany({
    where: { role_id: COUNSELLOR_ROLE, deleted_at: null },
    select: personSelect,
    orderBy: { name: 'asc' },
  });
}

export async function loadKpis(prisma: PrismaClient, userIds: number[]): Promise<Map<number, Kpis>> {
  if (userIds.length === 0) return new Map();
  const groups = await prisma.applications.groupBy({
    by: ['pipeline_user', 'stage', 'is_converted'],
    where: { pipeline_user: { in: userIds }, deleted_at: null },
    _count: { id: true },
  });
  return kpisByCounsellor(groups.map((g) => ({
    pipeline_user: g.pipeline_user, stage: g.stage, is_converted: g.is_converted, count: g._count?.id ?? 0,
  })));
}

export async function loadTrend(prisma: PrismaClient, userIds: number[], now: Date): Promise<TrendPoint[]> {
  if (userIds.length === 0) return buildTrend([], now);
  const since = trendWindowStart(now, ORG_TREND_MONTHS);
  const rows = await prisma.applications.findMany({
    where: {
      pipeline_user: { in: userIds },
      deleted_at: null,
      OR: [{ created_at: { gte: since } }, { converted_at: { gte: since } }],
    },
    select: { is_converted: true, created_at: true, converted_at: true },
  });
  return buildTrend(rows, now);
}

/** The latest ORG_APPLICATION_LIMIT applications handled by these counsellors. */
export async function loadApplications(
  prisma: PrismaClient,
  userIds: number[],
  people: Map<number, PersonRow>,
): Promise<OrgApplication[]> {
  if (userIds.length === 0) return [];
  const apps = await prisma.applications.findMany({
    where: { pipeline_user: { in: userIds }, deleted_at: null },
    select: {
      id: true, application_id: true, name: true, phone: true, course_id: true, pipeline_user: true,
      stage: true, is_converted: true, created_at: true, converted_at: true,
    },
    orderBy: { id: 'desc' },
    take: ORG_APPLICATION_LIMIT,
  });
  const courseIds = [...new Set(apps.map((a) => a.course_id).filter((x): x is number => x != null))];
  const courses = courseIds.length > 0
    ? await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
    : [];
  const courseTitle = new Map(courses.map((c) => [c.id, (c.title ?? '').trim()]));
  return apps.map((a) => {
    const enrolled = a.is_converted === 1;
    const counsellor = a.pipeline_user == null ? undefined : people.get(a.pipeline_user);
    return {
      id: String(a.id),
      applicationId: (a.application_id ?? '').trim() || `#${a.id}`,
      name: (a.name ?? '').trim(),
      phone: (a.phone ?? '').trim(),
      course: a.course_id == null ? '' : courseTitle.get(a.course_id) || `Course #${a.course_id}`,
      counsellorId: a.pipeline_user == null ? '' : String(a.pipeline_user),
      counsellor: personName(counsellor),
      stage: (a.stage ?? '').trim() || 'lead',
      enrolled,
      created: istDay(a.created_at),
      converted: enrolled ? istDay(a.converted_at ?? a.created_at) : '',
    };
  });
}
