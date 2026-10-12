// Pure helpers for Partner Management — Certification Partners and Certificate
// Combinations (TTII 2026-10-12, Naji's CertificationPartnersModule /
// CertificateCombinationsModule). Rows come from the existing endpoints only.

import { compareValues, matchesSearch, type SortDir } from '../cohorts/list-model.js';

export type StatusTab = 'all' | 'active' | 'inactive';

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n : null;
};
/** Stored status is free text ('active' / 'inactive' / legacy casing). */
export const isActiveStatus = (s: string): boolean => s.trim().toLowerCase() !== 'inactive';
export const statusLabel = (s: string): string => (isActiveStatus(s) ? 'Active' : 'Inactive');

// ─── Certification Partners ─────────────────────────────────────────────────

export interface PartnerRow {
  id: string;
  code: string;
  name: string;
  shortName: string;
  country: string;
  description: string;
  logo: string;
  status: string;
  position: number | null;
  /** Certificate combinations this partner is on (from the combinations list). */
  combinations: number;
}

export function toPartnerRows(raw: Record<string, unknown>[], combos: CombinationRow[]): PartnerRow[] {
  const count = new Map<string, number>();
  for (const c of combos) for (const p of c.partners) count.set(p.id, (count.get(p.id) ?? 0) + 1);
  return raw.map((r) => {
    const id = str(r.id);
    return {
      id,
      code: str(r.partner_code),
      name: str(r.name),
      shortName: str(r.short_name),
      country: str(r.country),
      description: str(r.description),
      logo: str(r.logo),
      status: str(r.status) || 'active',
      position: num(r.position),
      combinations: count.get(id) ?? 0,
    };
  });
}

export interface PartnerFilters { tab: StatusTab; search: string; country: string }

function tabMatches(tab: StatusTab, status: string): boolean {
  if (tab === 'all') return true;
  return tab === 'active' ? isActiveStatus(status) : !isActiveStatus(status);
}

export function filterPartners(rows: PartnerRow[], f: PartnerFilters): PartnerRow[] {
  return rows.filter((r) =>
    tabMatches(f.tab, r.status)
    && (!f.country || r.country === f.country)
    && matchesSearch(f.search, [r.code, r.name, r.shortName, r.country, r.description]));
}

export function statusCounts<T extends { status: string }>(rows: T[]): Record<StatusTab, number> {
  const active = rows.filter((r) => isActiveStatus(r.status)).length;
  return { all: rows.length, active, inactive: rows.length - active };
}

export type PartnerSortKey = 'position' | 'code' | 'name' | 'country' | 'description' | 'combinations' | 'status';

function partnerSortValue(r: PartnerRow, k: PartnerSortKey): string | number {
  switch (k) {
    case 'position': return r.position ?? Number.MAX_SAFE_INTEGER;
    case 'combinations': return r.combinations;
    case 'status': return statusLabel(r.status);
    default: return r[k];
  }
}

export function sortPartners(rows: PartnerRow[], k: PartnerSortKey, dir: SortDir): PartnerRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareValues(partnerSortValue(a, k), partnerSortValue(b, k)));
}

export function partnerCsvRows(rows: PartnerRow[]): Array<Array<string | number>> {
  return [
    ['Display Order', 'Code', 'Name', 'Short Name', 'Country', 'Description', 'Combinations', 'Status'],
    ...rows.map((r) => [r.position ?? '', r.code, r.name, r.shortName, r.country, r.description, r.combinations, statusLabel(r.status)]),
  ];
}

export interface PartnerForm {
  partner_code: string;
  name: string;
  short_name: string;
  country: string;
  description: string;
  logo: string;
  status: string;
  position: string;
}

export const EMPTY_PARTNER_FORM: PartnerForm = {
  partner_code: '', name: '', short_name: '', country: '', description: '', logo: '', status: 'active', position: '',
};

export function partnerFormFrom(r: PartnerRow): PartnerForm {
  return {
    partner_code: r.code,
    name: r.name,
    short_name: r.shortName,
    country: r.country,
    description: r.description,
    logo: r.logo,
    status: r.status || 'active',
    position: r.position === null ? '' : String(r.position),
  };
}

export type PartnerErrors = Partial<Record<'partner_code' | 'name' | 'position', string>>;

/** Required fields (as before) plus Naji's duplicate / display-order checks against the loaded list. */
export function validatePartner(form: PartnerForm, others: PartnerRow[]): PartnerErrors {
  const e: PartnerErrors = {};
  const code = form.partner_code.trim();
  const name = form.name.trim();
  if (!code) e.partner_code = 'Partner Code is required';
  else if (others.some((p) => p.code.trim().toLowerCase() === code.toLowerCase())) e.partner_code = 'This code is already used by another partner';
  if (!name) e.name = 'Partner Name is required';
  else if (others.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) e.name = 'A partner with this name already exists';
  if (form.position.trim() !== '') {
    const n = Number(form.position);
    if (!Number.isFinite(n) || n < 0) e.position = 'Display order must be 0 or more';
  }
  return e;
}

/** The exact body the old form posted (position only when filled in). */
export function buildPartnerPayload(form: PartnerForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    partner_code: form.partner_code.trim(),
    name: form.name.trim(),
    short_name: form.short_name.trim(),
    country: form.country.trim(),
    description: form.description.trim(),
    logo: form.logo.trim(),
    status: form.status,
  };
  if (form.position.trim() !== '') {
    const n = Number(form.position);
    if (Number.isFinite(n)) payload.position = n;
  }
  return payload;
}

// ─── Certificate Combinations ───────────────────────────────────────────────

export interface ComboPartner { id: string; code: string; name: string }

export interface CombinationRow {
  id: string;
  code: string;
  programId: string;
  program: string;
  courseId: string;
  course: string;
  partners: ComboPartner[];
  gst: boolean;
  gstPercent: number | null;
  status: string;
}

export function toCombinationRows(raw: Record<string, unknown>[]): CombinationRow[] {
  return raw.map((r) => ({
    id: str(r.id),
    code: str(r.combination_code),
    programId: str(r.program_id),
    program: str(r.program_title),
    courseId: str(r.course_id),
    course: str(r.course_title),
    partners: Array.isArray(r.partners)
      ? (r.partners as unknown[]).filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
        .map((p) => ({ id: str(p.id), code: str(p.partner_code), name: str(p.name) }))
      : [],
    gst: r.gst_applicable !== false && r.gst_applicable !== 0,
    gstPercent: num(r.gst_percent),
    status: str(r.status) || 'active',
  }));
}

/** "Yes (18%)" / "No" — 18 is the old screen's fallback when no percent is stored. */
export function gstLabel(r: CombinationRow): string {
  return r.gst ? `Yes (${r.gstPercent ?? 18}%)` : 'No';
}

export interface CombinationFilters {
  tab: StatusTab;
  search: string;
  programId: string;
  courseId: string;
  partnerId: string;
  gst: '' | 'yes' | 'no';
}

export function filterCombinations(rows: CombinationRow[], f: CombinationFilters): CombinationRow[] {
  return rows.filter((r) =>
    tabMatches(f.tab, r.status)
    && (!f.programId || r.programId === f.programId)
    && (!f.courseId || r.courseId === f.courseId)
    && (!f.partnerId || r.partners.some((p) => p.id === f.partnerId))
    && (!f.gst || (f.gst === 'yes') === r.gst)
    && matchesSearch(f.search, [r.code, r.program, r.course, ...r.partners.map((p) => `${p.code} ${p.name}`)]));
}

export type CombinationSortKey = 'code' | 'program' | 'course' | 'partners' | 'gst' | 'status';

function comboSortValue(r: CombinationRow, k: CombinationSortKey): string | number {
  switch (k) {
    case 'partners': return r.partners.map((p) => p.code || p.name).join(', ');
    case 'gst': return r.gst ? r.gstPercent ?? 18 : -1;
    case 'status': return statusLabel(r.status);
    default: return r[k];
  }
}

export function sortCombinations(rows: CombinationRow[], k: CombinationSortKey, dir: SortDir): CombinationRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareValues(comboSortValue(a, k), comboSortValue(b, k)));
}

export function combinationCsvRows(rows: CombinationRow[]): Array<Array<string | number>> {
  return [
    ['Code', 'Program', 'Course', 'Partners', 'GST', 'Status'],
    ...rows.map((r) => [r.code, r.program, r.course, r.partners.map((p) => p.code || p.name).join(' + '), gstLabel(r), statusLabel(r.status)]),
  ];
}

/** Collapse whitespace around `+` to " + " (Naji UAT 2026-05-14; the server does the same). */
export function normalizeCombinationCode(value: string): string {
  return value.trim().replace(/\s*\+\s*/g, ' + ');
}

/** "TTII + MSU" from the picked partners, in the partners' display order. */
export function buildCodeFromPartners(partners: Array<{ id: string; code: string; shortName?: string }>, selectedIds: string[]): string {
  const order = new Map(partners.map((p, i) => [p.id, i]));
  return [...selectedIds]
    .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
    .map((id) => {
      const p = partners.find((x) => x.id === id);
      return p ? p.code.trim() || (p.shortName ?? '').trim() : '';
    })
    .filter(Boolean)
    .join(' + ');
}

/** True when another combination already pairs this course with exactly these partners. */
export function isDuplicateCombination(rows: CombinationRow[], selfId: string, courseId: string, partnerIds: string[]): boolean {
  if (!courseId || partnerIds.length === 0) return false;
  const key = [...partnerIds].sort().join('|');
  return rows.some((r) => r.id !== selfId && r.courseId === courseId && r.partners.map((p) => p.id).sort().join('|') === key);
}
