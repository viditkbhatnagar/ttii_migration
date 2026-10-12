import { describe, expect, test } from 'vitest';

import {
  EMPTY_COMM_DRAFT, EMPTY_COMM_FILTERS, EMPTY_ONBOARDING_FILTERS, EMPTY_STUDENT_QUERY,
  commCounts, commCsvRows, commissionBasisCsvRows, feeStatus, filterComms, filterOnboarding, formatInr, istMonthOf,
  monthOptions, onboardingCounts, onboardingTabOf, rowHref, studentCsvRows, studentQueryParams, toCommList, toDashboard,
  toOnboardingRows, toStudentPage, validateCommDraft,
} from '../src/admin/pages/associates/associate-mgmt-model';

// Admin → Associate Management (Naji's design): pure view logic.

describe('dashboard', () => {
  test('parses KPIs, trend and top performers defensively', () => {
    const d = toDashboard({
      kpis: { total: 5, active: '3', leadsThisMonth: 4, enrolments: 2, enrolmentsThisMonth: 1 },
      trend: [{ month: '2026-10', label: 'Oct 26', leads: 4, enrolments: 1 }],
      top: [{ id: 21, name: 'Asha', photo: '', applications: 5, enrolled: 2, conversion: 40 }],
    });
    expect(d.kpis).toEqual({ total: 5, active: 3, leadsThisMonth: 4, enrolments: 2, enrolmentsThisMonth: 1 });
    expect(d.top[0]).toMatchObject({ id: '21', conversion: 40 });
    expect(toDashboard({}).trend).toEqual([]);
  });
});

const STUDENT_PAGE = toStudentPage({
  rows: [
    { id: 501, applicationId: 'APP-501', name: 'Riya', phone: '98', email: 'r@x.in', associateId: 21, associateName: 'Asha', course: 'Diploma', stage: 'paid', enrolled: true, enrollmentStatus: 'Active', leadDate: '2026-10-01', enrolledDate: '2026-10-02', fee: 45000, paymentStatus: 'paid', studentUserId: 77 },
    { id: 502, applicationId: 'APP-502', name: 'Manu', phone: '97', email: '', associateId: 22, associateName: 'Binu', course: '', stage: 'payment_pending', enrolled: false, enrollmentStatus: '', leadDate: '2026-09-15', enrolledDate: '', fee: null, paymentStatus: 'sent', studentUserId: null },
  ],
  total: 42, page: 2, pageSize: 25,
  counts: { all: 42, lead: 20, applied: 10, enrolled: 9, rejected: 3 },
  options: { associates: [{ id: 21, name: 'Asha' }], courses: [{ id: 9, title: 'Diploma' }] },
});

describe('associate students', () => {
  test('parses the server page', () => {
    expect(STUDENT_PAGE.total).toBe(42);
    expect(STUDENT_PAGE.counts.enrolled).toBe(9);
    expect(STUDENT_PAGE.rows[0]).toMatchObject({ id: '501', enrolled: true, fee: 45000, studentUserId: '77' });
    expect(STUDENT_PAGE.rows[1]).toMatchObject({ fee: null, studentUserId: '' });
    expect(STUDENT_PAGE.associates).toEqual([{ id: '21', name: 'Asha' }]);
  });

  test('query params only carry what is set; month goes with its basis', () => {
    expect(studentQueryParams(EMPTY_STUDENT_QUERY)).toEqual({ tab: 'all', sort: 'lead', dir: 'desc', page: '1' });
    expect(studentQueryParams({ ...EMPTY_STUDENT_QUERY, search: ' riya ', associateId: '21', month: '2026-10', monthBy: 'enrolled' }, { all: true }))
      .toEqual({ tab: 'all', sort: 'lead', dir: 'desc', page: '1', q: 'riya', associate_id: '21', month: '2026-10', month_by: 'enrolled', all: '1' });
  });

  test('links: converted + linked → student page, otherwise the application', () => {
    expect(rowHref(STUDENT_PAGE.rows[0]!)).toBe('/admin/students/view/77');
    expect(rowHref(STUDENT_PAGE.rows[1]!)).toBe('/admin/applications/view/502');
  });

  test('fee status from the application payment record; blank is unknown, not "Not paid"', () => {
    expect(feeStatus('paid')).toEqual({ label: 'Paid', tone: 'emerald' });
    expect(feeStatus('pending_approval')?.label).toBe('Awaiting approval');
    expect(feeStatus('sent')?.label).toBe('Link sent');
    expect(feeStatus('')).toBeNull();
    expect(formatInr(45000)).toBe('₹45,000');
    expect(formatInr(null)).toBe('—');
  });

  test('CSV rows: dd/mm/yyyy dates; the commissions basis carries no amounts', () => {
    const csv = studentCsvRows(STUDENT_PAGE.rows, (s) => s.toUpperCase());
    expect(csv[1]).toEqual(['APP-501', 'Riya', '98', 'r@x.in', 'Asha', 'Diploma', 'Enrolled', '01/10/2026', '02/10/2026', '45000', 'Paid']);
    expect(csv[2]?.[6]).toBe('PAYMENT_PENDING');
    const basis = commissionBasisCsvRows(STUDENT_PAGE.rows);
    expect(basis[0]).toEqual(['Application ID', 'Associate', 'Student', 'Course', 'Enrolled On', 'Enrolment Status']);
    expect(basis.flat().join(' ')).not.toMatch(/45000|₹/);
  });

  test('monthOptions: the last N IST months, newest first', () => {
    const months = monthOptions(new Date('2026-09-30T19:00:00Z'), 3); // 1 Oct IST
    expect(months).toEqual([
      { value: '2026-10', label: 'Oct 2026' },
      { value: '2026-09', label: 'Sep 2026' },
      { value: '2026-08', label: 'Aug 2026' },
    ]);
    expect(monthOptions(new Date('2026-01-15T00:00:00Z'), 2)[1]?.value).toBe('2025-12');
  });
});

describe('onboarding', () => {
  const rows = toOnboardingRows([
    { id: 1, name: 'Asha', email: 'a@x.in', phone: '98', centre: 'Kochi', createdAt: '2026-05-01', isActive: true, loginDisabled: false, firstSignIn: '2026-05-01T04:00:00.000Z', lastSignIn: '2026-10-10T04:00:00.000Z' },
    { id: 2, name: 'Binu', email: '', phone: '', centre: '', createdAt: '2026-06-01', isActive: true, loginDisabled: false, firstSignIn: '', lastSignIn: '' },
    { id: 3, name: 'Chitra', email: '', phone: '', centre: 'Kochi', createdAt: '', isActive: false, loginDisabled: true, firstSignIn: '2026-06-01T04:00:00.000Z', lastSignIn: '' },
  ]);

  test('tabs: disabled wins, then signed-in vs never', () => {
    expect(rows.map(onboardingTabOf)).toEqual(['signed', 'never', 'disabled']);
    expect(onboardingCounts(rows)).toEqual({ all: 3, never: 1, signed: 1, disabled: 1 });
  });

  test('filters by tab, centre and search', () => {
    expect(filterOnboarding(rows, { ...EMPTY_ONBOARDING_FILTERS, centre: 'Kochi' }).map((r) => r.id)).toEqual(['1', '3']);
    expect(filterOnboarding(rows, { ...EMPTY_ONBOARDING_FILTERS, tab: 'never' }).map((r) => r.id)).toEqual(['2']);
    expect(filterOnboarding(rows, { ...EMPTY_ONBOARDING_FILTERS, search: 'a@x' }).map((r) => r.id)).toEqual(['1']);
  });
});

describe('communications', () => {
  const list = toCommList({
    rows: [
      { id: 2, associateId: 21, associateName: 'Asha', channel: 'Email', direction: 'Outgoing', subject: 'Docs', message: 'Sent the list', createdByName: 'Majida', createdAt: '2026-09-30T19:00:00.000Z' },
      { id: 1, associateId: 22, associateName: 'Binu', channel: 'Call', direction: 'Incoming', subject: 'Batch', message: 'Asked about PG', createdByName: 'Risha', createdAt: '2026-09-20T05:00:00.000Z' },
    ],
    tableMissing: false,
    truncated: false,
  });

  test('parses, counts per channel and filters', () => {
    expect(list.rows).toHaveLength(2);
    expect(commCounts(list.rows)).toEqual({ all: 2, Call: 1, WhatsApp: 0, Email: 1, Note: 0 });
    expect(filterComms(list.rows, { ...EMPTY_COMM_FILTERS, channel: 'Call' }).map((r) => r.id)).toEqual(['1']);
    expect(filterComms(list.rows, { ...EMPTY_COMM_FILTERS, associate: '21' }).map((r) => r.id)).toEqual(['2']);
    expect(filterComms(list.rows, { ...EMPTY_COMM_FILTERS, staff: 'Risha', direction: 'Incoming' }).map((r) => r.id)).toEqual(['1']);
    // 30 Sep 19:00 UTC is 1 Oct in IST.
    expect(istMonthOf('2026-09-30T19:00:00.000Z')).toBe('2026-10');
    expect(filterComms(list.rows, { ...EMPTY_COMM_FILTERS, month: '2026-10' }).map((r) => r.id)).toEqual(['2']);
    expect(filterComms(list.rows, { ...EMPTY_COMM_FILTERS, search: 'pg' }).map((r) => r.id)).toEqual(['1']);
  });

  test('table-missing payload parses to an empty, flagged list', () => {
    expect(toCommList({ rows: [], tableMissing: true })).toEqual({ rows: [], tableMissing: true, truncated: false });
  });

  test('CSV has a header and IST timestamps', () => {
    const csv = commCsvRows(list.rows);
    expect(csv[0]?.[0]).toBe('Logged At (IST)');
    expect(csv[1]?.[0]).toMatch(/^01\/10\/2026/);
  });

  test('draft validation', () => {
    expect(Object.keys(validateCommDraft(EMPTY_COMM_DRAFT)).sort()).toEqual(['associateId', 'message', 'subject']);
    expect(validateCommDraft({ associateId: '21', channel: 'Call', direction: 'Outgoing', subject: 'x', message: 'y' })).toEqual({});
    const bad = validateCommDraft({ associateId: '21', channel: 'SMS', direction: 'Up', subject: 'x', message: 'y' });
    expect(Object.keys(bad).sort()).toEqual(['channel', 'direction']);
  });
});
