import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { InstructorService } from '../instructor/instructor-service.js';

// Admin → Instructors / Users in Naji's design (TTII 2026-10-12). Read-only
// side-cars for data the existing list endpoints do not return. Nothing here
// writes; every create / edit / disable stays on the existing endpoints.
//   - roleSummary:   live user counts per built-in role (Roles & Permissions).
//   - lastSignIns:   newest auth_session per Super Admin / Admin (Admin Users).
//   - instructorOverview: one instructor's profile plus the cohorts, live
//     sessions and assignments the faculty portal shows them — computed by the
//     SAME InstructorService methods (cohorts.instructor_id), so the admin view
//     and the instructor's own view can never disagree.

/** The built-in roles the admin manages, in display order. 4 (Team Lead) is unused. */
export const SUMMARY_ROLE_IDS = [1, 8, 3, 9, 7, 10, 2] as const;
const ADMIN_ROLE_IDS = [1, 8];
const INSTRUCTOR_ROLE_ID = 3;

export interface RoleCount {
  roleId: number;
  total: number;
  disabled: number;
}

export interface InstructorProfileRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  qualification: string;
  biography: string;
  image: string;
  status: number;
  disabled: boolean;
  createdAt: string | null;
}

export interface InstructorOverview {
  profile: InstructorProfileRow;
  cohorts: Awaited<ReturnType<InstructorService['listCohorts']>>;
  liveClasses: Array<{
    id: number;
    title: string;
    date: string | null;
    fromTime: string | null;
    toTime: string | null;
    status: string;
    cohortId: number | null;
    cohortTitle: string | null;
    hasRecording: boolean;
  }>;
  assignments: Awaited<ReturnType<InstructorService['listAssignments']>>;
}

/** Merges the two groupBy results into one row per summary role (zeros included). */
export function buildRoleCounts(
  totals: Array<{ role_id: number | null; _count: { id: number } }>,
  disabled: Array<{ role_id: number | null; _count: { id: number } }>,
): RoleCount[] {
  const totalBy = new Map(totals.map((r) => [r.role_id, r._count.id]));
  const disabledBy = new Map(disabled.map((r) => [r.role_id, r._count.id]));
  return SUMMARY_ROLE_IDS.map((roleId) => ({
    roleId,
    total: totalBy.get(roleId) ?? 0,
    disabled: disabledBy.get(roleId) ?? 0,
  }));
}

const text = (v: string | null | undefined): string => (v ?? '').trim();

/** users.email holds phone numbers on legacy rows, so it only counts when it looks like an email. */
export function displayEmail(userEmail: string | null | undefined, email: string | null | undefined): string {
  const primary = text(userEmail);
  if (primary) return primary;
  const fallback = text(email);
  return fallback.includes('@') ? fallback : '';
}

/** "+91 98…" when the code is stored separately and the number lacks it. */
export function joinPhone(code: string | null | undefined, phone: string | null | undefined): string {
  const number = text(phone);
  if (!number) return '';
  if (number.startsWith('+')) return number;
  const cc = text(code).replace(/^\+/, '');
  return cc ? `+${cc} ${number}` : number;
}

export class PeopleAdminService {
  private readonly instructors: InstructorService;

  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {
    this.instructors = new InstructorService(prisma);
  }

  async roleSummary(): Promise<RoleCount[]> {
    const where = { deleted_at: null, role_id: { in: [...SUMMARY_ROLE_IDS] } };
    const [totals, disabled] = await Promise.all([
      this.prisma.users.groupBy({ by: ['role_id'], where, _count: { id: true } }),
      this.prisma.users.groupBy({ by: ['role_id'], where: { ...where, disabled_at: { not: null } }, _count: { id: true } }),
    ]);
    return buildRoleCounts(totals, disabled);
  }

  /** userId → ISO instant of their newest session (password, OTP, SSO or role switch). */
  async lastSignIns(): Promise<Record<string, string>> {
    const admins = await this.prisma.users.findMany({
      where: { deleted_at: null, role_id: { in: ADMIN_ROLE_IDS } },
      select: { id: true },
    });
    if (admins.length === 0) return {};
    const rows = await this.prisma.auth_session.groupBy({
      by: ['user_id'],
      where: { user_id: { in: admins.map((a) => a.id) } },
      _max: { created_at: true },
    });
    const out: Record<string, string> = {};
    for (const r of rows) {
      const at = r._max.created_at;
      if (at instanceof Date && !Number.isNaN(at.getTime())) out[String(r.user_id)] = at.toISOString();
    }
    return out;
  }

  async instructorOverview(id: number): Promise<InstructorOverview | null> {
    if (!Number.isInteger(id) || id <= 0) return null;
    const user = await this.prisma.users.findFirst({
      where: { id, role_id: INSTRUCTOR_ROLE_ID, deleted_at: null },
      select: {
        id: true, name: true, user_email: true, email: true, phone: true, country_code: true,
        whatsapp_phone: true, whatsapp_code: true, highest_qualification: true, qualification: true,
        biography: true, image: true, profile_picture: true, status: true, disabled_at: true, created_at: true,
      },
    });
    if (!user) return null;

    const [cohorts, liveClasses, assignments] = await Promise.all([
      this.instructors.listCohorts(id),
      this.instructors.listLiveClasses(id, 'all'),
      this.instructors.listAssignments(id),
    ]);

    return {
      profile: {
        id: user.id,
        name: text(user.name),
        email: displayEmail(user.user_email, user.email),
        phone: joinPhone(user.country_code, user.phone),
        whatsapp: joinPhone(user.whatsapp_code, user.whatsapp_phone),
        qualification: text(user.highest_qualification) || text(user.qualification),
        biography: text(user.biography),
        image: text(user.image) || text(user.profile_picture),
        status: user.status ?? 0,
        disabled: user.disabled_at !== null,
        createdAt: user.created_at ? user.created_at.toISOString() : null,
      },
      cohorts,
      // Join / recording URLs are not needed by the admin overview, so they are dropped.
      liveClasses: liveClasses.map((c) => ({
        id: c.id,
        title: c.title,
        date: c.date,
        fromTime: c.fromTime,
        toTime: c.toTime,
        status: c.status,
        cohortId: c.cohortId,
        cohortTitle: c.cohortTitle,
        hasRecording: c.hasRecording,
      })),
      assignments,
    };
  }
}
