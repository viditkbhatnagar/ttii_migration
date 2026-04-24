import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';

export interface InstructorProfile {
  id: number;
  name: string;
  email: string;
  image: string | null;
}

export interface InstructorLiveClassSummary {
  id: number;
  title: string;
  date: string | null;
  fromTime: string | null;
  toTime: string | null;
  status: string;
  cohortId: number | null;
  cohortTitle: string | null;
  joinUrl: string | null;
  recordingUrl: string | null;
  recordingStorageKey: string | null;
}

export interface InstructorDashboardPayload {
  profile: InstructorProfile | null;
  upcomingLiveClasses: InstructorLiveClassSummary[];
  pastLiveClasses: InstructorLiveClassSummary[];
  cohortCount: number;
}

const UPCOMING_LIMIT = 8;
const PAST_LIMIT = 8;

function isoDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function timeOf(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(11, 19);
}

export class InstructorService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient = getPrismaClient()) {
    this.prisma = prisma;
  }

  async getDashboard(instructorId: number): Promise<InstructorDashboardPayload> {
    const [profile, cohorts] = await Promise.all([
      this.prisma.users.findFirst({
        where: { id: instructorId, deleted_at: null },
        select: { id: true, name: true, email: true, user_email: true, image: true },
      }),
      this.prisma.cohorts.findMany({
        where: { instructor_id: instructorId, deleted_at: null },
        select: { id: true, title: true },
      }),
    ]);

    const cohortIds = cohorts.map((c) => c.id);
    const cohortTitleMap = new Map(cohorts.map((c) => [c.id, c.title ?? '']));

    if (cohortIds.length === 0) {
      return {
        profile: profile
          ? {
              id: profile.id,
              name: profile.name ?? '',
              email: profile.email ?? profile.user_email ?? '',
              image: profile.image ?? null,
            }
          : null,
        upcomingLiveClasses: [],
        pastLiveClasses: [],
        cohortCount: 0,
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [upcoming, past] = await Promise.all([
      this.prisma.live_class.findMany({
        where: {
          cohort_id: { in: cohortIds },
          deleted_at: null,
          date: { gte: today },
        },
        orderBy: [{ date: 'asc' }, { fromTime: 'asc' }],
        take: UPCOMING_LIMIT,
        select: {
          id: true,
          title: true,
          date: true,
          fromTime: true,
          toTime: true,
          status: true,
          cohort_id: true,
          join_url: true,
          recording_url: true,
          recording_storage_key: true,
        },
      }),
      this.prisma.live_class.findMany({
        where: {
          cohort_id: { in: cohortIds },
          deleted_at: null,
          date: { lt: today },
        },
        orderBy: [{ date: 'desc' }, { fromTime: 'desc' }],
        take: PAST_LIMIT,
        select: {
          id: true,
          title: true,
          date: true,
          fromTime: true,
          toTime: true,
          status: true,
          cohort_id: true,
          join_url: true,
          recording_url: true,
          recording_storage_key: true,
        },
      }),
    ]);

    const mapRow = (row: {
      id: number;
      title: string;
      date: Date | null;
      fromTime: Date | null;
      toTime: Date | null;
      status: string;
      cohort_id: number | null;
      join_url: string | null;
      recording_url: string | null;
      recording_storage_key: string | null;
    }): InstructorLiveClassSummary => ({
      id: row.id,
      title: row.title ?? '',
      date: isoDate(row.date),
      fromTime: timeOf(row.fromTime),
      toTime: timeOf(row.toTime),
      status: row.status ?? '',
      cohortId: row.cohort_id ?? null,
      cohortTitle: row.cohort_id ? cohortTitleMap.get(row.cohort_id) ?? null : null,
      joinUrl: row.join_url ?? null,
      recordingUrl: row.recording_url ?? null,
      recordingStorageKey: row.recording_storage_key ?? null,
    });

    return {
      profile: profile
        ? {
            id: profile.id,
            name: profile.name ?? '',
            email: profile.email ?? profile.user_email ?? '',
            image: profile.image ?? null,
          }
        : null,
      upcomingLiveClasses: upcoming.map(mapRow),
      pastLiveClasses: past.map(mapRow),
      cohortCount: cohorts.length,
    };
  }
}
