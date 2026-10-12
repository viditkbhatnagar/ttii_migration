import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';

// Admin → Students list in Naji's design (TTII 2026-10-12) filters and shows
// Gender, City, Offering, Owner and Joined, none of which /admin/students/index
// returns. This read-only side-car supplies them per student, resolved the same
// way the Student View does (operations-service getStudentDetail):
//   - gender: users.gender (legacy '1'/'2'/'3' codes mapped), else the linked
//     application, else the latest user_details row;
//   - city:   applications.district, else user_details.district;
//   - offering: applications.offering_id → offerings (as /admin/enrol/index);
//   - owner:  applications.pipeline_user (the Student View's "Pipeline User"),
//     else users.counsellor_id;
//   - joined: users.created_at as an IST calendar date (YYYY-MM-DD).
// Fee money is deliberately NOT here: fees live in four stores and the list
// keeps the existing fee_status from /admin/students/index.

export interface StudentDirectoryExtra {
  id: string;
  gender: string;
  city: string;
  offering: string;
  owner: string;
  joined: string;
}

const IST_OFFSET_MS = 330 * 60 * 1000;

export function normalizeStudentGender(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (v === '1') return 'Male';
  if (v === '2') return 'Female';
  if (v === '3') return 'Other';
  if (!v) return '';
  // Legacy rows mix 'male' / 'MALE' / 'Male'.
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

/** A stored instant as the IST calendar day it fell on. */
export function istYmd(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

interface UserRow { id: number; gender: string | null; created_at: Date | null; application_id: number | null; counsellor_id: number | null }
interface AppRow { id: number; gender: string | null; district: string | null; pipeline_user: number | null; offering_id: number | null }
interface DetailRow { user_id: number | null; gender: string | null; district: string | null }
interface OfferingRow { id: number; title: string | null; offering_code: string | null }
interface NameRow { id: number; name: string | null }

export function buildStudentDirectoryExtras(input: {
  users: UserRow[];
  applications: AppRow[];
  details: DetailRow[];
  offerings: OfferingRow[];
  owners: NameRow[];
}): StudentDirectoryExtra[] {
  const appById = new Map(input.applications.map((a) => [a.id, a]));
  // details arrive newest-first; the first row per user wins (Student View
  // reads the latest user_details row too).
  const detailByUser = new Map<number, DetailRow>();
  for (const d of input.details) {
    if (d.user_id !== null && !detailByUser.has(d.user_id)) detailByUser.set(d.user_id, d);
  }
  const offeringById = new Map(input.offerings.map((o) => [o.id, (o.title ?? '').trim() || (o.offering_code ?? '').trim()]));
  const ownerById = new Map(input.owners.map((o) => [o.id, (o.name ?? '').trim()]));

  return input.users.map((u) => {
    const app = u.application_id ? appById.get(u.application_id) : undefined;
    const detail = detailByUser.get(u.id);
    const ownerId = app?.pipeline_user || u.counsellor_id || 0;
    return {
      id: String(u.id),
      gender: normalizeStudentGender((u.gender ?? '').trim() || app?.gender || detail?.gender),
      city: ((app?.district ?? '').trim() || (detail?.district ?? '').trim()),
      offering: app?.offering_id ? offeringById.get(app.offering_id) ?? '' : '',
      owner: ownerId ? ownerById.get(ownerId) ?? '' : '',
      joined: istYmd(u.created_at),
    };
  });
}

export class StudentDirectoryService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async extras(): Promise<StudentDirectoryExtra[]> {
    const users = await this.prisma.users.findMany({
      where: { deleted_at: null, role_id: 2 },
      select: { id: true, gender: true, created_at: true, application_id: true, counsellor_id: true },
    });
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const appIds = [...new Set(users.map((u) => u.application_id).filter((x): x is number => !!x && x > 0))];
    const [applications, details] = await Promise.all([
      appIds.length > 0
        ? this.prisma.applications.findMany({
            where: { id: { in: appIds } },
            select: { id: true, gender: true, district: true, pipeline_user: true, offering_id: true },
          })
        : Promise.resolve([]),
      this.prisma.user_details.findMany({
        where: { user_id: { in: userIds }, deleted_at: null },
        select: { user_id: true, gender: true, district: true },
        orderBy: { id: 'desc' },
      }),
    ]);

    const offeringIds = [...new Set(applications.map((a) => a.offering_id).filter((x): x is number => !!x && x > 0))];
    const ownerIds = [...new Set([
      ...applications.map((a) => a.pipeline_user),
      ...users.map((u) => u.counsellor_id),
    ].filter((x): x is number => !!x && x > 0))];
    const [offerings, owners] = await Promise.all([
      offeringIds.length > 0
        ? this.prisma.offerings.findMany({ where: { id: { in: offeringIds } }, select: { id: true, title: true, offering_code: true } })
        : Promise.resolve([]),
      ownerIds.length > 0
        ? this.prisma.users.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);

    return buildStudentDirectoryExtras({ users, applications, details, offerings, owners });
  }
}
