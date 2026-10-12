// Question bank rules (TTII 2026-10-12) — one definition of a valid question,
// used by add, edit and bulk upload alike.
//
// Before this, none of the three checked anything server-side:
//   - an MCQ could be saved with no correct answer ([]), or with an answer index
//     past the last option — every student was then marked wrong on it;
//   - the CSV upload dropped blank option columns BEFORE mapping the answer
//     letter, so a blank B shifted "C" onto the wrong option;
//   - a descriptive question was stored with 4 phantom options.
//
// Answers are 0-BASED indexes into the options array, repo-wide.

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export type QuestionType = 0 | 1; // 0 = MCQ, 1 = Descriptive

export interface QuestionShape {
  qType: QuestionType;
  options: string[];
  correct: number[];
}

export type ShapeResult = { ok: true; value: QuestionShape } | { ok: false; message: string };

/** An array from a JSON string or an array; anything else is []. */
export function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function validateQuestionShape(input: { qType: unknown; options: unknown; correct: unknown }): ShapeResult {
  const qType = Number(input.qType);
  if (qType !== 0 && qType !== 1) return { ok: false, message: 'Question type must be MCQ or Descriptive.' };
  if (qType === 1) return { ok: true, value: { qType: 1, options: [], correct: [] } };

  // Positional: an empty option is an error, never silently dropped — dropping
  // it shifts every later option and with them the answer.
  const options = toArray(input.options).map((o) => (typeof o === 'string' || typeof o === 'number' ? String(o).trim() : ''));
  const blank = options.findIndex((o) => o === '');
  if (blank >= 0) return { ok: false, message: `Option ${String.fromCharCode(65 + blank)} is empty.` };
  if (options.length < MIN_OPTIONS) return { ok: false, message: `An MCQ needs at least ${MIN_OPTIONS} options.` };
  if (options.length > MAX_OPTIONS) return { ok: false, message: `An MCQ can have at most ${MAX_OPTIONS} options.` };

  const correct = toArray(input.correct).map((c) => Number(c));
  if (correct.length !== 1) {
    return { ok: false, message: correct.length === 0 ? 'Choose the correct answer.' : 'An MCQ has exactly one correct answer.' };
  }
  const answer = correct[0] as number;
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
    return { ok: false, message: 'The correct answer must be one of the options.' };
  }
  return { ok: true, value: { qType: 0, options, correct: [answer] } };
}

/** Same question text, ignoring case and spacing — the duplicate test. */
export function normaliseQuestionText(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Do two shapes grade differently? Type, options and answer all count. */
export function shapeChanged(a: QuestionShape, b: QuestionShape): boolean {
  return a.qType !== b.qType
    || a.options.length !== b.options.length
    || a.options.some((o, i) => o !== b.options[i])
    || a.correct.length !== b.correct.length
    || a.correct.some((c, i) => c !== b.correct[i]);
}
