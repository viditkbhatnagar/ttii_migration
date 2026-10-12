import { describe, expect, test } from 'vitest';

import {
  EMPTY_FILTERS,
  csvRows,
  daysBefore,
  filterOptions,
  filterRows,
  formatIst,
  formatSeconds,
  inTab,
  lastGradedAt,
  sortRows,
  statusDetail,
  tabCounts,
  timelineEvents,
  toSubmissionDetail,
  toSubmissionRows,
  windowLabel,
} from '../src/admin/pages/exam_submissions/exam-submissions-model';

const base = {
  type: 'regular', attemptNo: 1, sittingId: 23, examId: 22, examCode: 'TTIIEXM2600022', examTitle: 'Diploma Regular',
  subject: 'Child Psychology', courseIds: [5], courses: ['Diploma in Montessori'], date: '2026-10-05', toDate: '2026-10-05',
  startTime: '10:00', endTime: '11:30', durationMinutes: 60, openAt: '2026-10-05T04:30:00.000Z', closeAt: '2026-10-05T06:00:00.000Z',
  evaluation: 'none', result: 'not_published', resultsPublished: false, descriptiveAnswered: 0, descriptiveGraded: 0, descriptiveMarks: 0,
};

const rows = toSubmissionRows({
  from: '2026-09-12',
  to: '',
  rows: [
    { ...base, key: 'a', userId: 1, studentName: 'Ananya Sharma', studentCode: 'TTS0001', status: 'submitted', submittedAt: '2026-10-05T05:15:00.000Z', timeTakenSeconds: 2400, score: 40, totalMarks: 70, evaluation: 'pending', descriptiveAnswered: 2, descriptiveGraded: 1, descriptiveMarks: 4 },
    { ...base, key: 'b', userId: 2, studentName: 'Rahul Verma', studentCode: 'TTS0002', status: 'auto_submitted', autoKind: 'server', evaluation: 'auto', resultsPublished: true, result: 'pass' },
    { ...base, key: 'c', userId: 3, studentName: 'Meera Iyer', studentCode: 'TTS0003', status: 'missed', missedReason: 'nothing_answered', resultsPublished: true, result: 'absent' },
    { ...base, key: 'd', userId: 4, studentName: 'Karthik Rao', studentCode: 'TTS0004', status: 'in_progress', activity: 'active', answered: 12, questionCount: 50, subject: 'Montessori', examId: 30, examTitle: 'Single paper', courseIds: [6], courses: ['PG Diploma'] },
    { ...base, key: 'e', userId: 3, studentName: 'Meera Iyer', type: 'reexam', attemptNo: 2, status: 'scheduled', date: '2026-10-15', openAt: '2026-10-15T04:30:00.000Z' },
    { ...base, key: '', userId: 9, status: 'bogus' },
  ],
});

describe('parsing the list', () => {
  test('rows without a key are dropped; unknown values fall back safely', () => {
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ status: 'submitted', score: 40, evaluation: 'pending', autoKind: null });
    expect(rows[4]?.type).toBe('reexam');
    expect(toSubmissionRows(null)).toEqual([]);
  });
});

describe('tabs and filters', () => {
  test('tab counts — submitted and auto submitted are separate; upcoming is scheduled', () => {
    expect(tabCounts(rows)).toEqual({
      in_progress: 1, upcoming: 1, submitted: 1, auto_submitted: 1, missed: 1,
      evaluation_pending: 1, results_published: 2, all: 5,
    });
    expect(inTab(rows[4]!, 'upcoming')).toBe(true);
  });

  test('search covers name, student ID, exam and subject', () => {
    expect(filterRows(rows, { ...EMPTY_FILTERS, search: 'tts0002' }).map((r) => r.key)).toEqual(['b']);
    expect(filterRows(rows, { ...EMPTY_FILTERS, search: 'montessori' }).map((r) => r.key)).toEqual(['d']);
  });

  test('course, exam, type, status, evaluation and result filters', () => {
    expect(filterRows(rows, { ...EMPTY_FILTERS, courseId: '6' }).map((r) => r.key)).toEqual(['d']);
    expect(filterRows(rows, { ...EMPTY_FILTERS, examId: '22' })).toHaveLength(4);
    expect(filterRows(rows, { ...EMPTY_FILTERS, type: 'reexam' }).map((r) => r.key)).toEqual(['e']);
    expect(filterRows(rows, { ...EMPTY_FILTERS, status: 'missed' }).map((r) => r.key)).toEqual(['c']);
    expect(filterRows(rows, { ...EMPTY_FILTERS, evaluation: 'auto' }).map((r) => r.key)).toEqual(['b']);
    expect(filterRows(rows, { ...EMPTY_FILTERS, result: 'absent' }).map((r) => r.key)).toEqual(['c']);
  });

  test('options come from the loaded rows', () => {
    const o = filterOptions(rows);
    expect(o.exams.map((e) => e.label)).toEqual(['Diploma Regular', 'Single paper']);
    expect(o.courses).toEqual([{ value: '5', label: 'Diploma in Montessori' }, { value: '6', label: 'PG Diploma' }]);
  });

  test('sorting by schedule and by status', () => {
    expect(sortRows(rows, 'schedule', 'desc')[0]?.key).toBe('e');
    expect(sortRows(rows, 'status', 'asc')[0]?.key).toBe('d');
    expect(sortRows(rows, 'student', 'asc').map((r) => r.studentName)[0]).toBe('Ananya Sharma');
  });
});

describe('formatting in IST', () => {
  test('an instant shows in IST whatever the browser zone', () => {
    expect(formatIst('2026-10-05T05:15:00.000Z')).toBe('05/10/2026, 10:45 AM');
    expect(formatIst(null)).toBe('');
  });

  test('durations and windows', () => {
    expect(formatSeconds(2400)).toBe('40m');
    expect(formatSeconds(3900)).toBe('1h 05m');
    expect(windowLabel(rows[0]!)).toBe('05/10/2026 10:00 AM – 11:30 AM');
  });

  test('status detail lines', () => {
    const now = Date.parse('2026-10-12T06:30:00Z');
    expect(statusDetail(rows[1]!, now)).toMatch(/server/);
    expect(statusDetail(rows[2]!, now)).toBe('Opened, nothing answered');
    expect(statusDetail(rows[3]!, now)).toBe('Active now');
    expect(statusDetail(rows[4]!, now)).toBe('Opens 15/10/2026, 10:00 AM');
  });

  test('CSV keeps written marks out of the score column', () => {
    const csv = csvRows([rows[0]!], 0);
    expect(csv[0]).toContain('Written marks (not in score)');
    expect(csv[1]).toContain(40);
    expect(csv[1]).toContain(4);
  });

  test('daysBefore uses local date parts', () => {
    expect(daysBefore(new Date(2026, 9, 12), 30)).toBe('2026-09-12');
  });
});

describe('detail', () => {
  test('timeline for a missed sitting and for a re-exam', () => {
    const now = Date.parse('2026-10-12T06:30:00Z');
    expect(timelineEvents(rows[2]!, null, now).map((e) => e.label)).toEqual([
      'Exam window opens', 'Student started', 'Window closed — nothing submitted', 'Result published',
    ]);
    expect(timelineEvents(rows[4]!, null, now)[0]).toMatchObject({ label: 'Re-exam scheduled', done: true });
    expect(timelineEvents(rows[0]!, null, now).map((e) => e.label)).toContain('Written answers graded');
  });

  test('parses the detail payload; an empty one is null', () => {
    const d = toSubmissionDetail({
      rows: [{ ...base, key: 'a', userId: 1, status: 'submitted' }],
      attempts: [{ attemptId: 7001, type: 'regular', submitted: true, score: 30 }],
      grades: [{ attemptId: 7001, questionId: 9, score: 4, gradedAt: '2026-10-06T05:00:00.000Z' }, { attemptId: 7001, questionId: 10, score: 2, gradedAt: '2026-10-07T05:00:00.000Z' }],
      studentEmail: 'a@example.com',
    });
    expect(d?.attempts[0]).toMatchObject({ attemptId: 7001, submitted: true });
    expect(lastGradedAt(d?.grades ?? [], 7001)).toBe('2026-10-07T05:00:00.000Z');
    expect(toSubmissionDetail({ rows: [] })).toBeNull();
  });
});
