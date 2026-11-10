// Grader for the lesson quizzes stored in the `quiz` table (keyed by
// lesson_file_id). The key columns are 0-BASED, like question_bank.correct_answers:
//   question_type 0 (single) -> answer_id   (option index)
//   question_type 1 (multi)  -> answer_ids  (JSON array of option indexes)
// The previous grader subtracted 1 from answer_id, so every correct pick k>=1
// was marked wrong and option A (0) could never be right.
//
// Scoring scale (documented, stored in practice_attempt.score): a PERCENTAGE,
// 0-100, rounded to a whole number = correct / gradable * 100. One mark per
// gradable question, so marks_obtained = correct and total_marks = gradable.

export interface QuizKeyRow {
  id: number;
  question_type: number | null;
  answer_id: number | null;
  answer_ids: string | null;
}

export type QuizSelection = number | number[] | null | undefined;

export interface QuizReviewRow {
  question_id: number;
  selected: number | number[] | null;
  correct: number[];
  isCorrect: boolean | null;
}

export interface QuizGrade {
  total_questions: number;
  gradable: number;
  correct: number;
  incorrect: number;
  skip: number;
  ungraded: number;
  score: number;
  percentage: number;
  marks_obtained: number;
  total_marks: number;
  review: QuizReviewRow[];
}

function parseIndexList(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n >= 0);
  } catch {
    return [];
  }
}

export function correctIndexes(row: QuizKeyRow): number[] {
  const fromList = parseIndexList(row.answer_ids);
  const single = row.answer_id !== null && Number.isInteger(row.answer_id) && row.answer_id >= 0 ? [row.answer_id] : [];
  const isMulti = row.question_type === 1;
  const picked = isMulti ? (fromList.length > 0 ? fromList : single) : (single.length > 0 ? single : fromList);
  return [...new Set(picked)].sort((a, b) => a - b);
}

function selectionSet(selected: QuizSelection): number[] {
  const list = Array.isArray(selected) ? selected : selected === null || selected === undefined ? [] : [selected];
  return [...new Set(list.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b);
}

export function gradeQuiz(
  questions: readonly QuizKeyRow[],
  answers: ReadonlyMap<number, QuizSelection>,
): QuizGrade {
  let correct = 0;
  let incorrect = 0;
  let skip = 0;
  let ungraded = 0;
  const review: QuizReviewRow[] = [];

  for (const q of questions) {
    const key = correctIndexes(q);
    const picked = selectionSet(answers.get(q.id));
    const raw = answers.get(q.id);
    const selected: number | number[] | null =
      picked.length === 0 ? null : Array.isArray(raw) ? picked : (picked[0] ?? null);
    let isCorrect: boolean | null = null;

    if (picked.length === 0) {
      skip += 1;
    } else if (key.length === 0) {
      // No key stored: cannot be graded, never penalised.
      ungraded += 1;
    } else if (key.length === picked.length && key.every((v, i) => v === picked[i])) {
      correct += 1;
      isCorrect = true;
    } else {
      incorrect += 1;
      isCorrect = false;
    }
    review.push({ question_id: q.id, selected, correct: key, isCorrect });
  }

  // Unanswered questions stay in the denominator (a skipped question is not
  // correct); only questions without a stored key are excluded.
  const withoutKey = questions.filter((q) => correctIndexes(q).length === 0).length;
  const gradable = questions.length - withoutKey;
  const score = gradable > 0 ? Math.round((correct / gradable) * 100) : 0;

  return {
    total_questions: questions.length,
    gradable,
    correct,
    incorrect,
    skip,
    ungraded,
    score,
    percentage: score,
    marks_obtained: correct,
    total_marks: gradable,
    review,
  };
}

// Attempts submitted before this grader shipped were marked by the 1-based bug
// and stored no answers, so their numbers cannot be trusted or re-graded. New
// submissions set time_taken (old web path never did); both must hold.
export const QUIZ_GRADER_FIXED_AT = new Date('2026-11-10T00:00:00.000Z');

export function isTrustedQuizAttempt(attempt: { time_taken: Date | null; end_time: Date | null }): boolean {
  return attempt.time_taken !== null && attempt.end_time !== null && attempt.end_time >= QUIZ_GRADER_FIXED_AT;
}

// practice_attempt.time_taken is a TIME column read back as a Date on 1970-01-01.
export function elapsedToTimeColumn(startedAt: Date | null, endedAt: Date): Date {
  const ms = startedAt ? Math.max(0, endedAt.getTime() - startedAt.getTime()) : 0;
  const capped = Math.min(ms, 24 * 3600 * 1000 - 1000);
  return new Date(Math.floor(capped / 1000) * 1000);
}
