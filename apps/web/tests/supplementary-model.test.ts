import { describe, expect, test } from 'vitest';

import {
  candidateNote,
  choiceProblem,
  createPayload,
  dialogProblem,
  initialChoice,
  istToday,
  outcomeChip,
  outcomeLabel,
  outcomesByKey,
  outcomeKey,
  selectedStudentCount,
  togglePicked,
  toSupplementaryDraft,
  toSupplementaryLinks,
  toSupplementaryWizardInfo,
  windowMinutes,
  withTimes,
  type SubjectChoice,
  type SupplementaryOutcome,
} from '../src/admin/pages/exam_supplementary/supplementary-model';

// Risha, TTII 2026-10-16 — the Create Supplementary Exam dialog and the
// supplementary outcomes on the regular exam's Result page.

const RAW_DRAFT = {
  sourceExamId: 22,
  sourceExamCode: 'TTIIEXM2600007',
  sourceTitle: 'Diploma, Regular Examination, August 2026',
  suggestedTitle: 'Diploma, Supplementary Examination, August 2026',
  setUp: true,
  existing: [],
  subjects: [
    {
      sittingExamId: 25, subjectTitle: 'Child Development', date: '2026-08-12', startTime: '19:30', endTime: '20:45',
      durationMinutes: 75, totalMarks: 70, passMarks: 25, mcqQuestions: 70, descriptiveQuestions: 0, marksEach: 1, failed: 1, preselect: true,
      candidates: [
        { userId: 101, name: 'ARCHANA RAJ C', studentCode: 'TTS0041', group: 'failed', score: 17, totalMarks: 70, flag: null, reExamDate: '', alreadyIn: '', preselect: true },
        { userId: 102, name: 'SAMEERA K', studentCode: 'TTS0042', group: 'absent', score: null, totalMarks: 70, flag: null, reExamDate: '', alreadyIn: '', preselect: false },
      ],
    },
    {
      sittingExamId: 23, subjectTitle: 'Montessori Methodology', date: '2026-08-10', startTime: '19:30', endTime: '20:45',
      durationMinutes: 75, totalMarks: 70, passMarks: null, mcqQuestions: 70, descriptiveQuestions: 0, marksEach: 1, failed: 0, preselect: false,
      candidates: [
        { userId: 103, name: 'SHEBA MARY SAMUEL', studentCode: 'TTS0022', group: 'flagged', score: 0, totalMarks: 70, flag: 'Only 0 of 70 answers saved in 2 min — possible technical issue', reExamDate: '', alreadyIn: '', preselect: false },
        { userId: 104, name: 'DIVYA P', studentCode: 'TTS0050', group: 'bogus', score: null, totalMarks: 70, flag: null, reExamDate: '2026-10-20', alreadyIn: '', preselect: false },
      ],
    },
  ],
};

describe('reading the dialog\'s draft', () => {
  test('keeps the server\'s groups and pre-selection; an unknown group reads as absent', () => {
    const d = toSupplementaryDraft(RAW_DRAFT);
    expect(d.subjects.map((s) => [s.sittingExamId, s.preselect])).toEqual([[25, true], [23, false]]);
    expect(d.subjects[0]?.candidates.map((c) => [c.userId, c.group, c.preselect])).toEqual([[101, 'failed', true], [102, 'absent', false]]);
    expect(d.subjects[1]?.passMarks).toBeNull();
    expect(d.subjects[1]?.candidates[1]?.group).toBe('absent');
  });

  test('a missing or malformed payload never throws', () => {
    expect(toSupplementaryDraft(null)).toMatchObject({ sourceExamId: 0, subjects: [], existing: [], setUp: false });
  });

  test('why each student is listed', () => {
    const [failed, absent] = toSupplementaryDraft(RAW_DRAFT).subjects[0]?.candidates ?? [];
    const [flagged, missed] = toSupplementaryDraft(RAW_DRAFT).subjects[1]?.candidates ?? [];
    expect(failed && candidateNote(failed)).toBe('17/70');
    expect(absent && candidateNote(absent)).toBe('Did not sit');
    expect(flagged && candidateNote(flagged)).toMatch(/^Only 0 of 70 answers/);
    expect(missed && candidateNote(missed)).toBe('Missed re-exam 20/10/2026');
  });
});

describe('one subject\'s choices', () => {
  const [development, methodology] = toSupplementaryDraft(RAW_DRAFT).subjects;
  const start = (): SubjectChoice => initialChoice(development as NonNullable<typeof development>);
  const TODAY = '2026-10-16';

  test('copies the regular sitting\'s window, length and marks, ticks the failed students, and leaves the date to the admin', () => {
    const c = start();
    expect(c).toMatchObject({ selected: true, date: '', startTime: '19:30', endTime: '20:45', durationMinutes: 75, durationTouched: false, totalMarks: 70, passMarks: 25 });
    expect([...c.picked]).toEqual([101]);
    expect(initialChoice(methodology as NonNullable<typeof methodology>)).toMatchObject({ selected: false, passMarks: 0, picked: new Set() });
  });

  test('the paper length follows the window until the admin types one', () => {
    const c = withTimes(start(), { startTime: '10:00', endTime: '11:30' });
    expect(c.durationMinutes).toBe(90);
    const typed = { ...c, durationMinutes: 75, durationTouched: true };
    expect(withTimes(typed, { endTime: '12:00' }).durationMinutes).toBe(75);
    expect(windowMinutes('20:00', '19:00')).toBeNull();
  });

  test('ticking and unticking a student', () => {
    const c = togglePicked(togglePicked(start(), 102), 101);
    expect([...c.picked]).toEqual([102]);
  });

  test.each([
    [{}, 'Pick the date.'],
    [{ date: '2026-10-15' }, 'The date has already passed.'],
    [{ date: '2026-10-28', endTime: '19:00' }, 'The end time must be after the start time.'],
    [{ date: '2026-10-28', durationMinutes: 0 }, 'Enter the paper length in minutes.'],
    [{ date: '2026-10-28', durationMinutes: 90 }, 'The paper (90 min) is longer than the window (75 min).'],
    [{ date: '2026-10-28', totalMarks: 70.5 }, 'Enter the total marks.'],
    [{ date: '2026-10-28', passMarks: 80 }, 'The pass marks cannot exceed the total marks.'],
    [{ date: '2026-10-28', picked: new Set<number>() }, 'Tick at least one student.'],
    [{ date: '2026-10-28' }, null],
  ])('%j → %s', (patch, problem) => {
    expect(choiceProblem({ ...start(), ...patch }, TODAY)).toBe(problem);
  });

  test('the dialog names the subject with the problem, and needs a name and a subject', () => {
    const subjects = toSupplementaryDraft(RAW_DRAFT).subjects;
    const choices = new Map(subjects.map((s) => [s.sittingExamId, initialChoice(s)]));
    expect(dialogProblem('  ', subjects, choices, TODAY)).toBe('Enter a name for the supplementary exam.');
    expect(dialogProblem('Supplementary', subjects, choices, TODAY)).toBe('Child Development: Pick the date.');
    choices.set(25, { ...(choices.get(25) as SubjectChoice), selected: false });
    expect(dialogProblem('Supplementary', subjects, choices, TODAY)).toBe('Select at least one subject.');
  });

  test('the create request carries only the ticked subjects and their ticked students', () => {
    const subjects = toSupplementaryDraft(RAW_DRAFT).subjects;
    const choices = new Map(subjects.map((s) => [s.sittingExamId, initialChoice(s)]));
    choices.set(25, { ...(choices.get(25) as SubjectChoice), date: '2026-10-28', picked: new Set([101, 102]) });
    expect(createPayload(22, '  Diploma, Supplementary  ', subjects, choices)).toEqual({
      source_exam_id: 22,
      title: 'Diploma, Supplementary',
      subjects: [{
        sitting_exam_id: 25, date: '2026-10-28', start_time: '19:30', end_time: '20:45',
        duration_minutes: 75, total_marks: 70, pass_marks: 25, user_ids: [101, 102],
      }],
    });
    choices.set(23, { ...(choices.get(23) as SubjectChoice), selected: true, picked: new Set([103, 101]) });
    expect(selectedStudentCount(choices)).toBe(3);
  });

  test('today is the IST date (the server checks the exact time)', () => {
    expect(istToday(new Date('2026-10-15T19:00:00Z'))).toBe('2026-10-16');
    expect(istToday(new Date('2026-10-15T18:00:00Z'))).toBe('2026-10-15');
  });
});

describe('the supplementary outcome on the regular exam\'s Result page', () => {
  const outcome = (over: Partial<SupplementaryOutcome> = {}): SupplementaryOutcome => ({
    userId: 101, sourceSittingId: 25, supplementaryExamId: 40, status: 'pass', score: 40, totalMarks: 70, passMarks: 25,
    date: '2026-10-28', examStatus: 'ready', ...over,
  });

  test('worded as Risha asked: "Supplementary: 40/70 Passed"', () => {
    expect(outcomeLabel(outcome())).toBe('Supplementary: 40/70 Passed');
    expect(outcomeLabel(outcome({ status: 'fail', score: 20 }))).toBe('Supplementary: 20/70 Failed');
    expect(outcomeLabel(outcome({ status: 'absent', score: null }))).toBe('Supplementary: Absent');
    expect(outcomeLabel(outcome({ status: 'pending', score: null }))).toBe('Supplementary on 28/10/2026');
    expect(outcomeLabel(outcome({ examStatus: 'draft', status: 'pending', score: null }))).toBe('Supplementary on 28/10/2026 (draft)');
  });

  test('the short chip under the mark', () => {
    expect(outcomeChip(outcome())).toEqual({ text: 'Supp. 40 P', tone: 'emerald' });
    expect(outcomeChip(outcome({ status: 'fail', score: 20 }))).toEqual({ text: 'Supp. 20 F', tone: 'rose' });
    expect(outcomeChip(outcome({ status: 'pending', score: null }))).toEqual({ text: 'Supp. 28/10', tone: 'blue' });
    expect(outcomeChip(outcome({ examStatus: 'draft', score: null }))).toEqual({ text: 'Supp. draft', tone: 'slate' });
  });

  test('a student in two supplementary exams for a subject shows the newest', () => {
    const map = outcomesByKey([outcome({ supplementaryExamId: 41, score: 50 }), outcome({ supplementaryExamId: 40 }), outcome({ sourceSittingId: 23 })]);
    expect(map.get(outcomeKey(101, 25))?.score).toBe(50);
    expect(map.size).toBe(2);
  });

  test('reading the links, a malformed payload included', () => {
    const links = toSupplementaryLinks({
      supplementaryOf: null,
      supplementaries: [{ examId: 40, examCode: 'TTIIEXM2600008', title: 'Supplementary', status: 'weird', subjects: 2, students: 3 }],
      outcomes: [{ userId: 101, sourceSittingId: 25, supplementaryExamId: 40, status: 'pass', score: 40, totalMarks: 70, passMarks: 25, date: '2026-10-28', examStatus: 'published' }],
    });
    expect(links.supplementaries[0]?.status).toBe('draft');
    expect(links.outcomes[0]).toMatchObject({ score: 40, examStatus: 'published' });
    expect(toSupplementaryLinks(undefined)).toEqual({ supplementaryOf: null, supplementaries: [], outcomes: [] });
  });
});

describe('the wizard\'s view', () => {
  test('null for a regular exam; otherwise the students per subject and the regular papers\' questions', () => {
    expect(toSupplementaryWizardInfo({ isSupplementary: false })).toBeNull();
    expect(toSupplementaryWizardInfo(null)).toBeNull();
    const info = toSupplementaryWizardInfo({
      isSupplementary: true, sourceExamId: 22, sourceExamCode: 'TTIIEXM2600007', sourceTitle: 'Diploma',
      subjects: [{ examSubjectId: 61, subjectTitle: 'Child Development', students: [{ userId: 101, name: 'ARCHANA RAJ C', studentCode: 'TTS0041' }] }],
      sourceQuestionIds: [3001, '3002', 0],
    });
    expect(info).toMatchObject({ sourceExamId: 22, sourceQuestionIds: [3001, 3002] });
    expect(info?.subjects[0]?.students[0]?.name).toBe('ARCHANA RAJ C');
  });
});
