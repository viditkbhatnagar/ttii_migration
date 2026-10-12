import { describe, expect, test } from 'vitest';

import {
  autoNameAndCode,
  buildCohortCode,
  cohortDurationDays,
  cohortFormError,
  cohortMonthLabel,
  cohortStatusOn,
  shortNameOf,
} from '../src/admin/pages/cohorts/cohort-form-model';
import { evaluatedCount, initials, splitSessions, toLearnerView, toSessionView } from '../src/admin/pages/cohorts/view/cohort-detail-model';

describe('cohort form rules', () => {
  test('name + code come from the subject short name and the start month', () => {
    expect(cohortMonthLabel('2026-01-05')).toBe('January 2026');
    expect(buildCohortCode('mm', '2026-01-05')).toBe('MMJAN26');
    expect(shortNameOf({ title: 'Child Psychology' })).toBe('Ch');
    expect(autoNameAndCode({ title: 'Child Psychology', short_name: 'CP' }, '2026-05-01')).toEqual({ title: 'Child Psychology - May 2026', code: 'CPMAY26' });
    expect(autoNameAndCode(null, '2026-05-01')).toBeNull();
    expect(autoNameAndCode({ title: 'X' }, '')).toBeNull();
  });

  test('a date-only start is never shifted to the previous month', () => {
    expect(buildCohortCode('CP', '2026-06-01')).toBe('CPJUN26');
  });

  test('validation', () => {
    expect(cohortFormError({ title: ' ', courseCount: 1, startDate: '', endDate: '' })).toBe('Cohort name is required.');
    expect(cohortFormError({ title: 'A', courseCount: 0, startDate: '', endDate: '' })).toBe('Pick at least one course.');
    expect(cohortFormError({ title: 'A', courseCount: 1, startDate: '2026-07-10', endDate: '2026-07-01' })).toMatch(/End date/);
    expect(cohortFormError({ title: 'A', courseCount: 2, startDate: '2026-07-01', endDate: '2026-07-01' })).toBeNull();
  });

  test('duration and status', () => {
    expect(cohortDurationDays('2026-07-01', '2026-07-31')).toBe(30);
    expect(cohortDurationDays('2026-07-01', '2026-07-01')).toBeNull();
    expect(cohortStatusOn('2026-07-01', '2026-07-31', '2026-08-01')).toBe('completed');
    expect(cohortStatusOn('2026-07-01', '2026-07-31', '2026-06-30')).toBe('upcoming');
    expect(cohortStatusOn('2026-07-01', '2026-07-31', '2026-07-31')).toBe('active');
    expect(cohortStatusOn('', '', '2026-07-31')).toBe('active');
  });
});

describe('cohort detail model', () => {
  test('a Teams session shows its host and joins on its URL', () => {
    const s = toSessionView({
      id: 738, session_id: 'LS-1', title: 'Chapter 4', platform: 'teams', host_email: 'host@x.in', join_url: 'https://teams/x',
      date: '2026-07-28T00:00:00.000Z', fromTime: '1970-01-01T14:00:00.000Z', toTime: '1970-01-01T15:15:00.000Z',
    });
    expect(s).toMatchObject({ platformLabel: 'Microsoft Teams', detailLabel: 'Host', detailValue: 'host@x.in', hostUrl: 'https://teams/x', date: '28 Jul 2026', time: '2:00 PM – 3:15 PM', completed: false });
  });

  test('legacy zoom rows open the zoom page; manual rows without a link cannot join', () => {
    expect(toSessionView({ id: 5, zoom_id: '123' })).toMatchObject({ platformLabel: 'Zoom', hostUrl: '/zoom/index/5' });
    expect(toSessionView({ id: 6, platform: 'manual', password: 'pw' })).toMatchObject({ hostUrl: '', detailLabel: 'Password', detailValue: 'pw' });
  });

  test('a session with a recording (Spaces or Vimeo) counts as completed', () => {
    const { upcoming, completed } = splitSessions([
      { id: 1 },
      { id: 2, recording_url: 'https://spaces/x' },
      { id: 3, video_url: 'https://vimeo.com/1' },
    ]);
    expect(upcoming.map((s) => s.id)).toEqual(['1']);
    expect(completed.map((s) => [s.id, s.spacesRecording, s.videoUrl])).toEqual([['2', 'https://spaces/x', ''], ['3', '', 'https://vimeo.com/1']]);
  });

  test('learners and submissions', () => {
    expect(toLearnerView({ id: 9, name: 'Shifa Shukoor', enrollment_id: 'E1' })).toMatchObject({ id: '9', name: 'SHIFA SHUKOOR', enrollmentId: 'E1' });
    expect(initials('SHIFA SHUKOOR')).toBe('SS');
    expect(initials('')).toBe('?');
    expect(evaluatedCount([{ marks: '28' }, { marks: '' }, { marks: null }, { marks: 0 }])).toBe(2);
  });
});
