import { istMonthKeys } from './staff-profile-service.js';

// Admin → Associate Management in Naji's design (TTII 2026-10-12): the pure
// rules behind the Dashboard, Associate Students, Onboarding and Commissions
// pages. associate-admin-service.ts does the Prisma reads and feeds these.
//
// SCOPE — the same as the admin Associates directory (listAssociates) and the
// associate profile (staff-profile-service): an associate's leads are the live
// applications whose pipeline_user is that associate (role 10). An enrolment
// is is_converted = 1, the directory's applications_converted rule.
//
// Note: the associate's OWN portal (getAssociateDashboard) scopes by
// created_by / added_under_centre instead. addLead stamps both created_by and
// pipeline_user with the associate, so they agree unless an admin has
// reassigned the lead's owner, in which case the admin view follows the owner.

export const ASSOCIATE_ROLE_ID = 10;
const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DASHBOARD_TREND_MONTHS = 6;
export const TOP_PERFORMER_LIMIT = 6;

/** The list tabs of Associate Students (Naji: All / Lead / Applied / Enrolled / Dropped). */
export type AssociateStudentTab = 'all' | 'lead' | 'applied' | 'enrolled' | 'rejected';
export const ASSOCIATE_STUDENT_TABS: readonly AssociateStudentTab[] = ['all', 'lead', 'applied', 'enrolled', 'rejected'];

/** A stored instant as the IST calendar day it fell on (YYYY-MM-DD), '' when absent. */
export function istYmd(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** An instant as ISO text, '' when absent. */
export function isoOrEmpty(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : '';
}

/** "2026-10" → the instants IST midnight on the 1st of that month and of the next. */
export function istMonthWindow(month: string): { gte: Date; lt: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const index = Number(m[2]) - 1;
  if (index < 0 || index > 11) return null;
  return {
    gte: new Date(Date.UTC(year, index, 1) - IST_OFFSET_MS),
    lt: new Date(Date.UTC(year, index + 1, 1) - IST_OFFSET_MS),
  };
}

/** Which Associate Students tab an application falls in. */
export function classifyApplication(stage: string | null, isConverted: number | null): Exclude<AssociateStudentTab, 'all'> {
  if (isConverted === 1) return 'enrolled';
  const s = (stage ?? '').trim();
  if (s === '' || s === 'lead') return 'lead';
  if (s === 'rejected') return 'rejected';
  return 'applied';
}

export function tabCounts(groups: Array<{ stage: string | null; is_converted: number | null; count: number }>): Record<AssociateStudentTab, number> {
  const out: Record<AssociateStudentTab, number> = { all: 0, lead: 0, applied: 0, enrolled: 0, rejected: 0 };
  for (const g of groups) {
    out.all += g.count;
    out[classifyApplication(g.stage, g.is_converted)] += g.count;
  }
  return out;
}

export function conversionPct(enrolled: number, applications: number): number {
  return applications > 0 ? Math.round((enrolled / applications) * 100) : 0;
}

export interface TrendPoint { month: string; label: string; leads: number; enrolments: number }

/**
 * Leads by the IST month they were created; enrolments by the IST month of
 * conversion (created_at when converted_at is unset) — the associate profile's
 * trend rule, so the dashboard and the profile agree.
 */
export function buildTrend(
  rows: Array<{ is_converted: number | null; created_at: Date | null; converted_at: Date | null }>,
  now: Date,
  months: number = DASHBOARD_TREND_MONTHS,
): TrendPoint[] {
  const keys = istMonthKeys(now, months);
  const trend: TrendPoint[] = keys.map((month) => ({
    month,
    label: `${MONTH_LABELS[Number(month.slice(5, 7)) - 1] ?? ''} ${month.slice(2, 4)}`,
    leads: 0,
    enrolments: 0,
  }));
  const index = new Map(keys.map((k, i) => [k, i]));
  for (const r of rows) {
    const created = index.get(istYmd(r.created_at).slice(0, 7));
    if (created !== undefined && trend[created]) trend[created].leads += 1;
    if (r.is_converted !== 1) continue;
    const enrolledOn = index.get(istYmd(r.converted_at ?? r.created_at).slice(0, 7));
    if (enrolledOn !== undefined && trend[enrolledOn]) trend[enrolledOn].enrolments += 1;
  }
  return trend;
}

export interface TopPerformer { id: number; name: string; photo: string; applications: number; enrolled: number; conversion: number }

/** Associates with at least one lead, most enrolments first (then conversion, then name). */
export function buildTopPerformers(
  people: Array<{ id: number; name: string; photo: string }>,
  applications: Map<number, number>,
  enrolled: Map<number, number>,
  limit: number = TOP_PERFORMER_LIMIT,
): TopPerformer[] {
  return people
    .map((p) => {
      const apps = applications.get(p.id) ?? 0;
      const conv = enrolled.get(p.id) ?? 0;
      return { ...p, applications: apps, enrolled: conv, conversion: conversionPct(conv, apps) };
    })
    .filter((p) => p.applications > 0)
    .sort((a, b) => b.enrolled - a.enrolled || b.conversion - a.conversion || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Count map from a Prisma groupBy on pipeline_user. */
export function countByOwner(groups: Array<{ pipeline_user: number | null; _count?: { id?: number } | null }>): Map<number, number> {
  const out = new Map<number, number>();
  for (const g of groups) {
    if (g.pipeline_user == null) continue;
    out.set(g.pipeline_user, g._count?.id ?? 0);
  }
  return out;
}

/** users.email holds phone numbers on legacy rows, so it only counts when it looks like an email. */
export function displayEmail(userEmail: string | null | undefined, email: string | null | undefined): string {
  const primary = (userEmail ?? '').trim();
  if (primary) return primary;
  const fallback = (email ?? '').trim();
  return fallback.includes('@') ? fallback : '';
}

/** Parses a positive integer id from query/body input; 0 when absent or invalid. */
export function toPositiveInt(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value.trim()) : Number.NaN;
  return Number.isInteger(n) && n > 0 ? n : 0;
}
