// Pure helpers for the centre portal shell (Naji 2026-10-22 centre design):
// the /centre/portal/shell payload, money and date text, the phone bar split,
// the support chat thread and the top-bar search. No React here, so the rules
// are unit-tested on their own.

import type { CentreNavItem } from '../routing/centre-nav-tree.js';

// ─── Values ─────────────────────────────────────────────────────────────────

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function str(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function num(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

export { record as asRecord };

/** "₹75,000" / "₹3,201.5" — Indian grouping, paise only when present. */
export function inr(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** "₹2.84 L" / "₹1.2 Cr" for chart axes and tight KPI tiles. */
export function inrShort(value: number): string {
  const n = Math.abs(value);
  if (n >= 1e7) return `₹${(value / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 1e5) return `₹${(value / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  return inr(value);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-22" → "22 Oct 2026" (a calendar day: no timezone maths). '—' when blank. */
export function formatYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return '—';
  return `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/** An instant (ISO / DATETIME text) as an IST "22 Oct 2026, 10:42 am". '' when unreadable. */
export function formatIstDateTime(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(ms));
}

/** Two-letter avatar initials ("JK"); "C" when there is no usable name. */
export function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? '').filter(Boolean).slice(0, 2).join('').toUpperCase() || 'C';
}

// ─── Shell payload ──────────────────────────────────────────────────────────

export type AffiliationState = 'valid' | 'due_soon' | 'expired' | 'not_set';

export interface ShellAffiliation { expiry: string; daysLeft: number | null; state: AffiliationState }

export interface CentreShellData {
  centre: { id: number; code: string; name: string; contactPerson: string; designation: string } | null;
  userName: string;
  /** Centre login only. */
  wallet: { balance: number } | null;
  /** Centre login only. */
  affiliation: ShellAffiliation | null;
}

export const EMPTY_SHELL: CentreShellData = { centre: null, userName: '', wallet: null, affiliation: null };

const AFFILIATION_STATES: readonly AffiliationState[] = ['valid', 'due_soon', 'expired', 'not_set'];

export function toAffiliation(value: unknown): ShellAffiliation | null {
  const a = record(value);
  if (Object.keys(a).length === 0) return null;
  const state = AFFILIATION_STATES.find((s) => s === a.state) ?? 'not_set';
  const days = typeof a.daysLeft === 'number' && Number.isFinite(a.daysLeft) ? a.daysLeft : null;
  return { expiry: str(a.expiry), daysLeft: days, state };
}

export function toShellData(raw: unknown): CentreShellData {
  const d = record(raw);
  const c = record(d.centre);
  const w = record(d.wallet);
  return {
    centre: Object.keys(c).length > 0
      ? { id: num(c.id), code: str(c.code), name: str(c.name), contactPerson: str(c.contactPerson), designation: str(c.designation) }
      : null,
    userName: str(d.userName),
    wallet: Object.keys(w).length > 0 ? { balance: num(w.balance) } : null,
    affiliation: toAffiliation(d.affiliation),
  };
}

/** "Centre Portal · TTC028" (his sidebar subtitle); "Associate Portal" for role 10. */
export function portalSubtitle(roleId: number, shell: CentreShellData): string {
  const label = roleId === 10 ? 'Associate Portal' : 'Centre Portal';
  return shell.centre?.code ? `${label} · ${shell.centre.code}` : label;
}

/** The top-bar greeting: the centre contact person, else the login name. */
export function welcomeName(shell: CentreShellData, profileName: string): string {
  return shell.centre?.contactPerson || shell.userName || profileName || (shell.centre?.name ?? '');
}

/** "Affiliation valid · 160 days left" and friends — never a made-up count. */
export function affiliationLine(a: ShellAffiliation | null): string {
  if (!a || a.state === 'not_set' || a.daysLeft === null) return 'Affiliation expiry not recorded';
  if (a.state === 'expired') {
    const ago = Math.abs(a.daysLeft);
    return `Affiliation expired ${ago} day${ago === 1 ? '' : 's'} ago`;
  }
  if (a.daysLeft === 0) return 'Affiliation expires today';
  const left = `${a.daysLeft} day${a.daysLeft === 1 ? '' : 's'} left`;
  return a.state === 'due_soon' ? `Affiliation renewal due · ${left}` : `Affiliation valid · ${left}`;
}

// ─── Navigation ─────────────────────────────────────────────────────────────

/** True when `pathname` is the nav item's page or one of its sub-pages. */
export function isNavActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '');
  if (href === '/centre/dashboard') return path === href || path === '/centre';
  return path === href || path.startsWith(`${href}/`);
}

/** The phone bar: Home, Applications | Students, Wallet (Naji 2026-10-19), from what this role may open. */
export const PHONE_TAB_IDS = ['dashboard', 'applications', 'students', 'wallet'] as const;
const PHONE_TAB_TITLES: Readonly<Record<string, string>> = { dashboard: 'Home', wallet: 'Wallet' };

export interface PhoneTab extends CentreNavItem { short: string }

/**
 * Four bar tabs (the role's own items, Naji's four first, topped up from the
 * rest when a role cannot open one of them) and the "More" grid (everything
 * else, in menu order).
 */
export function splitPhoneNav(items: readonly CentreNavItem[]): { tabs: PhoneTab[]; more: CentreNavItem[] } {
  const preferred = PHONE_TAB_IDS.map((id) => items.find((i) => i.id === id)).filter((i): i is CentreNavItem => Boolean(i));
  const fill = items.filter((i) => !preferred.includes(i)).slice(0, Math.max(0, 4 - preferred.length));
  const tabIds = new Set([...preferred, ...fill].map((i) => i.id));
  const tabs = items.filter((i) => tabIds.has(i.id)).map((i) => ({ ...i, short: PHONE_TAB_TITLES[i.id] ?? i.label }));
  return { tabs, more: items.filter((i) => !tabIds.has(i.id)) };
}

// ─── Support chat ───────────────────────────────────────────────────────────

export interface ChatMessage { id: string; text: string; at: string; own: boolean }

/**
 * support_chat rows as a thread, oldest first. A message is the centre's own
 * when the centre login sent it; anything else in the thread is TTII support.
 */
export function toChatMessages(raw: unknown, ownUserId: string): ChatMessage[] {
  return rows(raw)
    .map((r, i) => ({
      id: str(r.id) || `m${i}`,
      text: str(r.message),
      at: str(r.created_at),
      own: str(r.sender_id) === String(ownUserId),
    }))
    .filter((m) => m.text !== '')
    .sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0) || Number(a.id) - Number(b.id));
}

export const CHAT_MAX_LENGTH = 2000;

/** Why a draft cannot be sent ('' when it can). */
export function chatDraftProblem(draft: string): string {
  const text = draft.trim();
  if (!text) return 'Type a message first.';
  if (text.length > CHAT_MAX_LENGTH) return `Keep it under ${CHAT_MAX_LENGTH} characters.`;
  return '';
}

// ─── Top-bar search ─────────────────────────────────────────────────────────

export type SearchKind = 'page' | 'application' | 'student';

export interface SearchHit {
  kind: SearchKind;
  key: string;
  title: string;
  subtitle: string;
  /** Page href, or the record id the caller turns into a link. */
  target: string;
  /** Application / student code ('' when none): the text a list page is searched with. */
  code: string;
}

export interface SearchSources {
  pages: readonly CentreNavItem[];
  applications: readonly Record<string, unknown>[];
  students: readonly Record<string, unknown>[];
}

export const SEARCH_LIMIT = 6;

function matchesAll(haystack: string, words: readonly string[]): boolean {
  const text = haystack.toLowerCase();
  return words.every((w) => text.includes(w));
}

/**
 * Pages always; the centre's own applications and students once something is
 * typed (every word must match name, id, email, phone or course). At most six
 * of each.
 */
export function searchHits(query: string, sources: SearchSources): SearchHit[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const pages: SearchHit[] = sources.pages
    .filter((p) => words.length === 0 || matchesAll(p.label, words))
    .map((p) => ({ kind: 'page', key: `page-${p.id}`, title: p.label, subtitle: '', target: p.href, code: '' }));
  if (words.length === 0) return pages;
  const applications: SearchHit[] = sources.applications
    .filter((a) => matchesAll([a.application_id, a.name, a.user_email, a.phone, a.email, a.course_title].map(str).join(' '), words))
    .slice(0, SEARCH_LIMIT)
    .map((a) => ({
      kind: 'application',
      key: `app-${str(a.id)}`,
      title: str(a.name) || 'Applicant',
      subtitle: [str(a.application_id), str(a.course_title)].filter(Boolean).join(' · '),
      target: str(a.id),
      code: str(a.application_id),
    }));
  const students: SearchHit[] = sources.students
    .filter((s) => matchesAll([s.student_id, s.name, s.user_email, s.email, s.phone, s.course_title, s.course_name].map(str).join(' '), words))
    .slice(0, SEARCH_LIMIT)
    .map((s) => ({
      kind: 'student',
      key: `stu-${str(s.id)}`,
      title: str(s.name) || 'Student',
      subtitle: [str(s.student_id), str(s.course_title) || str(s.course_name)].filter(Boolean).join(' · '),
      target: str(s.id),
      code: str(s.student_id),
    }));
  return [...pages.slice(0, SEARCH_LIMIT), ...applications, ...students];
}
