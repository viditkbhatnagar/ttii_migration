import { asString } from '../../shared/utils/admin-data-utils.js';
import { dmy, hhmmOf, istInstantMs, matchesSearch, sortRows, ymdOf, type SortDir } from '../cohorts/list-model.js';

// Live Sessions list view model (TTII 2026-10-12, Naji's LiveSessionsModule).
// Rows are GET /admin/live_class/index (operations-service listLiveClasses).
//
// Upcoming vs Past is decided by when the class ENDS, in IST: the old page
// compared the date alone against a UTC "today", so a class later today was
// already "Past" (and after 18:30 IST "today" was tomorrow's date).

export type LiveTab = 'all' | 'upcoming' | 'past';
export type LiveSortKey = 'sessionId' | 'title' | 'cohort' | 'course' | 'date' | 'from' | 'to' | 'platform';

export interface LiveRow {
  id: string;
  sessionId: string;
  title: string;
  cohortId: string;
  cohort: string;
  course: string;
  /** YYYY-MM-DD (IST calendar date). */
  ymd: string;
  /** HH:MM, IST wall clock. */
  from: string;
  to: string;
  platform: string;
  joinUrl: string;
  zoomId: string;
  upcoming: boolean;
}

export interface LiveFilters {
  tab: LiveTab;
  search: string;
  cohortId: string;
  course: string;
  platform: string;
  /** YYYY-MM-DD. */
  date: string;
}

export const EMPTY_LIVE_FILTERS: LiveFilters = { tab: 'all', search: '', cohortId: '', course: '', platform: '', date: '' };

const PLATFORM_LABEL: Record<string, string> = { teams: 'Microsoft Teams', zoom: 'Zoom', manual: 'Manual Link', other: 'Other' };

export function platformLabel(platform: string, zoomId: string): string {
  const p = platform || (zoomId ? 'zoom' : '');
  return p ? PLATFORM_LABEL[p] ?? p : '-';
}

export function toLiveRow(r: Record<string, unknown>, nowMs: number): LiveRow {
  const ymd = ymdOf(r.date);
  const from = hhmmOf(asString(r.fromTime) || asString(r.from_time));
  const to = hhmmOf(asString(r.toTime) || asString(r.to_time));
  const zoomId = asString(r.zoom_id);
  const end = istInstantMs(ymd, to || from);
  return {
    id: asString(r.id),
    sessionId: asString(r.session_id),
    title: asString(r.title),
    cohortId: asString(r.cohort_id),
    cohort: asString(r.cohort_title),
    course: asString(r.course_title),
    ymd,
    from,
    to,
    platform: platformLabel(asString(r.platform).toLowerCase(), zoomId),
    joinUrl: asString(r.join_url),
    zoomId,
    upcoming: end !== null && end > nowMs,
  };
}

export function toLiveRows(data: unknown, nowMs: number = Date.now()): LiveRow[] {
  return Array.isArray(data)
    ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').map((r) => toLiveRow(r, nowMs))
    : [];
}

export function filterLiveIgnoringTab(rows: LiveRow[], f: LiveFilters): LiveRow[] {
  return rows.filter((s) => {
    if (f.cohortId && s.cohortId !== f.cohortId) return false;
    if (f.course && s.course !== f.course) return false;
    if (f.platform && s.platform !== f.platform) return false;
    if (f.date && s.ymd !== f.date) return false;
    return matchesSearch(f.search, [s.sessionId, s.title, s.cohort, s.course]);
  });
}

export function filterLive(rows: LiveRow[], f: LiveFilters): LiveRow[] {
  const base = filterLiveIgnoringTab(rows, f);
  if (f.tab === 'upcoming') return base.filter((s) => s.upcoming);
  if (f.tab === 'past') return base.filter((s) => !s.upcoming);
  return base;
}

export function liveTabCounts(rows: LiveRow[]): Record<LiveTab, number> {
  const upcoming = rows.filter((s) => s.upcoming).length;
  return { all: rows.length, upcoming, past: rows.length - upcoming };
}

export function sortLive(rows: LiveRow[], key: LiveSortKey, dir: SortDir): LiveRow[] {
  const pick = (s: LiveRow): string => {
    switch (key) {
      case 'date': return `${s.ymd} ${s.from}`;
      case 'cohort': return s.cohort;
      case 'course': return s.course;
      default: return s[key];
    }
  };
  return sortRows(rows, pick, dir);
}

/** A join link the browser can open (http/https only). */
export function joinHref(s: LiveRow): string {
  return /^https?:\/\//i.test(s.joinUrl) ? s.joinUrl : '';
}

export function liveCsvRows(rows: LiveRow[]): Array<Array<string | number>> {
  return [
    ['ID', 'Title', 'Cohort', 'Course', 'Date', 'From', 'To', 'Platform', 'Status', 'Meeting link'],
    ...rows.map((s) => [s.sessionId, s.title, s.cohort, s.course, dmy(s.ymd), s.from, s.to, s.platform, s.upcoming ? 'Upcoming' : 'Past', s.joinUrl]),
  ];
}
