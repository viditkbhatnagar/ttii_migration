import { beforeEach, describe, expect, test, vi } from 'vitest';

import { memoryPrisma, type MemoryDb } from './support/memory-prisma.js';

// Risha, TTII 2026-10-16 — a supplementary exam from the Diploma regular exam,
// end to end on one in-memory database: the dialog's draft, creating it,
// the wizard's view of it, publishing it, its results, what the regular exam's
// Result page shows, and how the Exams list, the calendar and the student's
// own exam list treat it.

const sendEmail = vi.fn((_message: { to: string; subject: string; html: string }) => Promise.resolve({ accepted: true, provider: 'test' }));
vi.mock('../../src/integrations/registry.js', () => ({
  createIntegrationRegistry: () => ({ email: { sendEmail } }),
}));

const { OperationsService } = await import('../../src/operations/operations-service.js');
const { ExamResultsService } = await import('../../src/operations/exam-results-service.js');
const { SupplementaryExamService } = await import('../../src/operations/supplementary-exam-service.js');
const { ExamAdminService } = await import('../../src/operations/exam-admin-service.js');
const { ExamCalendarService } = await import('../../src/operations/exam-calendar-service.js');
const { AssessmentService } = await import('../../src/assessment/assessment-service.js');

const IST = (5 * 60 + 30) * 60 * 1000;
const ist = (y: number, mo: number, d: number, h: number, m = 0): Date => new Date(Date.UTC(y, mo - 1, d, h, m) - IST);
const NOW = ist(2026, 10, 16, 15);
const AFTER_SUPPLEMENTARY = ist(2026, 10, 30, 12);
const day = (ymd: string): Date => new Date(`${ymd}T00:00:00Z`);
const clock = (hm: string): Date => new Date(`1970-01-01T${hm}:00Z`);

const SOURCE = 22;
const TITLE = 'Diploma in Montessori Teacher Training, Regular Examination, August 2026';
const [ARCHANA, SAMEERA, SHEBA, DIVYA] = [101, 102, 103, 104];

function examRow(id: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id, exam_code: 'TTIIEXM2600007', title: TITLE, description: null, course_id: 16, batch_id: null,
    parent_exam_id: null, exam_subject_id: null, is_practice: 0, duration: '75', mark: 70,
    have_minus_mark: 0, minus_mark: null, publish_result: false, shuffle_questions: true,
    from_date: day('2026-08-10'), from_time: clock('19:30'), to_date: day('2026-08-12'), to_time: clock('20:45'),
    status: 'published', instructions: 'Read every question.', notify_email: 1, notify_inapp: 1,
    published_at: day('2026-08-01'), published_by: 1, result_published_at: null, result_published_by: null,
    created_at: day('2026-08-01'), created_by: 1, updated_at: null, updated_by: null, deleted_at: null, deleted_by: null,
    ...over,
  };
}

const subjects = [
  { row: 51, sitting: 23, subjectId: 7, title: 'Montessori Methodology', date: '2026-08-10' },
  { row: 52, sitting: 24, subjectId: 8, title: 'Child Psychology', date: '2026-08-11' },
  { row: 53, sitting: 25, subjectId: 9, title: 'Child Development', date: '2026-08-12' },
];

let attemptId = 500;
function paper(examId: number, userId: number, score: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  attemptId += 1;
  return {
    id: attemptId, exam_id: examId, user_id: userId, score, question_no: 70, skip: 10, submit_status: true,
    start_time: ist(2026, 8, 10, 19, 35), end_time: ist(2026, 8, 10, 20, 30), created_at: ist(2026, 8, 10, 19, 35),
    deleted_at: null, question_id: '["9001"]', ...over,
  };
}

function world(): MemoryDb {
  const students = [ARCHANA, SAMEERA, SHEBA, DIVYA];
  return memoryPrisma({
    exam: [
      examRow(SOURCE, { exam_subject_id: null, duration: '5835', mark: null }),
      ...subjects.map((s) => examRow(s.sitting, {
        exam_code: `TTIIEXM2600007-S${s.row}`, title: `${TITLE} — ${s.title}`, parent_exam_id: SOURCE, exam_subject_id: s.row,
        from_date: day(s.date), to_date: day(s.date),
      })),
    ],
    exam_subjects: subjects.map((s, position) => ({
      id: s.row, exam_id: SOURCE, subject_id: s.subjectId, subject_title: s.title, course_ids: '16', exam_date: day(s.date),
      start_time: clock('19:30'), end_time: clock('20:45'), duration_minutes: 75, total_marks: 70, pass_marks: 25, position,
    })),
    exam_subject_components: subjects.map((s, i) => ({
      id: i + 1, exam_subject_id: s.row, component_type: 'mcq', num_questions: 70, marks_each: 1, negative_marks: 0,
      shuffle_questions: 0, shuffle_options: 0, word_limit: null,
    })),
    exam_courses: [SOURCE, 23, 24, 25].map((exam_id, i) => ({ id: i + 1, exam_id, course_id: 16 })),
    exam_offerings: [{ id: 1, exam_id: SOURCE, offering_id: 5 }],
    exam_student_allocations: [SOURCE, 23, 24, 25].flatMap((exam_id) => students.map((user_id) => ({ exam_id, user_id }))),
    users: [
      { id: 1, name: 'Admin', role_id: 1, student_id: null, user_email: 'admin@example.com', email: null, deleted_at: null },
      { id: ARCHANA, name: 'ARCHANA RAJ C', role_id: 2, student_id: 'TTS0041', user_email: 'archana@example.com', email: null, deleted_at: null },
      { id: SAMEERA, name: 'SAMEERA K', role_id: 2, student_id: 'TTS0042', user_email: 'sameera@example.com', email: null, deleted_at: null },
      { id: SHEBA, name: 'SHEBA MARY SAMUEL', role_id: 2, student_id: 'TTS0022', user_email: 'sheba@example.com', email: null, deleted_at: null },
      { id: DIVYA, name: 'DIVYA P', role_id: 2, student_id: 'TTS0050', user_email: 'divya@example.com', email: null, deleted_at: null, course_id: 16 },
    ],
    course: [{ id: 16, title: 'Diploma in Montessori', deleted_at: null, is_free_course: 0 }],
    exam_attempt: [
      paper(23, ARCHANA, 50), paper(24, ARCHANA, 52), paper(25, ARCHANA, 17),
      paper(23, SAMEERA, 60), paper(24, SAMEERA, 61),
      paper(23, SHEBA, 0, { skip: 70, end_time: ist(2026, 8, 10, 19, 37) }), paper(24, SHEBA, 45), paper(25, SHEBA, 48),
      paper(23, DIVYA, 60), paper(24, DIVYA, 60), paper(25, DIVYA, 60),
    ],
    exam_questions: [
      ...[1001, 1002, 1003].map((question_id, i) => ({ id: 10 + i, exam_id: 23, question_id, question_no: i + 1, mark: 1, deleted_at: null })),
      ...[3001, 3002, 3003].map((question_id, i) => ({ id: 20 + i, exam_id: 25, question_id, question_no: i + 1, mark: 1, deleted_at: null })),
    ],
    question_bank: [
      ...[1001, 1002, 1003, 1004, 1005].map((id) => ({ id, subject_id: 7, course_id: 16, q_type: 0, deleted_at: null })),
      ...[3001, 3002, 3003, 3004, 3005].map((id) => ({ id, subject_id: 9, course_id: 16, q_type: 0, deleted_at: null })),
    ],
    exam_supplementary: [],
    exam_re_examinations: [],
    quiz: [],
    exam_answer: [],
    payment_info: [],
  });
}

function services(db: MemoryDb, now: Date = NOW) {
  const results = new ExamResultsService(db.prisma, { now: () => now });
  return {
    results,
    supplementary: new SupplementaryExamService(db.prisma, { results, now: () => now }),
    operations: new OperationsService(db.prisma),
  };
}

const subjectInput = (sittingExamId: number, userIds: number[], date: string) => ({
  sittingExamId, date, startTime: '19:30', endTime: '20:45', durationMinutes: 75, totalMarks: 70, passMarks: 25, userIds,
});
const SUPP_TITLE = 'Diploma in Montessori Teacher Training, Supplementary Examination, October 2026';

async function createSupplementary(db: MemoryDb): Promise<number> {
  const res = await services(db).supplementary.create(1, {
    sourceExamId: SOURCE,
    title: SUPP_TITLE,
    subjects: [subjectInput(25, [ARCHANA, SAMEERA], '2026-10-28'), subjectInput(23, [SHEBA], '2026-10-27')],
  });
  expect(res).toMatchObject({ status: 1 });
  return res.data?.examId ?? 0;
}

const exams = (db: MemoryDb) => db.tables.exam;
const allocationsOf = (db: MemoryDb, examId: number): number[] =>
  db.tables.exam_student_allocations.filter((a) => a.exam_id === examId).map((a) => a.user_id as number).sort();

beforeEach(() => sendEmail.mockClear());

describe('the Create Supplementary Exam dialog', () => {
  test('lists only the subjects someone failed, missed or has a flagged paper in; a failed subject comes pre-selected', async () => {
    const draft = await services(world()).supplementary.draft(SOURCE);
    expect(draft.status).toBe(1);
    const data = draft.data;
    expect(data?.suggestedTitle).toBe('Diploma in Montessori Teacher Training, Supplementary Examination, August 2026');
    expect(data?.setUp).toBe(true);
    // Child Psychology: everyone passed — not listed.
    expect(data?.subjects.map((s) => [s.subjectTitle, s.preselect])).toEqual([['Montessori Methodology', false], ['Child Development', true]]);
    const development = data?.subjects.find((s) => s.subjectTitle === 'Child Development');
    expect(development?.candidates.map((c) => [c.name, c.group, c.preselect])).toEqual([
      ['ARCHANA RAJ C', 'failed', true],
      ['SAMEERA K', 'absent', false],
    ]);
    expect(development).toMatchObject({ startTime: '19:30', endTime: '20:45', durationMinutes: 75, totalMarks: 70, passMarks: 25, mcqQuestions: 70, marksEach: 1 });
    expect(data?.subjects[0]?.candidates.map((c) => [c.name, c.group])).toEqual([['SHEBA MARY SAMUEL', 'flagged']]);
  });

  test('opening it from a sitting reads the whole exam', async () => {
    expect((await services(world()).supplementary.draft(24)).data?.sourceExamId).toBe(SOURCE);
  });

  test('is refused while the exam is still running', async () => {
    const res = await services(world(), ist(2026, 8, 12, 20)).supplementary.draft(SOURCE);
    expect(res.status).toBe(0);
    expect(res.message).toMatch(/once this exam's results are ready/);
  });

  test('says "not set up" before the migration, without failing', async () => {
    const db = world();
    db.missing.add('exam_supplementary');
    expect((await services(db).supplementary.draft(SOURCE)).data?.setUp).toBe(false);
  });
});

describe('creating the supplementary exam', () => {
  test('is a normal DRAFT exam with only the chosen subjects, each sitting holding only its own students', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const parent = exams(db).find((e) => e.id === id);
    expect(parent).toMatchObject({
      title: SUPP_TITLE, exam_code: 'TTIIEXM2600008', status: 'draft', course_id: 16,
      is_practice: 0, instructions: 'Read every question.', shuffle_questions: true, created_by: 1,
    });
    // A top-level exam (the column defaults to NULL; the in-memory rows have no defaults).
    expect(parent?.parent_exam_id ?? null).toBeNull();
    // Step 1 window: first sitting's start to the last one's end (IST wall clock).
    expect(parent?.from_date).toEqual(day('2026-10-27'));
    expect(parent?.to_date).toEqual(day('2026-10-28'));

    const rows = db.tables.exam_subjects.filter((r) => r.exam_id === id);
    expect(rows.map((r) => [r.subject_id, r.subject_title, r.exam_date, r.total_marks, r.pass_marks, r.position])).toEqual([
      [7, 'Montessori Methodology', day('2026-10-27'), 70, 25, 0],
      [9, 'Child Development', day('2026-10-28'), 70, 25, 1],
    ]);
    // The question plan is copied; the questions themselves are not.
    expect(db.tables.exam_subject_components.filter((c) => rows.some((r) => r.id === c.exam_subject_id)).map((c) => c.num_questions)).toEqual([70, 70]);
    expect(db.tables.exam_questions.filter((q) => q.exam_id === id)).toEqual([]);

    const sittings = exams(db).filter((e) => e.parent_exam_id === id);
    expect(sittings.map((s) => [s.status, s.exam_code, s.title])).toEqual([
      ['draft', `TTIIEXM2600008-S${String(rows[0]?.id)}`, `${SUPP_TITLE} — Montessori Methodology`],
      ['draft', `TTIIEXM2600008-S${String(rows[1]?.id)}`, `${SUPP_TITLE} — Child Development`],
    ]);
    expect(allocationsOf(db, sittings[0]?.id as number)).toEqual([SHEBA]);
    expect(allocationsOf(db, sittings[1]?.id as number)).toEqual([ARCHANA, SAMEERA]);
    expect(allocationsOf(db, id)).toEqual([ARCHANA, SAMEERA, SHEBA]);
    expect(db.tables.exam_supplementary).toEqual([expect.objectContaining({ exam_id: id, source_exam_id: SOURCE, created_by: 1 })]);
    expect(db.tables.exam_offerings.filter((o) => o.exam_id === id).map((o) => o.offering_id)).toEqual([5]);
  });

  test('refuses before the migration has run, and writes nothing', async () => {
    const db = world();
    db.missing.add('exam_supplementary');
    const before = exams(db).length;
    const res = await services(db).supplementary.create(1, { sourceExamId: SOURCE, title: SUPP_TITLE, subjects: [subjectInput(25, [ARCHANA], '2026-10-28')] });
    expect(res.status).toBe(0);
    expect(res.message).toMatch(/not set up yet/);
    expect(exams(db).length).toBe(before);
  });

  test('refuses a student who passed that subject', async () => {
    const db = world();
    const res = await services(db).supplementary.create(1, { sourceExamId: SOURCE, title: SUPP_TITLE, subjects: [subjectInput(25, [ARCHANA, DIVYA], '2026-10-28')] });
    expect(res).toEqual({ status: 0, message: 'Child Development: 1 selected student did not fail, miss or have a flagged paper in this subject.' });
    expect(db.tables.exam_supplementary).toEqual([]);
  });

  test('the dialog then names a student already in it, unticked', async () => {
    const db = world();
    await createSupplementary(db);
    const development = (await services(db).supplementary.draft(SOURCE)).data?.subjects.find((s) => s.subjectTitle === 'Child Development');
    expect(development?.candidates.find((c) => c.userId === ARCHANA)).toMatchObject({ alreadyIn: SUPP_TITLE, preselect: false });
    expect((await services(db).supplementary.draft(SOURCE)).data?.existing).toEqual([
      expect.objectContaining({ title: SUPP_TITLE, status: 'draft', subjects: 2, students: 3 }),
    ]);
  });
});

describe('creating it twice, and clashing sittings (review 2026-10-16)', () => {
  const create = (db: MemoryDb, subjects: Array<ReturnType<typeof subjectInput>>) =>
    services(db).supplementary.create(1, { sourceExamId: SOURCE, title: SUPP_TITLE, subjects });

  test('a student entered for two sittings that overlap is refused, naming both subjects and the student', async () => {
    const db = world();
    // Archana also failed Montessori Methodology, so she is a candidate in two subjects.
    const methodology = db.tables.exam_attempt.find((a) => a.exam_id === 23 && a.user_id === ARCHANA);
    if (methodology) methodology.score = 10;
    const res = await create(db, [
      subjectInput(25, [ARCHANA], '2026-10-28'),
      { ...subjectInput(23, [ARCHANA, SHEBA], '2026-10-28'), startTime: '20:00', endTime: '21:15' },
    ]);
    expect(res).toEqual({
      status: 0,
      message: 'Montessori Methodology (28/10/2026, 20:00–21:15) and Child Development (28/10/2026, 19:30–20:45) overlap, and ARCHANA RAJ C is entered for both. Give them different times.',
    });
    expect(db.tables.exam_supplementary).toEqual([]);
    // The same two papers on different days are fine.
    expect((await create(db, [subjectInput(25, [ARCHANA], '2026-10-28'), subjectInput(23, [ARCHANA, SHEBA], '2026-10-29')])).status).toBe(1);
  });

  test('different students in overlapping sittings are fine', async () => {
    const db = world();
    expect((await create(db, [subjectInput(25, [ARCHANA, SAMEERA], '2026-10-28'), subjectInput(23, [SHEBA], '2026-10-28')])).status).toBe(1);
  });

  test('a second create with the same student and subject while the first is a draft is refused', async () => {
    const db = world();
    await createSupplementary(db);
    const again = await create(db, [subjectInput(25, [ARCHANA], '2026-10-29')]);
    expect(again.status).toBe(0);
    expect(again.message).toBe(`A draft supplementary exam already includes ARCHANA RAJ C for Child Development: “${SUPP_TITLE}” (TTIIEXM2600008). Open it instead.`);
    expect(db.tables.exam_supplementary).toHaveLength(1);
  });

  test('a double submit creates exactly one exam', async () => {
    const db = world();
    const body = [subjectInput(25, [ARCHANA, SAMEERA], '2026-10-28')];
    const results = await Promise.all([create(db, body), create(db, body)]);
    expect(results.map((r) => r.status).sort()).toEqual([0, 1]);
    expect(db.tables.exam_supplementary).toHaveLength(1);
    expect(exams(db).filter((e) => e.status === 'draft' && (e.parent_exam_id ?? null) === null)).toHaveLength(1);
  });

  test('once the first is published, a new supplementary may include the same student again', async () => {
    const db = world();
    const id = await createSupplementary(db);
    await publishSupplementary(db, id);
    const again = await create(db, [subjectInput(25, [ARCHANA], '2026-11-04')]);
    expect(again.status).toBe(1);
  });

  test('a subject removed in Step 2 of a draft stops counting: links, and the duplicate check', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const development = db.tables.exam_subjects.find((r) => r.exam_id === id && r.subject_id === 9);
    const kept = db.tables.exam_subjects.filter((r) => r.exam_id === id && r !== development);
    await services(db).operations.saveExamSchedule('1', String(id), kept.map((r) => ({
      id: r.id as number, subjectId: r.subject_id as number, subjectTitle: r.subject_title as string, courseIds: '16',
      examDate: '2026-10-27', startTime: '19:30', endTime: '20:45', durationMinutes: 75, totalMarks: 70, passMarks: 25,
    })));
    const links = await services(db).supplementary.forResultPage(SOURCE);
    expect(links.supplementaries).toEqual([expect.objectContaining({ examId: id, subjects: 1, students: 1 })]);
    expect(links.outcomes.map((o) => o.userId)).toEqual([SHEBA]);
    expect((await create(db, [subjectInput(25, [ARCHANA], '2026-10-29')])).status).toBe(1);
  });
});

describe('the wizard', () => {
  test('knows the exam is supplementary, its students per subject, and the regular papers\' questions', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const info = await services(db).supplementary.info(id);
    expect(info).toMatchObject({ isSupplementary: true, sourceExamId: SOURCE, sourceTitle: TITLE });
    expect(info.subjects.map((s) => [s.subjectTitle, s.students.map((st) => st.name)])).toEqual([
      ['Montessori Methodology', ['SHEBA MARY SAMUEL']],
      ['Child Development', ['ARCHANA RAJ C', 'SAMEERA K']],
    ]);
    expect(info.sourceQuestionIds.sort()).toEqual([1001, 1002, 1003, 3001, 3002, 3003]);
    expect((await services(db).supplementary.info(SOURCE)).isSupplementary).toBe(false);
  });

  test('Step 5 cannot replace the per-subject students with one list', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const res = await services(db).operations.saveExamAllocations(String(id), [ARCHANA, SAMEERA, SHEBA, DIVYA]);
    expect(res.status).toBe(0);
    expect(String(res.message)).toMatch(/^This is a supplementary exam/);
    expect(allocationsOf(db, id)).toEqual([ARCHANA, SAMEERA, SHEBA]);
  });

  test('Step 5 on a regular exam still writes the list onto every sitting', async () => {
    const db = world();
    const res = await services(db).operations.saveExamAllocations(String(SOURCE), [ARCHANA, DIVYA]);
    expect(res).toMatchObject({ status: 1 });
    for (const sitting of [SOURCE, 23, 24, 25]) expect(allocationsOf(db, sitting)).toEqual([ARCHANA, DIVYA]);
  });
});

async function publishSupplementary(db: MemoryDb, id: number) {
  const ops = services(db).operations;
  // Step 4: a fresh paper for each subject (any bank questions will do here).
  await ops.saveExamQuestions('1', String(id), [1004, 1005, 3004, 3005].map((questionId) => ({ questionId, mark: 1 })));
  return ops.publishExam('1', String(id), { notifyEmail: true, notifyInapp: true });
}

describe('publishing the supplementary exam', () => {
  test('keeps each sitting\'s own students, and emails each student only their subjects', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const res = await publishSupplementary(db, id);
    expect(res.status).toBe(1);
    expect(String(res.message)).toMatch(/^Exam published with 2 subject sittings\./);

    const sittings = exams(db).filter((e) => e.parent_exam_id === id);
    expect(sittings.map((s) => s.status)).toEqual(['published', 'published']);
    expect(allocationsOf(db, sittings[0]?.id as number)).toEqual([SHEBA]);
    expect(allocationsOf(db, sittings[1]?.id as number)).toEqual([ARCHANA, SAMEERA]);
    // Each sitting got its own subject's slice of the new paper.
    expect(db.tables.exam_questions.filter((q) => q.exam_id === sittings[0]?.id).map((q) => q.question_id)).toEqual([1004, 1005]);
    expect(db.tables.exam_questions.filter((q) => q.exam_id === sittings[1]?.id).map((q) => q.question_id)).toEqual([3004, 3005]);

    const mail = new Map(sendEmail.mock.calls.map(([m]) => [m.to, m.html]));
    expect([...mail.keys()].sort()).toEqual(['archana@example.com', 'sameera@example.com', 'sheba@example.com']);
    expect(mail.get('archana@example.com')).toContain('Child Development');
    expect(mail.get('archana@example.com')).not.toContain('Montessori Methodology');
    expect(mail.get('sheba@example.com')).toContain('Montessori Methodology');
    expect(mail.get('sheba@example.com')).not.toContain('Child Development');
  });

  test('a regular exam still copies its student list onto every sitting it creates', async () => {
    const db = world();
    const ops = services(db).operations;
    const regular = 70;
    db.tables.exam.push(examRow(regular, { exam_code: 'TTIIEXM2600009', status: 'draft', published_at: null }));
    db.tables.exam_subjects.push({ id: 71, exam_id: regular, subject_id: 9, subject_title: 'Child Development', course_ids: '16', exam_date: day('2026-11-02'), start_time: clock('10:00'), end_time: clock('11:15'), duration_minutes: 75, total_marks: 70, pass_marks: 25, position: 0 });
    db.tables.exam_student_allocations.push({ exam_id: regular, user_id: ARCHANA }, { exam_id: regular, user_id: DIVYA });
    await ops.saveExamQuestions('1', String(regular), [{ questionId: 3004, mark: 1 }]);
    const res = await ops.publishExam('1', String(regular), { notifyEmail: false, notifyInapp: false });
    expect(res).toMatchObject({ status: 1 });
    const child = exams(db).find((e) => e.parent_exam_id === regular);
    expect(allocationsOf(db, child?.id as number)).toEqual([ARCHANA, DIVYA]);
  });

  test('a subject added in Step 2 after creation (nobody chosen for it) is refused', async () => {
    const db = world();
    const id = await createSupplementary(db);
    db.tables.exam_subjects.push({ id: 90, exam_id: id, subject_id: 8, subject_title: 'Child Psychology', course_ids: '16', exam_date: day('2026-10-29'), start_time: clock('19:30'), end_time: clock('20:45'), duration_minutes: 75, total_marks: 70, pass_marks: 25, position: 2 });
    const res = await publishSupplementary(db, id);
    expect(res.status).toBe(0);
    expect(String(res.message)).toMatch(/^Not published — Child Psychology was added after this supplementary exam was created/);
    expect(exams(db).filter((e) => e.parent_exam_id === id).every((s) => s.status === 'draft')).toBe(true);
  });

  test('a subject removed in Step 2 drops its students from the exam', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const methodology = db.tables.exam_subjects.find((r) => r.exam_id === id && r.subject_id === 7);
    await services(db).operations.saveExamSchedule('1', String(id), db.tables.exam_subjects
      .filter((r) => r.exam_id === id && r !== methodology)
      .map((r) => ({ id: r.id as number, subjectId: r.subject_id as number, subjectTitle: r.subject_title as string, courseIds: '16', examDate: '2026-10-28', startTime: '19:30', endTime: '20:45', durationMinutes: 75, totalMarks: 70, passMarks: 25 })));
    expect(await publishSupplementary(db, id)).toMatchObject({ status: 1 });
    expect(allocationsOf(db, id)).toEqual([ARCHANA, SAMEERA]);
    expect(sendEmail.mock.calls.map(([m]) => m.to).sort()).toEqual(['archana@example.com', 'sameera@example.com']);
  });
});

describe('results', () => {
  async function sat(db: MemoryDb): Promise<{ id: number; methodology: number; development: number }> {
    const id = await createSupplementary(db);
    await publishSupplementary(db, id);
    const [methodology, development] = exams(db).filter((e) => e.parent_exam_id === id).map((e) => e.id as number);
    const on = (examId: number, userId: number, score: number) => paper(examId, userId, score, {
      start_time: ist(2026, 10, 27, 19, 35), end_time: ist(2026, 10, 27, 20, 30), created_at: ist(2026, 10, 27, 19, 35),
    });
    db.tables.exam_attempt.push(on(development as number, ARCHANA, 40), on(methodology as number, SHEBA, 55));
    return { id, methodology: methodology as number, development: development as number };
  }

  test('the supplementary\'s own sheet: each student only on their own subjects', async () => {
    const db = world();
    const { id } = await sat(db);
    const detail = await new ExamResultsService(db.prisma, { now: () => AFTER_SUPPLEMENTARY }).getExamResults(id);
    expect(detail?.status).toBe('ready');
    const byName = new Map(detail?.sheet.students.map((s) => [s.name, s]));
    expect(byName.get('ARCHANA RAJ C')?.sittings.map((c) => c.status)).toEqual(['not_entered', 'pass']);
    expect(byName.get('ARCHANA RAJ C')).toMatchObject({ overall: 'passed', maxMarks: 70, subjectsTotal: 1 });
    expect(byName.get('SAMEERA K')?.sittings.map((c) => c.status)).toEqual(['not_entered', 'absent']);
    expect(byName.get('SHEBA MARY SAMUEL')?.sittings.map((c) => [c.status, c.score])).toEqual([['pass', 55], ['not_entered', null]]);
    expect(detail?.sheet.subjects.map((s) => s.students)).toEqual([1, 2]);
  });

  test('the regular exam\'s numbers do not move, and its Result page shows the supplementary outcomes', async () => {
    const db = world();
    const before = await new ExamResultsService(db.prisma, { now: () => AFTER_SUPPLEMENTARY }).getExamResults(SOURCE);
    const { id, methodology, development } = await sat(db);
    const after = await new ExamResultsService(db.prisma, { now: () => AFTER_SUPPLEMENTARY }).getExamResults(SOURCE);
    expect(after?.sheet).toEqual(before?.sheet);

    const links = await services(db, AFTER_SUPPLEMENTARY).supplementary.forResultPage(SOURCE);
    expect(links.supplementaryOf).toBeNull();
    expect(links.supplementaries).toEqual([expect.objectContaining({ examId: id, title: SUPP_TITLE, status: 'ready', subjects: 2, students: 3 })]);
    expect(links.outcomes.map((o) => [o.userId, o.sourceSittingId, o.supplementarySittingId, o.status, o.score])).toEqual([
      [ARCHANA, 25, development, 'pass', 40],
      [SAMEERA, 25, development, 'absent', null],
      [SHEBA, 23, methodology, 'pass', 55],
    ]);
    const own = await services(db, AFTER_SUPPLEMENTARY).supplementary.forResultPage(id);
    expect(own.supplementaryOf).toEqual({ examId: SOURCE, examCode: 'TTIIEXM2600007', title: TITLE });
  });

  test('before the migration, results and links load as for any exam', async () => {
    const db = world();
    db.missing.add('exam_supplementary');
    expect((await services(db).results.getExamResults(SOURCE))?.status).toBe('ready');
    expect(await services(db).supplementary.forResultPage(SOURCE)).toEqual({ supplementaryOf: null, supplementaries: [], outcomes: [] });
  });
});

describe('Exams list, calendar and the student\'s own exams', () => {
  test('the Exams list types it Supplementary and reads a draft from its Step 2 schedule', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const rows = (await new ExamAdminService(db.prisma, { now: () => NOW }).list()).rows;
    const supp = rows.find((r) => r.examId === id);
    expect(supp).toMatchObject({ isSupplementary: true, sourceExamId: SOURCE, phase: 'draft', subjects: 2, fromDate: '2026-10-27', toDate: '2026-10-28', allocated: 3, submitted: 0 });
    expect(rows.find((r) => r.examId === SOURCE)).toMatchObject({ isSupplementary: false, sourceExamId: null, phase: 'completed', subjects: 3 });
    const overview = await new ExamAdminService(db.prisma, { now: () => NOW }).overview(id);
    expect(overview?.schedule.map((s) => [s.subjectTitle, s.sittingId, s.date])).toEqual([
      ['Montessori Methodology', null, '2026-10-27'],
      ['Child Development', null, '2026-10-28'],
    ]);
    // A Step 2 move before publishing shows at once (the draft sittings only follow on publish).
    const moved = db.tables.exam_subjects.find((r) => r.exam_id === id && r.subject_id === 9);
    if (moved) moved.exam_date = day('2026-11-03');
    expect((await new ExamAdminService(db.prisma, { now: () => NOW }).list()).rows.find((r) => r.examId === id)?.toDate).toBe('2026-11-03');
  });

  test('the Exams list still loads before the migration', async () => {
    const db = world();
    db.missing.add('exam_supplementary');
    const rows = (await new ExamAdminService(db.prisma, { now: () => NOW }).list()).rows;
    expect(rows.map((r) => [r.examId, r.isSupplementary])).toEqual([[SOURCE, false]]);
  });

  test('the calendar draws a draft once (from its schedule), then each sitting with its own students', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const calendar = () => new ExamCalendarService(db.prisma, { now: () => NOW }).range('2026-10-01', '2026-10-31');
    expect((await calendar()).map((i) => [i.kind, i.subject, i.students])).toEqual([
      ['draft', 'Montessori Methodology', 1],
      ['draft', 'Child Development', 2],
    ]);
    await publishSupplementary(db, id);
    expect((await calendar()).map((i) => [i.kind, i.subject, i.students, i.examId])).toEqual([
      ['sitting', 'Montessori Methodology', 1, id],
      ['sitting', 'Child Development', 2, id],
    ]);
  });

  test('the older readers treat a draft supplementary like any draft: one calendar entry, no sittings counted', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const ops = services(db).operations;
    const examEvents = async (from: string, to: string) =>
      (await ops.globalCalendar(from, to)).filter((e) => e.event_type === 'exam').map((e) => e.id as number).sort();
    const legacy = async (examId: number) => (await ops.listAdminExams()).exams.find((e) => e.id === examId);
    expect(await examEvents('2026-10-01', '2026-10-31')).toEqual([id]);
    expect(await legacy(id)).toMatchObject({ sitting_count: 0, scheduled_sitting_count: 2 });

    await publishSupplementary(db, id);
    const sittings = exams(db).filter((e) => e.parent_exam_id === id).map((e) => e.id as number).sort();
    expect(await examEvents('2026-10-01', '2026-10-31')).toEqual(sittings);
    expect(await legacy(id)).toMatchObject({ sitting_count: 2, scheduled_sitting_count: 2 });
    // The regular exam is drawn and counted as before: its three sittings.
    expect(await examEvents('2026-08-01', '2026-08-31')).toEqual([23, 24, 25]);
    expect(await legacy(SOURCE)).toMatchObject({ sitting_count: 3 });
  });

  test('a student never sees a draft supplementary sitting; once published, only their own subjects', async () => {
    const db = world();
    const id = await createSupplementary(db);
    const assessment = new AssessmentService({ prisma: db.prisma, integrations: { email: { name: 'test', sendEmail } } });
    const visible = async (userId: number): Promise<number[]> => {
      const list = await assessment.listExams(String(userId), { courseId: '16' });
      return [...(list.upcoming_exams as Array<{ id: number; is_allocated: number }>), ...(list.expired_exams as Array<{ id: number; is_allocated: number }>)]
        .filter((e) => e.is_allocated === 1).map((e) => e.id).sort();
    };
    expect(await visible(ARCHANA)).toEqual([23, 24, 25]);
    await publishSupplementary(db, id);
    const development = exams(db).find((e) => e.parent_exam_id === id && e.title === `${SUPP_TITLE} — Child Development`)?.id as number;
    expect(await visible(ARCHANA)).toEqual([23, 24, 25, development]);
    expect(await visible(DIVYA)).toEqual([23, 24, 25]);
  });
});
