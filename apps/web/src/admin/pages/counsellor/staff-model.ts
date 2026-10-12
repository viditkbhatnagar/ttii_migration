import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';

// Admin → Counsellors Directory and Associates Directory in Naji's design
// (TTII 2026-10-12, CounsellorsModule / AssociatesModule). Pure list logic for
// both, since both are `users` rows from the same-shaped endpoints
// (/admin/counsellor/index = role 9, /admin/associates/index = role 10).
//
// Status semantics are unchanged from the old pages:
//   - Active / Inactive is users.status (1 / anything else), edited in the form;
//   - "Login disabled" is the universal disabled_at kill-switch (Enable/Disable).
// Applications / Converted are the server's lifetime counts of applications
// where pipeline_user is the person.

export type StaffTab = 'all' | 'Active' | 'Inactive' | 'Disabled';
export type StaffSortKey =
  | 'name' | 'phone' | 'centre' | 'joined' | 'applications' | 'converted' | 'conversion' | 'status' | 'target';

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  centre: string;
  isActive: boolean;
  statusLabel: 'Active' | 'Inactive';
  loginDisabled: boolean;
  /** YYYY-MM-DD: date of joining when set, else the IST day the account was created. */
  joined: string;
  applications: number;
  converted: number;
  /** Whole-number conversion percentage (converted / applications). */
  conversion: number;
  gender: string;
  dob: string;
  languages: string;
  qualification: string;
  raw: Record<string, unknown>;
}

export interface StaffFilters {
  tab: StaffTab;
  search: string;
  centre: string;
  /** Joined on/after (YYYY-MM-DD), '' for any. */
  from: string;
  /** Joined on/before (YYYY-MM-DD), '' for any. */
  to: string;
}

export const EMPTY_STAFF_FILTERS: StaffFilters = { tab: 'all', search: '', centre: '', from: '', to: '' };

const IST_OFFSET_MS = 330 * 60 * 1000;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** A @db.Date value (serialised as YYYY-MM-DD or UTC midnight) as YYYY-MM-DD. */
export function dateOnlyYmd(value: unknown): string {
  const m = YMD_RE.exec(asString(value));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** A stored instant (ISO) as the IST calendar day it fell on. */
export function istYmd(value: unknown): string {
  const s = asString(value);
  if (!s) return '';
  const t = Date.parse(s);
  if (Number.isNaN(t)) return '';
  return new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** dd/mm/yyyy from YYYY-MM-DD (string split, never a local Date). */
export function formatYmd(ymd: string): string {
  const m = YMD_RE.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Today as an IST calendar day. */
export function todayIstYmd(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function initialsOf(name: string): string {
  const letters = name.trim().split(/\s+/).filter(Boolean).map((p) => p[0] ?? '');
  if (letters.length === 0) return '?';
  if (letters.length === 1) return (letters[0] ?? '').toUpperCase();
  return `${letters[0] ?? ''}${letters[letters.length - 1] ?? ''}`.toUpperCase();
}

export function conversionPct(converted: number, applications: number): number {
  return applications > 0 ? Math.round((converted / applications) * 100) : 0;
}

export function toStaffRows(records: Record<string, unknown>[]): StaffRow[] {
  return records.map((r) => {
    const applications = asNumber(r.applications_referred);
    const converted = asNumber(r.applications_converted);
    const isActive = asNumber(r.status) === 1;
    return {
      id: asString(r.id) || asString(r._id),
      name: asString(r.name),
      email: asString(r.user_email),
      phone: asString(r.phone),
      photo: asString(r.image) || asString(r.profile_picture),
      centre: asString(r.centre_name),
      isActive,
      statusLabel: isActive ? 'Active' : 'Inactive',
      loginDisabled: Boolean(r.disabled_at),
      joined: dateOnlyYmd(r.doj) || istYmd(r.created_at),
      applications,
      converted,
      conversion: conversionPct(converted, applications),
      gender: asString(r.gender),
      dob: dateOnlyYmd(r.dob),
      languages: asString(r.languages_spoken),
      qualification: asString(r.highest_qualification),
      raw: r,
    };
  });
}

function matchesTab(r: StaffRow, tab: StaffTab): boolean {
  if (tab === 'Active') return r.isActive;
  if (tab === 'Inactive') return !r.isActive;
  if (tab === 'Disabled') return r.loginDisabled;
  return true;
}

export function filterStaff(rows: StaffRow[], f: StaffFilters): StaffRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (!matchesTab(r, f.tab)) return false;
    if (f.centre && r.centre !== f.centre) return false;
    if (f.from && (!r.joined || r.joined < f.from)) return false;
    if (f.to && (!r.joined || r.joined > f.to)) return false;
    if (!q) return true;
    return [r.name, r.email, r.phone, r.id].some((v) => v.toLowerCase().includes(q));
  });
}

export function staffCounts(rows: StaffRow[]): Record<StaffTab, number> {
  return {
    all: rows.length,
    Active: rows.filter((r) => r.isActive).length,
    Inactive: rows.filter((r) => !r.isActive).length,
    Disabled: rows.filter((r) => r.loginDisabled).length,
  };
}

export function distinctCentres(rows: StaffRow[]): string[] {
  return [...new Set(rows.map((r) => r.centre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/**
 * Sort a copy. Text compares case-insensitively; blanks always sink to the
 * bottom. `targetPct` supplies the per-row active-target % for the 'target' key.
 */
export function sortStaff(
  rows: StaffRow[],
  key: StaffSortKey,
  dir: 'asc' | 'desc',
  targetPct: (r: StaffRow) => number | null = () => null,
): StaffRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const value = (r: StaffRow): string | number | null => {
    switch (key) {
      case 'applications': return r.applications;
      case 'converted': return r.converted;
      case 'conversion': return r.conversion;
      case 'target': return targetPct(r);
      case 'status': return r.statusLabel;
      case 'joined': return r.joined || null;
      default: return r[key] ? r[key].toLowerCase() : null;
    }
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return c * sign;
  });
}

export function statusTone(r: StaffRow): Tone {
  return r.isActive ? 'emerald' : 'rose';
}

export function staffCsvRows(rows: StaffRow[], extra?: { header: string; value: (r: StaffRow) => string }): Array<Array<string | number>> {
  const header = ['ID', 'Name', 'Email', 'Phone', 'Centre', 'Joined', 'Applications', 'Converted', 'Conversion %', 'Status', 'Login'];
  if (extra) header.push(extra.header);
  return [
    header,
    ...rows.map((r) => {
      const line: Array<string | number> = [
        r.id, r.name, r.email, r.phone, r.centre, formatYmd(r.joined), r.applications, r.converted, r.conversion,
        r.statusLabel, r.loginDisabled ? 'Disabled' : 'Enabled',
      ];
      if (extra) line.push(extra.value(r));
      return line;
    }),
  ];
}
