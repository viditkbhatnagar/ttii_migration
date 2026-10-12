import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  addDaysYmd,
  allocationPending,
  awaitingMarking,
  batchByDay,
  conductNow,
  istYmd,
  lastMonths,
  monthlyTrend,
  participation,
  readyToPublish,
  recentActivity,
  reExamNeeds,
  reExamsScheduled,
  statusCounts,
  unpublishedPaperIds,
  type DashboardExamRow,
} from '../../src/operations/exam-dashboard.js';
import { computeExamResults, type ResultAttempt, type ResultReExam, type ResultSitting } from '../../src/operations/exam-results.js';
import { ExamResultsService, type ExamSheetBundle } from '../../src/operations/exam-results-service.js';
import { hasAnswerText } from '../../src/operations/written-answers.js';

// TTII 2026-10-12 — Exam → Dashboard. Every figure comes from the rows the
// Exams list and the Result sheets already produce; these pin how they are
// aggregated, and that IST — not the server's UTC clock — decides days and months.

const IST = (5 * 60 + 30) * 60 * 1000;
const ist = (y: number, mo: number, d: number, h: number, m = 0): number => Date.UTC(y, mo - 1, d, h, m) - IST;
const NOW = ist(2026, 10, 12, 15);

function row(over: Partial<DashboardExamRow> & { examId: number }): DashboardExamRow {
  return { title: `Exam ${over.examId}`, isPractice: false, phase: 'completed', allocated: 10, resultsPublished: false, ...over };
}

function attempt(id: number, examId: number, userId: number, over: Partial<ResultAttempt> = {}): ResultAttempt {
  return {
    attemptId: id, examId, userId, score: 40, questionCount: 50, skipped: 0, submitted: true,
    startTime: null, endTime: null, createdAt: new Date(ist(2026, 10, 1, 19, 35)), ...over,
  };
}

/** A two-subject exam: 101 held 1 Oct (closed), 102 open right now. */
function bundle(over: { status?: ExamSheetBundle['status']; attempts?: ResultAttempt[]; reExams?: ResultReExam[] } = {}): ExamSheetBundle {
  const sittings: ResultSitting[] = [
    { examId: 101, subjectTitle: 'Child Psychology', date: '2026-10-01', totalMarks: 70, passMarks: 25, closed: true },
    { examId: 102, subjectTitle: 'Child Care', date: '2026-10-12', totalMarks: 70, passMarks: 25, closed: false },
  ];
  const students = [
    { userId: 1, name: 'Asha', studentCode: 'TTS1' },
    { userId: 2, name: 'Bindu', studentCode: 'TTS2' },
    { userId: 3, name: 'Chitra', studentCode: 'TTS3' },
  ];
  const attempts = over.attempts ?? [
    attempt(1, 101, 1),
    // Two answers saved of fifty — flagged as a likely technical failure.
    attempt(2, 101, 2, { score: 2, skipped: 48 }),
    // Chitra missed sitting 101. Asha has started 102 and not yet submitted.
    attempt(3, 102, 1, { submitted: false, score: 0 }),
  ];
  return {
    examId: 22,
    title: 'Diploma Regular',
    status: over.status ?? 'in_progress',
    sittings: [
      { examId: 101, openMs: ist(2026, 10, 1, 19, 30), closeMs: ist(2026, 10, 1, 20, 45) },
      { examId: 102, openMs: ist(2026, 10, 12, 14), closeMs: ist(2026, 10, 12, 16) },
    ],
    sheet: computeExamResults(sittings, students, attempts, over.reExams ?? []),
    attempts,
  };
}

describe('IST dates', () => {
  test('a time after 18:30 UTC is already the next IST day', () => {
    expect(istYmd(Date.UTC(2026, 9, 31, 19, 0))).toBe('2026-11-01');
    expect(istYmd(Date.UTC(2026, 9, 31, 18, 0))).toBe('2026-10-31');
  });

  test('day arithmetic crosses month and year ends', () => {
    expect(addDaysYmd('2026-10-12', 30)).toBe('2026-11-11');
    expect(addDaysYmd('2026-12-20', 30)).toBe('2027-01-19');
  });

  test('the last six months end with the current IST month', () => {
    expect(lastMonths(NOW, 6)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(lastMonths(ist(2026, 2, 1, 0, 30), 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('status counts', () => {
  const rows = [
    row({ examId: 1, phase: 'draft', allocated: 0 }),
    row({ examId: 2, phase: 'upcoming' }),
    row({ examId: 3, phase: 'in_progress' }),
    row({ examId: 4, phase: 'completed' }),
    row({ examId: 5, phase: 'completed', resultsPublished: true }),
    // Last sitting closed two minutes ago: the Result page still says in progress.
    row({ examId: 6, phase: 'completed' }),
    row({ examId: 7, phase: 'upcoming', isPractice: true, allocated: 0 }),
  ];
  const statusOf = new Map([[3, 'in_progress' as const], [4, 'ready' as const], [5, 'published' as const], [6, 'in_progress' as const]]);

  test('one bucket per real exam, practice left out, adding up to the total', () => {
    const c = statusCounts(rows, statusOf);
    expect(c).toEqual({ total: 6, draft: 1, upcoming: 1, inProgress: 2, ready: 1, published: 1 });
    expect(c.draft + c.upcoming + c.inProgress + c.ready + c.published).toBe(c.total);
  });

  test('allocation pending: real exams with no student that can still be sat', () => {
    const pending = allocationPending([...rows, row({ examId: 8, phase: 'completed', allocated: 0 })]);
    expect(pending.map((p) => p.examId)).toEqual([1]);
  });
});

describe('from the result sheets', () => {
  test('absent and flagged papers on closed sittings need a re-exam; open sittings never count', () => {
    const needs = reExamNeeds([bundle()]);
    // Bindu flagged on 101, Chitra absent from 101. 102 is still open.
    expect(needs).toEqual({ papers: 2, students: 2, exams: [{ examId: 22, title: 'Diploma Regular', count: 2 }] });
  });

  test('a scheduled re-exam takes the paper off the list and counts as pending', () => {
    const reExam: ResultReExam = {
      id: 9, examId: 101, userId: 3, scheduledAt: new Date(ist(2026, 10, 5, 10)),
      date: '2026-10-20', startTime: '19:30', endTime: '20:45', closed: false,
    };
    const b = bundle({ reExams: [reExam] });
    expect(reExamNeeds([b]).papers).toBe(1);
    expect(reExamsScheduled([b])).toBe(1);
  });

  test('a missed re-exam needs another', () => {
    const reExam: ResultReExam = {
      id: 9, examId: 101, userId: 3, scheduledAt: new Date(ist(2026, 10, 5, 10)),
      date: '2026-10-08', startTime: '19:30', endTime: '20:45', closed: true,
    };
    expect(reExamNeeds([bundle({ reExams: [reExam] })]).papers).toBe(2);
  });

  test('conduct: open sittings and the unsubmitted papers in them', () => {
    expect(conductNow([bundle()], NOW)).toEqual({ openSittings: 1, papersInProgress: 1 });
    expect(conductNow([bundle()], ist(2026, 10, 12, 17))).toEqual({ openSittings: 0, papersInProgress: 0 });
  });

  test('marking: only submitted papers of unpublished exams', () => {
    const open = bundle();
    expect(unpublishedPaperIds([open, bundle({ status: 'published' })])).toEqual([1, 2]);
    expect(awaitingMarking([open], new Set([2, 3]))).toEqual({ papers: 1, exams: [{ examId: 22, title: 'Diploma Regular', count: 1 }] });
    expect(awaitingMarking([bundle({ status: 'published' })], new Set([2])).papers).toBe(0);
  });

  test('ready to publish lists ready exams with their student count', () => {
    expect(readyToPublish([bundle({ status: 'ready' }), bundle()])).toEqual([{ examId: 22, title: 'Diploma Regular', count: 3 }]);
  });

  test('participation covers closed sittings opened in the last 30 days', () => {
    expect(participation([bundle()], NOW)).toEqual({ days: 30, expected: 3, appeared: 2, absent: 1, passed: 1, failed: 1 });
    expect(participation([bundle()], ist(2026, 12, 1, 12)).expected).toBe(0);
  });
});

describe('monthly trend', () => {
  test('counts by IST month and ignores the future', () => {
    const trend = monthlyTrend(NOW, 2, {
      // 30 Sep 23:00 IST is September in India, October in UTC.
      createdMs: [ist(2026, 9, 30, 23), ist(2026, 10, 2, 10)],
      heldMs: [ist(2026, 10, 1, 19, 30), ist(2026, 10, 20, 19, 30)],
      publishedMs: [ist(2026, 4, 1, 10)],
    });
    expect(trend).toEqual([
      { month: '2026-09', created: 1, held: 0, published: 0 },
      { month: '2026-10', created: 1, held: 1, published: 0 },
    ]);
  });
});

describe('recent activity', () => {
  test('bulk rows fold into one event per person, exam and IST day', () => {
    const rows = [
      { atMs: ist(2026, 10, 9, 10), actorId: 5, examId: 22, title: 'Diploma' },
      { atMs: ist(2026, 10, 9, 10, 1), actorId: 5, examId: 22, title: 'Diploma' },
      { atMs: ist(2026, 10, 10, 9), actorId: 5, examId: 22, title: 'Diploma' },
      { atMs: ist(2026, 10, 9, 11), actorId: 6, examId: 22, title: 'Diploma' },
    ];
    const events = batchByDay('reexam_scheduled', rows);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ kind: 'reexam_scheduled', actorId: 5, count: 2, atMs: ist(2026, 10, 9, 10, 1) });
  });

  test('newest first, capped, nothing from the future', () => {
    const e = (atMs: number) => ({ kind: 'exam_created' as const, atMs, actorId: 1, examId: 1, title: 'x', count: 1 });
    const out = recentActivity([e(NOW - 3000), e(NOW + 1000), e(NOW - 1000), e(NOW - 2000)], NOW, 2);
    expect(out.map((x) => x.atMs)).toEqual([NOW - 1000, NOW - 2000]);
  });
});

describe('written answers', () => {
  test('blank, empty-array and null answers are not written answers', () => {
    expect(hasAnswerText(null)).toBe(false);
    expect(hasAnswerText('  ')).toBe(false);
    expect(hasAnswerText('[]')).toBe(false);
    expect(hasAnswerText('[" "]')).toBe(false);
    expect(hasAnswerText('null')).toBe(false);
  });

  test('any text, JSON or plain, is', () => {
    expect(hasAnswerText('["Children learn through play."]')).toBe(true);
    expect(hasAnswerText('"An answer"')).toBe(true);
    expect(hasAnswerText('plain text, not JSON')).toBe(true);
  });
});

describe('ExamResultsService.dashboardSheets — every exam loaded in one batch', () => {
  type Row = Record<string, unknown>;
  const examRow = (id: number, over: Row = {}): Row => ({
    id, exam_code: `EX${id}`, title: `Exam ${id}`, course_id: null, parent_exam_id: null, exam_subject_id: null,
    status: 'published', is_practice: 0, mark: 70, duration: '75',
    from_date: new Date('2026-10-01T00:00:00Z'), from_time: new Date('1970-01-01T19:30:00Z'),
    to_date: new Date('2026-10-01T00:00:00Z'), to_time: new Date('1970-01-01T20:45:00Z'),
    publish_result: false, result_published_at: null, result_published_by: null, ...over,
  });
  const ids = (v: unknown): number[] => (v && typeof v === 'object' && 'in' in v ? (v as { in: number[] }).in : []);

  // Exam 1 has two subject sittings (11, 12); exam 2 is a single sitting.
  const tops = [examRow(1), examRow(2)];
  const children = [examRow(11, { parent_exam_id: 1, exam_subject_id: 501 }), examRow(12, { parent_exam_id: 1, exam_subject_id: 502 })];
  const prisma = {
    exam: {
      findMany: ({ where }: { where: Row }) => Promise.resolve(
        where.parent_exam_id !== null && where.parent_exam_id !== undefined
          ? children.filter((c) => ids(where.parent_exam_id).includes(c.parent_exam_id as number))
          : tops,
      ),
    },
    exam_subjects: {
      findMany: ({ where }: { where: Row }) => Promise.resolve([
        { id: 501, exam_id: 1, subject_title: 'Child Psychology', total_marks: 70, pass_marks: 25 },
        { id: 502, exam_id: 1, subject_title: 'Child Care', total_marks: 70, pass_marks: 25 },
        { id: 601, exam_id: 2, subject_title: 'Pedagogy', total_marks: 70, pass_marks: 30 },
      ].filter((s) => ('id' in where ? ids(where.id).includes(s.id) : ids(where.exam_id).includes(s.exam_id)))),
    },
    exam_student_allocations: {
      findMany: () => Promise.resolve([{ exam_id: 1, user_id: 7 }, { exam_id: 1, user_id: 8 }, { exam_id: 2, user_id: 9 }]),
    },
    exam_courses: { findMany: () => Promise.resolve([]) },
    course: { findMany: () => Promise.resolve([]) },
    users: {
      findMany: ({ where }: { where: { id: { in: number[] } } }) => Promise.resolve(
        where.id.in.map((id) => ({ id, name: `Student ${id}`, student_id: `TTS${id}`, user_email: null, email: null })),
      ),
    },
    exam_attempt: {
      findMany: () => Promise.resolve([
        { id: 1, exam_id: 11, user_id: 7, score: 40, question_no: 50, skip: 0, submit_status: true, start_time: null, end_time: null, created_at: null, question_id: '[]' },
        { id: 2, exam_id: 2, user_id: 9, score: 50, question_no: 50, skip: 0, submit_status: true, start_time: null, end_time: null, created_at: null, question_id: '[]' },
        // Student 9 is not allocated to exam 1: this paper must not join its sheet.
        { id: 3, exam_id: 12, user_id: 9, score: 10, question_no: 50, skip: 0, submit_status: true, start_time: null, end_time: null, created_at: null, question_id: '[]' },
      ]),
    },
    quiz: { findMany: () => Promise.resolve([]) },
    exam_re_examinations: { findMany: () => Promise.resolve([]) },
  } as unknown as PrismaClient;

  test('each exam keeps its own sittings, students, pass marks and papers', async () => {
    const service = new ExamResultsService(prisma, { now: () => new Date(NOW) });
    const [a, b] = await service.dashboardSheets();

    expect(a?.sittings.map((s) => s.examId)).toEqual([11, 12]);
    expect(a?.sheet.students.map((s) => s.userId)).toEqual([7, 8]);
    expect(a?.attempts.map((x) => x.attemptId)).toEqual([1]);
    expect(a?.sheet.subjects.map((s) => s.subjectTitle)).toEqual(['Child Psychology', 'Child Care']);
    expect(a?.status).toBe('ready');

    expect(b?.sittings.map((s) => s.examId)).toEqual([2]);
    expect(b?.sheet.students.map((s) => s.userId)).toEqual([9]);
    // A single-sitting exam borrows its one wizard subject's pass mark.
    expect(b?.sheet.subjects[0]?.passMarks).toBe(30);
    expect(b?.sheet.students[0]?.overall).toBe('passed');
  });
});
