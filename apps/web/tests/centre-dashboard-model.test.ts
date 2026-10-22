import { describe, expect, test } from 'vitest';

import {
  DEFAULT_TOP_SORT, EMPTY_TOP_FILTERS, activityText, daysLeftLabel, enrollmentBars, filterTopCentres, inr, inrThousands,
  istDateTime, nextTopSort, periodLabel, periodRange, pipelineBars, renewalState, sortTopCentres, stateOptions, toCentreDashboard,
  type DashboardActivity,
} from '../src/admin/pages/centres/centre-dashboard-model';

const raw = {
  period: 'quarter',
  window: { fromYmd: '2026-10-01', toYmd: '2026-10-22' },
  centres: [{ id: 30, code: '30', name: 'Hanahadhi' }, { id: 1, code: 'TTC0001', name: 'TTC Bepur svk' }, { id: 0, name: 'bad' }],
  kpis: {
    totalCentres: 2, activeCentres: 1, inactiveCentres: 1, enrollments: 3, inProgress: 2, awaitingApproval: 1,
    collected: 30000, collectedTopUps: 25000, collectedAffiliation: 5000, walletTotal: 3201, pendingTopUps: 1,
  },
  pipeline: [
    { stage: 'lead', count: 2 }, { stage: 'payment_pending', count: 0 }, { stage: 'paid', count: 0 }, { stage: 'form_pending', count: 0 },
    { stage: 'approval_waiting', count: 1 }, { stage: 'enrolled', count: 1 }, { stage: 'rejected', count: 0 },
  ],
  actions: { awaitingApproval: 1, pendingTopUps: 1, expiringSoon: 1, expired: 1 },
  trend: [{ month: '2026-10', label: 'Oct', topUps: 5000, affiliation: 0 }],
  rows: [
    { id: 1, code: 'TTC0001', name: 'TTC Bepur svk', state: 'Kerala', status: 'active', enrollments: 3, applications: 3, approved: 1, conversion: 33, revenue: 6000, wallet: 3201, affiliationExpiry: '2026-12-15', daysLeft: 54, affiliation: 'due_soon' },
    { id: 30, code: '30', name: 'Hanahadhi', state: '', status: 'inactive', enrollments: 0, applications: 1, approved: 0, conversion: 0, revenue: 0, wallet: 0, affiliationExpiry: '2026-08-31', daysLeft: -52, affiliation: 'expired' },
    { id: 28, code: '28', name: 'upCarrera Education', state: 'Karnataka', status: 'active', enrollments: 1, applications: 2, approved: 0, conversion: 0, revenue: 25000, wallet: 75000, affiliationExpiry: '', daysLeft: null, affiliation: 'not_set' },
  ],
  renewals: [{ id: 30, name: 'Hanahadhi', expiry: '2026-08-31', daysLeft: -52 }],
  lowWallets: [{ id: 30, name: 'Hanahadhi', balance: 0 }],
  activity: [{ id: 'txn-11', kind: 'wallet_credit', at: '2026-10-21T20:00:00.000Z', who: 'TTC Bepur svk', ref: '#11', amount: 5000, note: 'Manual credit' }],
  affiliationReady: false,
  affiliationMessage: 'Affiliation records are not set up yet.',
};

const data = toCentreDashboard(raw);

describe('payload mapping', () => {
  test('maps every section; bad centre options drop; null daysLeft stays null', () => {
    expect(data.period).toBe('quarter');
    expect(data.centres.map((c) => c.id)).toEqual([30, 1]);
    expect(data.kpis.collected).toBe(30000);
    expect(data.rows.find((r) => r.id === 28)).toMatchObject({ daysLeft: null, affiliation: 'not_set', affiliationExpiry: '' });
    expect(data.rows.find((r) => r.id === 30)?.status).toBe('inactive');
    expect(data.affiliationReady).toBe(false);
    expect(toCentreDashboard({}).period).toBe('year');
    expect(toCentreDashboard({}).rows).toEqual([]);
    expect(toCentreDashboard({ rows: [{ id: 2, affiliation: 'weird' }] }).rows[0]?.affiliation).toBe('not_set');
  });
});

describe('formatting', () => {
  test('whole-rupee en-IN money and axis thousands', () => {
    expect(inr(75000)).toBe('₹75,000');
    expect(inr(3201.6)).toBe('₹3,202');
    expect(inr(1234567)).toBe('₹12,34,567');
    expect(inrThousands(25000)).toBe('₹25k');
    expect(inrThousands(2500)).toBe('₹2.5k');
    expect(inrThousands(0)).toBe('₹0k');
  });

  test('renewal badges and the IST timestamp', () => {
    expect(daysLeftLabel(-52)).toBe('52d overdue');
    expect(daysLeftLabel(54)).toBe('54d left');
    expect(renewalState(-1)).toBe('expired');
    expect(renewalState(60)).toBe('due_soon');
    expect(renewalState(61)).toBe('valid');
    expect(istDateTime('2026-10-21T20:00:00.000Z')).toMatch(/^22 Oct 2026, 1:30\s?am$/i);
    expect(istDateTime('nope')).toBe('');
  });

  test('activity in words', () => {
    const e = (kind: string, extra: Partial<DashboardActivity> = {}): DashboardActivity => ({
      id: 'x', kind, at: '', who: '', ref: '', amount: 100, note: '', ...extra,
    });
    expect(activityText(e('topup_requested'))).toBe('Top-up of ₹100 requested');
    expect(activityText(e('topup_approved', { amount: 25000 }))).toBe('Top-up approved · ₹25,000 credited');
    expect(activityText(e('topup_rejected'))).toBe('Top-up of ₹100 rejected');
    expect(activityText(e('wallet_credit', { note: 'Manual credit' }))).toBe('Wallet credited ₹100 · Manual credit');
    expect(activityText(e('wallet_debit'))).toBe('Wallet debited ₹100');
    expect(activityText(e('application_created', { amount: null, note: 'Hanahadhi' }))).toBe('Application created · Hanahadhi');
    expect(activityText(e('application_enrolled', { amount: null }))).toBe('Application enrolled');
    expect(activityText(e('onboarding', { amount: null, note: 'Signed agreement uploaded' }))).toBe('Signed agreement uploaded');
  });
});

describe('pipeline bars', () => {
  test('n · pct% of the period total, labelled like the Applications pipeline; zero bars are empty', () => {
    const bars = pipelineBars(data.pipeline);
    expect(bars.map((b) => b.label)).toEqual(['Lead', 'Payment Pending', 'Paid', 'Form Pending', 'Approval Waiting', 'Enrolled', 'Rejected']);
    expect(bars[0]).toMatchObject({ count: 2, pct: 50, width: 50 });
    expect(bars[1]).toMatchObject({ count: 0, pct: 0, width: 0 });
    expect(bars[4]?.barClass).toBe('bg-primary');
    expect(pipelineBars([{ stage: 'lead', count: 1 }, { stage: 'rejected', count: 99 }])[0]?.width).toBe(4);
    expect(pipelineBars([{ stage: 'lead', count: 0 }])[0]).toMatchObject({ pct: 0, width: 0 });
  });
});

describe('top centres', () => {
  test('defaults to enrolments, most first; a new column sorts ascending, the same column flips', () => {
    expect(sortTopCentres(data.rows, DEFAULT_TOP_SORT.key, DEFAULT_TOP_SORT.dir).map((r) => r.id)).toEqual([1, 28, 30]);
    const byWallet = nextTopSort(DEFAULT_TOP_SORT, 'wallet');
    expect(byWallet).toEqual({ key: 'wallet', dir: 'asc' });
    expect(nextTopSort(byWallet, 'wallet')).toEqual({ key: 'wallet', dir: 'desc' });
    expect(sortTopCentres(data.rows, 'affiliation', 'asc').map((r) => r.affiliation)).toEqual(['due_soon', 'expired', 'not_set']);
  });

  test('search (name, code, state), state and status filters', () => {
    expect(filterTopCentres(data.rows, { ...EMPTY_TOP_FILTERS, search: 'kar' }).map((r) => r.id)).toEqual([28]);
    expect(filterTopCentres(data.rows, { ...EMPTY_TOP_FILTERS, search: 'ttc0001' }).map((r) => r.id)).toEqual([1]);
    expect(filterTopCentres(data.rows, { ...EMPTY_TOP_FILTERS, state: 'Kerala' }).map((r) => r.id)).toEqual([1]);
    expect(filterTopCentres(data.rows, { ...EMPTY_TOP_FILTERS, status: 'inactive' }).map((r) => r.id)).toEqual([30]);
    expect(stateOptions(data.rows)).toEqual(['Karnataka', 'Kerala']);
  });

  test('enrolment bars: top seven, most first', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ ...data.rows[0]!, id: i + 1, name: `C${i + 1}`, enrollments: i }));
    expect(enrollmentBars(many).map((b) => b.enrollments)).toEqual([8, 7, 6, 5, 4, 3, 2]);
    expect(enrollmentBars(data.rows)[0]).toEqual({ name: 'TTC Bepur svk', enrollments: 3 });
  });
});

describe('period labels', () => {
  test('calendar period to date, named and dated', () => {
    expect(data.window).toEqual({ fromYmd: '2026-10-01', toYmd: '2026-10-22' });
    expect(periodLabel('quarter')).toBe('This quarter');
    expect(periodRange(data.window)).toBe('01 Oct – 22 Oct 2026 (IST)');
    expect(periodRange({ fromYmd: '2025-12-01', toYmd: '2026-01-05' })).toBe('01 Dec 2025 – 05 Jan 2026 (IST)');
    expect(periodRange({ fromYmd: '', toYmd: '' })).toBe('');
  });
});
