import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import type { EmailProvider } from '../../src/integrations/contracts.js';
import { ReExamService, parseReExamWindow } from '../../src/operations/re-exam-service.js';

// TTII 2026-10-09 — re-examination, admin side. The Diploma Regular exam
// (10–14 Aug) left four students with papers that look like a technical
// failure and one who missed a subject; each needs that ONE subject re-opened
// in a window of its own. These pin what scheduling may and may not do.

const IST = (5 * 60 + 30) * 60 * 1000;
/** An IST wall-clock instant. */
const ist = (y: number, mo: number, d: number, h: number, m = 0): Date => new Date(Date.UTC(y, mo - 1, d, h, m) - IST);
const NOW = ist(2026, 10, 9, 15);

const SITTING_ID = 24;
const PARENT_ID = 22;

interface ReRow {
  id: number;
  exam_id: number;
  exam_subject_id: number | null;
  user_id: number;
  new_date: Date | null;
  new_start_time: Date | null;
  new_end_time: Date | null;
  status: string | null;
  notes: string | null;
  created_at: Date | null;
  created_by: number | null;
}

interface AttemptRow {
  id: number;
  exam_id: number;
  user_id: number;
  score: number;
  submit_status: boolean;
  created_at: Date;
  start_time: Date;
}

function sittingRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SITTING_ID,
    title: 'Diploma Regular — Child Psychology',
    exam_code: 'TTIIEXM2600007-S48',
    parent_exam_id: PARENT_ID,
    exam_subject_id: 48,
    status: 'published',
    is_practice: 0,
    mark: 70,
    duration: '75',
    // 11 Aug 2026, 07:30–08:45 PM IST.
    from_date: new Date('2026-08-11T00:00:00Z'),
    from_time: new Date('1970-01-01T19:30:00Z'),
    to_date: new Date('2026-08-11T00:00:00Z'),
    to_time: new Date('1970-01-01T20:45:00Z'),
    ...over,
  };
}

interface World {
  sitting: Record<string, unknown>;
  children: number;
  allocated: number[];
  students: Array<{ id: number; name: string; user_email: string | null; email: string | null; student_id: string }>;
  reExams: ReRow[];
  attempts: AttemptRow[];
  mailed: string[];
}

function world(over: Partial<World> = {}): World {
  return {
    sitting: sittingRow(),
    children: 0,
    allocated: [174, 152],
    students: [
      { id: 174, name: 'SHEBA MARY SAMUEL', user_email: 'sheba@example.com', email: null, student_id: 'TTS0022' },
      { id: 152, name: 'JUVAIRIA C B', user_email: null, email: '9847000000', student_id: 'TTS0010' },
    ],
    reExams: [],
    attempts: [],
    mailed: [],
    ...over,
  };
}

function gte(value: Date, where: unknown): boolean {
  const floor = (where as { gte?: Date } | undefined)?.gte;
  return !floor || value.getTime() >= floor.getTime();
}

function makeService(w: World): ReExamService {
  const notCancelled = (r: ReRow): boolean => r.status !== 'cancelled';
  const prisma = {
    exam: {
      findFirst: ({ where }: { where: { id: number } }) =>
        Promise.resolve(where.id === w.sitting.id ? { ...w.sitting } : where.id === PARENT_ID ? { title: 'Diploma Regular', exam_code: 'TTIIEXM2600007' } : null),
      count: () => Promise.resolve(w.children),
      findMany: ({ where }: { where: { id: { in: number[] } } }) =>
        Promise.resolve(where.id.in.includes(SITTING_ID) ? [{ ...w.sitting }] : where.id.in.includes(PARENT_ID) ? [{ id: PARENT_ID, title: 'Diploma Regular', exam_code: 'TTIIEXM2600007' }] : []),
    },
    exam_student_allocations: {
      findMany: ({ where }: { where: { user_id: { in: number[] } } }) =>
        Promise.resolve(w.allocated.filter((id) => where.user_id.in.includes(id)).map((user_id) => ({ user_id }))),
    },
    users: {
      findMany: ({ where }: { where: { id: { in: number[] } } }) =>
        Promise.resolve(w.students.filter((s) => where.id.in.includes(s.id))),
    },
    exam_subjects: {
      findFirst: () => Promise.resolve({ subject_title: 'Child Psychology' }),
      findMany: () => Promise.resolve([{ id: 48, subject_title: 'Child Psychology', pass_marks: 25, total_marks: 70 }]),
    },
    exam_re_examinations: {
      findFirst: ({ where }: { where: { id?: number; exam_id?: number; user_id?: number } }) => {
        if (where.id !== undefined) return Promise.resolve(w.reExams.find((r) => r.id === where.id) ?? null);
        const rows = w.reExams
          .filter((r) => r.exam_id === where.exam_id && r.user_id === where.user_id && notCancelled(r))
          .sort((a, b) => b.id - a.id);
        return Promise.resolve(rows[0] ?? null);
      },
      findMany: () => Promise.resolve([...w.reExams].sort((a, b) => b.id - a.id)),
      create: ({ data }: { data: Omit<ReRow, 'id'> }) => {
        const row = { id: w.reExams.length + 1, ...data } as ReRow;
        w.reExams.push(row);
        return Promise.resolve(row);
      },
      update: ({ where, data }: { where: { id: number }; data: Partial<ReRow> }) => {
        const row = w.reExams.find((r) => r.id === where.id);
        if (row) Object.assign(row, data);
        return Promise.resolve(row);
      },
    },
    exam_attempt: {
      count: ({ where }: { where: { exam_id: number; user_id: number; created_at?: unknown } }) =>
        Promise.resolve(w.attempts.filter((a) => a.exam_id === where.exam_id && a.user_id === where.user_id && gte(a.created_at, where.created_at)).length),
      findMany: () => Promise.resolve(w.attempts),
    },
  } as unknown as PrismaClient;
  const email = {
    name: 'stub',
    sendEmail: ({ to }: { to: string }) => { w.mailed.push(to); return Promise.resolve({ accepted: true }); },
  } as unknown as EmailProvider;
  return new ReExamService(prisma, { email, now: () => NOW });
}

const input = (over: Record<string, unknown> = {}) => ({
  examId: SITTING_ID,
  userIds: [174, 152],
  date: '2026-10-20',
  startTime: '10:00',
  endTime: '11:30',
  ...over,
});

describe('parseReExamWindow — an IST wall clock, stored the way the exam stores its own', () => {
  test('20 Oct 10:00–11:30 IST is 04:30–06:00 UTC; date and times keep the exam columns\' shape', () => {
    const w = parseReExamWindow('2026-10-20', '10:00', '11:30');

    expect(new Date(w?.startMs ?? 0).toISOString()).toBe('2026-10-20T04:30:00.000Z');
    expect(new Date(w?.endMs ?? 0).toISOString()).toBe('2026-10-20T06:00:00.000Z');
    expect(w?.date.toISOString()).toBe('2026-10-20T00:00:00.000Z');
    expect(w?.start.toISOString()).toBe('1970-01-01T10:00:00.000Z');
  });

  test('impossible dates and malformed times are refused, not rolled over', () => {
    expect(parseReExamWindow('2026-02-31', '10:00', '11:30')).toBeNull();
    expect(parseReExamWindow('2026-10-20', '25:00', '11:30')).toBeNull();
    expect(parseReExamWindow('20/10/2026', '10:00', '11:30')).toBeNull();
  });
});

describe('scheduling a re-exam', () => {
  test('creates one row per student, stamped now (the attempt floor), and emails real addresses only', async () => {
    const w = world();

    const res = await makeService(w).schedule(1, input());

    expect(res).toMatchObject({ status: 1, scheduled: 2, rescheduled: 0, emailed: 1 });
    expect(w.reExams).toHaveLength(2);
    expect(w.reExams[0]).toMatchObject({ exam_id: SITTING_ID, exam_subject_id: 48, status: 'scheduled', created_at: NOW, created_by: 1 });
    expect(w.reExams[0]?.new_start_time?.toISOString()).toBe('1970-01-01T10:00:00.000Z');
    // Juvairia's email column holds a phone number.
    expect(w.mailed).toEqual(['sheba@example.com']);
  });

  test('moves a re-exam the student has not started instead of stacking a second one', async () => {
    const w = world({ allocated: [174], students: [world().students[0]!] });
    const service = makeService(w);
    await service.schedule(1, input({ userIds: [174] }));

    const res = await service.schedule(1, input({ userIds: [174], date: '2026-10-22' }));

    expect(res).toMatchObject({ status: 1, scheduled: 0, rescheduled: 1 });
    expect(w.reExams).toHaveLength(1);
    expect(w.reExams[0]?.new_date?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
  });

  test('once the student has started it, a new re-exam is a fresh one', async () => {
    const w = world({ allocated: [174], students: [world().students[0]!] });
    const service = makeService(w);
    await service.schedule(1, input({ userIds: [174] }));
    w.attempts.push({ id: 900, exam_id: SITTING_ID, user_id: 174, score: 10, submit_status: true, created_at: ist(2026, 10, 20, 10), start_time: ist(2026, 10, 20, 10) });

    const res = await service.schedule(1, input({ userIds: [174], date: '2026-10-25' }));

    expect(res).toMatchObject({ status: 1, scheduled: 1, rescheduled: 0 });
    expect(w.reExams).toHaveLength(2);
  });

  test('refused while the original sitting is still running (or auto-submitting)', async () => {
    const w = world({ sitting: sittingRow({ from_date: new Date('2026-10-09T00:00:00Z'), to_date: new Date('2026-10-09T00:00:00Z'), from_time: new Date('1970-01-01T14:00:00Z'), to_time: new Date('1970-01-01T14:58:00Z') }) });

    const res = await makeService(w).schedule(1, input());

    // Closed at 14:58 IST; the server may still auto-submit until 15:03.
    expect(res.status).toBe(0);
    expect(res.message).toContain('original sitting has finished');
    expect(w.reExams).toHaveLength(0);
  });

  test('a whole exam is refused — re-exams are per subject', async () => {
    const res = await makeService(world({ children: 5 })).schedule(1, input());
    expect(res.status).toBe(0);
    expect(res.message).toContain('subject');
  });

  test('a window shorter than the paper is refused', async () => {
    const res = await makeService(world()).schedule(1, input({ endTime: '11:00' }));
    expect(res.status).toBe(0);
    expect(res.message).toContain('shorter than the paper (75 min)');
  });

  test('an end before the start, or a start already past, is refused', async () => {
    expect(await makeService(world()).schedule(1, input({ startTime: '12:00', endTime: '11:00' })))
      .toMatchObject({ status: 0, message: 'The end time must be after the start time.' });
    expect(await makeService(world()).schedule(1, input({ date: '2026-10-09', startTime: '13:00', endTime: '15:00' })))
      .toMatchObject({ status: 0, message: 'The start time has already passed.' });
  });

  test('a student who was never allocated the paper is refused, and nothing is written', async () => {
    const w = world({ allocated: [174] });

    const res = await makeService(w).schedule(1, input());

    expect(res).toMatchObject({ status: 0, message: '1 selected student is not allocated to this exam.' });
    expect(w.reExams).toHaveLength(0);
  });
});

describe('cancelling a re-exam', () => {
  test('cancels one that has not been started', async () => {
    const w = world();
    const service = makeService(w);
    await service.schedule(1, input({ userIds: [174] }));

    expect(await service.cancel(1)).toMatchObject({ status: 1 });
    expect(w.reExams[0]?.status).toBe('cancelled');
  });

  test('refuses once the student has started the re-exam paper', async () => {
    const w = world();
    const service = makeService(w);
    await service.schedule(1, input({ userIds: [174] }));
    w.attempts.push({ id: 900, exam_id: SITTING_ID, user_id: 174, score: 0, submit_status: false, created_at: ist(2026, 10, 20, 10), start_time: ist(2026, 10, 20, 10) });

    expect(await service.cancel(1)).toMatchObject({ status: 0 });
    expect(w.reExams[0]?.status).toBe('scheduled');
  });
});

describe('the re-exam list', () => {
  test('shows the original mark, then the re-exam mark and its result', async () => {
    const w = world();
    const service = makeService(w);
    await service.schedule(1, input({ userIds: [174] }));
    w.attempts.push(
      { id: 133, exam_id: SITTING_ID, user_id: 174, score: 0, submit_status: true, created_at: ist(2026, 8, 11, 19, 32), start_time: ist(2026, 8, 11, 19, 32) },
    );

    const before = await service.list();
    expect(before[0]).toMatchObject({ state: 'upcoming', previousScore: 0, newScore: null, subjectTitle: 'Child Psychology', examTitle: 'Diploma Regular' });

    w.attempts.push({ id: 950, exam_id: SITTING_ID, user_id: 174, score: 61, submit_status: true, created_at: ist(2026, 10, 20, 10), start_time: ist(2026, 10, 20, 10) });
    const after = await service.list();
    expect(after[0]).toMatchObject({ state: 'completed', previousScore: 0, newScore: 61, result: 'pass' });
  });

  test('a window that passed unused is missed; a cancelled one says so', async () => {
    const w = world({
      reExams: [
        { id: 1, exam_id: SITTING_ID, exam_subject_id: 48, user_id: 174, new_date: new Date('2026-10-01T00:00:00Z'), new_start_time: new Date('1970-01-01T10:00:00Z'), new_end_time: new Date('1970-01-01T11:30:00Z'), status: 'scheduled', notes: null, created_at: ist(2026, 9, 25, 10), created_by: 1 },
        { id: 2, exam_id: SITTING_ID, exam_subject_id: 48, user_id: 152, new_date: new Date('2026-10-20T00:00:00Z'), new_start_time: new Date('1970-01-01T10:00:00Z'), new_end_time: new Date('1970-01-01T11:30:00Z'), status: 'cancelled', notes: null, created_at: ist(2026, 10, 5, 10), created_by: 1 },
      ],
    });

    const rows = await makeService(w).list();

    expect(rows.find((r) => r.id === 1)?.state).toBe('missed');
    expect(rows.find((r) => r.id === 2)?.state).toBe('cancelled');
  });
});
