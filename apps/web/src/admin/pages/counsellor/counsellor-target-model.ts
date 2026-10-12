import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';

// Admin → Counsellor Target in Naji's design (TTII 2026-10-12, TargetsModule).
// Pure logic. The create / edit payload and period semantics are UNCHANGED from
// the old page: a target is assigned to one calendar month, stored as
// from_date = YYYY-MM-01 and to_date = the month's last day; the server
// computes "achieved" live (operations-service computeCounsellorTargetAchieved).
//
// The prototype's Active / Inactive status has no column here, so a target's
// state is read from its window against today (IST): Active = covers today,
// Upcoming = starts later, Ended = finished.

export const TARGET_TYPES = ['Applications', 'Points', 'Enrolments', 'Revenue'] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const MONTHS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

export type TargetPhase = 'Active' | 'Upcoming' | 'Ended';
export type TargetTab = 'all' | TargetPhase | 'none';
export type TargetSortKey = 'month' | 'type' | 'counsellor' | 'value' | 'achieved' | 'progress' | 'phase';

export interface TargetRow {
  id: string;
  userId: string;
  counsellor: string;
  counsellorEmail: string;
  type: string;
  value: number;
  achieved: number;
  /** Achievement % (uncapped; bars cap at 100). */
  pct: number;
  from: string;
  to: string;
  /** YYYY-MM of from_date, '' when the period is unreadable. */
  monthKey: string;
  remarks: string;
  phase: TargetPhase | null;
  raw: Record<string, unknown>;
}

export interface TargetFilters {
  tab: TargetTab;
  search: string;
  counsellor: string;
  month: string;
  type: string;
}

export const EMPTY_TARGET_FILTERS: TargetFilters = { tab: 'all', search: '', counsellor: '', month: '', type: '' };

/** The year choices of the old form: last year to three years ahead. */
export function yearOptions(now: Date = new Date(), keep = ''): string[] {
  const y = now.getFullYear();
  const years = [y - 1, y, y + 1, y + 2, y + 3].map(String);
  return keep && !years.includes(keep) ? [keep, ...years].sort() : years;
}

/** First / last calendar day of a "YYYY" + "MM" — the stored target window. */
export function monthRange(year: string, month: string): { from: string; to: string } {
  if (!year || !month) return { from: '', to: '' };
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
}

export function parsePeriod(period: unknown): { from: string; to: string } {
  const parts = asString(period).split(' to ');
  return { from: parts[0]?.trim() ?? '', to: parts[1]?.trim() ?? '' };
}

/** "October 2026" from YYYY-MM, '' when unreadable. */
export function monthLabel(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return '';
  const name = MONTHS.find((x) => x.value === m[2])?.label;
  return name ? `${name} ${m[1]}` : '';
}

export function targetPhase(from: string, to: string, today: string): TargetPhase | null {
  if (!from || !to) return null;
  if (today < from) return 'Upcoming';
  if (today > to) return 'Ended';
  return 'Active';
}

export const PHASE_TONE: Record<TargetPhase, Tone> = { Active: 'emerald', Upcoming: 'blue', Ended: 'slate' };
export const TYPE_TONE: Record<string, Tone> = { Applications: 'blue', Enrolments: 'primary', Points: 'amber', Revenue: 'emerald' };

export function progressTone(pct: number): Tone {
  if (pct >= 80) return 'emerald';
  if (pct >= 50) return 'amber';
  return 'rose';
}

export function toTargetRows(records: Record<string, unknown>[], today: string): TargetRow[] {
  return records.map((r) => {
    const { from, to } = parsePeriod(r.period);
    const value = asNumber(r.target_value);
    const achieved = asNumber(r.achieved_value);
    const m = /^(\d{4})-(\d{2})/.exec(from);
    return {
      id: asString(r.id) || asString(r._id),
      userId: asString(r.user_id),
      counsellor: asString(r.counsellor_name),
      counsellorEmail: asString(r.counsellor_email),
      type: asString(r.target_type),
      value,
      achieved,
      pct: value > 0 ? Math.round((achieved / value) * 100) : 0,
      from,
      to,
      monthKey: m ? `${m[1]}-${m[2]}` : '',
      remarks: asString(r.remarks),
      phase: targetPhase(from, to, today),
      raw: r,
    };
  });
}

export function filterTargets(rows: TargetRow[], f: TargetFilters): TargetRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.tab !== 'all' && f.tab !== 'none' && r.phase !== f.tab) return false;
    if (f.counsellor && r.userId !== f.counsellor) return false;
    if (f.month && r.monthKey !== f.month) return false;
    if (f.type && r.type !== f.type) return false;
    if (!q) return true;
    return [r.counsellor, r.counsellorEmail, r.type, r.remarks, r.id].some((v) => v.toLowerCase().includes(q));
  });
}

export function targetCounts(rows: TargetRow[]): Record<'all' | TargetPhase, number> {
  return {
    all: rows.length,
    Active: rows.filter((r) => r.phase === 'Active').length,
    Upcoming: rows.filter((r) => r.phase === 'Upcoming').length,
    Ended: rows.filter((r) => r.phase === 'Ended').length,
  };
}

/** Distinct months present, newest first, for the Month filter. */
export function targetMonths(rows: TargetRow[]): Array<{ value: string; label: string }> {
  return [...new Set(rows.map((r) => r.monthKey).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a))
    .map((k) => ({ value: k, label: monthLabel(k) }));
}

export function sortTargets(rows: TargetRow[], key: TargetSortKey, dir: 'asc' | 'desc'): TargetRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const value = (r: TargetRow): string | number => {
    switch (key) {
      case 'month': return r.from;
      case 'type': return r.type.toLowerCase();
      case 'counsellor': return r.counsellor.toLowerCase();
      case 'value': return r.value;
      case 'achieved': return r.achieved;
      case 'progress': return r.pct;
      default: return r.phase ?? '';
    }
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return c * sign;
  });
}

/** The counsellor's target covering today (newest first as the server sorts). */
export function activeTargetFor(rows: TargetRow[], userId: string): TargetRow | null {
  return rows.find((r) => r.userId === userId && r.phase === 'Active') ?? null;
}

/** Counsellors with no target covering today. */
export function withoutActiveTarget<T extends { id: string }>(counsellors: T[], rows: TargetRow[]): T[] {
  const covered = new Set(rows.filter((r) => r.phase === 'Active').map((r) => r.userId));
  return counsellors.filter((c) => !covered.has(c.id));
}

export function targetCsvRows(rows: TargetRow[]): Array<Array<string | number>> {
  return [
    ['Target ID', 'Counsellor', 'Email', 'Type', 'Month', 'From', 'To', 'Target', 'Achieved', 'Progress %', 'State', 'Remarks'],
    ...rows.map((r) => [
      r.id, r.counsellor, r.counsellorEmail, r.type, monthLabel(r.monthKey), r.from, r.to, r.value, r.achieved, r.pct,
      r.phase ?? '', r.remarks,
    ]),
  ];
}

export interface TargetFormValues {
  userId: string;
  type: string;
  value: string;
  month: string;
  year: string;
  remarks: string;
}

export const EMPTY_TARGET_FORM: TargetFormValues = { userId: '', type: TARGET_TYPES[0], value: '', month: '', year: '', remarks: '' };

/** Prefill the form from a row exactly as the old Edit did. */
export function formFromRow(row: TargetRow): TargetFormValues {
  const m = /^(\d{4})-(\d{2})/.exec(row.from);
  return {
    userId: row.userId,
    type: row.type || TARGET_TYPES[0],
    value: String(row.value),
    month: m?.[2] ?? '',
    year: m?.[1] ?? '',
    remarks: row.remarks,
  };
}

/** The unchanged add / edit payload, or null while a required field is empty. */
export function targetPayload(v: TargetFormValues): {
  user_id: string; target_type: string; target_value: number; period_from: string; period_to: string; remarks: string | undefined;
} | null {
  if (!v.userId || !v.type || !v.value || !v.month || !v.year) return null;
  const { from, to } = monthRange(v.year, v.month);
  return {
    user_id: v.userId,
    target_type: v.type,
    target_value: Number(v.value),
    period_from: from,
    period_to: to,
    remarks: v.remarks || undefined,
  };
}
