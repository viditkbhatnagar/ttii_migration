import { istDaysAgo, istToday } from '../../shared/utils/ist-date.js';

// Administration → Audit Logs in Naji's design (AuditLogsModule), on real data
// only: sign-in events (auth_audit_log) and application / payment actions
// (application_events). The server filters and pages
// (GET /admin/audit_logs/list); this file shapes the query and the response.

export type AuditSource = 'all' | 'auth' | 'application' | 'payment';
export type AuditOutcome = 'all' | 'success' | 'failure';

export const AUDIT_PAGE_SIZE = 25;
/** Server cap per request; Export walks the filtered set in pages this size. */
export const AUDIT_EXPORT_PAGE = 100;
/** Export stops here so one click cannot fire hundreds of requests. */
export const AUDIT_EXPORT_CAP = 5000;
export const DEFAULT_RANGE_DAYS = 30;

export const AUDIT_TABS: ReadonlyArray<{ value: AuditSource; label: string }> = [
  { value: 'all', label: 'All Activities' },
  { value: 'auth', label: 'Sign-in & Security' },
  { value: 'application', label: 'Application Activities' },
  { value: 'payment', label: 'Payment Activities' },
];

export const RECORDED_NOTE =
  'Only sign-in events (logins, failed logins, OTP, Google / Microsoft sign-in, role switches, password resets, access denials) and application actions (lead, form, approval, payment and stage changes) are recorded today. Edits elsewhere in the LMS are not logged yet.';

export interface AuditFilters {
  from: string;
  to: string;
  source: AuditSource;
  event: string;
  outcome: AuditOutcome;
  search: string;
  userId: string;
  /** Display only, for the "user" chip. */
  userName: string;
}

export function defaultAuditFilters(now: Date = new Date()): AuditFilters {
  return {
    from: istDaysAgo(now, DEFAULT_RANGE_DAYS - 1),
    to: istToday(now),
    source: 'all',
    event: '',
    outcome: 'all',
    search: '',
    userId: '',
    userName: '',
  };
}

/**
 * The query string for one page; empty filters are left out so the server
 * applies its defaults. `rowsOnly` (Export) skips the KPI counts and event list.
 */
export function auditQuery(f: AuditFilters, page: number, pageSize: number = AUDIT_PAGE_SIZE, rowsOnly = false): Record<string, string> {
  const q: Record<string, string> = { take: String(pageSize), skip: String(Math.max(0, page - 1) * pageSize) };
  if (rowsOnly) q.meta = '0';
  if (f.from) q.from = f.from;
  if (f.to) q.to = f.to;
  if (f.source !== 'all') q.source = f.source;
  if (f.event) q.event = f.event;
  if (f.outcome !== 'all') q.outcome = f.outcome;
  if (f.search.trim()) q.q = f.search.trim();
  if (f.userId) q.user = f.userId;
  return q;
}

export interface AuditDetail {
  label: string;
  value: string;
}

export interface AuditRow {
  key: string;
  source: 'auth' | 'application';
  at: string;
  event: string;
  action: string;
  category: string;
  success: boolean;
  userId: string;
  userName: string;
  userRole: string;
  userEmail: string;
  identifier: string;
  ipAddress: string;
  userAgent: string;
  description: string;
  details: AuditDetail[];
  applicationId: string;
  applicationCode: string;
  applicantName: string;
}

export interface AuditEventOption {
  value: string;
  label: string;
  source: 'auth' | 'application';
  count: number;
}

export interface AuditPage {
  rows: AuditRow[];
  total: number;
  range: { from: string; to: string };
  /** null when the page was fetched rows-only (Export). */
  kpis: { signInsToday: number; failedSignIns24h: number; applicationActions7d: number; paymentActions7d: number } | null;
  eventTypes: AuditEventOption[];
  user: { id: string; name: string } | null;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.map(rec) : []);

function toRow(r: Record<string, unknown>): AuditRow {
  return {
    key: str(r.key),
    source: r.source === 'application' ? 'application' : 'auth',
    at: str(r.at),
    event: str(r.event),
    action: str(r.action) || str(r.event),
    category: str(r.category),
    success: r.success === true,
    userId: str(r.userId),
    userName: str(r.userName),
    userRole: str(r.userRole),
    userEmail: str(r.userEmail),
    identifier: str(r.identifier),
    ipAddress: str(r.ipAddress),
    userAgent: str(r.userAgent),
    description: str(r.description),
    details: list(r.details).map((d) => ({ label: str(d.label), value: str(d.value) })).filter((d) => d.label && d.value),
    applicationId: str(r.applicationId),
    applicationCode: str(r.applicationCode),
    applicantName: str(r.applicantName),
  };
}

/** The list endpoint's data → a typed page; anything missing becomes empty, never undefined. */
export function toAuditPage(raw: Record<string, unknown> | null): AuditPage {
  const data = rec(raw);
  const kpis = data.kpis && typeof data.kpis === 'object' ? rec(data.kpis) : null;
  const range = rec(data.range);
  const user = rec(data.user);
  return {
    rows: list(data.rows).map(toRow).filter((r) => r.key),
    total: num(data.total),
    range: { from: str(range.from), to: str(range.to) },
    kpis: kpis
      ? {
          signInsToday: num(kpis.signInsToday),
          failedSignIns24h: num(kpis.failedSignIns24h),
          applicationActions7d: num(kpis.applicationActions7d),
          paymentActions7d: num(kpis.paymentActions7d),
        }
      : null,
    eventTypes: list(data.eventTypes)
      .map((e) => ({ value: str(e.value), label: str(e.label) || str(e.value), source: e.source === 'application' ? 'application' as const : 'auth' as const, count: num(e.count) }))
      .filter((e) => e.value),
    user: str(user.id) ? { id: str(user.id), name: str(user.name) } : null,
  };
}

/** Event filter options that can match under the chosen tab. */
export function eventOptionsFor(source: AuditSource, options: readonly AuditEventOption[]): AuditEventOption[] {
  if (source === 'auth') return options.filter((o) => o.source === 'auth');
  if (source === 'payment') return options.filter((o) => o.source === 'application' && /^(payment_|instalment_)/.test(o.value));
  if (source === 'application') return options.filter((o) => o.source === 'application');
  return [...options];
}

/** "Chrome 124" / "Windows" from a user agent; empty parts when it cannot tell. */
export function parseUserAgent(ua: string): { browser: string; device: string } {
  const s = ua || '';
  const version = (re: RegExp) => re.exec(s)?.[1]?.split('.')[0] ?? '';
  let browser = '';
  if (/Edg\//.test(s)) browser = `Edge ${version(/Edg\/([\d.]+)/)}`;
  else if (/OPR\//.test(s)) browser = `Opera ${version(/OPR\/([\d.]+)/)}`;
  else if (/Firefox\//.test(s)) browser = `Firefox ${version(/Firefox\/([\d.]+)/)}`;
  else if (/Chrome\//.test(s)) browser = `Chrome ${version(/Chrome\/([\d.]+)/)}`;
  else if (/Safari\//.test(s) && /Version\//.test(s)) browser = `Safari ${version(/Version\/([\d.]+)/)}`;
  else if (/^Dart\//.test(s)) browser = 'Mobile app';
  else if (/okhttp|CFNetwork/i.test(s)) browser = 'Mobile app';
  let device = '';
  if (/iPhone|iPad|iOS/.test(s)) device = 'iOS';
  else if (/Android/.test(s)) device = 'Android';
  else if (/Windows/.test(s)) device = 'Windows';
  else if (/Mac OS X|Macintosh/.test(s)) device = 'macOS';
  else if (/Linux/.test(s)) device = 'Linux';
  return { browser: browser.trim(), device };
}

export function auditStatus(row: Pick<AuditRow, 'success'>): 'Success' | 'Failed' {
  return row.success ? 'Success' : 'Failed';
}

/** Who did it, for a row with no signed-in actor (the applicant, Razorpay, an unknown sign-in name). */
export function actorLabel(row: Pick<AuditRow, 'userName' | 'source' | 'identifier'>): string {
  if (row.userName) return row.userName;
  if (row.source === 'auth') return row.identifier ? 'Unknown account' : 'Anonymous';
  return 'Applicant / system';
}

/** The record an application event is about: "TTII260031 · Anu". */
export function recordLabel(row: Pick<AuditRow, 'applicationId' | 'applicationCode' | 'applicantName'>): string {
  if (!row.applicationId) return '';
  const code = row.applicationCode || `Application #${row.applicationId}`;
  return row.applicantName ? `${code} · ${row.applicantName}` : code;
}

export const AUDIT_CSV_HEADER = [
  'Date & Time (IST)', 'Source', 'Category', 'Action', 'Event Code', 'Status', 'User', 'Role', 'Email', 'Sign-in Name',
  'Record', 'Description', 'Details', 'IP Address', 'Browser', 'Device', 'User Agent',
];

export function auditCsvRows(rows: readonly AuditRow[], fmt: (iso: string) => string): Array<Array<string | number>> {
  return [
    AUDIT_CSV_HEADER,
    ...rows.map((r) => {
      const ua = parseUserAgent(r.userAgent);
      return [
        fmt(r.at),
        r.source === 'auth' ? 'Sign-in' : 'Application',
        r.category,
        r.action,
        r.event,
        auditStatus(r),
        actorLabel(r),
        r.userRole,
        r.userEmail,
        r.identifier,
        recordLabel(r),
        r.description,
        r.details.map((d) => `${d.label}: ${d.value}`).join('; '),
        r.ipAddress,
        ua.browser,
        ua.device,
        r.userAgent,
      ];
    }),
  ];
}

/** "Download Report": counts of the filtered activity by category, status and action. */
export function auditSummaryCsv(rows: readonly AuditRow[]): Array<Array<string | number>> {
  const by = (pick: (r: AuditRow) => string): Array<[string, number]> => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = pick(r) || 'Unknown';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  return [
    ['Section', 'Item', 'Count'],
    ...by((r) => r.category).map(([k, v]) => ['Category', k, v]),
    ...by(auditStatus).map(([k, v]) => ['Status', k, v]),
    ...by((r) => r.action).map(([k, v]) => ['Action', k, v]),
  ];
}
