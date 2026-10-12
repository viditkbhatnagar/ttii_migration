import { describe, expect, test } from 'vitest';

import { normaliseQuestionText, shapeChanged, validateQuestionShape } from '../../src/operations/question-rules.js';

// TTII 2026-10-12 — one definition of a valid question. Answers are 0-based.

describe('validateQuestionShape — MCQ', () => {
  test('a well-formed MCQ passes and is normalised', () => {
    const r = validateQuestionShape({ qType: 0, options: '[" Montessori ","Froebel","Dewey"]', correct: '["1"]' });
    expect(r).toEqual({ ok: true, value: { qType: 0, options: ['Montessori', 'Froebel', 'Dewey'], correct: [1] } });
  });

  test('no correct answer is refused — it used to save, and graded every student wrong', () => {
    expect(validateQuestionShape({ qType: 0, options: ['A', 'B'], correct: [] }))
      .toEqual({ ok: false, message: 'Choose the correct answer.' });
  });

  test('an answer past the last option is refused', () => {
    expect(validateQuestionShape({ qType: 0, options: ['A', 'B'], correct: [2] }))
      .toEqual({ ok: false, message: 'The correct answer must be one of the options.' });
    expect(validateQuestionShape({ qType: 0, options: ['A', 'B'], correct: [-1] }).ok).toBe(false);
    expect(validateQuestionShape({ qType: 0, options: ['A', 'B'], correct: [0.5] }).ok).toBe(false);
  });

  test('a blank option is an error, never dropped (dropping shifts the answer)', () => {
    expect(validateQuestionShape({ qType: 0, options: ['A', '', 'C'], correct: [2] }))
      .toEqual({ ok: false, message: 'Option B is empty.' });
  });

  test('option count is 2 to 6', () => {
    expect(validateQuestionShape({ qType: 0, options: ['A'], correct: [0] }).ok).toBe(false);
    expect(validateQuestionShape({ qType: 0, options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], correct: [0] }).ok).toBe(false);
  });

  test('more than one correct answer is refused — the player sends one', () => {
    expect(validateQuestionShape({ qType: 0, options: ['A', 'B', 'C'], correct: [0, 2] }))
      .toEqual({ ok: false, message: 'An MCQ has exactly one correct answer.' });
  });
});

describe('validateQuestionShape — descriptive and type', () => {
  test('a descriptive question carries no options and no answer key', () => {
    expect(validateQuestionShape({ qType: 1, options: ['x', 'y', 'z', 'w'], correct: [0] }))
      .toEqual({ ok: true, value: { qType: 1, options: [], correct: [] } });
  });

  test('an unknown type is refused', () => {
    expect(validateQuestionShape({ qType: 3, options: [], correct: [] }).ok).toBe(false);
  });
});

describe('helpers', () => {
  test('duplicate text ignores case, spacing and tags', () => {
    expect(normaliseQuestionText('  What is <b>Practical</b>  Life? ')).toBe(normaliseQuestionText('what is practical life?'));
  });

  test('a grading change is any change to type, options or answer', () => {
    const base = { qType: 0 as const, options: ['A', 'B'], correct: [0] };
    expect(shapeChanged(base, { ...base })).toBe(false);
    expect(shapeChanged(base, { ...base, correct: [1] })).toBe(true);
    expect(shapeChanged(base, { ...base, options: ['A', 'b'] })).toBe(true);
  });
});
