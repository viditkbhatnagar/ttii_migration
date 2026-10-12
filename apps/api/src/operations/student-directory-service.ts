import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';

// Admin → Students list in Naji's design (TTII 2026-10-12) filters and shows
// Gender, City, Offering, Owner and Joined, none of which /admin/students/index
// returns. This read-only side-car supplies them per student, derived EXACTLY
// as the Student View does (operations-service getStudentDetail), batched:
//   - application: users.application_id (live rows only); when the user has no
//     application_id, the latest live application with the same user_email;
//   - user_details: the latest live row for the user;
//   - gender: users.gender (trimmed) || application.gender || user_details.gender,
//     legacy '1'/'2'/'3' mapped to Male/Female/Other, otherwise shown as stored;
//   - city:   application.district ?? user_details.district;
//   - owner:  application.pipeline_user's name, else user_details.pipeline_user's;
//   - offering: application.offering_id → offerings title / code;
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

/** The Student View's normalizeGender, '' instead of null. */
export function normalizeStudentGender(raw: string | null | undefined): string {
  if (raw == null) return '';
  const v = raw.trim();
  if (v === '1') return 'Male';
  if (v === '2') return 'Female';
  if (v === '3') return 'Other';
  return v;
}

/** A stored instant as the IST calendar day it fell on. */
export function istYmd(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const emailKey = (e: string | null | undefined) => (e ?? '').trim().toLowerCase();

interface UserRow { id: number; gender: string | null; created_at: Date | null; application_id: number | null; user_email: string | null }
interface AppRow { id: number; user_email: string | null; gender: string | null; district: string | null; pipeline_user: number | null; offering_id: number | null }
interface DetailRow { user_id: number | null; gender: string | null; district: string | null; pipeline_user: number | null }
interface OfferingRow { id: number; title: string | null; offering_code: string | null }
interface NameRow { id: number; name: string | null }

export function buildStudentDirectoryExtras(input: {
  users: UserRow[];
  /** Live applications by id (users.application_id). */
  applicationsById: AppRow[];
  /** Live applications matched by email, NEWEST FIRST. */
  applicationsByEmail: AppRow[];
  /** user_details rows, NEWEST FIRST. */
  details: DetailRow[];
  offerings: OfferingRow[];
  owners: NameRow[];
}): StudentDirectoryExtra[] {
  const appById = new Map(input.applicationsById.map((a) => [a.id, a]));
  const appByEmail = new Map<string, AppRow>();
  for (const a of input.applicationsByEmail) {
    const k = emailKey(a.user_email);
    if (k && !appByEmail.has(k)) appByEmail.set(k, a);
  }
  const detailByUser = new Map<number, DetailRow>();
  for (const d of input.details) {
    if (d.user_id !== null && !detailByUser.has(d.user_id)) detailByUser.set(d.user_id, d);
  }
  const offeringById = new Map(input.offerings.map((o) => [o.id, (o.title ?? '').trim() || (o.offering_code ?? '').trim()]));
  const nameById = new Map(input.owners.map((o) => [o.id, o.name]));

  return input.users.map((u) => {
    // Same branch as the View: a set application_id never falls back to email.
    const app = u.application_id
      ? appById.get(u.application_id) ?? null
      : u.user_email ? appByEmail.get(emailKey(u.user_email)) ?? null : null;
    const detail = detailByUser.get(u.id) ?? null;
    const appOwner = app?.pipeline_user ? nameById.get(app.pipeline_user) ?? null : null;
    const detailOwner = !appOwner && detail?.pipeline_user ? nameById.get(detail.pipeline_user) ?? null : null;
    return {
      id: String(u.id),
      gender: normalizeStudentGender((u.gender && u.gender.trim()) || app?.gender || detail?.gender),
      city: app?.district ?? detail?.district ?? '',
      offering: app?.offering_id ? offeringById.get(app.offering_id) ?? '' : '',
      owner: appOwner ?? detailOwner ?? '',
      joined: istYmd(u.created_at),
    };
  });
}

const appSelect = { id: true, user_email: true, gender: true, district: true, pipeline_user: true, offering_id: true } as const;

export class StudentDirectoryService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async extras(): Promise<StudentDirectoryExtra[]> {
    const users = await this.prisma.users.findMany({
      where: { deleted_at: null, role_id: 2 },
      select: { id: true, gender: true, created_at: true, application_id: true, user_email: true },
    });
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const appIds = [...new Set(users.map((u) => u.application_id).filter((x): x is number => !!x))];
    const emails = [...new Set(users.filter((u) => !u.application_id && u.user_email).map((u) => u.user_email as string))];
    const [applicationsById, applicationsByEmail, details] = await Promise.all([
      appIds.length > 0
        ? this.prisma.applications.findMany({ where: { id: { in: appIds }, deleted_at: null }, select: appSelect })
        : Promise.resolve([]),
      emails.length > 0
        ? this.prisma.applications.findMany({ where: { user_email: { in: emails }, deleted_at: null }, select: appSelect, orderBy: { created_at: 'desc' } })
        : Promise.resolve([]),
      this.prisma.user_details.findMany({
        where: { user_id: { in: userIds }, deleted_at: null },
        select: { user_id: true, gender: true, district: true, pipeline_user: true },
        orderBy: { id: 'desc' },
      }),
    ]);

    const apps = [...applicationsById, ...applicationsByEmail];
    const offeringIds = [...new Set(apps.map((a) => a.offering_id).filter((x): x is number => !!x && x > 0))];
    const ownerIds = [...new Set([
      ...apps.map((a) => a.pipeline_user),
      ...details.map((d) => d.pipeline_user),
    ].filter((x): x is number => !!x))];
    const [offerings, owners] = await Promise.all([
      offeringIds.length > 0
        ? this.prisma.offerings.findMany({ where: { id: { in: offeringIds } }, select: { id: true, title: true, offering_code: true } })
        : Promise.resolve([]),
      ownerIds.length > 0
        ? this.prisma.users.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);

    return buildStudentDirectoryExtras({ users, applicationsById, applicationsByEmail, details, offerings, owners });
  }
}
