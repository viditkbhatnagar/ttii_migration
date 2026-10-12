import { describe, expect, test } from 'vitest';

import { formatClock, istDateTime, istDaysAgo, istToday, istYmd } from '../src/admin/shared/utils/ist-date';
import {
  EMPTY_INSTRUCTOR_FILTERS, filterInstructors, instructorCsvRows, instructorStatus, instructorTabCounts,
  qualificationOptions, sortInstructors, toInstructorRows, waNumber,
} from '../src/admin/pages/instructor/instructor-list-model';
import {
  assignmentState, biographyText, cappedNote, cohortPhase, filterAssignments, filterCohorts, filterSessions,
  instructorStats, sessionPhase, toInstructorOverview,
} from '../src/admin/pages/instructor/instructor-detail-model';
import {
  EMPTY_ADMIN_FILTERS, adminStatusCounts, adminUserCsvRows, filterAdminUsers, sortAdminUsers, toAdminUserRows,
} from '../src/admin/pages/users/admin-users-model';
import {
  EMPTY_ROLE_FILTERS, ROLE_DEFS, filterGrantRows, filterRoles, roleCode, roleCsvRows, toGrantRows, toRoleRows,
} from '../src/admin/pages/roles/roles-model';

const NOW = new Date('2026-10-12T06:00:00Z'); // 11:30 IST

describe('ist-date', () => {
  test('instants read as India time regardless of the browser zone', () => {
    expect(istYmd('2026-09-01T20:00:00Z')).toBe('2026-09-02');
    expect(istYmd('2026-09-01T10:00:00.000Z')).toBe('2026-09-01');
    expect(istYmd('garbage')).toBe('');
    expect(istToday(new Date('2026-10-11T19:00:00Z'))).toBe('2026-10-12');
    expect(istDaysAgo(NOW, 7)).toBe('2026-10-05');
    expect(istDateTime('2026-10-10T04:30:00Z')).toBe('10/10/2026, 10:00 AM');
    expect(istDateTime('2026-10-10T13:05:00Z')).toBe('10/10/2026, 6:35 PM');
    expect(istDateTime('')).toBe('');
  });

  test('formatClock turns a 24h wall clock into 12h', () => {
    expect(formatClock('09:05')).toBe('9:05 AM');
    expect(formatClock('00:30')).toBe('12:30 AM');
    expect(formatClock('12:00')).toBe('12:00 PM');
    expect(formatClock('18:45')).toBe('6:45 PM');
    expect(formatClock(null)).toBe('');
  });
});

const ins = (over: Record<string, unknown>) => ({
  id: 1, name: 'A', phone: '+91 9000000001', user_email: 'a@x.in', highest_qualification: 'MBA',
  cohort_count: 1, status: 1, disabled_at: null, created_at: '2026-10-10T04:00:00.000Z', image: '', profile_picture: '', ...over,
});

describe('instructor list model', () => {
  const rows = toInstructorRows([
    ins({ id: 1, name: 'Sabitha', cohort_count: 0, created_at: '2024-01-01T00:00:00Z' }),
    ins({ id: 2, name: 'Abhirami', highest_qualification: 'M A English', cohort_count: 2 }),
    ins({ id: 3, name: 'Paulsy', status: 0, highest_qualification: '' }),
    ins({ id: 4, name: 'Risha', disabled_at: '2026-10-01T00:00:00Z', status: 1, cohort_count: 3, user_email: 'risha@ttii.in' }),
  ]);

  test('disabled wins over users.status; joined is the IST day; photo falls back', () => {
    expect(instructorStatus({ status: 1, disabled_at: '2026-01-01' })).toBe('Disabled');
    expect(instructorStatus({ status: 0 })).toBe('Inactive');
    expect(rows.map((r) => r.status)).toEqual(['Active', 'Active', 'Inactive', 'Disabled']);
    expect(rows[3]?.isDisabled).toBe(true);
    expect(rows[1]?.joined).toBe('2026-10-10');
    expect(toInstructorRows([ins({ image: '', profile_picture: 'p.png' })])[0]?.photo).toBe('p.png');
  });

  test('filters: tab, qualification, cohorts bucket, joined range, search', () => {
    const f = EMPTY_INSTRUCTOR_FILTERS;
    expect(filterInstructors(rows, { ...f, tab: 'Disabled' }, NOW).map((r) => r.id)).toEqual(['4']);
    expect(filterInstructors(rows, { ...f, qualification: 'MBA' }, NOW).map((r) => r.id)).toEqual(['1', '4']);
    expect(filterInstructors(rows, { ...f, cohorts: '0' }, NOW).map((r) => r.id)).toEqual(['1']);
    expect(filterInstructors(rows, { ...f, cohorts: '2+' }, NOW).map((r) => r.id)).toEqual(['2', '4']);
    expect(filterInstructors(rows, { ...f, range: '30' }, NOW).map((r) => r.id)).toEqual(['2', '3', '4']);
    expect(filterInstructors(rows, { ...f, search: 'RISHA@' }, NOW).map((r) => r.id)).toEqual(['4']);
    expect(filterInstructors(rows, { ...f, search: 'english' }, NOW).map((r) => r.id)).toEqual(['2']);
  });

  test('tab counts ignore the tab but honour the other filters', () => {
    expect(instructorTabCounts(rows, { ...EMPTY_INSTRUCTOR_FILTERS, tab: 'Active' }, NOW)).toEqual({ all: 4, Active: 2, Inactive: 1, Disabled: 1 });
    expect(instructorTabCounts(rows, { ...EMPTY_INSTRUCTOR_FILTERS, cohorts: '2+' }, NOW).all).toBe(2);
  });

  test('sort, options, csv and WhatsApp number', () => {
    expect(sortInstructors(rows, 'cohorts', 'desc').map((r) => r.id)).toEqual(['4', '2', '3', '1']);
    expect(sortInstructors(rows, 'name', 'asc')[0]?.name).toBe('Abhirami');
    expect(qualificationOptions(rows)).toEqual(['M A English', 'MBA']);
    const csv = instructorCsvRows(rows.slice(1, 2), (d) => d.split('-').reverse().join('/'));
    expect(csv[1]).toEqual(['Abhirami', '+91 9000000001', 'a@x.in', 'M A English', 2, '10/10/2026', 'Active']);
    expect(waNumber('+91 98470 12345')).toBe('919847012345');
    expect(waNumber('12')).toBe('');
  });
});

describe('instructor detail model', () => {
  const model = toInstructorOverview({
    profile: { id: 7, name: 'Nayana', status: 1, disabled: false, biography: '<p>Hi &amp; welcome</p><p>Two</p>' },
    cohorts: [
      { id: 1, title: 'DMTT A', cohortCode: 'C1', courseTitle: 'Diploma', startDate: '2026-09-01', endDate: '2026-12-31', learnerCount: 20, upcomingSessionCount: 3 },
      { id: 2, title: 'ECE B', cohortCode: 'C2', courseTitle: 'ECE', startDate: '2026-11-01', endDate: null, learnerCount: 5, upcomingSessionCount: 0 },
      { id: 3, title: 'Old', cohortCode: 'C3', courseTitle: 'ECE', startDate: '2025-01-01', endDate: '2025-06-01', learnerCount: 9, upcomingSessionCount: 0 },
    ],
    liveClasses: [
      { id: 10, title: 'Past one', date: '2026-10-01', fromTime: '10:00', toTime: '11:00', cohortTitle: 'DMTT A' },
      { id: 11, title: 'Today', date: '2026-10-12', fromTime: '14:00', toTime: '15:00', cohortTitle: 'DMTT A' },
      { id: 12, title: 'Next', date: '2026-10-20', fromTime: '09:00', toTime: '10:00', cohortTitle: 'ECE B' },
      { id: 13, title: 'Older', date: '2026-09-01', fromTime: '09:00', toTime: '10:00', cohortTitle: 'DMTT A' },
    ],
    assignments: [
      { id: 20, title: 'Album', cohortTitle: 'DMTT A', dueDate: '2026-10-05', totalMarks: 50, submissionCount: 10, gradedCount: 7, pendingCount: 3 },
      { id: 21, title: 'Essay', cohortTitle: 'ECE B', dueDate: '2026-10-25', totalMarks: null, submissionCount: 0, gradedCount: 0, pendingCount: 0 },
      { id: 22, title: 'Notes', cohortTitle: 'DMTT A', dueDate: '2026-09-25', totalMarks: 20, submissionCount: 4, gradedCount: 4, pendingCount: 0 },
    ],
  });
  const today = '2026-10-12';

  test('phases come from the real dates', () => {
    expect(model.cohorts.map((c) => cohortPhase(c, today))).toEqual(['Ongoing', 'Upcoming', 'Completed']);
    expect(cohortPhase({ startDate: '', endDate: '' }, today)).toBe('Undated');
    expect(model.sessions.map((s) => sessionPhase(s, today))).toEqual(['Past', 'Today', 'Upcoming', 'Past']);
  });

  test('stats: seats, past sessions, ungraded submissions', () => {
    expect(instructorStats(model, today)).toEqual({ cohorts: 3, learners: 34, sessionsDone: 2, pendingEval: 3 });
  });

  test('filters and schedule order (upcoming soonest first, then past newest first)', () => {
    expect(filterCohorts(model.cohorts, 'ece', '', today).map((c) => c.id)).toEqual([2, 3]);
    expect(filterCohorts(model.cohorts, '', 'Completed', today).map((c) => c.id)).toEqual([3]);
    expect(filterSessions(model.sessions, '', '', today).map((s) => s.id)).toEqual([11, 12, 10, 13]);
    expect(filterSessions(model.sessions, 'ece', '', today).map((s) => s.id)).toEqual([12]);
    expect(model.assignments.map(assignmentState)).toEqual(['pending', 'none', 'done']);
    expect(filterAssignments(model.assignments, '', 'done').map((a) => a.id)).toEqual([22]);
    expect(model.assignments[1]?.totalMarks).toBeNull();
  });

  test('server totals (over capped-off rows too) drive the stats; cap note only when capped', () => {
    const capped = toInstructorOverview({
      profile: {}, cohorts: [{ id: 1, learnerCount: 5 }], liveClasses: [], assignments: [{ id: 2, pendingCount: 1 }],
      totals: { cohorts: 130, assignments: 240, learners: 900, pendingEval: 37 },
    });
    expect(instructorStats(capped, today)).toEqual({ cohorts: 130, learners: 900, sessionsDone: 0, pendingEval: 37 });
    expect(cappedNote(100, 130, 'cohorts')).toBe('Showing latest 100 of 130 cohorts.');
    expect(cappedNote(3, 3, 'cohorts')).toBe('');
  });

  test('biography is shown as text, never markup', () => {
    expect(biographyText(model.profile.biography)).toBe('Hi & welcome\nTwo');
    expect(biographyText('<script>alert(1)</script>ok')).toBe('alert(1)ok');
  });
});

describe('admin users model', () => {
  const rows = toAdminUserRows(
    [{ id: 1, name: 'Naji', user_email: 'naji@x.in', phone: '900', status: 1, created_at: '2025-01-10T05:00:00Z' }],
    [
      { id: 2, name: 'Risha', user_email: 'risha@x.in', phone: '901', status: 0, created_at: '2026-05-01T05:00:00Z' },
      { id: 3, name: 'Ishfaq', user_email: 'ish@x.in', phone: '902', status: 1, disabled_at: '2026-06-01', created_at: '2026-06-01T05:00:00Z' },
    ],
    { '1': '2026-10-10T04:30:00.000Z', '3': '2026-09-01T04:30:00.000Z' },
  );

  test('role comes from the list the row came from (the rows carry no role_id)', () => {
    expect(rows.map((r) => [r.id, r.roleLabel, r.status])).toEqual([
      ['1', 'Super Admin', 'Active'], ['2', 'Admin', 'Inactive'], ['3', 'Admin', 'Disabled'],
    ]);
    expect(rows[0]?.raw.role_id).toBe(1);
    expect(rows[1]?.lastSignIn).toBe('');
  });

  test('filters, KPI counts, sort (never-signed-in last) and csv', () => {
    expect(filterAdminUsers(rows, { ...EMPTY_ADMIN_FILTERS, role: '8' }).map((r) => r.id)).toEqual(['2', '3']);
    expect(filterAdminUsers(rows, { ...EMPTY_ADMIN_FILTERS, from: '2026-01-01', to: '2026-05-31' }).map((r) => r.id)).toEqual(['2']);
    expect(filterAdminUsers(rows, { ...EMPTY_ADMIN_FILTERS, search: 'ISH@' }).map((r) => r.id)).toEqual(['3']);
    expect(adminStatusCounts(rows, { ...EMPTY_ADMIN_FILTERS, tab: 'Active', role: '8' })).toEqual({ all: 2, Active: 0, Inactive: 1, Disabled: 1 });
    expect(sortAdminUsers(rows, 'lastSignIn', 'desc').map((r) => r.id)).toEqual(['1', '3', '2']);
    expect(sortAdminUsers(rows, 'lastSignIn', 'asc').map((r) => r.id)).toEqual(['3', '1', '2']);
    const csv = adminUserCsvRows(rows.slice(0, 1), (d) => d, (i) => (i ? 'when' : ''));
    expect(csv[1]).toEqual(['Naji', 'naji@x.in', '900', 'Super Admin', 'Active', '2025-01-10', 'when']);
  });
});

describe('roles model', () => {
  const roles = toRoleRows([{ roleId: 1, total: 2, disabled: 0 }, { roleId: 3, total: 13, disabled: 4 }]);

  test('one row per built-in role, real counts, codes from the role id', () => {
    expect(roles.map((r) => r.roleId)).toEqual(ROLE_DEFS.map((d) => d.roleId));
    expect(roles.find((r) => r.roleId === 3)).toMatchObject({ code: 'ROLE-03', users: 13, disabled: 4, access: 'role' });
    expect(roles.find((r) => r.roleId === 8)?.users).toBe(0);
    expect(roleCode(10)).toBe('ROLE-10');
  });

  test('role filters and csv', () => {
    expect(filterRoles(roles, { ...EMPTY_ROLE_FILTERS, assignedOnly: true }).map((r) => r.roleId)).toEqual([1, 3]);
    expect(filterRoles(roles, { ...EMPTY_ROLE_FILTERS, access: 'grants' }).map((r) => r.roleId)).toEqual([8]);
    expect(filterRoles(roles, { ...EMPTY_ROLE_FILTERS, search: 'role-07' }).map((r) => r.roleId)).toEqual([7]);
    expect(roleCsvRows(roles.slice(0, 1))[1]?.slice(0, 5)).toEqual(['ROLE-01', 'Super Admin', expect.any(String), 'All permissions', 2]);
  });

  test('grant rows keep the old page rules (null status = active, only role 8 managed)', () => {
    const grants = toGrantRows([
      { user_id: 5, name: 'Naji', email: 'n@x.in', role_id: 1, role_label: 'Super Admin', status: null, granted_count: 17, permission_managed: false },
      { user_id: 6, name: 'Risha', email: 'r@x.in', role_id: 8, role_label: 'Admin', status: 0, granted_count: 4, permission_managed: true },
    ]);
    expect(grants.map((g) => [g.active, g.managed])).toEqual([[true, false], [false, true]]);
    expect(filterGrantRows(grants, '', '8').map((g) => g.userId)).toEqual([6]);
    expect(filterGrantRows(grants, 'N@X', '').map((g) => g.userId)).toEqual([5]);
  });
});
