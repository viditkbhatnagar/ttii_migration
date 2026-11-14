import {
  DELIVERED_STATUSES, ITEM_STATUS_LABEL, isOverdue, istMonthOf, FINISHED_STATUSES,
} from './credential-delivery-model.js';
import type { DocFact, InsightsData, ItemFact } from './credential-insights-data.js';
import { DELIVERY_MODE_LABEL, DOC_TYPE_LABEL, type DocType } from './credential-types.js';

// Credential Manager — the nine Reports (spec §1.6), derived from the shared
// InsightsData snapshot. Pure so the derivations can be tested.

export const REPORT_KEYS = [
  'issuance', 'pending', 'turnaround', 'holds', 'delivery', 'changes', 'verification', 'centre', 'audit',
] as const;
export type ReportKey = typeof REPORT_KEYS[number];

export const REPORT_TITLE: Record<ReportKey, string> = {
  issuance: 'Issuance', pending: 'Pending', turnaround: 'Turnaround time', holds: 'Holds', delivery: 'Delivery',
  changes: 'Duplicates, corrections & revocations', verification: 'Verification', centre: 'Centre-wise', audit: 'Audit Log',
};

export type ReportCell = string | number;
export type ReportRow = Record<string, ReportCell>;

export interface ReportResult {
  key: ReportKey;
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: ReportRow[];
  /** Whether the From/To filter applies (the report has a `date` column). */
  hasDate: boolean;
  chart: { group: string; points: Array<{ label: string; value: number }> } | null;
  note: string;
}

export interface DateRange { from?: string | null; to?: string | null }

const dayOf = (iso: string): string => iso.slice(0, 10);
const docLabel = (type: string): string => DOC_TYPE_LABEL[type as DocType] ?? type;
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const round1 = (n: number): number => Math.round(n * 10) / 10;
const DAY_MS = 86_400_000;
const daysBetween = (start: Date, end: Date): number => Math.max(0, (end.getTime() - start.getTime()) / DAY_MS);

function defineColumns(spec: ReadonlyArray<readonly [string, string]>): Array<{ key: string; label: string }> {
  return spec.map(([key, label]) => ({ key, label }));
}

function groupChart(rows: readonly ReportRow[], groupKey: string, groupLabel: string): ReportResult['chart'] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[groupKey] ?? '') || 'Unknown';
    const raw = row.count ?? row.documents ?? row.issued ?? 1;
    totals.set(label, (totals.get(label) ?? 0) + (typeof raw === 'number' ? raw : Number(raw) || 0));
  }
  const points = [...totals].map(([label, value]) => ({ label, value })).sort((a, b) => a.label.localeCompare(b.label));
  return { group: groupLabel, points };
}

function latestItemByDoc(items: readonly ItemFact[]): Map<number, ItemFact> {
  const latest = new Map<number, ItemFact>();
  for (const item of items) {
    const current = latest.get(item.documentId);
    if (!current || item.id > current.id) latest.set(item.documentId, item);
  }
  return latest;
}

function issuance(data: InsightsData): ReportResult {
  const rows: ReportRow[] = data.docs.map((d) => ({
    date: d.issueDate, month: d.issueDate.slice(0, 7), learner: d.learner, document: d.documentNo, course: d.course, batch: d.batch,
    centre: d.centre, documentType: docLabel(d.docType), issuedBy: d.issuedBy, status: cap(d.status), count: 1,
  }));
  return {
    key: 'issuance', title: REPORT_TITLE.issuance, hasDate: true, rows, note: '', chart: groupChart(rows, 'course', 'course'),
    columns: defineColumns([['date', 'Date / time'], ['month', 'Month'], ['learner', 'Learner'], ['document', 'Document no.'], ['course', 'Course'], ['batch', 'Batch'], ['centre', 'Centre'], ['documentType', 'Document type'], ['issuedBy', 'Issuing user'], ['status', 'Status'], ['count', 'Count']]),
  };
}

function pending(data: InsightsData): ReportResult {
  const rows: ReportRow[] = (data.ready ?? []).map((r) => ({
    date: r.completionDate, learner: r.learner, enrolment: r.enrolmentNo, course: r.course, batch: r.batch, centre: r.centre, daysWaiting: r.daysWaiting, count: 1,
  }));
  return {
    key: 'pending', title: REPORT_TITLE.pending, hasDate: true, rows, chart: groupChart(rows, 'course', 'course'),
    note: data.ready === null ? 'The eligibility module is not connected yet, so there is nothing to list here.' : '',
    columns: defineColumns([['date', 'Date / time'], ['learner', 'Learner'], ['enrolment', 'Enrolment'], ['course', 'Course'], ['batch', 'Batch'], ['centre', 'Centre'], ['daysWaiting', 'Days waiting'], ['count', 'Count']]),
  };
}

function turnaround(data: InsightsData): ReportResult {
  const deliveredOf = new Map<number, Date>();
  for (const item of data.items) if (item.deliveredAt && DELIVERED_STATUSES.includes(item.status)) deliveredOf.set(item.documentId, item.deliveredAt);
  const groups = new Map<string, DocFact[]>();
  for (const d of data.docs.filter((x) => x.version === 1)) {
    const key = `${d.course}\u0000${d.centre}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  const stats = (values: number[]): { avg: ReportCell; worst: ReportCell } =>
    values.length ? { avg: round1(values.reduce((a, b) => a + b, 0) / values.length), worst: round1(Math.max(...values)) } : { avg: '—', worst: '—' };
  const rows: ReportRow[] = [...groups.values()].map((docs) => {
    const first = docs[0];
    const toIssue = docs.flatMap((d) => (d.completionDate ? [daysBetween(new Date(`${d.completionDate}T00:00:00Z`), new Date(`${d.issueDate}T00:00:00Z`))] : []));
    const toDeliver = docs.flatMap((d) => { const at = deliveredOf.get(d.id); return at ? [daysBetween(new Date(`${d.issueDate}T00:00:00Z`), at)] : []; });
    const total = docs.flatMap((d) => { const at = deliveredOf.get(d.id); return at && d.completionDate ? [daysBetween(new Date(`${d.completionDate}T00:00:00Z`), at)] : []; });
    const a = stats(toIssue), b = stats(toDeliver), c = stats(total);
    return {
      course: first?.course ?? '', centre: first?.centre ?? '', documents: docs.length, avgIssue: a.avg, worstIssue: a.worst,
      avgDelivery: b.avg, worstDelivery: b.worst, avgTotal: c.avg, worstTotal: c.worst, delivered: docs.filter((d) => deliveredOf.has(d.id)).length,
    };
  });
  return {
    key: 'turnaround', title: REPORT_TITLE.turnaround, hasDate: false, rows, chart: groupChart(rows, 'course', 'course'), note: '',
    columns: defineColumns([['course', 'Course'], ['centre', 'Centre'], ['documents', 'Documents'], ['avgIssue', 'Average completion → issue (days)'], ['worstIssue', 'Worst completion → issue (days)'], ['avgDelivery', 'Average issue → delivery (days)'], ['worstDelivery', 'Worst issue → delivery (days)'], ['avgTotal', 'Average total (days)'], ['worstTotal', 'Worst total (days)'], ['delivered', 'Delivered documents']]),
  };
}

function holds(data: InsightsData): ReportResult {
  const rows: ReportRow[] = data.holds.map((h) => ({
    date: h.placedAt.toISOString(), learner: h.learner, course: h.course, centre: h.centre, reason: h.reason,
    daysOnHold: Math.floor((data.now.getTime() - h.placedAt.getTime()) / DAY_MS), placedBy: h.placedBy, count: 1,
  }));
  return {
    key: 'holds', title: REPORT_TITLE.holds, hasDate: true, rows, chart: groupChart(rows, 'reason', 'reason'), note: '',
    columns: defineColumns([['date', 'Date / time'], ['learner', 'Learner'], ['course', 'Course'], ['centre', 'Centre'], ['reason', 'Reason'], ['daysOnHold', 'Days on hold'], ['placedBy', 'Placed by'], ['count', 'Count']]),
  };
}

function delivery(data: InsightsData): ReportResult {
  const latest = latestItemByDoc(data.items);
  const rows: ReportRow[] = data.docs.filter((d) => d.status !== 'superseded').map((d) => {
    const item = latest.get(d.id);
    const mode = data.modes.get(d.id) ?? 'digital';
    const status = d.status === 'revoked' ? 'Revoked' : item ? ITEM_STATUS_LABEL[item.status] : mode === 'digital' ? 'Digital available' : 'Print queued';
    const delivered = item && DELIVERED_STATUSES.includes(item.status) ? 1 : 0;
    const finished = item ? FINISHED_STATUSES.includes(item.status) : false;
    const pendingFlag = item ? (finished ? 0 : 1) : d.status === 'valid' && mode !== 'digital' ? 1 : 0;
    const dispatchedAt = item?.dispatchedAt ?? null;
    return {
      date: dispatchedAt ? dispatchedAt.toISOString() : d.issueDate, document: d.documentNo, learner: d.learner, course: d.course, centre: d.centre,
      mode: DELIVERY_MODE_LABEL[mode], courier: item?.courier || '—', status, delivered, pending: pendingFlag,
      returned: item?.status === 'returned' ? 1 : 0, overdue: item && isOverdue(dispatchedAt, item.status, data.now, data.settings.overdueDays) ? 1 : 0, count: 1,
    };
  });
  return {
    key: 'delivery', title: REPORT_TITLE.delivery, hasDate: true, rows, chart: groupChart(rows, 'status', 'status'), note: '',
    columns: defineColumns([['date', 'Date / time'], ['document', 'Document no.'], ['learner', 'Learner'], ['course', 'Course'], ['centre', 'Centre'], ['mode', 'Mode'], ['courier', 'Courier'], ['status', 'Status'], ['delivered', 'Delivered'], ['pending', 'Pending'], ['returned', 'Returned'], ['overdue', 'Overdue'], ['count', 'Count']]),
  };
}

function changes(data: InsightsData): ReportResult {
  const docOf = new Map(data.docs.map((d) => [d.id, d]));
  const rows: ReportRow[] = data.docEvents.filter((e) => ['Duplicate', 'Correction', 'Revoke', 'Restore'].includes(e.action)).map((e) => {
    const d = docOf.get(e.documentId);
    return { date: e.at.toISOString(), month: istMonthOf(e.at), action: e.action, reason: e.reason, document: d?.documentNo ?? '', course: d?.course ?? '', centre: d?.centre ?? '', user: e.user, count: 1 };
  });
  return {
    key: 'changes', title: REPORT_TITLE.changes, hasDate: true, rows, chart: groupChart(rows, 'month', 'month'), note: '',
    columns: defineColumns([['date', 'Date / time'], ['month', 'Month'], ['action', 'Action'], ['reason', 'Reason'], ['document', 'Document no.'], ['course', 'Course'], ['centre', 'Centre'], ['user', 'User'], ['count', 'Count']]),
  };
}

function verification(data: InsightsData): ReportResult {
  const docOf = new Map(data.docs.map((d) => [d.id, d]));
  const rows: ReportRow[] = data.scans.map((s) => {
    const d = s.documentId ? docOf.get(s.documentId) : undefined;
    return {
      date: s.at.toISOString(), month: istMonthOf(s.at), verificationId: s.verificationId, document: d?.documentNo ?? '—', course: d?.course ?? '—',
      country: s.country, method: s.method === 'qr' ? 'QR' : 'Manual', status: s.status === 'not_found' ? 'Not found' : cap(s.status), notFound: s.status === 'not_found' ? 1 : 0, count: 1,
    };
  });
  return {
    key: 'verification', title: REPORT_TITLE.verification, hasDate: true, rows, chart: groupChart(rows, 'month', 'month'), note: '',
    columns: defineColumns([['date', 'Date / time'], ['month', 'Month'], ['verificationId', 'Verification ID'], ['document', 'Document no.'], ['course', 'Course'], ['country', 'Country'], ['method', 'Method'], ['status', 'Status'], ['notFound', 'Not found'], ['count', 'Count']]),
  };
}

function centreWise(data: InsightsData): ReportResult {
  const today = data.now.toISOString().slice(0, 10);
  const itemsByDoc = new Map<number, ItemFact[]>();
  for (const i of data.items) itemsByDoc.set(i.documentId, [...(itemsByDoc.get(i.documentId) ?? []), i]);
  const centres = new Map<string, { completed: Set<string>; issued: number; dispatched: number; delivered: number; pending: number }>();
  const slot = (name: string) => {
    const label = name || 'No centre';
    const existing = centres.get(label);
    if (existing) return existing;
    const created = { completed: new Set<string>(), issued: 0, dispatched: 0, delivered: 0, pending: 0 };
    centres.set(label, created);
    return created;
  };
  for (const r of data.ready ?? []) {
    const c = slot(r.centre);
    c.pending += 1;
    if (r.completionDate <= today) c.completed.add(r.enrolmentNo || `e${r.enrolId}`);
  }
  for (const d of data.docs) {
    const c = slot(d.centre);
    c.completed.add(d.enrolmentNo || `e${d.enrolId}`);
    if (d.status !== 'superseded') c.issued += 1;
    for (const i of itemsByDoc.get(d.id) ?? []) {
      if (i.dispatchedAt) c.dispatched += 1;
      if (DELIVERED_STATUSES.includes(i.status)) c.delivered += 1;
    }
  }
  const rows: ReportRow[] = [...centres].sort((a, b) => a[0].localeCompare(b[0])).map(([centre, c]) => ({
    centre, completed: c.completed.size, issued: c.issued, dispatched: c.dispatched, delivered: c.delivered, pending: c.pending,
  }));
  return {
    key: 'centre', title: REPORT_TITLE.centre, hasDate: false, rows, chart: groupChart(rows, 'centre', 'centre'), note: '',
    columns: defineColumns([['centre', 'Centre'], ['completed', 'Completed'], ['issued', 'Issued'], ['dispatched', 'Dispatched'], ['delivered', 'Delivered'], ['pending', 'Pending']]),
  };
}

export interface AuditRow { date: string; user: string; action: string; entity: string; record: string; before: string; after: string }

function audit(rows: readonly AuditRow[]): ReportResult {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  return {
    key: 'audit', title: REPORT_TITLE.audit, hasDate: true, rows: sorted.map((r) => ({ ...r })), chart: null, note: '',
    columns: defineColumns([['date', 'Date / time'], ['user', 'User'], ['action', 'Action'], ['entity', 'Entity'], ['record', 'Record'], ['before', 'Before'], ['after', 'After']]),
  };
}

/** Rows whose `date` falls inside the From/To range (inclusive, YYYY-MM-DD). */
export function filterByRange(rows: readonly ReportRow[], range: DateRange): ReportRow[] {
  const { from, to } = range;
  if (!from && !to) return [...rows];
  return rows.filter((r) => {
    const day = dayOf(String(r.date ?? ''));
    return (!from || day >= from) && (!to || day <= to);
  });
}

export function buildReport(key: ReportKey, data: InsightsData, range: DateRange = {}, auditRows: readonly AuditRow[] = []): ReportResult {
  const base = ((): ReportResult => {
    switch (key) {
      case 'issuance': return issuance(data);
      case 'pending': return pending(data);
      case 'turnaround': return turnaround(data);
      case 'holds': return holds(data);
      case 'delivery': return delivery(data);
      case 'changes': return changes(data);
      case 'verification': return verification(data);
      case 'centre': return centreWise(data);
      case 'audit': return audit(auditRows);
    }
  })();
  if (!base.hasDate) return base;
  const rows = filterByRange(base.rows, range);
  const groupKey = base.chart ? (base.key === 'holds' ? 'reason' : base.key === 'delivery' ? 'status' : base.key === 'verification' || base.key === 'changes' ? 'month' : 'course') : null;
  return { ...base, rows, chart: groupKey && base.chart ? groupChart(rows, groupKey, base.chart.group) : null };
}

export function isReportKey(value: string): value is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(value);
}
