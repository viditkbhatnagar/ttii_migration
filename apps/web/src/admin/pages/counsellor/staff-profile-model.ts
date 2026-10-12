import { asNumber, asRecord, asString, toRecords } from '../../shared/utils/admin-data-utils.js';

// Counsellor / Associate profile in Naji's design (TTII 2026-10-12). Pure
// normalisation of GET /admin/{counsellor|associates}/profile_stats
// (apps/api/src/operations/staff-profile-service.ts) plus display helpers.

export interface ProfileApplication {
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
  created: string;
  converted: string;
}

export interface ProfileTrendPoint { month: string; label: string; applications: number; enrollments: number }
export interface ProfileActivity { id: string; type: string; title: string; student: string; at: string }
export interface ProfileCourseMix { course: string; applications: number; enrolled: number }

export interface ProfileStats {
  kpis: { applications: number; pending: number; enrolled: number; rejected: number; dropouts: number };
  trend: ProfileTrendPoint[];
  courseMix: ProfileCourseMix[];
  /** The latest applications only (the server caps the list; kpis are totals). */
  applications: ProfileApplication[];
  activity: ProfileActivity[];
}

export const EMPTY_PROFILE_STATS: ProfileStats = {
  kpis: { applications: 0, pending: 0, enrolled: 0, rejected: 0, dropouts: 0 },
  trend: [],
  courseMix: [],
  applications: [],
  activity: [],
};

export function toProfileStats(raw: unknown): ProfileStats {
  const r = asRecord(raw) ?? {};
  const k = asRecord(r.kpis) ?? {};
  return {
    kpis: {
      applications: asNumber(k.applications),
      pending: asNumber(k.pending),
      enrolled: asNumber(k.enrolled),
      rejected: asNumber(k.rejected),
      dropouts: asNumber(k.dropouts),
    },
    trend: toRecords(r.trend).map((t) => ({
      month: asString(t.month),
      label: asString(t.label),
      applications: asNumber(t.applications),
      enrollments: asNumber(t.enrollments),
    })),
    courseMix: toRecords(r.courseMix).map((c) => ({
      course: asString(c.course),
      applications: asNumber(c.applications),
      enrolled: asNumber(c.enrolled),
    })),
    applications: toRecords(r.applications).map((a) => ({
      id: asString(a.id),
      applicationId: asString(a.applicationId),
      name: asString(a.name),
      phone: asString(a.phone),
      email: asString(a.email),
      course: asString(a.course),
      stage: asString(a.stage) || 'lead',
      enrolled: a.enrolled === true,
      enrollmentStatus: asString(a.enrollmentStatus),
      paymentStatus: asString(a.paymentStatus),
      created: asString(a.created),
      converted: asString(a.converted),
    })),
    activity: toRecords(r.activity).map((e) => ({
      id: asString(e.id),
      type: asString(e.type),
      title: asString(e.title),
      student: asString(e.student),
      at: asString(e.at),
    })),
  };
}

const IST_DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

/** An ISO instant as "dd/mm/yyyy, h:mm am" in IST; '' when unreadable. */
export function formatIstDateTime(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : IST_DATE_TIME.format(new Date(t));
}

/** "Payment Pending" style label from a snake/space status. */
export function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export type ProfileAppFilter = 'all' | 'pending' | 'enrolled' | 'rejected';

export function filterProfileApplications(apps: ProfileApplication[], filter: ProfileAppFilter, search: string): ProfileApplication[] {
  const q = search.trim().toLowerCase();
  return apps.filter((a) => {
    if (filter === 'enrolled' && !a.enrolled) return false;
    if (filter === 'rejected' && (a.enrolled || a.stage !== 'rejected')) return false;
    if (filter === 'pending' && (a.enrolled || a.stage === 'rejected')) return false;
    if (!q) return true;
    return [a.applicationId, a.name, a.phone, a.email, a.course].some((v) => v.toLowerCase().includes(q));
  });
}
