import { asNumber, asRecord, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';
import { dayMonthYear, matchesSearch, nextSort, sortRows, ymdOf, type SortDir } from '../cohorts/list-model.js';
import { STAGE_LABEL, STAGE_TONE } from '../applications/application-list-model.js';

// Centre Dashboard view model (Naji 2026-10-22, CentreDashboardModule). The
// numbers come from GET /admin/centres/dashboard (centre-dashboard-service.ts):
// this file only maps the payload, words the activity feed, and filters /
// sorts the "Top centres" table. Money is "₹" + whole rupees, en-IN, as on the
// prototype's dashboard.

export type DashboardPeriod = 'month' | 'quarter' | 'year';

export const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
];

export const HREF = {
  directory: '/admin/centres/index',
  // The Applications page has no centre filter to deep-link into (yet).
  applications: '/admin/applications/index',
  topUps: '/admin/wallet/index?tab=topups',
  pendingTopUps: '/admin/wallet/index?tab=topups&status=Pending',
  wallets: '/admin/wallet/index?tab=wallets',
  affiliation: '/admin/centres/affiliation',
  centre: (id: number) => `/admin/centres/view/${id}`,
} as const;

export type AffiliationState = 'expired' | 'due_soon' | 'valid' | 'not_set';

export interface DashboardRow {
  id: number;
  code: string;
  name: string;
  state: string;
  status: 'active' | 'inactive';
  enrollments: number;
  applications: number;
  approved: number;
  conversion: number;
  revenue: number;
  wallet: number;
  affiliationExpiry: string;
  daysLeft: number | null;
  affiliation: AffiliationState;
}

export interface DashboardActivity {
  id: string;
  kind: string;
  at: string;
  who: string;
  ref: string;
  amount: number | null;
  note: string;
}

export interface CentreDashboardData {
  period: DashboardPeriod;
  centres: Array<{ id: number; code: string; name: string }>;
  kpis: {
    totalCentres: number; activeCentres: number; inactiveCentres: number; enrollments: number; inProgress: number;
    awaitingApproval: number; collected: number; collectedTopUps: number; collectedAffiliation: number;
    walletTotal: number; pendingTopUps: number;
  };
  pipeline: Array<{ stage: string; count: number }>;
  actions: { awaitingApproval: number; pendingTopUps: number; expiringSoon: number; expired: number };
  trend: Array<{ month: string; label: string; topUps: number; affiliation: number }>;
  rows: DashboardRow[];
  renewals: Array<{ id: number; name: string; expiry: string; daysLeft: number }>;
  lowWallets: Array<{ id: number; name: string; balance: number }>;
  activity: DashboardActivity[];
  affiliationReady: boolean;
  affiliationMessage: string;
}

const AFFILIATION_STATES: AffiliationState[] = ['expired', 'due_soon', 'valid', 'not_set'];

function affiliationOf(value: unknown): AffiliationState {
  const s = asString(value);
  return (AFFILIATION_STATES as string[]).includes(s) ? (s as AffiliationState) : 'not_set';
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined || value === '' ? null : asNumber(value);
}

function toRow(r: Record<string, unknown>): DashboardRow {
  return {
    id: asNumber(r.id),
    code: asString(r.code),
    name: asString(r.name),
    state: asString(r.state),
    status: asString(r.status) === 'inactive' ? 'inactive' : 'active',
    enrollments: asNumber(r.enrollments),
    applications: asNumber(r.applications),
    approved: asNumber(r.approved),
    conversion: asNumber(r.conversion),
    revenue: asNumber(r.revenue),
    wallet: asNumber(r.wallet),
    affiliationExpiry: ymdOf(asString(r.affiliationExpiry)),
    daysLeft: nullableNumber(r.daysLeft),
    affiliation: affiliationOf(r.affiliation),
  };
}

export function toCentreDashboard(raw: Record<string, unknown>): CentreDashboardData {
  const k = asRecord(raw.kpis) ?? {};
  const a = asRecord(raw.actions) ?? {};
  const period = asString(raw.period);
  return {
    period: period === 'month' || period === 'quarter' ? period : 'year',
    centres: toRecords(raw.centres).map((c) => ({ id: asNumber(c.id), code: asString(c.code), name: asString(c.name) })).filter((c) => c.id > 0),
    kpis: {
      totalCentres: asNumber(k.totalCentres), activeCentres: asNumber(k.activeCentres), inactiveCentres: asNumber(k.inactiveCentres),
      enrollments: asNumber(k.enrollments), inProgress: asNumber(k.inProgress), awaitingApproval: asNumber(k.awaitingApproval),
      collected: asNumber(k.collected), collectedTopUps: asNumber(k.collectedTopUps), collectedAffiliation: asNumber(k.collectedAffiliation),
      walletTotal: asNumber(k.walletTotal), pendingTopUps: asNumber(k.pendingTopUps),
    },
    pipeline: toRecords(raw.pipeline).map((p) => ({ stage: asString(p.stage), count: asNumber(p.count) })),
    actions: {
      awaitingApproval: asNumber(a.awaitingApproval), pendingTopUps: asNumber(a.pendingTopUps),
      expiringSoon: asNumber(a.expiringSoon), expired: asNumber(a.expired),
    },
    trend: toRecords(raw.trend).map((t) => ({ month: asString(t.month), label: asString(t.label), topUps: asNumber(t.topUps), affiliation: asNumber(t.affiliation) })),
    rows: toRecords(raw.rows).map(toRow).filter((r) => r.id > 0),
    renewals: toRecords(raw.renewals).map((r) => ({ id: asNumber(r.id), name: asString(r.name), expiry: ymdOf(asString(r.expiry)), daysLeft: asNumber(r.daysLeft) })),
    lowWallets: toRecords(raw.lowWallets).map((r) => ({ id: asNumber(r.id), name: asString(r.name), balance: asNumber(r.balance) })),
    activity: toRecords(raw.activity).map((e) => ({
      id: asString(e.id), kind: asString(e.kind), at: asString(e.at), who: asString(e.who), ref: asString(e.ref),
      amount: nullableNumber(e.amount), note: asString(e.note),
    })),
    affiliationReady: raw.affiliationReady !== false,
    affiliationMessage: asString(raw.affiliationMessage),
  };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/** "₹75,000" — whole rupees, en-IN (the prototype dashboard's inr()). */
export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Axis label: "₹25k". */
export function inrThousands(amount: number): string {
  return `₹${Math.round(amount / 100) / 10}k`;
}

const IST_DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

/** An ISO instant as "22 Oct 2026, 11:30 am" in IST; '' when unreadable. */
export function istDateTime(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : IST_DATE_TIME.format(new Date(t));
}

export function expiryLabel(ymd: string): string {
  return dayMonthYear(ymd) || '—';
}

export const AFFILIATION_LABEL: Record<AffiliationState, string> = {
  expired: 'Expired', due_soon: 'Due Soon', valid: 'Valid', not_set: 'Not set',
};

export const AFFILIATION_TONE: Record<AffiliationState, Tone> = {
  expired: 'rose', due_soon: 'amber', valid: 'emerald', not_set: 'slate',
};

/** "12d overdue" / "40d left". */
export function daysLeftLabel(daysLeft: number): string {
  return daysLeft < 0 ? `${-daysLeft}d overdue` : `${daysLeft}d left`;
}

export function renewalState(daysLeft: number): AffiliationState {
  if (daysLeft < 0) return 'expired';
  return daysLeft <= 60 ? 'due_soon' : 'valid';
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

const TONE_BAR: Record<Tone, string> = {
  primary: 'bg-primary', emerald: 'bg-emerald-500', rose: 'bg-rose-500', amber: 'bg-amber-400', blue: 'bg-sky-500', slate: 'bg-slate-400',
};

export interface PipelineBar { stage: string; label: string; count: number; pct: number; width: number; barClass: string }

/** One bar per stage: "n · pct%" of the period's centre applications; a non-zero bar is never thinner than 4%. */
export function pipelineBars(pipeline: Array<{ stage: string; count: number }>): PipelineBar[] {
  const total = pipeline.reduce((s, p) => s + p.count, 0);
  return pipeline.map((p) => {
    const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
    return {
      stage: p.stage,
      label: STAGE_LABEL[p.stage] ?? p.stage,
      count: p.count,
      pct,
      width: p.count > 0 ? Math.max(4, (p.count / total) * 100) : 0,
      barClass: TONE_BAR[STAGE_TONE[p.stage] ?? 'slate'],
    };
  });
}

// ─── Activity ───────────────────────────────────────────────────────────────

/** What happened, in words ("Top-up of ₹100 requested"). */
export function activityText(e: DashboardActivity): string {
  const amount = e.amount === null ? '' : inr(e.amount);
  const withNote = (text: string) => (e.note ? `${text} · ${e.note}` : text);
  switch (e.kind) {
    case 'topup_requested': return `Top-up of ${amount} requested`;
    case 'topup_approved': return `Top-up approved · ${amount} credited`;
    case 'topup_rejected': return `Top-up of ${amount} rejected`;
    case 'wallet_credit': return withNote(`Wallet credited ${amount}`);
    case 'wallet_debit': return withNote(`Wallet debited ${amount}`);
    case 'application_created': return withNote('Application created');
    case 'application_enrolled': return withNote('Application enrolled');
    case 'onboarding': return e.note || 'Onboarding update';
    default: return e.note;
  }
}

// ─── Top centres table ──────────────────────────────────────────────────────

export type TopSortKey = 'name' | 'state' | 'enrollments' | 'applications' | 'approved' | 'conversion' | 'revenue' | 'wallet' | 'affiliation';

export interface TopCentreFilters { search: string; state: string; status: '' | 'active' | 'inactive' }

export const EMPTY_TOP_FILTERS: TopCentreFilters = { search: '', state: '', status: '' };

export const DEFAULT_TOP_SORT: { key: TopSortKey; dir: SortDir } = { key: 'enrollments', dir: 'desc' };

/** The prototype's header click: a new column sorts ascending, the same column flips. */
export function nextTopSort(current: { key: TopSortKey; dir: SortDir }, key: TopSortKey): { key: TopSortKey; dir: SortDir } {
  return nextSort(current, key);
}

export function filterTopCentres(rows: DashboardRow[], f: TopCentreFilters): DashboardRow[] {
  return rows.filter((r) => {
    if (f.state && r.state !== f.state) return false;
    if (f.status && r.status !== f.status) return false;
    return matchesSearch(f.search, [r.name, r.code, r.state]);
  });
}

export function sortTopCentres(rows: DashboardRow[], key: TopSortKey, dir: SortDir): DashboardRow[] {
  return sortRows(rows, (r) => (key === 'affiliation' ? AFFILIATION_LABEL[r.affiliation] : r[key]), dir);
}

export function stateOptions(rows: DashboardRow[]): string[] {
  return [...new Set(rows.map((r) => r.state).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** The seven centres with the most enrolments, for the bar chart. */
export function enrollmentBars(rows: DashboardRow[]): Array<{ name: string; enrollments: number }> {
  return [...rows]
    .sort((a, b) => b.enrollments - a.enrollments || a.name.localeCompare(b.name))
    .slice(0, 7)
    .map((r) => ({ name: r.name || r.code, enrollments: r.enrollments }));
}
