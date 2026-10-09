import { describe, expect, test } from 'vitest';

import {
  formatHm,
  formatYmd,
  resultSheetCsv,
  toExamResultsDetail,
  type StudentResult,
  type StudentSitting,
} from '../src/admin/pages/exam_result/exam-results-model';
import { reExamCandidates } from '../src/admin/pages/exam_result/re-exam-candidates';

// TTII 2026-10-09 — Exam → Result and re-examination, the parts of the admin
// screen that encode a rule rather than a layout.

const cell = (over: Partial<StudentSitting> = {}): StudentSitting => ({
  examId: 24,
  status: 'pass',
  score: 60,
  totalMarks: 70,
  passMarks: 25,
  answered: 60,
  questionCount: 70,
  minutesTaken: 40,
  flag: null,
  reExam: null,
  previousScore: null,
  ...over,
});

const student = (userId: number, c: StudentSitting, name = `Student ${userId}`): StudentResult => ({
  userId,
  name,
  studentCode: `TTS${userId}`,
  sittings: [c],
  obtained: c.score ?? 0,
  maxMarks: 70,
  percentage: 0,
  subjectsPassed: c.status === 'pass' ? 1 : 0,
  subjectsTotal: 1,
  overall: 'passed',
  flagged: c.flag !== null,
});

describe('who the re-exam dialog offers for a subject', () => {
  const students = [
    student(1, cell()),
    student(2, cell({ status: 'fail', score: 0, answered: 0, flag: 'Only 0 of 70 answers saved in 2 min — possible technical issue' })),
    student(3, cell({ status: 'absent', score: null })),
    student(4, cell({ status: 'fail', score: 17 })),
    student(5, cell({ status: 'reexam', score: null, reExam: { id: 9, date: '2026-10-20', startTime: '10:00', endTime: '11:30', state: 'scheduled' } })),
  ];

  test('a pass is never offered', () => {
    expect(reExamCandidates(students, 0).map((c) => c.userId)).not.toContain(1);
  });

  test('flagged and absent papers are ticked; a genuine fail is offered unticked', () => {
    const byId = new Map(reExamCandidates(students, 0).map((c) => [c.userId, c]));

    expect(byId.get(2)).toMatchObject({ preselect: true, tone: 'amber', note: 'Check · 0/70 answered' });
    expect(byId.get(3)).toMatchObject({ preselect: true, note: 'Absent' });
    expect(byId.get(4)).toMatchObject({ preselect: false, tone: 'rose', note: 'Failed · 17/70' });
  });

  test('a student who already has a re-exam is listed unticked — ticking moves it', () => {
    expect(reExamCandidates(students, 0).find((c) => c.userId === 5)).toMatchObject({ preselect: false, note: 'Re-exam 20/10' });
  });
});

describe('formatting', () => {
  test('dates and IST times are formatted by hand, never through a timezone', () => {
    expect(formatYmd('2026-10-20')).toBe('20/10/2026');
    expect(formatHm('14:00')).toBe('2:00 PM');
    expect(formatHm('00:30')).toBe('12:30 AM');
    expect(formatHm('12:05')).toBe('12:05 PM');
  });
});

describe('the result sheet export', () => {
  const detail = toExamResultsDetail({
    examId: 22,
    title: 'Diploma Regular',
    sittings: [{ examId: 24, subjectTitle: 'Child Psychology', date: '2026-08-11', totalMarks: 70, passMarks: 25, closed: true }],
    sheet: {
      students: [
        { userId: 1, name: '=HYPERLINK("x")', studentCode: 'TTS1', obtained: 66, maxMarks: 70, percentage: 94.3, subjectsPassed: 1, subjectsTotal: 1, overall: 'passed', flagged: false,
          sittings: [{ examId: 24, status: 'pass', score: 66, totalMarks: 70, passMarks: 25, reExam: { id: 9, date: '2026-10-20', startTime: '10:00', endTime: '11:30', state: 'completed' }, previousScore: 0 }] },
      ],
      subjects: [],
      totals: {},
    },
  });

  test('a re-exam mark says so, with the original beside it', () => {
    expect(resultSheetCsv(detail)).toContain('66 (re-exam; was 0)');
  });

  test('a name that looks like a formula stays text in Excel', () => {
    expect(resultSheetCsv(detail)).toContain('"\'=HYPERLINK(""x"")"');
  });
});
