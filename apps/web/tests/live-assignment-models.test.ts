import { describe, expect, test } from 'vitest';

import {
  EMPTY_LIVE_FILTERS,
  filterLive,
  joinHref,
  liveTabCounts,
  sortLive,
  toLiveRows,
} from '../src/admin/pages/live_class/live-session-list-model';
import {
  evalCounts,
  filterEval,
  filterSummary,
  showsMarks,
  sortEval,
  submittedPercent,
  summaryCounts,
  toEvalRows,
  toSummaryRows,
} from '../src/admin/pages/assignment/assignment-model';

// 14 Jul 2026, 18:00 IST.
const NOW = Date.UTC(2026, 6, 14, 12, 30);

const live = toLiveRows([
  { id: 1, session_id: 'LS-1', title: 'Food (part-2)', cohort_id: 92, cohort_title: 'Child Care - July', course_title: 'Diploma', date: '2026-07-14T00:00:00.000Z', fromTime: '1970-01-01T19:30:00.000Z', toTime: '1970-01-01T20:30:00.000Z', platform: 'teams', join_url: 'https://teams/1' },
  { id: 2, session_id: 'LS-2', title: 'Chapter 4', cohort_id: 93, cohort_title: 'TEP - July', course_title: 'PG Diploma', date: '2026-07-14T00:00:00.000Z', fromTime: '1970-01-01T02:00:00.000Z', toTime: '1970-01-01T03:15:00.000Z', platform: 'teams' },
  { id: 3, session_id: 'LS-3', title: 'Old', cohort_id: 93, cohort_title: 'TEP - July', date: '2026-06-01T00:00:00.000Z', fromTime: '1970-01-01T10:00:00.000Z', toTime: '1970-01-01T11:00:00.000Z', zoom_id: '999', join_url: 'zoom-id-only' },
], NOW);

describe('live sessions list', () => {
  test('a class later today is Upcoming; one that already ended today is Past', () => {
    expect(live.map((s) => [s.id, s.upcoming])).toEqual([['1', true], ['2', false], ['3', false]]);
    expect(liveTabCounts(live)).toEqual({ all: 3, upcoming: 1, past: 2 });
  });

  test('platform labels, filters and date sort', () => {
    expect(live[2]?.platform).toBe('Zoom');
    expect(filterLive(live, { ...EMPTY_LIVE_FILTERS, cohortId: '93', tab: 'past' }).map((s) => s.id)).toEqual(['2', '3']);
    expect(filterLive(live, { ...EMPTY_LIVE_FILTERS, date: '2026-06-01' }).map((s) => s.id)).toEqual(['3']);
    expect(filterLive(live, { ...EMPTY_LIVE_FILTERS, search: 'part-2' }).map((s) => s.id)).toEqual(['1']);
    expect(sortLive(live, 'date', 'desc').map((s) => s.id)).toEqual(['1', '2', '3']);
  });

  test('only http(s) links become a Join button', () => {
    expect(joinHref(live[0]!)).toBe('https://teams/1');
    expect(joinHref(live[2]!)).toBe('');
  });
});

describe('assignment summary', () => {
  const rows = toSummaryRows([
    { id: 1, title: 'Child Psychology', course_title: 'Diploma', cohort_title: 'CP MAY 26', total_marks: 30, due_date: '2026-06-10T00:00:00.000Z', total_students: 21, submission_count: 8, evaluated_count: 8 },
    { id: 2, title: 'Parent Teacher', cohort_id: 7, total_marks: 30, total_students: 14, submission_count: 8, evaluated_count: 5 },
    { id: 3, title: 'Fresh', cohort_id: 7, total_students: 0, submission_count: 0, evaluated_count: 0 },
    { id: 4, title: '' },
  ]);

  test('legacy rows with no title and no course/cohort are dropped', () => {
    expect(rows.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  test('pending = no submissions yet or any ungraded', () => {
    expect(summaryCounts(rows)).toEqual({ pending: 2, completed: 1, all: 3 });
    expect(filterSummary(rows, 'pending', '').map((r) => r.id)).toEqual(['2', '3']);
    expect(filterSummary(rows, 'all', 'cp may').map((r) => r.id)).toEqual(['1']);
    expect(submittedPercent(rows[0]!)).toBe(38);
    expect(submittedPercent(rows[2]!)).toBe(0);
    expect(rows[0]?.dueYmd).toBe('2026-06-10');
  });
});

describe('assignment evaluation', () => {
  const rows = toEvalRows([
    { id: 11, status: 'pending_evaluation', student_name: 'Archana', student_id: 'TTS0005', assignment_id: 41, submitted_at: '2026-07-14T05:00:00.000Z' },
    { id: 12, status: 'pending_verification', student_name: 'Anakha', marks: '28', total_marks: 30, submitted_at: '2026-07-13T05:00:00.000Z' },
    { id: 13, status: 'result_published', student_name: 'Shifa', marks: '25', submitted_at: '2026-07-12T05:00:00.000Z' },
    { id: 14, status: 'bogus', student_name: 'X', submitted_at: '2026-07-15T05:00:00.000Z' },
  ]);

  test('unknown statuses fall back to Pending Evaluation; counts per tab', () => {
    expect(evalCounts(rows)).toEqual({ pending_evaluation: 2, pending_verification: 1, result_published: 1, returned: 0 });
  });

  test('tab + search + newest first', () => {
    expect(sortEval(filterEval(rows, 'pending_evaluation', ''), 'submitted', 'desc').map((r) => r.id)).toEqual(['14', '11']);
    expect(filterEval(rows, 'pending_evaluation', 'tts0005').map((r) => r.id)).toEqual(['11']);
    expect(showsMarks('pending_verification')).toBe(true);
    expect(showsMarks('pending_evaluation')).toBe(false);
  });
});
