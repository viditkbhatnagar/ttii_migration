import { describe, expect, test } from 'vitest';

import { computeExamResults, type ResultAttempt, type ResultReExam, type ResultSitting } from '../../src/operations/exam-results.js';
import {
  buildDraftSubjects,
  candidateGroup,
  candidatesBySitting,
  enteredKey,
  matchSittings,
  parentWindow,
  supplementaryOutcomes,
  supplementaryPublishProblem,
  supplementaryTitle,
  validateSupplementary,
  type SourceSitting,
  type SubjectInput,
} from '../../src/operations/supplementary-exam.js';

// Risha, TTII 2026-10-16: "create a supplementary exam from an existing exam,
// with an editable name ... automatically pick only the subjects where
// students failed, and assign only the students who failed each subject."

const IST = (5 * 60 + 30) * 60 * 1000;
const ist = (y: number, mo: number, d: number, h: number, m = 0): number => Date.UTC(y, mo - 1, d, h, m) - IST;
const NOW = ist(2026, 10, 16, 15);

describe('the supplementary exam name', () => {
  test('Risha\'s example: Regular Examination becomes Supplementary Examination, month and year kept', () => {
    expect(supplementaryTitle('Diploma in Montessori Teacher Training, Regular Examination, August 2026'))
      .toBe('Diploma in Montessori Teacher Training, Supplementary Examination, August 2026');
  });

  test('without "Regular" the words are appended', () => {
    expect(supplementaryTitle('PG Diploma Exam – October 2026')).toBe('PG Diploma Exam – October 2026 – Supplementary Examination');
  });

  test('"Regular" on its own is replaced, keeping the case of the title', () => {
    expect(supplementaryTitle('Diploma Regular Exam 2026')).toBe('Diploma Supplementary Exam 2026');
    expect(supplementaryTitle('DIPLOMA REGULAR EXAMINATION AUG 2026')).toBe('DIPLOMA SUPPLEMENTARY EXAMINATION AUG 2026');
  });

  test('a supplementary of a supplementary keeps its name instead of doubling it', () => {
    expect(supplementaryTitle('Diploma, Supplementary Examination, August 2026')).toBe('Diploma, Supplementary Examination, August 2026');
  });

  test('never longer than the exam title column', () => {
    expect(supplementaryTitle('x'.repeat(199)).length).toBe(200);
    expect(supplementaryTitle('  ')).toBe('Supplementary Examination');
  });
});

// The Diploma regular exam: three sittings, pass mark 25 of 70.
const sitting = (examId: number): ResultSitting => ({ examId, subjectTitle: `Subject ${examId}`, date: '2026-08-10', totalMarks: 70, passMarks: 25, closed: true });
const SITTINGS = [sitting(23), sitting(24), sitting(25)];
const STUDENTS = [1, 2, 3, 4].map((id) => ({ userId: id, name: `Student ${id}`, studentCode: `TTS${id}` }));
let nextId = 1;
const paper = (userId: number, examId: number, score: number, over: Partial<ResultAttempt> = {}): ResultAttempt => ({
  attemptId: nextId++, examId, userId, score, questionCount: 70, skipped: 10, submitted: true,
  startTime: new Date('2026-08-10T14:00:00Z'), endTime: new Date('2026-08-10T15:00:00Z'), createdAt: new Date('2026-08-10T14:00:00Z'), ...over,
});
const reExam: ResultReExam = {
  id: 9, examId: 23, userId: 4, scheduledAt: new Date('2026-08-15T06:00:00Z'), date: '2026-10-20', startTime: '10:00', endTime: '11:15', closed: false,
};
// 1 failed subject 25 (Archana: 17); 2 missed subject 24; 3 saved 0 answers in
// 2 minutes on subject 23 (flagged); 4 has a re-exam pending on subject 23.
const SHEET = computeExamResults(SITTINGS, STUDENTS, [
  paper(1, 23, 60), paper(1, 24, 55), paper(1, 25, 17),
  paper(2, 23, 50), paper(2, 25, 40),
  paper(3, 23, 0, { skipped: 70, endTime: new Date('2026-08-10T14:02:00Z') }), paper(3, 24, 50), paper(3, 25, 45),
  paper(4, 23, 10), paper(4, 24, 60), paper(4, 25, 61),
], [reExam]);

describe('who is a candidate — straight from the Result page\'s own sheet', () => {
  test('each cell lands in exactly one group, and a pass in none', () => {
    const groups = SHEET.students.map((s) => s.sittings.map(candidateGroup));
    expect(groups).toEqual([
      [null, null, 'failed'],
      [null, 'absent', null],
      ['flagged', null, null],
      ['reexam', null, null],
    ]);
  });

  test('a subject a supplementary student was not entered for is never a candidate', () => {
    expect(candidateGroup({ status: 'not_entered', flag: null })).toBeNull();
    expect(candidateGroup({ status: 'pending', flag: null })).toBeNull();
  });

  test('candidates per subject, failed students first', () => {
    const bySitting = candidatesBySitting(SITTINGS, SHEET.students);
    expect(bySitting.get(25)?.map((c) => [c.userId, c.group, c.score])).toEqual([[1, 'failed', 17]]);
    expect(bySitting.get(24)?.map((c) => [c.userId, c.group])).toEqual([[2, 'absent']]);
    expect(bySitting.get(23)?.map((c) => [c.userId, c.group])).toEqual([[3, 'flagged'], [4, 'reexam']]);
    expect(bySitting.get(23)?.find((c) => c.userId === 4)?.reExamDate).toBe('2026-10-20');
  });
});

const source = (id: number, subjectId: number | null): SourceSitting => ({
  sittingExamId: id, examSubjectId: id + 28, subjectId, subjectTitle: `Subject ${id}`, courseIds: '16',
  date: '2026-08-10', startTime: '19:30', endTime: '20:45', durationMinutes: 75, totalMarks: 70, passMarks: 25,
  mcqQuestions: 70, descriptiveQuestions: 0, marksEach: 1,
});

describe('the dialog\'s subjects', () => {
  const candidates = candidatesBySitting(SITTINGS, SHEET.students);

  test('only subjects where someone needs a supplementary; a failed subject is pre-selected with its failed students', () => {
    const subjects = buildDraftSubjects([source(23, 7), source(24, 8), source(25, 9)], candidates);
    expect(subjects.map((s) => [s.sittingExamId, s.failed, s.preselect])).toEqual([[23, 0, false], [24, 0, false], [25, 1, true]]);
    expect(subjects.find((s) => s.sittingExamId === 25)?.candidates.map((c) => [c.userId, c.preselect])).toEqual([[1, true]]);
    // Absent, flagged and re-exam students are listed unticked.
    expect(subjects.flatMap((s) => s.candidates).filter((c) => c.group !== 'failed').every((c) => !c.preselect)).toBe(true);
  });

  test('a subject nobody failed, missed or was flagged in is not listed', () => {
    const clean = computeExamResults([sitting(30)], [STUDENTS[0] as (typeof STUDENTS)[number]], [paper(1, 30, 66)]);
    expect(buildDraftSubjects([source(30, 1)], candidatesBySitting([sitting(30)], clean.students))).toEqual([]);
  });

  test('a student already in another supplementary for the subject is named and not ticked', () => {
    const subjects = buildDraftSubjects([source(25, 9)], candidates, new Map([[enteredKey(1, 25), 'Supplementary, Sept 2026']]));
    expect(subjects[0]?.candidates[0]).toMatchObject({ userId: 1, alreadyIn: 'Supplementary, Sept 2026', preselect: false });
    expect(subjects[0]?.preselect).toBe(false);
  });
});

describe('creating: what the server accepts', () => {
  const ctx = {
    subjectTitles: new Map([[23, 'Subject 23'], [24, 'Subject 24'], [25, 'Subject 25']]),
    candidates: new Map([[23, new Set([3, 4])], [24, new Set([2])], [25, new Set([1])]]),
    nowMs: NOW,
  };
  const subject = (over: Partial<SubjectInput> = {}): SubjectInput => ({
    sittingExamId: 25, date: '2026-10-28', startTime: '19:30', endTime: '20:45', durationMinutes: 75, totalMarks: 70, passMarks: 25, userIds: [1], ...over,
  });
  const check = (subjects: SubjectInput[], title = 'Diploma, Supplementary Examination, October 2026') => validateSupplementary({ title, subjects }, ctx);

  test('a valid request is stored as an IST wall clock, in the source exam\'s subject order', () => {
    const v = check([subject(), subject({ sittingExamId: 24, userIds: [2, 2], date: '2026-10-27' })]);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.subjects.map((s) => s.sittingExamId)).toEqual([24, 25]);
    expect(v.subjects[0]?.userIds).toEqual([2]);
    const s = v.subjects[1];
    expect(s?.storedDate.toISOString()).toBe('2026-10-28T00:00:00.000Z');
    expect(s?.storedStart.toISOString()).toBe('1970-01-01T19:30:00.000Z');
    expect(s?.startMs).toBe(ist(2026, 10, 28, 19, 30));
  });

  test.each([
    [{ title: '' }, 'Enter a name for the supplementary exam.'],
    [{ subjects: [] }, 'Select at least one subject.'],
    [{ subjects: [subject({ sittingExamId: 99 })] }, 'A selected subject is not part of this exam.'],
    [{ subjects: [subject(), subject()] }, 'Subject 25 is selected twice.'],
    [{ subjects: [subject({ date: '2026-02-31' })] }, 'Subject 25: enter a valid date, start time and end time.'],
    [{ subjects: [subject({ endTime: '19:00' })] }, 'Subject 25: the end time must be after the start time.'],
    [{ subjects: [subject({ date: '2026-10-15' })] }, 'Subject 25: the start time has already passed.'],
    [{ subjects: [subject({ durationMinutes: 90 })] }, 'Subject 25: the paper (90 min) is longer than the window (75 min). Widen the window or shorten the paper.'],
    [{ subjects: [subject({ durationMinutes: 0 })] }, 'Subject 25: enter the paper length in minutes.'],
    [{ subjects: [subject({ totalMarks: 70.5 })] }, 'Subject 25: enter the total marks.'],
    [{ subjects: [subject({ passMarks: 80 })] }, 'Subject 25: the pass marks cannot exceed the total marks.'],
    [{ subjects: [subject({ userIds: [] })] }, 'Subject 25: select at least one student.'],
  ])('refuses %j', (over, message) => {
    const input = { title: 'Supplementary', subjects: [subject()], ...over };
    expect(validateSupplementary(input, ctx)).toEqual({ ok: false, message });
  });

  test('refuses a student who passed the subject — only failed, absent or flagged students can be entered', () => {
    expect(check([subject({ userIds: [1, 4] })])).toEqual({
      ok: false,
      message: 'Subject 25: 1 selected student did not fail, miss or have a flagged paper in this subject.',
    });
  });

  test('the exam\'s own window runs from the first sitting\'s start to the last one\'s end', () => {
    const v = check([subject({ date: '2026-10-29' }), subject({ sittingExamId: 24, userIds: [2], date: '2026-10-27', startTime: '10:00', endTime: '11:15' })]);
    if (!v.ok) throw new Error(v.message);
    const w = parentWindow(v.subjects);
    expect(w?.fromDate.toISOString().slice(0, 10)).toBe('2026-10-27');
    expect(w?.fromTime.toISOString()).toBe('1970-01-01T10:00:00.000Z');
    expect(w?.toDate.toISOString().slice(0, 10)).toBe('2026-10-29');
    expect(w?.toTime.toISOString()).toBe('1970-01-01T20:45:00.000Z');
    expect(w?.durationMinutes).toBe(2 * 24 * 60 + 10 * 60 + 45);
    expect(parentWindow([])).toBeNull();
  });
});

describe('linking a supplementary sitting back to the source subject', () => {
  test('by subject, by title for a whole-course row, and never across subjects', () => {
    const map = matchSittings(
      [
        { sittingExamId: 23, subjectId: 7, subjectTitle: 'Child Psychology' },
        { sittingExamId: 24, subjectId: null, subjectTitle: 'Diploma in Montessori' },
      ],
      [
        { sittingExamId: 101, subjectId: 7, subjectTitle: 'Child Psychology' },
        { sittingExamId: 102, subjectId: null, subjectTitle: ' diploma in  Montessori ' },
        { sittingExamId: 103, subjectId: 99, subjectTitle: 'Something else' },
      ],
    );
    expect([...map]).toEqual([[101, 23], [102, 24]]);
  });
});

describe('publishing a supplementary exam', () => {
  const schedule = [{ id: 51, subject_title: 'Montessori Methodology' }, { id: 52, subject_title: 'Child Psychology' }];

  test('passes when every subject has its sitting and students', () => {
    expect(supplementaryPublishProblem(schedule, new Map([[51, 201], [52, 202]]), new Map([[201, 1], [202, 2]]))).toBeNull();
  });

  test('refuses a subject added after creation (nobody was chosen for it)', () => {
    expect(supplementaryPublishProblem(schedule, new Map([[51, 201]]), new Map([[201, 1]])))
      .toMatch(/^Not published — Child Psychology was added after this supplementary exam was created/);
  });

  test('refuses a sitting with no students, and an exam with no subjects left', () => {
    expect(supplementaryPublishProblem(schedule, new Map([[51, 201], [52, 202]]), new Map([[201, 1]])))
      .toBe('Not published — no students are entered for Child Psychology.');
    expect(supplementaryPublishProblem([], new Map(), new Map())).toMatch(/no subjects left/);
  });
});

describe('the supplementary outcome shown on the source exam', () => {
  test('each entered cell, re-keyed to the source sitting; not-entered cells are left out', () => {
    const supp = computeExamResults(
      [sitting(101), sitting(102)],
      [STUDENTS[0], STUDENTS[1]].filter((s): s is (typeof STUDENTS)[number] => s !== undefined),
      [paper(1, 101, 40)],
      [],
      new Map([[101, new Set([1])], [102, new Set([2])]]),
    );
    const outcomes = supplementaryOutcomes(
      { examId: 100, examStatus: 'ready', sittings: [sitting(101), sitting(102)], students: supp.students },
      new Map([[101, 25], [102, 24]]),
    );
    expect(outcomes).toEqual([
      expect.objectContaining({ userId: 1, sourceSittingId: 25, supplementaryExamId: 100, supplementarySittingId: 101, status: 'pass', score: 40, totalMarks: 70 }),
      expect.objectContaining({ userId: 2, sourceSittingId: 24, supplementarySittingId: 102, status: 'absent', score: null }),
    ]);
  });
});
