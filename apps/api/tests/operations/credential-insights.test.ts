import { describe, expect, test } from 'vitest';

import { buildDashboard } from '../../src/operations/credential-dashboard.js';
import type { DocFact, InsightsData, ItemFact } from '../../src/operations/credential-insights-data.js';
import { buildReport, filterByRange, REPORT_KEYS } from '../../src/operations/credential-reports.js';

const NOW = new Date('2026-11-14T10:00:00Z');

const doc = (id: number, over: Partial<DocFact> = {}): DocFact => ({
  id, enrolId: id, enrolmentNo: `E${id}`, learner: `Learner ${id}`, courseId: 1, course: 'Montessori', batch: 'Intake', centreId: 5, centre: 'Kochi',
  docType: 'certificate', version: 1, documentNo: `TTII/CERT/2026/00000${id}`, verificationId: `V${id}`, status: 'valid', issueDate: '2026-11-03',
  issuedAt: NOW, issuedBy: 'Admin', completionDate: '2026-10-25', offeringId: 1, ...over,
});
const item = (id: number, documentId: number, over: Partial<ItemFact> = {}): ItemFact => ({
  id, documentId, status: 'print_queued', batchId: null, batchNo: '', courier: '', dispatchedAt: null, deliveredAt: null, ...over,
});

function data(over: Partial<InsightsData> = {}): InsightsData {
  return {
    now: NOW, settings: { overdueDays: 10, readyDays: 3, centreModes: {} }, docs: [], items: [], docEvents: [], scans: [], alerts: [], holds: [], ready: null,
    modes: new Map(), ...over,
  };
}

describe('dashboard', () => {
  test('issued this month with month-on-month trend; revoked still counts as issued', () => {
    const d = data({ docs: [doc(1), doc(2), doc(3, { issueDate: '2026-10-20' }), doc(4, { status: 'revoked' })] });
    const kpi = buildDashboard(d).kpis.find((k) => k.key === 'issued');
    expect(kpi?.value).toBe(3);
    expect(kpi?.trendPct).toBe(200);
    expect(kpi?.trendGood).toBe(true);
    expect(kpi?.table.rows).toHaveLength(3);
  });

  test('ready is unavailable (null) until the eligibility module is connected, then counts and flags late waits', () => {
    expect(buildDashboard(data()).kpis[0]?.value).toBeNull();
    expect(buildDashboard(data()).readyConnected).toBe(false);
    const ready = [3, 4, 9].map((daysWaiting, i) => ({
      enrolId: i, enrolmentNo: `E${i}`, learner: `L${i}`, course: 'C', batch: 'B', centreId: 5, centre: 'Kochi', completionDate: '2026-11-05', daysWaiting, holdReasons: [],
    }));
    const view = buildDashboard(data({ ready }));
    expect(view.kpis[0]?.value).toBe(3);
    expect(view.needsAttention.map((r) => [r.daysWaiting, r.late])).toEqual([[9, true], [4, true], [3, false]]);
  });

  test('awaiting dispatch, dispatched-not-delivered with overdue, and the delivery donut', () => {
    const old = new Date('2026-11-01T00:00:00Z');
    const d = data({
      docs: [doc(1), doc(2), doc(3), doc(4), doc(5), doc(6)],
      items: [
        item(1, 1, { status: 'printed' }), item(2, 2, { status: 'in_transit', dispatchedAt: old, batchNo: 'B1', courier: 'BlueDart' }),
        item(3, 3, { status: 'delivered', dispatchedAt: old }), item(4, 4, { status: 'lost', dispatchedAt: old }),
        item(5, 5, { status: 'dispatched', dispatchedAt: new Date('2026-11-12T00:00:00Z') }),
      ],
    });
    const view = buildDashboard(d);
    expect(view.kpis.find((k) => k.key === 'awaiting')?.value).toBe(1);
    const dispatched = view.kpis.find((k) => k.key === 'dispatched');
    expect(dispatched?.value).toBe(2);
    expect(dispatched?.overdue).toBe(1);
    expect(dispatched?.tone).toBe('danger');
    expect(Object.fromEntries(view.deliveryStatus.map((s) => [s.label, s.count]))).toEqual({ Digital: 1, Printed: 1, 'In transit': 2, Delivered: 1, Returned: 1 });
    expect(view.overdueParcels).toEqual([{ batchNo: 'B1', daysLate: 3, learner: 'Learner 2', courier: 'BlueDart' }]);
  });

  test('open alerts exclude reviewed ones; 12 monthly points; top 6 courses', () => {
    const docs = Array.from({ length: 8 }, (_, i) => doc(i + 1, { course: `Course ${i}`, issueDate: i === 7 ? '2024-01-01' : '2026-11-02' }));
    const view = buildDashboard(data({
      docs,
      alerts: [
        { id: 1, type: 'revoked_scan', details: 'x', createdAt: NOW, documentId: 1, reviewedAt: null },
        { id: 2, type: 'revoked_scan', details: 'y', createdAt: NOW, documentId: 1, reviewedAt: NOW },
      ],
    }));
    expect(view.kpis.find((k) => k.key === 'alerts')?.value).toBe(1);
    expect(view.kpis.find((k) => k.key === 'alerts')?.tone).toBe('danger');
    expect(view.issuedByMonth).toHaveLength(12);
    expect(view.issuedByMonth[11]).toEqual({ month: '2026-11', count: 7 });
    expect(view.issuanceByCourse).toHaveLength(6);
    expect(view.issuanceByCourse.some((c) => c.course === 'Course 7')).toBe(false);
    expect(view.openAlerts).toHaveLength(1);
  });

  test('recent activity lists only issue-type actions, newest first', () => {
    const ev = (id: number, action: string, day: number) => ({ id, documentId: 1, action, copyType: '', reason: '', beforeStatus: '', afterStatus: '', user: 'Admin', at: new Date(Date.UTC(2026, 10, day)) });
    const view = buildDashboard(data({ docs: [doc(1)], docEvents: [ev(1, 'Print', 9), ev(2, 'Issue', 3), ev(3, 'Revoke', 8)] }));
    expect(view.recentActivity.map((a) => a.action)).toEqual(['Revoke', 'Issue']);
  });
});

describe('reports', () => {
  test('there are nine reports, each building without data', () => {
    expect(REPORT_KEYS).toHaveLength(9);
    for (const key of REPORT_KEYS) {
      const r = buildReport(key, data());
      expect(r.columns.length).toBeGreaterThan(0);
      expect(r.rows).toEqual([]);
    }
  });

  test('issuance rows and date range', () => {
    const d = data({ docs: [doc(1), doc(2, { issueDate: '2026-09-01' })] });
    expect(buildReport('issuance', d).rows).toHaveLength(2);
    expect(buildReport('issuance', d, { from: '2026-10-01' }).rows).toHaveLength(1);
    expect(buildReport('issuance', d, { to: '2026-09-30' }).rows[0]?.document).toBe('TTII/CERT/2026/000002');
    expect(filterByRange([{ date: '2026-11-03T20:00:00Z' }], { from: '2026-11-03', to: '2026-11-03' })).toHaveLength(1);
  });

  test('turnaround: averages and worst per course and centre, dashes when nothing delivered', () => {
    const d = data({
      docs: [doc(1, { completionDate: '2026-10-30', issueDate: '2026-11-03' }), doc(2, { completionDate: '2026-10-24', issueDate: '2026-11-03' }), doc(3, { version: 2 })],
      items: [item(1, 1, { status: 'delivered', deliveredAt: new Date('2026-11-08T00:00:00Z') })],
    });
    const [row] = buildReport('turnaround', d).rows;
    expect(row).toMatchObject({ documents: 2, avgIssue: 7, worstIssue: 10, avgDelivery: 5, worstDelivery: 5, avgTotal: 9, worstTotal: 9, delivered: 1 });
    const none = buildReport('turnaround', data({ docs: [doc(1)] })).rows[0];
    expect(none?.avgDelivery).toBe('—');
  });

  test('delivery statuses, pending, overdue and revoked', () => {
    const d = data({
      docs: [doc(1), doc(2), doc(3, { status: 'revoked' }), doc(4, { status: 'superseded' }), doc(5)],
      items: [item(1, 1, { status: 'in_transit', dispatchedAt: new Date('2026-10-01T00:00:00Z'), courier: 'BlueDart' }), item(2, 2, { status: 'delivered' })],
      modes: new Map([[1, 'courier_learner'], [2, 'via_centre'], [5, 'digital']]),
    });
    const rows = buildReport('delivery', d).rows;
    expect(rows).toHaveLength(4);
    const by = (doc: string) => rows.find((r) => String(r.document).endsWith(doc));
    expect(by('000001')).toMatchObject({ status: 'In transit', pending: 1, overdue: 1, courier: 'BlueDart', mode: 'Courier to learner' });
    expect(by('000002')).toMatchObject({ status: 'Delivered', delivered: 1, pending: 0 });
    expect(by('000003')).toMatchObject({ status: 'Revoked' });
    expect(by('000005')).toMatchObject({ status: 'Digital available', pending: 0 });
  });

  test('verification and changes group by month; centre-wise counts', () => {
    const d = data({
      docs: [doc(1), doc(2, { centre: '' })],
      items: [item(1, 1, { status: 'delivered', dispatchedAt: NOW, deliveredAt: NOW })],
      scans: [{ id: 1, at: NOW, verificationId: 'V1', documentId: 1, status: 'valid', method: 'qr', country: 'India' }, { id: 2, at: NOW, verificationId: 'ZZ', documentId: null, status: 'not_found', method: 'manual', country: 'Unknown' }],
      docEvents: [{ id: 1, documentId: 1, action: 'Revoke', copyType: '', reason: 'Error', beforeStatus: 'valid', afterStatus: 'revoked', user: 'A', at: NOW }],
    });
    const ver = buildReport('verification', d);
    expect(ver.rows.map((r) => r.status)).toEqual(['Valid', 'Not found']);
    expect(ver.rows[1]?.notFound).toBe(1);
    expect(ver.chart?.points).toEqual([{ label: '2026-11', value: 2 }]);
    expect(buildReport('changes', d).rows).toHaveLength(1);
    const centre = buildReport('centre', d).rows;
    expect(centre.find((r) => r.centre === 'Kochi')).toMatchObject({ completed: 1, issued: 1, dispatched: 1, delivered: 1, pending: 0 });
    expect(centre.find((r) => r.centre === 'No centre')).toMatchObject({ issued: 1 });
  });

  test('audit log is newest first and has no chart', () => {
    const r = buildReport('audit', data(), {}, [
      { date: '2026-11-01T00:00:00Z', user: 'A', action: 'Edit', entity: 'rule', record: '1', before: '{}', after: '{}' },
      { date: '2026-11-09T00:00:00Z', user: 'B', action: 'Review alert', entity: 'Scan alert', record: 'Alert 1', before: 'Open', after: 'ok' },
    ]);
    expect(r.rows.map((x) => x.user)).toEqual(['B', 'A']);
    expect(r.chart).toBeNull();
    expect(buildReport('audit', data(), { from: '2026-11-05' }, r.rows as never).rows).toHaveLength(1);
  });

  test('pending says so when the eligibility module is not connected', () => {
    expect(buildReport('pending', data()).note).toMatch(/not connected/);
  });
});
