import { describe, expect, test } from 'vitest';

import { parseQuestionCsvRow } from '../src/admin/pages/question_bank/question-csv';

// TTII 2026-10-12 — the CSV answer letter must point at the option it names.

describe('parseQuestionCsvRow', () => {
  test('a normal MCQ maps its letter to a 0-based index', () => {
    expect(parseQuestionCsvRow(['MCQ', 'Capital of India?', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'b']))
      .toEqual({ ok: true, row: { qType: 0, title: 'Capital of India?', options: ['Mumbai', 'Delhi', 'Chennai', 'Kolkata'], correctAnswers: [1], hint: '', solution: '' } });
  });

  test('a blank option in the middle is kept, so the answer does not shift', () => {
    // Before: B was dropped and "C" (Chennai) silently became Kolkata.
    const r = parseQuestionCsvRow(['MCQ', 'Q', 'Mumbai', '', 'Chennai', 'Kolkata', 'C']);
    expect(r).toMatchObject({ ok: true, row: { options: ['Mumbai', '', 'Chennai', 'Kolkata'], correctAnswers: [2] } });
  });

  test('trailing blank options are dropped — a 3-option question is fine', () => {
    expect(parseQuestionCsvRow(['mcq', 'Q', 'Yes', 'No', 'Maybe', '', 'A']))
      .toMatchObject({ ok: true, row: { options: ['Yes', 'No', 'Maybe'], correctAnswers: [0] } });
  });

  test('an answer letter on an empty option, or not a letter, is an error, never an answerless MCQ', () => {
    expect(parseQuestionCsvRow(['MCQ', 'Q', 'Yes', 'No', '', '', 'C'])).toEqual({ ok: false, reason: 'Answer C points at an empty option.' });
    expect(parseQuestionCsvRow(['MCQ', 'Q', 'Yes', 'No', '', '', 'AB'])).toMatchObject({ ok: false });
    expect(parseQuestionCsvRow(['MCQ', 'Q', 'Yes', 'No', '', '', ''])).toMatchObject({ ok: false });
  });

  test('descriptive rows carry no options; unknown types and empty text are reported', () => {
    expect(parseQuestionCsvRow(['Descriptive', 'Explain.', 'x', 'y', '', '', 'A'])).toMatchObject({ ok: true, row: { qType: 1, options: [], correctAnswers: [] } });
    expect(parseQuestionCsvRow(['True/False', 'Q'])).toMatchObject({ ok: false });
    expect(parseQuestionCsvRow(['MCQ', ''])).toEqual({ ok: false, reason: 'The question text is empty.' });
    expect(parseQuestionCsvRow(['', ''])).toEqual({ ok: 'skip' });
  });
});
