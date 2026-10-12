import { describe, expect, test } from 'vitest';

import {
  activityText,
  dayLabel,
  formatWhen,
  monthLabel,
  pct,
  pendingTasks,
  pipelineStages,
  questionBars,
  resultsHref,
  statusBars,
  toExamDashboard,
} from '../src/admin/pages/exam_dashboard/exam-dashboard-model';

// TTII 2026-10-12 — Exam → Dashboard. The page shows only real figures from
// /admin/exam_dashboard/summary; these pin the parsing and the wording.

const RAW = {
  generatedAt: '2026-10-12T09:30:00.000Z',
  status: { total: 9, draft: 2, upcoming: 1, inProgress: 2, ready: 1, published: 3 },
  reExamsScheduled: 4,
  questionBank: { total: 1200, mcq: 900, descriptive: 300, other: 0, subjects: 12, addedLast30Days: 48 },
  conduct: { openSittings: 1, papersInProgress: 6 },
  allocationPending: [{ examId: 30, title: 'PG Diploma Supplementary', count: 0 }],
  awaitingMarking: { papers: 0, exams: [] },
  readyToPublish: [{ examId: 28, title: 'PG Diploma Regular', count: 41 }],
  reExamNeeds: { papers: 5, students: 4, exams: [{ examId: 22, title: 'Diploma Regular', count: 3 }, { examId: 28, title: 'PG Diploma Regular', count: 2 }] },
  upcoming: [{ key: 's1', kind: 'sitting', examId: 28, title: 'PG Diploma Regular', fromDate: '2026-10-15', toDate: '2026-10-15', status: 'upcoming', students: 41 }],
  trend: [{ month: '2026-10', created: 2, held: 5, published: 1 }],
  participation: { days: 30, expected: 10, appeared: 8, absent: 2, passed: 6, failed: 2 },
  activity: [
    { kind: 'reexam_scheduled', at: '2026-10-12T04:00:00.000Z', actor: 'Risha', examId: 22, title: 'Diploma Regular', count: 3 },
    { kind: 'something_new', at: '2026-10-12T03:00:00.000Z', actor: 'X', examId: 1, title: 'x', count: 1 },
    { kind: 'questions_added', at: '2026-10-11T04:00:00.000Z', actor: '', examId: null, title: '', count: 1 },
  ],
};

describe('toExamDashboard', () => {
  test('parses the summary; unknown activity kinds are dropped and blanks get defaults', () => {
    const d = toExamDashboard(RAW);
    expect(d.status.total).toBe(9);
    expect(d.upcoming[0]).toMatchObject({ kind: 'sitting', status: 'upcoming', students: 41 });
    expect(d.activity.map((a) => a.kind)).toEqual(['reexam_scheduled', 'questions_added']);
    expect(d.activity[1]).toMatchObject({ actor: 'Someone', examId: null, count: 1 });
  });

  test('a missing or malformed payload reads as an empty dashboard, never a crash', () => {
    const d = toExamDashboard(null);
    expect(d.status).toEqual({ total: 0, draft: 0, upcoming: 0, inProgress: 0, ready: 0, published: 0 });
    expect(d.upcoming).toEqual([]);
    expect(pendingTasks(d)).toEqual([]);
  });
});

describe('pipeline and tasks', () => {
  const d = toExamDashboard(RAW);

  test('eight stages in order; eligibility says it is not set up rather than inventing a number', () => {
    const stages = pipelineStages(d);
    expect(stages.map((s) => s.label)).toEqual([
      'Question Bank', 'Exam Creation', 'Student Eligibility', 'Student Allocation',
      'Exam Conduct', 'Evaluation', 'Result Management', 'Published',
    ]);
    expect(stages[2]).toMatchObject({ value: 'Not set up', href: '/admin/exam/eligibility/index' });
    expect(stages[1]?.caption).toBe('2 draft · 7 published');
    expect(stages[4]?.caption).toBe('open now · 6 papers in progress');
    // One exam ready: the stage opens that exam's result sheet.
    expect(stages[6]?.href).toBe('/admin/Exam_result/index?exam=28');
  });

  test('only tasks with something in them are listed', () => {
    const tasks = pendingTasks(d);
    expect(tasks.map((t) => t.key)).toEqual(['allocation', 'publish', 'reexam']);
    expect(tasks[0]).toMatchObject({ count: 1, label: 'exam has no students allocated', detail: 'PG Diploma Supplementary' });
    expect(tasks[2]).toMatchObject({ count: 4, href: '/admin/Exam_result/index', detail: '5 papers · Diploma Regular, PG Diploma Regular' });
  });

  test('results link opens the exam only when there is exactly one', () => {
    expect(resultsHref([])).toBe('/admin/Exam_result/index');
    expect(resultsHref([{ examId: 5, title: 'x', count: 1 }])).toBe('/admin/Exam_result/index?exam=5');
  });

  test('status bars add up to the total; an empty "other" question type is hidden', () => {
    expect(statusBars(d).reduce((n, b) => n + b.value, 0)).toBe(d.status.total);
    expect(questionBars(d).map((b) => b.label)).toEqual(['MCQ', 'Descriptive']);
  });
});

describe('wording and dates', () => {
  test('activity text', () => {
    const d = toExamDashboard(RAW);
    expect(activityText(d.activity[0]!)).toBe('scheduled 3 re-exams for “Diploma Regular”');
    expect(activityText(d.activity[1]!)).toBe('added 1 question to the Question Bank');
  });

  test('today and yesterday by the viewer’s own calendar day', () => {
    const now = new Date(2026, 9, 12, 15, 0);
    expect(formatWhen(new Date(2026, 9, 12, 9, 5).toISOString(), now)).toBe('Today · 9:05 AM');
    expect(formatWhen(new Date(2026, 9, 11, 18, 12).toISOString(), now)).toBe('Yesterday · 6:12 PM');
    expect(formatWhen(new Date(2026, 9, 1, 0, 30).toISOString(), now)).toBe('01/10/2026 · 12:30 AM');
    expect(formatWhen('not a date', now)).toBe('');
  });

  test('exam days are bare dates: never shifted by a time zone', () => {
    const now = new Date(2026, 9, 31, 23, 0);
    expect(dayLabel('2026-10-31', now)).toBe('Today');
    expect(dayLabel('2026-11-01', now)).toBe('Tomorrow');
    expect(dayLabel('2026-11-15', now)).toBe('15/11/2026');
    expect(dayLabel('', now)).toBe('—');
  });

  test('helpers', () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(5, 0)).toBe(0);
    expect(monthLabel('2026-10')).toBe('Oct');
    expect(monthLabel('bad')).toBe('bad');
  });
});
