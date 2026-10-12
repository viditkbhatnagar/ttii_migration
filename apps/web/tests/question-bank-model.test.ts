import { describe, expect, test } from 'vitest';

import {
  buildPayload,
  changeKind,
  emptyForm,
  filterQuestions,
  formFromQuestion,
  kindOf,
  questionCode,
  questionsCsvRows,
  sortQuestions,
  sortSubjects,
  statusLabel,
  statusTone,
  toOverview,
  toQuestionRows,
  toSubjectDetail,
  type QuestionForm,
} from '../src/admin/pages/question_bank/question-bank-model';

const questions = toQuestionRows([
  { id: 501, q_type: 0, subject_id: 36, subject_title: 'Montessori Philosophy', title: 'Who founded the Casa dei Bambini?', options: '["Montessori","Froebel"]', correct_answers: '[0]', created_by: 7, created_at: '2026-10-01T05:00:00.000Z', updated_at: '2026-10-02T05:00:00.000Z', used_in_exams: 2, used_in_published: ['TTIIEXM2600007'] },
  { id: 12, q_type: 0, title: 'The prepared environment is child-centred.', options: '["true","false"]', correct_answers: '[0]', used_in_exams: 0, used_in_published: [] },
  { id: 77, q_type: 1, title: 'Explain sensitive periods.', options: '["", "", "", ""]', correct_answers: '[]', hint: 'Think of language', solution: 'Model answer' },
  { id: 0, title: 'no id — dropped' },
  'junk',
]);

describe('question rows', () => {
  test('ids read as Q-00123, kinds are derived, junk is dropped', () => {
    expect(questions.map((q) => q.code)).toEqual(['Q-00501', 'Q-00012', 'Q-00077']);
    expect(questions.map((q) => q.kind)).toEqual(['mcq', 'tf', 'descriptive']);
    // A descriptive question carries no phantom options or answers.
    expect(questions[2]).toMatchObject({ options: [], correct: [], updatedAt: '' });
    expect(questions[0]).toMatchObject({ usedInPublished: ['TTIIEXM2600007'], subjectTitle: 'Montessori Philosophy', correct: [0] });
  });

  test('True / False is an MCQ with exactly True and False', () => {
    expect(kindOf(0, ['True', 'False'])).toBe('tf');
    expect(kindOf(0, ['False', 'True'])).toBe('mcq');
    expect(kindOf(0, ['True', 'False', 'Maybe'])).toBe('mcq');
    expect(kindOf(1, ['True', 'False'])).toBe('descriptive');
    expect(questionCode(7)).toBe('Q-00007');
  });

  test('search matches text, the Q-id or the bare number; type filters', () => {
    expect(filterQuestions(questions, 'casa', '').map((q) => q.id)).toEqual([501]);
    expect(filterQuestions(questions, 'Q-00012', '').map((q) => q.id)).toEqual([12]);
    expect(filterQuestions(questions, '77', '').map((q) => q.id)).toEqual([77]);
    expect(filterQuestions(questions, '', 'tf').map((q) => q.id)).toEqual([12]);
  });

  test('sorting by use, then newest id first on ties', () => {
    expect(sortQuestions(questions, 'used', 'desc').map((q) => q.id)).toEqual([501, 77, 12]);
    expect(sortQuestions(questions, 'id', 'asc').map((q) => q.id)).toEqual([12, 77, 501]);
  });

  test('export carries every option slot and the answer letter', () => {
    const [header, first] = questionsCsvRows(questions);
    expect(header?.[0]).toBe('Question ID');
    expect(first?.slice(0, 6)).toEqual(['Q-00501', 'Montessori Philosophy', 'MCQ', 'Who founded the Casa dei Bambini?', 'Montessori', 'Froebel']);
    expect(first?.[10]).toBe('A');
  });
});

describe('overview', () => {
  const raw = {
    kpis: { subjects: 3, questions: 5, mcq: 3, descriptive: 2, recent: 1 },
    subjects: [
      { id: 36, code: 'MP-101', title: 'Montessori Philosophy', status: 'active', courses: [{ id: 16, title: 'Diploma' }, { id: 0, title: 'bad' }], total: 3, mcq: 2, descriptive: 1, recent: 1, lastUpdated: '2026-10-11T00:00:00.000Z', matching: null },
      { id: 41, code: '', title: 'Classroom Management', status: '', courses: [], total: 0, mcq: 0, descriptive: 0, recent: 0, lastUpdated: null, matching: 0 },
    ],
    authors: [{ id: 7, name: 'Risha' }],
  };

  test('parses rows, keeps empty subjects, and drops bad chips', () => {
    const o = toOverview(raw);
    expect(o.kpis.questions).toBe(5);
    expect(o.subjects).toHaveLength(2);
    expect(o.subjects[0]?.courses).toEqual([{ id: 16, title: 'Diploma' }]);
    expect(o.subjects[1]).toMatchObject({ lastUpdated: '', matching: 0 });
    expect(toOverview(null).subjects).toEqual([]);
  });

  test('sorts; an empty subject has no last update and sorts first ascending', () => {
    const o = toOverview(raw);
    expect(sortSubjects(o.subjects, 'lastUpdated', 'asc').map((s) => s.id)).toEqual([41, 36]);
    expect(sortSubjects(o.subjects, 'total', 'desc').map((s) => s.id)).toEqual([36, 41]);
  });

  test('subject detail and status pills', () => {
    expect(toSubjectDetail({ subject: raw.subjects[0], authors: raw.authors })?.subject.id).toBe(36);
    expect(toSubjectDetail({ subject: null })).toBeNull();
    expect([statusLabel(''), statusLabel('ACTIVE'), statusTone('active'), statusTone(''), statusTone('archived')]).toEqual(['Draft', 'Active', 'emerald', 'slate', 'amber']);
  });
});

describe('question form', () => {
  const base: QuestionForm = { ...emptyForm('16'), title: '  What is 2 + 2?  ' };

  test('an MCQ: trailing empty options are dropped, the answer is 0-based', () => {
    const res = buildPayload({ ...base, options: ['3', '4', '', ''], correct: 1 });
    expect(res).toMatchObject({ ok: true, payload: { qType: 0, title: 'What is 2 + 2?', options: '["3","4"]', correctAnswers: '[1]', numberOfOptions: 2, courseId: '16' } });
  });

  test('a blank option in the middle is refused, never shifted', () => {
    expect(buildPayload({ ...base, options: ['3', '', '5'], correct: 2 })).toEqual({ ok: false, message: 'Option B is empty — fill it in or remove it.' });
  });

  test('no answer, an answer past the options, too few options, no text', () => {
    expect(buildPayload({ ...base, options: ['3', '4'], correct: null })).toMatchObject({ ok: false, message: 'Choose the correct answer.' });
    expect(buildPayload({ ...base, options: ['3', '4', ''], correct: 2 })).toMatchObject({ ok: false });
    expect(buildPayload({ ...base, options: ['3', ''], correct: 0 })).toMatchObject({ ok: false, message: 'An MCQ needs at least 2 options.' });
    expect(buildPayload({ ...base, title: '  ' })).toMatchObject({ ok: false, message: 'Question text is required.' });
  });

  test('True / False sends its two options; a stored lowercase pair is re-sent as stored', () => {
    const tf = changeKind(base, 'tf');
    expect(tf.options).toEqual(['True', 'False']);
    expect(buildPayload({ ...tf, correct: 1 })).toMatchObject({ ok: true, payload: { options: '["True","False"]', correctAnswers: '[1]' } });

    const stored = formFromQuestion(questions[1]!, '16');
    expect(stored.kind).toBe('tf');
    expect(buildPayload(stored)).toMatchObject({ ok: true, payload: { options: '["true","false"]', correctAnswers: '[0]' } });
  });

  test('descriptive sends no options and keeps the model answer', () => {
    const d = formFromQuestion(questions[2]!, '16');
    expect(buildPayload(d)).toMatchObject({ ok: true, payload: { qType: 1, options: '[]', correctAnswers: '[]', solution: 'Model answer', hint: 'Think of language', courseId: '16' } });
  });

  test('switching type keeps what fits', () => {
    const mcq = { ...base, options: ['a', 'b', 'c'], correct: 2 };
    expect(changeKind(mcq, 'descriptive')).toMatchObject({ kind: 'descriptive', correct: null, options: ['a', 'b', 'c'] });
    expect(changeKind(changeKind(mcq, 'tf'), 'mcq')).toMatchObject({ options: ['', '', '', ''], correct: null });
    expect(changeKind(changeKind(mcq, 'descriptive'), 'mcq').options).toEqual(['a', 'b', 'c']);
  });
});
