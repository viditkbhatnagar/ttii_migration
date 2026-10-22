import { describe, expect, test, vi } from 'vitest';

import {
  addDays, affiliationState, approvedRequestIdOf, daysBetween, feePeriod, feeStatus, istYmd, looseYmd, money,
  parsePeriod, paymentState, periodWindow, pipelineStageOf, stateName, toPositiveInt, trendMonths,
} from '../../src/operations/centre-dashboard-model.js';
import { buildActivity } from '../../src/operations/centre-dashboard-activity.js';
import { CentreDashboardService } from '../../src/operations/centre-dashboard-service.js';
import { memoryPrisma } from './support/memory-prisma.js';

// Centres v2 (Naji 2026-10-22): Centre Dashboard, Affiliation Fee Records and
// Application Payments — real data, IST days, derived statuses, and the
// not-yet-migrated affiliation tables degrading to empty (P2021).

const NOW = new Date('2026-10-22T06:00:00Z'); // 11:30 IST, 22 Oct 2026
const d = (iso: string) => new Date(iso);
const day = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`); // a @db.Date as Prisma returns it

describe('centre-dashboard-model', () => {
  test('period windows are rolling IST calendar days ending today', () => {
    expect(parsePeriod('quarter')).toBe('quarter');
    expect(parsePeriod('decade')).toBe('year');
    expect(parsePeriod(undefined)).toBe('year');
    expect(periodWindow('month', NOW)).toEqual({ period: 'month', days: 31, fromYmd: '2026-09-22', toYmd: '2026-10-22' });
    expect(periodWindow('quarter', NOW).fromYmd).toBe('2026-07-23');
    expect(periodWindow('year', NOW).fromYmd).toBe('2025-10-22');
    // 20:00 UTC on 21 Oct is already 22 Oct in IST.
    expect(periodWindow('month', d('2026-10-21T20:00:00Z')).toYmd).toBe('2026-10-22');
    expect(istYmd(d('2026-09-30T19:00:00Z'))).toBe('2026-10-01');
    expect(istYmd(null)).toBe('');
  });

  test('dates: loose expiry text, day arithmetic, six IST trend months', () => {
    expect(looseYmd('2027-03-31')).toBe('2027-03-31');
    expect(looseYmd('2027-03-31 00:00:00')).toBe('2027-03-31');
    expect(looseYmd('31-08-2026')).toBe('2026-08-31');
    expect(looseYmd('31/08/2026')).toBe('2026-08-31');
    expect(looseYmd('0000-00-00')).toBe('');
    expect(looseYmd('2026-02-30')).toBe('');
    expect(looseYmd(null)).toBe('');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-22', '2026-11-30')).toBe(39);
    expect(daysBetween('2026-10-22', '2026-08-31')).toBe(-52);
    expect(trendMonths(NOW).map((m) => m.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(trendMonths(d('2026-01-31T19:00:00Z'), 2)).toEqual([{ month: '2026-01', label: 'Jan' }, { month: '2026-02', label: 'Feb' }]);
  });

  test('pipeline bucketing uses the real stage; converted and rejected win', () => {
    expect(pipelineStageOf({ stage: 'lead', status: 'converted', is_converted: 1 })).toBe('enrolled');
    expect(pipelineStageOf({ stage: 'approval_waiting', status: 'pending', is_converted: 0 })).toBe('approval_waiting');
    expect(pipelineStageOf({ stage: 'form_submitted', status: null, is_converted: 0 })).toBe('approval_waiting');
    expect(pipelineStageOf({ stage: 'payment_pending', status: 'rejected', is_converted: 0 })).toBe('rejected');
    expect(pipelineStageOf({ stage: null, status: 'pending', is_converted: null })).toBe('lead');
    expect(pipelineStageOf({ stage: 'mystery', status: null, is_converted: 0 })).toBe('lead');
  });

  test('derived statuses: affiliation, affiliation fee, application payment', () => {
    expect(affiliationState(null)).toBe('not_set');
    expect(affiliationState(-1)).toBe('expired');
    expect(affiliationState(0)).toBe('due_soon');
    expect(affiliationState(60)).toBe('due_soon');
    expect(affiliationState(61)).toBe('valid');
    const today = '2026-10-22';
    expect(feeStatus({ paid: true, amount: 30000, dueYmd: '2020-01-01' }, today)).toBe('paid');
    expect(feeStatus({ paid: false, amount: 30000, dueYmd: '2026-10-21' }, today)).toBe('overdue');
    expect(feeStatus({ paid: false, amount: 30000, dueYmd: '2026-10-22' }, today)).toBe('due_soon');
    expect(feeStatus({ paid: false, amount: 30000, dueYmd: '2026-11-21' }, today)).toBe('due_soon');
    expect(feeStatus({ paid: false, amount: 30000, dueYmd: '2026-11-22' }, today)).toBe('pending');
    expect(feeStatus({ paid: false, amount: 0, dueYmd: '2026-01-01' }, today)).toBe('no_fee');
    expect(feePeriod('2026-04-01', '2029-03-31')).toBe('2026–29');
    expect(feePeriod('2026-01-01', '2026-12-31')).toBe('2026');
    expect(paymentState(0, 0)).toBe('no_plan');
    expect(paymentState(20000, 0)).toBe('unpaid');
    expect(paymentState(20000, 5000)).toBe('partial');
    expect(paymentState(20000, 20000)).toBe('paid');
  });

  test('small helpers', () => {
    expect(money('75,000')).toBe(75000);
    expect(money('abc')).toBe(0);
    expect(money('')).toBe(0);
    expect(money({ toNumber: () => 1234.5 })).toBe(1234.5);
    expect(money({})).toBe(0);
    expect(stateName('Kerala')).toBe('Kerala');
    expect(stateName('12')).toBe('');
    expect(toPositiveInt('28')).toBe(28);
    expect(toPositiveInt('2.5')).toBe(0);
    expect(toPositiveInt('')).toBe(0);
    expect(approvedRequestIdOf('Fund request approved #12')).toBe(12);
    expect(approvedRequestIdOf('GPay top-up')).toBeNull();
  });
});

function seed() {
  return {
    centres: [
      { id: 1, centre_id: 'TTC0001', centre_name: 'TTC Bepur svk', status: 1, wallet_balance: '3201', state_id: 'Kerala', date_of_expiry: '2026-11-30', phone: '9946801100', email: 'a@x.in', deleted_at: null },
      { id: 28, centre_id: '28', centre_name: 'upCarrera Education', status: 1, wallet_balance: '75000', state_id: '12', date_of_expiry: '', phone: '', email: '', deleted_at: null },
      { id: 30, centre_id: '30', centre_name: 'Hanahadhi', status: 0, wallet_balance: '0', state_id: null, date_of_expiry: '31-08-2026', phone: '', email: '', deleted_at: null },
      { id: 99, centre_id: '99', centre_name: 'Gone', status: 1, wallet_balance: '999', state_id: null, date_of_expiry: '', phone: '', email: '', deleted_at: d('2026-01-01T00:00:00Z') },
    ],
    users: [
      { id: 501, role_id: 2, added_under_centre: 1, deleted_at: null, name: 'Riya', student_id: 'TTS0101', course_id: 16, application_id: 103, created_at: d('2026-10-02T05:00:00Z') },
      { id: 502, role_id: 2, added_under_centre: 1, deleted_at: null, name: 'Sana', student_id: 'TTS0102', course_id: 16, application_id: 0, created_at: d('2026-08-01T05:00:00Z') },
      { id: 504, role_id: 2, added_under_centre: 1, deleted_at: null, name: 'Tara', student_id: 'TTS0104', course_id: null, application_id: 0, created_at: d('2026-08-02T05:00:00Z') },
      { id: 503, role_id: 2, added_under_centre: 28, deleted_at: null, name: 'Uma', student_id: 'TTS0103', course_id: 18, application_id: 0, created_at: d('2026-07-01T05:00:00Z') },
      { id: 505, role_id: 2, added_under_centre: 1, deleted_at: d('2026-09-01T00:00:00Z'), name: 'Old', student_id: 'TTS0105', course_id: 16, application_id: 0, created_at: null },
      { id: 700, role_id: 7, added_under_centre: 1, deleted_at: null, name: 'Centre login', student_id: null, course_id: null, application_id: 0, created_at: null },
    ],
    applications: [
      { id: 101, application_id: 'APP-101', name: 'Anu', added_under_centre: 1, course_id: 16, stage: 'lead', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-20T06:00:00Z'), converted_at: null, deleted_at: null },
      { id: 102, application_id: 'APP-102', name: 'Bina', added_under_centre: 1, course_id: 16, stage: 'approval_waiting', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-05-01T06:00:00Z'), converted_at: null, deleted_at: null },
      { id: 103, application_id: 'APP-103', name: 'Riya', added_under_centre: 1, course_id: 16, stage: 'lead', status: 'converted', is_converted: 1, student_id: 501, created_at: d('2026-09-30T19:00:00Z'), converted_at: d('2026-10-02T05:00:00Z'), deleted_at: null },
      { id: 104, application_id: 'APP-104', name: 'Chitra', added_under_centre: 28, course_id: 18, stage: 'payment_pending', status: 'rejected', is_converted: 0, student_id: null, created_at: d('2026-06-01T06:00:00Z'), converted_at: null, deleted_at: null },
      { id: 105, application_id: 'APP-105', name: 'Devi', added_under_centre: 28, course_id: 18, stage: 'form_submitted', status: 'pending', is_converted: 0, student_id: null, created_at: d('2024-01-01T06:00:00Z'), converted_at: null, deleted_at: null },
      { id: 106, application_id: '', name: 'Esha', added_under_centre: 30, course_id: null, stage: null, status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-21T08:00:00Z'), converted_at: null, deleted_at: null },
      { id: 107, application_id: 'APP-107', name: 'Deleted', added_under_centre: 1, course_id: 16, stage: 'approval_waiting', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-21T08:00:00Z'), converted_at: null, deleted_at: d('2026-10-21T09:00:00Z') },
      { id: 108, application_id: 'APP-108', name: 'TTII direct', added_under_centre: 0, course_id: 16, stage: 'approval_waiting', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-21T08:00:00Z'), converted_at: null, deleted_at: null },
    ],
    centre_fund_requests: [
      { id: 1, centre_id: 28, amount: '25000', status: 'approved', created_at: d('2026-01-19T04:00:00Z'), updated_at: d('2026-01-19T05:00:00Z'), deleted_at: null },
      { id: 2, centre_id: 1, amount: '100', status: 'pending', created_at: d('2025-12-05T04:00:00Z'), updated_at: null, deleted_at: null },
      { id: 3, centre_id: 1, amount: '15000', status: 'rejected', created_at: d('2025-12-06T04:00:00Z'), updated_at: d('2025-12-07T04:00:00Z'), deleted_at: null },
      { id: 4, centre_id: 28, amount: '500', status: 'pending', created_at: d('2026-10-01T04:00:00Z'), updated_at: null, deleted_at: d('2026-10-02T04:00:00Z') },
    ],
    wallet_transactions: [
      { id: 10, centre_id: 28, transaction_type: 'credit', amount: '25000', remarks: 'Fund request approved #1', created_at: d('2026-01-19T05:00:00Z'), deleted_at: null },
      { id: 11, centre_id: 1, transaction_type: 'credit', amount: '5000', remarks: 'Manual credit', created_at: d('2026-10-21T20:00:00Z'), deleted_at: null },
      { id: 12, centre_id: 1, transaction_type: 'debit', amount: '800', remarks: 'Enrollment fee', created_at: d('2026-10-01T06:00:00Z'), deleted_at: null },
      { id: 13, centre_id: 1, transaction_type: 'Credit', amount: '1000', remarks: null, created_at: d('2025-04-01T06:00:00Z'), deleted_at: null },
    ],
    centre_agreements: [
      { id: 1, agreement_no: 'AGR-2026-101', centre_id: 28, onboarding_id: null, effective_date: day('2026-04-01'), expiry_date: day('2029-03-31'), fee_amount: '30000.00', fee_paid: true, fee_paid_on: day('2026-04-15'), deleted_at: null },
      { id: 2, agreement_no: 'AGR-2026-102', centre_id: 1, onboarding_id: null, effective_date: day('2025-12-16'), expiry_date: day('2026-12-15'), fee_amount: '20000.00', fee_paid: false, fee_paid_on: null, deleted_at: null },
      { id: 3, agreement_no: 'AGR-2026-103', centre_id: null, onboarding_id: 5, effective_date: day('2026-10-01'), expiry_date: day('2029-09-30'), fee_amount: '10000.00', fee_paid: true, fee_paid_on: day('2026-10-05'), deleted_at: null },
      { id: 4, agreement_no: 'AGR-2026-104', centre_id: null, onboarding_id: 6, effective_date: day('2026-11-10'), expiry_date: day('2027-11-09'), fee_amount: '12000.00', fee_paid: false, fee_paid_on: null, deleted_at: null },
      { id: 5, agreement_no: 'AGR-2026-105', centre_id: 1, onboarding_id: null, effective_date: day('2026-01-01'), expiry_date: day('2030-01-01'), fee_amount: '1.00', fee_paid: false, fee_paid_on: null, deleted_at: d('2026-02-01T00:00:00Z') },
      { id: 6, agreement_no: 'AGR-2026-106', centre_id: 99, onboarding_id: null, effective_date: day('2026-01-01'), expiry_date: day('2030-01-01'), fee_amount: '9.00', fee_paid: true, fee_paid_on: day('2026-10-01'), deleted_at: null },
    ],
    centre_onboarding: [
      { id: 5, centre_name: 'Kochi Learning Hub', ref_no: 'ONB-005', centre_id: null },
      { id: 6, centre_name: 'Thrissur Academy', ref_no: 'ONB-006', centre_id: null },
    ],
    centre_onboarding_events: [
      { id: 1, onboarding_id: 5, message: 'Signed agreement uploaded', created_at: d('2026-10-21T10:00:00Z') },
    ],
    course: [{ id: 16, title: 'Diploma' }, { id: 18, title: ' PG Diploma ' }],
  };
}

const noPayments = () => Promise.resolve({ installments: [] });

function service(missing: string[] = [], loadPaymentStatus = noPayments) {
  const db = memoryPrisma(seed());
  for (const t of missing) db.missing.add(t);
  return new CentreDashboardService({ prisma: db.prisma, loadPaymentStatus });
}

const AFFILIATION_TABLES = ['centre_agreements', 'centre_onboarding', 'centre_onboarding_events'];

describe('CentreDashboardService.dashboard', () => {
  test('KPIs, pipeline, actions and money over the default year', async () => {
    const out = await service().dashboard({}, NOW);
    expect(out.period).toBe('year');
    expect(out.window).toEqual({ fromYmd: '2025-10-22', toYmd: '2026-10-22' });
    expect(out.centres.map((c) => c.id)).toEqual([30, 1, 28]); // live centres, A–Z (Hanahadhi, TTC…, upCarrera)
    expect(out.kpis).toEqual({
      totalCentres: 3, activeCentres: 2, inactiveCentres: 1,
      enrollments: 4,
      inProgress: 3, // 101, 102, 106 (105 is older than a year; 103 enrolled; 104 rejected)
      awaitingApproval: 2, // 102 + the form_submitted 105, any date
      collectedTopUps: 30000, // credits 10 + 11; 13 is older than a year
      collectedAffiliation: 40000, // AGR-101 + the onboarding AGR-103; a deleted centre's AGR-106 is out
      collected: 70000,
      walletTotal: 78201,
      pendingTopUps: 1,
    });
    expect(Object.fromEntries(out.pipeline.map((p) => [p.stage, p.count]))).toEqual({
      lead: 2, payment_pending: 0, paid: 0, form_pending: 0, approval_waiting: 1, enrolled: 1, rejected: 1,
    });
    expect(out.actions).toEqual({ awaitingApproval: 2, pendingTopUps: 1, expiringSoon: 1, expired: 1 });
    expect(out.trend.map((t) => t.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(out.trend[5]).toEqual({ month: '2026-10', label: 'Oct', topUps: 5000, affiliation: 10000 });
    expect(out.trend.slice(0, 5).every((t) => t.topUps === 0 && t.affiliation === 0)).toBe(true);
    expect(out.affiliationReady).toBe(true);
  });

  test('per-centre rows: enrolments, conversion, revenue, expiry = later of centre and agreement', async () => {
    const out = await service().dashboard({}, NOW);
    const byId = new Map(out.rows.map((r) => [r.id, r]));
    expect(byId.get(1)).toEqual({
      id: 1, code: 'TTC0001', name: 'TTC Bepur svk', state: 'Kerala', status: 'active', enrollments: 3,
      applications: 3, approved: 1, conversion: 33, revenue: 6000, wallet: 3201,
      affiliationExpiry: '2026-12-15', daysLeft: 54, affiliation: 'due_soon',
    });
    expect(byId.get(28)).toMatchObject({ state: '', applications: 2, approved: 0, conversion: 0, revenue: 25000, affiliationExpiry: '2029-03-31', affiliation: 'valid' });
    expect(byId.get(30)).toMatchObject({ status: 'inactive', affiliationExpiry: '2026-08-31', daysLeft: -52, affiliation: 'expired' });
    expect(out.renewals.map((r) => [r.id, r.daysLeft])).toEqual([[30, -52], [1, 54], [28, daysBetween('2026-10-22', '2029-03-31')]]);
    expect(out.lowWallets).toEqual([{ id: 30, name: 'Hanahadhi', balance: 0 }, { id: 1, name: 'TTC Bepur svk', balance: 3201 }]);
  });

  test('recent activity: real events, newest first', async () => {
    const out = await service().dashboard({}, NOW);
    expect(out.activity.map((a) => a.id)).toEqual(['txn-11', 'onb-1', 'app-106', 'app-101', 'app-103-enrolled', 'txn-12']);
    expect(out.activity[0]).toEqual({ id: 'txn-11', kind: 'wallet_credit', at: '2026-10-21T20:00:00.000Z', who: 'TTC Bepur svk', ref: '#11', amount: 5000, note: 'Manual credit' });
    expect(out.activity[1]).toMatchObject({ kind: 'onboarding', who: 'Kochi Learning Hub', ref: 'ONB-005', note: 'Signed agreement uploaded' });
    expect(out.activity[2]).toMatchObject({ kind: 'application_created', who: 'Esha', ref: '#106', note: 'Hanahadhi' });
  });

  test('month window and the header centre filter narrow everything', async () => {
    const month = await service().dashboard({ period: 'month' }, NOW);
    expect(month.kpis.inProgress).toBe(2); // 101, 106
    expect(month.kpis.collectedTopUps).toBe(5000);
    expect(month.kpis.collectedAffiliation).toBe(10000);

    const one = await service().dashboard({ centreId: '28' }, NOW);
    expect(one.centreId).toBe(28);
    expect(one.centres).toHaveLength(3); // the filter's options stay complete
    expect(one.rows.map((r) => r.id)).toEqual([28]);
    expect(one.kpis).toMatchObject({ totalCentres: 1, enrollments: 1, awaitingApproval: 1, pendingTopUps: 0, collectedTopUps: 25000, collectedAffiliation: 30000 });
    expect(one.activity.some((a) => a.kind === 'onboarding')).toBe(false);
    expect(one.activity.every((a) => a.who === 'upCarrera Education' || a.note === 'upCarrera Education')).toBe(true);

    const unknown = await service().dashboard({ centreId: '4242' }, NOW);
    expect(unknown.kpis.totalCentres).toBe(0);
    expect(unknown.rows).toEqual([]);
  });

  test('before the affiliation migration (P2021): empty affiliation data and a flag, never a throw', async () => {
    const out = await service(AFFILIATION_TABLES).dashboard({}, NOW);
    expect(out.affiliationReady).toBe(false);
    expect(out.affiliationMessage).toBe('Affiliation records are not set up yet.');
    expect(out.kpis.collectedAffiliation).toBe(0);
    expect(out.kpis.collected).toBe(30000);
    // Expiry falls back to centres.date_of_expiry alone.
    expect(out.rows.find((r) => r.id === 1)).toMatchObject({ affiliationExpiry: '2026-11-30', daysLeft: 39 });
    expect(out.rows.find((r) => r.id === 28)).toMatchObject({ affiliationExpiry: '', daysLeft: null, affiliation: 'not_set' });
    expect(out.activity.some((a) => a.kind === 'onboarding')).toBe(false);
  });

  test('other database errors still surface', async () => {
    const db = memoryPrisma(seed());
    const broken = new Proxy(db.prisma, {
      get(target, prop) {
        if (prop === 'centre_agreements') return { findMany: () => Promise.reject(Object.assign(new Error('boom'), { code: 'P1001' })) };
        return (target as unknown as Record<string | symbol, unknown>)[prop];
      },
    });
    await expect(new CentreDashboardService({ prisma: broken, loadPaymentStatus: noPayments }).dashboard({}, NOW)).rejects.toThrow('boom');
  });
});

describe('buildActivity', () => {
  test('an approval is dated by its wallet credit; a legacy approval falls back to updated_at; rejections show', () => {
    const out = buildActivity({
      centreNames: new Map([[1, 'A'], [2, 'B']]),
      requests: [
        { id: 1, centre_id: 1, amount: '500', status: 'approved', created_at: d('2026-01-01T00:00:00Z'), updated_at: d('2026-01-03T00:00:00Z') },
        { id: 2, centre_id: 2, amount: '700', status: 'approved', created_at: d('2026-01-04T00:00:00Z'), updated_at: d('2026-01-05T00:00:00Z') },
        { id: 3, centre_id: 2, amount: '900', status: 'rejected', created_at: d('2026-01-06T00:00:00Z'), updated_at: d('2026-01-07T00:00:00Z') },
      ],
      txns: [{ id: 9, centre_id: 1, transaction_type: 'credit', amount: '500', remarks: 'Fund request approved #1', created_at: d('2026-01-02T00:00:00Z') }],
      apps: [],
      onboarding: [],
    }, 20);
    expect(out.map((e) => [e.id, e.kind, e.ref])).toEqual([
      ['fr-3-rejected', 'topup_rejected', 'FR-3'],
      ['fr-3', 'topup_requested', 'FR-3'],
      ['fr-2-approved', 'topup_approved', 'FR-2'],
      ['fr-2', 'topup_requested', 'FR-2'],
      ['txn-9', 'topup_approved', 'FR-1'],
      ['fr-1', 'topup_requested', 'FR-1'],
    ]);
  });
});

describe('CentreDashboardService.affiliationFees', () => {
  test('records with derived statuses; onboarding agreements named from the lead', async () => {
    const out = await service().affiliationFees(NOW);
    expect(out.ready).toBe(true);
    expect(out.rows.map((r) => r.recordNo)).toEqual(['AGR-2026-104', 'AGR-2026-103', 'AGR-2026-102', 'AGR-2026-101']);
    expect(out.rows.find((r) => r.id === 1)).toEqual({
      id: 1, recordNo: 'AGR-2026-101', centreId: 28, centreName: 'upCarrera Education', onboarding: false,
      period: '2026–29', amount: 30000, dueDate: '2026-04-01', paidOn: '2026-04-15', status: 'paid',
    });
    expect(out.rows.find((r) => r.id === 2)).toMatchObject({ status: 'overdue', paidOn: '' });
    expect(out.rows.find((r) => r.id === 4)).toMatchObject({ centreName: 'Thrissur Academy', onboarding: true, status: 'due_soon', period: '2026–27' });
  });

  test('P2021 → ready=false with the not-set-up message', async () => {
    expect(await service(AFFILIATION_TABLES).affiliationFees(NOW)).toEqual({ ready: false, message: 'Affiliation records are not set up yet.', rows: [] });
  });
});

describe('CentreDashboardService.applicationPayments', () => {
  const installments = [
    { id: 'app-101-0', user_id: null, course_id: 16, amount: 5000, computed_status: 'paid' },
    { id: 'app-101-1', user_id: null, course_id: 16, amount: 15000, computed_status: 'upcoming' },
    { id: 'app-102-0', user_id: null, course_id: 16, amount: 20000, computed_status: 'overdue' },
    { id: 'app-999-0', user_id: null, course_id: 16, amount: 1, computed_status: 'paid' },
    { id: 900, user_id: 501, course_id: 16, amount: 10000, computed_status: 'paid', course_title: 'Diploma' },
    { id: 901, user_id: 501, course_id: 16, amount: 10000, computed_status: 'paid', course_title: 'Diploma' },
    { id: 902, user_id: 501, course_id: 18, amount: 3000, computed_status: 'due', course_title: 'PG Diploma' },
    { id: 903, user_id: 502, course_id: 16, amount: 8000, computed_status: 'paid', course_title: 'Diploma' },
    { id: 904, user_id: 502, course_id: 16, amount: 8000, computed_status: 'upcoming', course_title: 'Diploma' },
    { id: 905, user_id: 600, course_id: 16, amount: 4000, computed_status: 'paid', course_title: 'Diploma' },
  ];

  test('fee / paid / balance from the Payment Status rows, per application or centre student', async () => {
    const loader = vi.fn().mockResolvedValue({ installments });
    const out = await service([], loader).applicationPayments();
    expect(loader).toHaveBeenCalledTimes(1);
    const byKey = new Map(out.rows.map((r) => [r.key, r]));
    expect([...byKey.keys()].sort()).toEqual(['app-101', 'app-102', 'app-103', 'app-105', 'app-106', 'user-501-18', 'user-502-16', 'user-503-18', 'user-504-0']);
    expect(byKey.get('app-101')).toEqual({
      key: 'app-101', applicationId: 'APP-101', studentName: 'Anu', studentCode: '', studentUserId: null,
      centreId: 1, centreName: 'TTC Bepur svk', course: 'Diploma', fee: 20000, paid: 5000, balance: 15000,
      date: '2026-10-20', status: 'partial', source: 'application',
    });
    expect(byKey.get('app-102')).toMatchObject({ fee: 20000, paid: 0, balance: 20000, status: 'unpaid' });
    // Converted: the enrolled student's student_payments for the application's course.
    expect(byKey.get('app-103')).toMatchObject({ studentCode: 'TTS0101', studentUserId: 501, fee: 20000, paid: 20000, balance: 0, status: 'paid', source: 'enrolment', date: '2026-10-01' });
    expect(byKey.get('app-105')).toMatchObject({ fee: 0, status: 'no_plan', course: 'PG Diploma' });
    expect(byKey.get('app-106')).toMatchObject({ applicationId: '#106', course: '', status: 'no_plan', centreName: 'Hanahadhi' });
    // The same student's other course, and students added directly under a centre.
    expect(byKey.get('user-501-18')).toMatchObject({ applicationId: '', course: 'PG Diploma', fee: 3000, paid: 0, status: 'unpaid' });
    expect(byKey.get('user-502-16')).toMatchObject({ studentCode: 'TTS0102', fee: 16000, paid: 8000, balance: 8000, status: 'partial' });
    expect(byKey.get('user-503-18')).toMatchObject({ centreName: 'upCarrera Education', course: 'PG Diploma', status: 'no_plan' });
    expect(byKey.get('user-504-0')).toMatchObject({ studentName: 'Tara', course: '', status: 'no_plan' });
  });

  test('no centres → no rows and no Payment Status read', async () => {
    const loader = vi.fn();
    const db = memoryPrisma({ centres: [] });
    const out = await new CentreDashboardService({ prisma: db.prisma, loadPaymentStatus: loader }).applicationPayments();
    expect(out.rows).toEqual([]);
    expect(loader).not.toHaveBeenCalled();
  });
});
