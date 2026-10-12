import type { BarSeriesOption, EChartsOption } from 'echarts';
import { asArray, asBoolean, asNumber, asRecord, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';
import { formatYmd } from '../counsellor/staff-model.js';
import { formatIstDateTime } from '../counsellor/staff-profile-model.js';

// Admin → Associate Management in Naji's design (TTII 2026-10-12): the pure
// view logic for Dashboard, Associate Students, Commissions (basis only),
// Onboarding and Communications. The pages parse the API payloads with these
// and render; nothing here talks to the network.
//
// Scope (server side, apps/api/src/operations/associate-admin-model.ts): an
// associate's leads are the live applications whose pipeline_user is that
// associate; an enrolment is is_converted = 1 — the Associates directory rule.

const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dash = (v: string): string => v || '—';

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardTrendPoint { month: string; label: string; leads: number; enrolments: number }
export interface DashboardPerformer { id: string; name: string; photo: string; applications: number; enrolled: number; conversion: number }
export interface AssociateDashboardData {
  kpis: { total: number; active: number; leadsThisMonth: number; enrolments: number; enrolmentsThisMonth: number };
  trend: DashboardTrendPoint[];
  top: DashboardPerformer[];
}

export function toDashboard(raw: Record<string, unknown>): AssociateDashboardData {
  const k = asRecord(raw.kpis) ?? {};
  return {
    kpis: {
      total: asNumber(k.total),
      active: asNumber(k.active),
      leadsThisMonth: asNumber(k.leadsThisMonth),
      enrolments: asNumber(k.enrolments),
      enrolmentsThisMonth: asNumber(k.enrolmentsThisMonth),
    },
    trend: toRecords(raw.trend).map((t) => ({
      month: asString(t.month), label: asString(t.label), leads: asNumber(t.leads), enrolments: asNumber(t.enrolments),
    })),
    top: toRecords(raw.top).map((p) => ({
      id: asString(p.id), name: asString(p.name), photo: asString(p.photo),
      applications: asNumber(p.applications), enrolled: asNumber(p.enrolled), conversion: asNumber(p.conversion),
    })),
  };
}

/**
 * ECharts option for "Leads vs Enrolments": grouped bars, Leads in the muted
 * token and Enrolments in the brand `primary` token. `colors` are the theme
 * tokens resolved to rgb (a canvas cannot read CSS variables); a missing one
 * falls back to ECharts' default rather than a hard-coded colour.
 */
export function trendChartOption(
  trend: DashboardTrendPoint[],
  colors: Partial<Record<'primary' | 'muted-foreground' | 'border' | 'card' | 'foreground', string>>,
): EChartsOption {
  const muted = colors['muted-foreground'];
  const border = colors.border;
  const bar = (name: string, data: number[], color: string | undefined): BarSeriesOption => ({
    type: 'bar',
    name,
    data,
    barMaxWidth: 28,
    ...(color ? { itemStyle: { color, borderRadius: [4, 4, 0, 0] } } : { itemStyle: { borderRadius: [4, 4, 0, 0] } }),
  });
  return {
    grid: { left: 36, right: 12, top: 32, bottom: 28 },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, ...(muted ? { textStyle: { color: muted, fontSize: 12 } } : {}) },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...(colors.card ? { backgroundColor: colors.card } : {}),
      ...(border ? { borderColor: border } : {}),
      ...(colors.foreground ? { textStyle: { color: colors.foreground, fontSize: 12 } } : {}),
    },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.label),
      axisTick: { show: false },
      ...(border ? { axisLine: { lineStyle: { color: border } } } : {}),
      axisLabel: { fontSize: 12, ...(muted ? { color: muted } : {}) },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 12, ...(muted ? { color: muted } : {}) },
      splitLine: { lineStyle: { type: 'dashed', ...(border ? { color: border } : {}) } },
    },
    series: [
      bar('Leads', trend.map((t) => t.leads), muted),
      bar('Enrolments', trend.map((t) => t.enrolments), colors.primary),
    ],
  };
}

// ─── Associate Students / Commissions basis ─────────────────────────────────

export type StudentTab = 'all' | 'lead' | 'applied' | 'enrolled' | 'rejected';
export const STUDENT_TABS: Array<{ id: StudentTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'lead', label: 'Lead' },
  { id: 'applied', label: 'Applied' },
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'rejected', label: 'Rejected' },
];
export type StudentSortKey = 'lead' | 'name' | 'enrolled';

export interface StudentQuery {
  tab: StudentTab;
  search: string;
  associateId: string;
  courseId: string;
  /** YYYY-MM (IST), '' for any: the lead's month, or with monthBy 'enrolled' the enrolment's. */
  month: string;
  monthBy: 'lead' | 'enrolled';
  sort: StudentSortKey;
  dir: 'asc' | 'desc';
  page: number;
}

export const EMPTY_STUDENT_QUERY: StudentQuery = {
  tab: 'all', search: '', associateId: '', courseId: '', month: '', monthBy: 'lead', sort: 'lead', dir: 'desc', page: 1,
};

export interface AssociateStudentRow {
  id: string;
  applicationId: string;
  name: string;
  phone: string;
  email: string;
  associateId: string;
  associateName: string;
  course: string;
  stage: string;
  enrolled: boolean;
  enrollmentStatus: string;
  leadDate: string;
  enrolledDate: string;
  fee: number | null;
  paymentStatus: string;
  studentUserId: string;
}

export interface AssociateStudentPage {
  rows: AssociateStudentRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<StudentTab, number>;
  associates: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; title: string }>;
}

export function toStudentPage(raw: Record<string, unknown>): AssociateStudentPage {
  const c = asRecord(raw.counts) ?? {};
  const options = asRecord(raw.options) ?? {};
  return {
    rows: toRecords(raw.rows).map((r) => ({
      id: asString(r.id),
      applicationId: asString(r.applicationId),
      name: asString(r.name),
      phone: asString(r.phone),
      email: asString(r.email),
      associateId: asString(r.associateId),
      associateName: asString(r.associateName),
      course: asString(r.course),
      stage: asString(r.stage),
      enrolled: asBoolean(r.enrolled),
      enrollmentStatus: asString(r.enrollmentStatus),
      leadDate: asString(r.leadDate),
      enrolledDate: asString(r.enrolledDate),
      fee: r.fee == null || r.fee === '' ? null : asNumber(r.fee),
      paymentStatus: asString(r.paymentStatus),
      studentUserId: asString(r.studentUserId),
    })),
    total: asNumber(raw.total),
    page: Math.max(1, asNumber(raw.page)),
    pageSize: Math.max(1, asNumber(raw.pageSize)),
    counts: {
      all: asNumber(c.all), lead: asNumber(c.lead), applied: asNumber(c.applied), enrolled: asNumber(c.enrolled), rejected: asNumber(c.rejected),
    },
    associates: toRecords(options.associates).map((a) => ({ id: asString(a.id), name: asString(a.name) })),
    courses: toRecords(options.courses).map((x) => ({ id: asString(x.id), title: asString(x.title) })),
  };
}

/** Query parameters for /admin/associates/students_list. */
export function studentQueryParams(q: StudentQuery, extra: { all?: boolean } = {}): Record<string, string> {
  return {
    tab: q.tab,
    sort: q.sort,
    dir: q.dir,
    page: String(q.page),
    ...(q.search.trim() ? { q: q.search.trim() } : {}),
    ...(q.associateId ? { associate_id: q.associateId } : {}),
    ...(q.courseId ? { course_id: q.courseId } : {}),
    ...(q.month ? { month: q.month, month_by: q.monthBy } : {}),
    ...(extra.all ? { all: '1' } : {}),
  };
}

/**
 * The application's own payment record (applications.payment_status). It
 * reflects the registration / link payment taken at application stage, not
 * instalments recorded after enrolment, so blanks render as '—' rather than
 * "Not paid".
 */
export function feeStatus(paymentStatus: string): { label: string; tone: Tone } | null {
  switch (paymentStatus.trim().toLowerCase()) {
    case 'paid': return { label: 'Paid', tone: 'emerald' };
    case 'pending_approval': return { label: 'Awaiting approval', tone: 'amber' };
    case 'sent': return { label: 'Link sent', tone: 'blue' };
    case '': return null;
    default: return { label: paymentStatus.replace(/_/g, ' '), tone: 'slate' };
  }
}

export function formatInr(amount: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** The last `count` IST months (newest first) as filter options. */
export function monthOptions(now: Date, count = 12): Array<{ value: string; label: string }> {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const out: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    out.push({ value, label: `${MONTHS[d.getUTCMonth()] ?? ''} ${d.getUTCFullYear()}` });
  }
  return out;
}

/** Where a row links: the student page once converted and linked, else the application. */
export function rowHref(r: AssociateStudentRow): string {
  return r.enrolled && r.studentUserId ? `/admin/students/view/${r.studentUserId}` : `/admin/applications/view/${r.id}`;
}

export function studentCsvRows(rows: AssociateStudentRow[], stageLabel: (s: string) => string): string[][] {
  return [
    ['Application ID', 'Student', 'Phone', 'Email', 'Associate', 'Course', 'Stage', 'Lead Date', 'Enrolled On', 'Fee (INR)', 'Fee Status'],
    ...rows.map((r) => [
      r.applicationId, r.name, r.phone, r.email, r.associateName, r.course,
      r.enrolled ? 'Enrolled' : stageLabel(r.stage),
      formatYmd(r.leadDate), formatYmd(r.enrolledDate),
      r.fee == null ? '' : String(r.fee),
      feeStatus(r.paymentStatus)?.label ?? '',
    ]),
  ];
}

/** Commissions basis: confirmed enrolments only, without any amounts. */
export function commissionBasisCsvRows(rows: AssociateStudentRow[]): string[][] {
  return [
    ['Application ID', 'Associate', 'Student', 'Course', 'Enrolled On', 'Enrolment Status'],
    ...rows.map((r) => [r.applicationId, r.associateName, r.name, r.course, formatYmd(r.enrolledDate), r.enrollmentStatus]),
  ];
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

export type OnboardingTab = 'all' | 'never' | 'signed' | 'disabled';
export const ONBOARDING_TABS: Array<{ id: OnboardingTab; label: string }> = [
  { id: 'never', label: 'Never signed in' },
  { id: 'signed', label: 'Signed in' },
  { id: 'disabled', label: 'Login disabled' },
  { id: 'all', label: 'All' },
];

export interface OnboardingRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  centre: string;
  createdAt: string;
  isActive: boolean;
  loginDisabled: boolean;
  firstSignIn: string;
  lastSignIn: string;
}

export function toOnboardingRows(raw: unknown): OnboardingRow[] {
  return toRecords(raw).map((r) => ({
    id: asString(r.id),
    name: asString(r.name),
    email: asString(r.email),
    phone: asString(r.phone),
    centre: asString(r.centre),
    createdAt: asString(r.createdAt),
    isActive: asBoolean(r.isActive),
    loginDisabled: asBoolean(r.loginDisabled),
    firstSignIn: asString(r.firstSignIn),
    lastSignIn: asString(r.lastSignIn),
  }));
}

export function onboardingTabOf(r: OnboardingRow): Exclude<OnboardingTab, 'all'> {
  if (r.loginDisabled) return 'disabled';
  return r.firstSignIn ? 'signed' : 'never';
}

export interface OnboardingFilters { tab: OnboardingTab; search: string; centre: string }
export const EMPTY_ONBOARDING_FILTERS: OnboardingFilters = { tab: 'all', search: '', centre: '' };

export function filterOnboarding(rows: OnboardingRow[], f: OnboardingFilters): OnboardingRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) =>
    (f.tab === 'all' || onboardingTabOf(r) === f.tab)
    && (!f.centre || r.centre === f.centre)
    && (!q || `${r.name} ${r.id} ${r.email} ${r.phone}`.toLowerCase().includes(q)));
}

export function onboardingCounts(rows: OnboardingRow[]): Record<OnboardingTab, number> {
  const out: Record<OnboardingTab, number> = { all: rows.length, never: 0, signed: 0, disabled: 0 };
  for (const r of rows) out[onboardingTabOf(r)] += 1;
  return out;
}

export function onboardingCsvRows(rows: OnboardingRow[]): string[][] {
  return [
    ['ID', 'Associate', 'Email', 'Phone', 'Centre', 'Account Created', 'Status', 'Login', 'First Sign-in (IST)', 'Last Sign-in (IST)'],
    ...rows.map((r) => [
      r.id, r.name, r.email, r.phone, r.centre, formatYmd(r.createdAt), r.isActive ? 'Active' : 'Inactive',
      r.loginDisabled ? 'Disabled' : 'Enabled', formatIstDateTime(r.firstSignIn), formatIstDateTime(r.lastSignIn),
    ]),
  ];
}

// ─── Communications ─────────────────────────────────────────────────────────

export const COMM_CHANNELS = ['Call', 'WhatsApp', 'Email', 'Note'] as const;
export const COMM_DIRECTIONS = ['Outgoing', 'Incoming'] as const;
export type CommChannelTab = 'all' | (typeof COMM_CHANNELS)[number];
export const COMM_SUBJECT_MAX = 255;
export const COMM_MESSAGE_MAX = 5000;

export interface CommRow {
  id: string;
  associateId: string;
  associateName: string;
  channel: string;
  direction: string;
  subject: string;
  message: string;
  createdByName: string;
  createdAt: string;
}

export interface CommList {
  rows: CommRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<CommChannelTab, number>;
  staff: Array<{ id: string; name: string }>;
  tableMissing: boolean;
}

export function toCommList(raw: Record<string, unknown>): CommList {
  const c = asRecord(raw.counts) ?? {};
  return {
    total: asNumber(raw.total),
    page: Math.max(1, asNumber(raw.page)),
    pageSize: Math.max(1, asNumber(raw.pageSize)),
    counts: { all: asNumber(c.all), Call: asNumber(c.Call), WhatsApp: asNumber(c.WhatsApp), Email: asNumber(c.Email), Note: asNumber(c.Note) },
    staff: toRecords(raw.staff).map((s) => ({ id: asString(s.id), name: asString(s.name) })),
    rows: asArray(raw.rows).map((x) => asRecord(x) ?? {}).map((r) => ({
      id: asString(r.id),
      associateId: asString(r.associateId),
      associateName: asString(r.associateName),
      channel: asString(r.channel),
      direction: asString(r.direction),
      subject: asString(r.subject),
      message: asString(r.message),
      createdByName: asString(r.createdByName),
      createdAt: asString(r.createdAt),
    })),
    tableMissing: asBoolean(raw.tableMissing),
  };
}

/** List filters; paging, search and filtering all run on the server. */
export interface CommFilters { channel: CommChannelTab; search: string; associate: string; direction: string; staffId: string; month: string; page: number }
export const EMPTY_COMM_FILTERS: CommFilters = { channel: 'all', search: '', associate: '', direction: '', staffId: '', month: '', page: 1 };

/** Query parameters for /admin/associates/communications/list. */
export function commQueryParams(f: CommFilters, extra: { all?: boolean } = {}): Record<string, string> {
  return {
    page: String(f.page),
    ...(f.channel !== 'all' ? { channel: f.channel } : {}),
    ...(f.search.trim() ? { q: f.search.trim() } : {}),
    ...(f.associate ? { associate_id: f.associate } : {}),
    ...(f.direction ? { direction: f.direction } : {}),
    ...(f.staffId ? { created_by: f.staffId } : {}),
    ...(f.month ? { month: f.month } : {}),
    ...(extra.all ? { all: '1' } : {}),
  };
}

export function commCsvRows(rows: CommRow[]): string[][] {
  return [
    ['Logged At (IST)', 'Associate', 'Channel', 'Direction', 'Subject', 'Summary', 'Logged By'],
    ...rows.map((r) => [formatIstDateTime(r.createdAt), r.associateName, r.channel, r.direction, r.subject, r.message, r.createdByName]),
  ];
}

export interface CommDraft { associateId: string; channel: string; direction: string; subject: string; message: string }
export const EMPTY_COMM_DRAFT: CommDraft = { associateId: '', channel: 'Call', direction: 'Outgoing', subject: '', message: '' };

/** Client-side check before posting (the server validates again). */
export function validateCommDraft(d: CommDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.associateId) e.associateId = 'Select an associate';
  if (!(COMM_CHANNELS as readonly string[]).includes(d.channel)) e.channel = 'Select a channel';
  if (!(COMM_DIRECTIONS as readonly string[]).includes(d.direction)) e.direction = 'Select a direction';
  if (!d.subject.trim()) e.subject = 'Subject is required';
  else if (d.subject.trim().length > COMM_SUBJECT_MAX) e.subject = `At most ${COMM_SUBJECT_MAX} characters`;
  if (!d.message.trim()) e.message = 'Summary is required';
  else if (d.message.trim().length > COMM_MESSAGE_MAX) e.message = `At most ${COMM_MESSAGE_MAX} characters`;
  return e;
}

/** Distinct, sorted non-empty values. */
export function uniqSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
