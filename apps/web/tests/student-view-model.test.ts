import { describe, expect, test } from 'vitest';

import {
  accountStatusLabel,
  courseStatusLabel,
  formatDuration,
  offeringSortKey,
  pipelineRoleIds,
  progressLabel,
  recentCount,
  scopePaymentSchedule,
  serverResult,
  subjectProgress,
  toUserOptions,
  withPaidDateStatus,
} from '../src/admin/pages/students/student-view/student-view-model';

// The Student View's logic, moved verbatim out of the old single-file page.

describe('account vs course status (Risha UAT 2026-07-27)', () => {
  test('a disabled login reads Inactive regardless of users.status', () => {
    expect(accountStatusLabel({ disabled_at: '2026-01-01', status_label: 'Active' })).toBe('Inactive');
    expect(accountStatusLabel({ status_label: 'Active' })).toBe('Active');
    expect(accountStatusLabel(null)).toBe('Active');
  });

  test('course status rolls up the enrolments', () => {
    expect(courseStatusLabel([])).toBe('');
    expect(courseStatusLabel([{ status: 'Completed' }, { enrollment_status: 'graduated' }])).toBe('Completed');
    expect(courseStatusLabel([{ status: 'Dropout' }])).toBe('Dropout');
    expect(courseStatusLabel([{ status: 'Completed' }, { status: 'Active' }])).toBe('Partly completed');
    expect(courseStatusLabel([{}])).toBe('Active');
  });
});

describe('scopePaymentSchedule (Naji 2026-07-06)', () => {
  const schedule = [{ id: 1, course_id: 7 }, { id: 2, course_id: 9 }];
  test('keeps only rows for enrolled courses', () => {
    expect(scopePaymentSchedule(schedule, [{ course_id: 7 }]).map((r) => r.id)).toEqual([1]);
  });
  test('falls back to every row when no enrolment course is known', () => {
    expect(scopePaymentSchedule(schedule, [{ course_id: null }])).toHaveLength(2);
  });
});

describe('withPaidDateStatus', () => {
  const base = { installment_details: 'I1', amount: '100', due_date: '2026-01-01', paid_date: '', payment_mode: '', status: 'Pending' };
  test('a paid date makes the row Paid', () => {
    expect(withPaidDateStatus({ ...base, paid_date: '2026-01-02' }).status).toBe('Paid');
  });
  test('no paid date leaves the status alone and never mutates the input', () => {
    const input = { ...base, status: 'Overdue' };
    expect(withPaidDateStatus(input).status).toBe('Overdue');
    expect(input.status).toBe('Overdue');
  });
});

describe('subjectProgress', () => {
  test('lessons complete only when every file is done; pace against 60%', () => {
    const rows = subjectProgress([
      { subject_id: 2, subject_title: 'B', subject_order: 2, lesson_id: 1, status: 1 },
      { subject_id: 1, subject_title: 'A', subject_order: 1, lesson_id: 2, status: 1 },
      { subject_id: 1, subject_title: 'A', subject_order: 1, lesson_id: 2, status: 0 },
      { subject_id: 1, subject_title: 'A', subject_order: 1, lesson_id: 3, status: 1 },
      { subject_title: 'loose', lesson_file_id: 9, status: 0 },
    ]);
    expect(rows.map((r) => r.title)).toEqual(['A', 'B', 'loose']);
    expect(rows[0]).toMatchObject({ completedLessons: 1, totalLessons: 2, pct: 67, pace: 'On track' });
    expect(rows[1]).toMatchObject({ pct: 100, pace: 'Ahead' });
    expect(rows[2]).toMatchObject({ pct: 0, pace: 'Behind' });
  });
});

describe('small helpers', () => {
  test('recentCount', () => {
    expect(recentCount([{ created_at: '2026-10-10T00:00:00Z' }, { updated_at: '2026-01-01T00:00:00Z' }, {}], Date.parse('2026-10-01T00:00:00Z'))).toBe(1);
  });

  test('offerings sort by the trailing month-year, unknowns last', () => {
    const a = offeringSortKey({ title: 'Diploma - May 2026' });
    const b = offeringSortKey({ title: 'Diploma - January 2026' });
    expect(b).toBeLessThan(a);
    expect(offeringSortKey({ title: 'No date' })).toBe(Number.MAX_SAFE_INTEGER);
  });

  test('pipeline roles and de-duplicated user options', () => {
    expect(pipelineRoleIds('Admin')).toEqual([1, 8]);
    expect(pipelineRoleIds('Centre')).toEqual([]);
    expect(toUserOptions([{ id: 1, name: 'A' }, { id: 1, name: 'A again' }, { id: 2, user_email: 'b@x' }, { name: 'no id' }]))
      .toEqual([{ value: '1', label: 'A' }, { value: '2', label: 'b@x' }]);
  });

  test('labels', () => {
    expect(progressLabel(100)).toBe('Completed');
    expect(progressLabel(5)).toBe('In progress');
    expect(progressLabel(0)).toBe('Not started');
    expect(formatDuration(0)).toBe('-');
    expect(formatDuration(45 * 60)).toBe('45m');
    expect(formatDuration(90 * 60)).toBe('1h 30m');
  });

  test('serverResult reads the envelope', () => {
    expect(serverResult({ status: 0, message: 'You cannot disable your own account.' }, 'ok')).toEqual({ ok: false, message: 'You cannot disable your own account.' });
    expect(serverResult({ status: 1, message: 'success' }, 'Saved.')).toEqual({ ok: true, message: 'Saved.' });
  });
});
