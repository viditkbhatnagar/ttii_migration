import { describe, expect, test } from 'vitest';

import {
  filterProfileApplications,
  formatIstDateTime,
  humanize,
  toProfileStats,
} from '../src/admin/pages/counsellor/staff-profile-model';

const stats = toProfileStats({
  kpis: { applications: 3, pending: 1, enrolled: 1, rejected: 1, dropouts: 0 },
  trend: [{ month: '2026-10', label: 'Oct 26', applications: 3, enrollments: 1 }],
  applications: [
    { id: '1', applicationId: 'TTA1', name: 'Asha', phone: '98', email: '', course: 'Montessori', stage: 'enrolled', enrolled: true, enrollmentStatus: 'Active', paymentStatus: 'paid', created: '2026-10-01', converted: '2026-10-03' },
    { id: '2', applicationId: '#2', name: 'Ravi', phone: '97', email: 'r@x.in', course: 'ECCE', stage: 'rejected', enrolled: false, created: '2026-10-02' },
    { id: '3', applicationId: '#3', name: 'Zoya', phone: '96', course: '', stage: '', enrolled: 'yes' },
  ],
  courseMix: [{ course: 'Montessori', applications: '2', enrolled: 1 }],
  activity: [{ id: '9', type: 'link_sent', title: 'Payment link sent', student: 'Asha', at: '2026-10-02T04:30:00.000Z' }],
});

describe('toProfileStats', () => {
  test('normalises the endpoint payload defensively', () => {
    expect(stats.kpis).toEqual({ applications: 3, pending: 1, enrolled: 1, rejected: 1, dropouts: 0 });
    expect(stats.trend).toHaveLength(1);
    expect(stats.courseMix).toEqual([{ course: 'Montessori', applications: 2, enrolled: 1 }]);
    expect(stats.applications[2]).toMatchObject({ stage: 'lead', enrolled: false, enrollmentStatus: '', converted: '' });
    expect(stats.activity[0]?.title).toBe('Payment link sent');
    expect(toProfileStats(null).applications).toEqual([]);
    expect(toProfileStats(null).courseMix).toEqual([]);
  });
});

describe('profile helpers', () => {
  test('application filters match the KPI split', () => {
    const ids = (f: Parameters<typeof filterProfileApplications>[1], q = '') => filterProfileApplications(stats.applications, f, q).map((a) => a.id);
    expect(ids('all')).toEqual(['1', '2', '3']);
    expect(ids('enrolled')).toEqual(['1']);
    expect(ids('rejected')).toEqual(['2']);
    expect(ids('pending')).toEqual(['3']);
    expect(ids('all', 'ecce')).toEqual(['2']);
    expect(ids('all', 'tta1')).toEqual(['1']);
  });

  test('IST date-time and labels', () => {
    expect(formatIstDateTime('2026-10-02T04:30:00.000Z')).toMatch(/^02\/10\/2026, 10:00\s?am$/i);
    expect(formatIstDateTime('')).toBe('');
    expect(humanize('payment_pending')).toBe('Payment Pending');
    expect(humanize('ACTIVE')).toBe('Active');
  });
});
