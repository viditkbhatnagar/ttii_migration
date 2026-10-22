import { describe, expect, it } from 'vitest';
import {
  buildKpis, courseAxisLabel, kpiProgress, monthDelta, stageLabel, stageTone, toDashboardData, trendHasData,
} from '../src/centre/pages/dashboard/centre-dashboard-model.js';

const payload = {
  today: '2026-10-22',
  centre: { name: 'TTII Kochi' },
  kpis: { applications: 10, applicationsThisMonth: 6, applicationsLastMonth: 3, inProgress: 4, awaitingApproval: 2, converted: 5, conversion: 50, students: 8, studentsThisMonth: 2, studentsLastMonth: 0, activeStudents: 6, runningCohorts: 2, upcomingCohorts: 1 },
  trend: [{ month: '2026-10', label: 'Oct', applications: 6, enrolments: 2 }],
  courses: [{ courseId: 1, title: 'Diploma in Montessori Teachers Training Programme', shortName: '', applications: 3, enrolments: 2 }],
  recentApplications: [{ id: 1, applicationId: 'APP1', name: 'A', course: 'C', date: '2026-10-20', stage: 'enrolled' }],
  money: { walletBalance: 75000, pendingTopUps: 1, feesScheduled: 1000, feesPaid: 250, feesBalance: 750, withBalance: 3, recentPayments: [], recentWallet: [] },
};

describe('centre dashboard model', () => {
  it('shows money tiles only when the server sent money (role 7)', () => {
    const owner = buildKpis(toDashboardData(payload)).map((k) => k.id);
    expect(owner).toEqual(['wallet', 'students', 'cohorts', 'applications', 'enrolments', 'pending', 'collected', 'balance']);
    const assoc = buildKpis(toDashboardData({ ...payload, money: null })).map((k) => k.id);
    expect(assoc).toEqual(['students', 'cohorts', 'applications', 'enrolments', 'pending']);
  });

  it('never invents a delta without a base month', () => {
    expect(monthDelta(5, 0)).toBeNull();
    expect(monthDelta(6, 3)).toBe(100);
    expect(monthDelta(1, 4)).toBe(-75);
  });

  it('uses real numbers and honest subtitles', () => {
    const kpis = buildKpis(toDashboardData(payload));
    expect(kpis.find((k) => k.id === 'wallet')).toMatchObject({ value: '₹75,000', sub: '1 top-up awaiting approval' });
    expect(kpis.find((k) => k.id === 'balance')).toMatchObject({ value: '₹750', sub: '3 students with a balance', href: '/centre/wallet?tab=collections' });
    expect(kpis.find((k) => k.id === 'students')?.delta).toBeNull();
  });

  it('computes bar progress only where a real total exists', () => {
    const data = toDashboardData(payload);
    const kpis = buildKpis(data);
    expect(kpiProgress(kpis.find((k) => k.id === 'collected')!, data)).toBe(25);
    expect(kpiProgress(kpis.find((k) => k.id === 'wallet')!, data)).toBeUndefined();
  });

  it('survives a malformed payload', () => {
    const data = toDashboardData(null);
    expect(data.money).toBeNull();
    expect(trendHasData(data.trend)).toBe(false);
    expect(buildKpis(data).find((k) => k.id === 'applications')?.value).toBe('0');
  });

  it('labels stages and truncates long course names', () => {
    expect(stageLabel('approval_waiting')).toBe('Awaiting Approval');
    expect(stageTone('rejected')).toBe('danger');
    const c = toDashboardData(payload).courses[0]!;
    expect(courseAxisLabel(c).length).toBeLessThanOrEqual(28);
  });
});
