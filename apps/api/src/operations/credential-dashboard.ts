import {
  AWAITING_PRINT_STATUSES, DELIVERED_STATUSES, FINISHED_STATUSES, IN_TRANSIT_STATUSES, ITEM_STATUS_LABEL, daysLate, isGoodTrend,
  isOverdue, isReadyLate, istMonthKey, istMonthOf, lastMonthKeys, monthOfDateOnly, trendPercent,
} from './credential-delivery-model.js';
import type { DocFact, InsightsData, ItemFact } from './credential-insights-data.js';

// Credential Manager — Dashboard figures (spec §1.1). Pure: everything is
// derived from the InsightsData snapshot, so it is unit-testable.

const TOP_COURSES = 6;
const NEEDS_ATTENTION = 5;
const RECENT_ACTIVITY = 10;
const OVERDUE_PANEL = 5;
const ALERT_PANEL = 5;
const ACTIVITY_ACTIONS = ['Issue', 'Duplicate', 'Correction', 'Revoke', 'Restore'];
const RETURNED_STATUSES = ['returned', 'address_issue', 'lost'];

export interface KpiTable { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, string | number>> }
export interface Kpi {
  key: 'ready' | 'issued' | 'awaiting' | 'dispatched' | 'alerts';
  title: string;
  /** null when the figure is unavailable (eligibility module not connected). */
  value: number | null;
  trendPct: number;
  trendGood: boolean;
  overdue?: number;
  tone: 'neutral' | 'danger';
  table: KpiTable;
}

export interface DashboardView {
  kpis: Kpi[];
  readyConnected: boolean;
  issuedByMonth: Array<{ month: string; count: number }>;
  issuanceByCourse: Array<{ course: string; count: number }>;
  deliveryStatus: Array<{ label: string; count: number }>;
  needsAttention: Array<{ enrolmentNo: string; learner: string; course: string; centre: string; daysWaiting: number; late: boolean }>;
  recentActivity: Array<{ learner: string; action: string; user: string; at: string }>;
  overdueParcels: Array<{ batchNo: string; daysLate: number; learner: string; courier: string }>;
  openAlerts: Array<{ id: number; type: string; details: string; createdAt: string }>;
  settings: { overdueDays: number; readyDays: number };
}

function countByMonth(dates: Array<string | null>, key: string): number {
  return dates.filter((d) => d === key).length;
}

/** The newest delivery item of each document. */
function latestItems(items: readonly ItemFact[]): Map<number, ItemFact> {
  const latest = new Map<number, ItemFact>();
  for (const item of items) {
    const current = latest.get(item.documentId);
    if (!current || item.id > current.id) latest.set(item.documentId, item);
  }
  return latest;
}

export function buildDashboard(data: InsightsData): DashboardView {
  const { now, settings } = data;
  const thisMonth = istMonthKey(now);
  const prevMonth = istMonthKey(now, -1);
  const docOf = new Map<number, DocFact>(data.docs.map((d) => [d.id, d]));
  const trend = (current: number, previous: number, goodUp: boolean) => {
    const pct = trendPercent(current, previous);
    return { trendPct: pct, trendGood: isGoodTrend(pct, goodUp) };
  };

  // Ready to issue
  const ready = data.ready;
  const readyMonths = (ready ?? []).map((r) => r.completionDate.slice(0, 7));
  const readyKpi: Kpi = {
    key: 'ready', title: 'Ready to issue', value: ready ? ready.length : null,
    ...trend(countByMonth(readyMonths, thisMonth), countByMonth(readyMonths, prevMonth), false), tone: 'neutral',
    table: {
      columns: [['learner', 'Learner'], ['enrolmentNo', 'Enrolment'], ['course', 'Course'], ['centre', 'Centre'], ['daysWaiting', 'Days waiting'], ['reason', 'Reason']].map(([key, label]) => ({ key: key ?? '', label: label ?? '' })),
      rows: (ready ?? []).map((r) => ({ learner: r.learner, enrolmentNo: r.enrolmentNo, course: r.course, centre: r.centre, daysWaiting: r.daysWaiting, reason: r.holdReasons.join(', ') })),
    },
  };

  // Issued this month
  const issuedMonths = data.docs.map((d) => monthOfDateOnly(new Date(`${d.issueDate}T00:00:00Z`)));
  const issuedKpi: Kpi = {
    key: 'issued', title: 'Issued this month', value: countByMonth(issuedMonths, thisMonth),
    ...trend(countByMonth(issuedMonths, thisMonth), countByMonth(issuedMonths, prevMonth), true), tone: 'neutral',
    table: {
      columns: [['documentNo', 'Document'], ['learner', 'Learner'], ['course', 'Course'], ['centre', 'Centre'], ['date', 'Date'], ['status', 'Status']].map(([key, label]) => ({ key: key ?? '', label: label ?? '' })),
      rows: data.docs.filter((d) => d.issueDate.startsWith(thisMonth)).map((d) => ({ documentNo: d.documentNo, learner: d.learner, course: d.course, centre: d.centre, date: d.issueDate, status: d.status })),
    },
  };

  const itemRow = (item: ItemFact): Record<string, string | number> => {
    const doc = docOf.get(item.documentId);
    return {
      documentNo: doc?.documentNo ?? '', learner: doc?.learner ?? '', course: doc?.course ?? '', centre: doc?.centre ?? '',
      status: ITEM_STATUS_LABEL[item.status], parcel: item.batchNo, overdue: isOverdue(item.dispatchedAt, item.status, now, settings.overdueDays) ? 'Yes' : 'No',
    };
  };
  const itemColumns = [['documentNo', 'Document'], ['learner', 'Learner'], ['course', 'Course'], ['centre', 'Centre'], ['status', 'Status'], ['parcel', 'Parcel'], ['overdue', 'Overdue']]
    .map(([key, label]) => ({ key: key ?? '', label: label ?? '' }));

  // Awaiting dispatch: trend by the document's issue month
  const awaiting = data.items.filter((i) => AWAITING_PRINT_STATUSES.includes(i.status));
  const awaitingMonths = awaiting.map((i) => docOf.get(i.documentId)?.issueDate.slice(0, 7) ?? null);
  const awaitingKpi: Kpi = {
    key: 'awaiting', title: 'Awaiting dispatch', value: awaiting.length,
    ...trend(countByMonth(awaitingMonths, thisMonth), countByMonth(awaitingMonths, prevMonth), false), tone: 'neutral',
    table: { columns: itemColumns, rows: awaiting.map(itemRow) },
  };

  // Dispatched, not delivered
  const dispatched = data.items.filter((i) => i.dispatchedAt && !FINISHED_STATUSES.includes(i.status));
  const dispatchedMonths = data.items.filter((i) => i.dispatchedAt).map((i) => (i.dispatchedAt ? istMonthOf(i.dispatchedAt) : null));
  const overdueCount = dispatched.filter((i) => isOverdue(i.dispatchedAt, i.status, now, settings.overdueDays)).length;
  const dispatchedKpi: Kpi = {
    key: 'dispatched', title: 'Dispatched not delivered', value: dispatched.length,
    ...trend(countByMonth(dispatchedMonths, thisMonth), countByMonth(dispatchedMonths, prevMonth), false), overdue: overdueCount,
    tone: overdueCount > 0 ? 'danger' : 'neutral', table: { columns: itemColumns, rows: dispatched.map(itemRow) },
  };

  // Open scan alerts
  const open = data.alerts.filter((a) => !a.reviewedAt);
  const alertMonths = data.alerts.map((a) => istMonthOf(a.createdAt));
  const alertsKpi: Kpi = {
    key: 'alerts', title: 'Open scan alerts', value: open.length,
    ...trend(countByMonth(alertMonths, thisMonth), countByMonth(alertMonths, prevMonth), false), tone: open.length > 0 ? 'danger' : 'neutral',
    table: {
      columns: [['type', 'Type'], ['details', 'Details'], ['date', 'Date'], ['status', 'Status']].map(([key, label]) => ({ key: key ?? '', label: label ?? '' })),
      rows: open.map((a) => ({ type: a.type, details: a.details, date: a.createdAt.toISOString(), status: 'Open' })),
    },
  };

  // Charts
  const months = lastMonthKeys(now, 12);
  const issuedByMonth = months.map((month) => ({ month, count: countByMonth(issuedMonths, month) }));
  const windowStart = months[0] ?? thisMonth;
  const byCourse = new Map<string, number>();
  for (const d of data.docs) if (d.issueDate.slice(0, 7) >= windowStart) byCourse.set(d.course || 'Unknown', (byCourse.get(d.course || 'Unknown') ?? 0) + 1);
  const issuanceByCourse = [...byCourse].sort((a, b) => b[1] - a[1]).slice(0, TOP_COURSES).map(([course, count]) => ({ course, count }));

  const latest = latestItems(data.items);
  let digital = 0, printed = 0, transit = 0, delivered = 0, returned = 0;
  for (const d of data.docs) {
    if (d.status !== 'valid') continue;
    const item = latest.get(d.id);
    if (!item) digital += 1;
    else if (AWAITING_PRINT_STATUSES.includes(item.status)) printed += 1;
    else if (IN_TRANSIT_STATUSES.includes(item.status)) transit += 1;
    else if (DELIVERED_STATUSES.includes(item.status)) delivered += 1;
    else if (RETURNED_STATUSES.includes(item.status)) returned += 1;
  }

  const needsAttention = [...(ready ?? [])].sort((a, b) => b.daysWaiting - a.daysWaiting).slice(0, NEEDS_ATTENTION).map((r) => ({
    enrolmentNo: r.enrolmentNo, learner: r.learner, course: r.course, centre: r.centre, daysWaiting: r.daysWaiting,
    late: isReadyLate(r.daysWaiting, settings.readyDays),
  }));
  const recentActivity = data.docEvents.filter((e) => ACTIVITY_ACTIONS.includes(e.action))
    .sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, RECENT_ACTIVITY)
    .map((e) => ({ learner: docOf.get(e.documentId)?.learner ?? '', action: e.action, user: e.user, at: e.at.toISOString() }));
  const overdueParcels = data.items
    .filter((i) => i.dispatchedAt && isOverdue(i.dispatchedAt, i.status, now, settings.overdueDays))
    .map((i) => ({ batchNo: i.batchNo, daysLate: i.dispatchedAt ? daysLate(i.dispatchedAt, now, settings.overdueDays) : 0, learner: docOf.get(i.documentId)?.learner ?? '', courier: i.courier }))
    .sort((a, b) => b.daysLate - a.daysLate).slice(0, OVERDUE_PANEL);
  const openAlerts = open.slice(0, ALERT_PANEL).map((a) => ({ id: a.id, type: a.type, details: a.details, createdAt: a.createdAt.toISOString() }));

  return {
    kpis: [readyKpi, issuedKpi, awaitingKpi, dispatchedKpi, alertsKpi], readyConnected: ready !== null, issuedByMonth, issuanceByCourse,
    deliveryStatus: [
      { label: 'Digital', count: digital }, { label: 'Printed', count: printed }, { label: 'In transit', count: transit },
      { label: 'Delivered', count: delivered }, { label: 'Returned', count: returned },
    ],
    needsAttention, recentActivity, overdueParcels, openAlerts, settings: { overdueDays: settings.overdueDays, readyDays: settings.readyDays },
  };
}
