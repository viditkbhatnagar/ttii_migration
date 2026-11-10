// Pure helpers for the lesson-quiz result screen (no React).

export interface QuizLastAttempt {
  attemptId: number;
  submittedAt: string | null;
  graded: boolean;
  correct: number;
  incorrect: number;
  skip: number;
  score: number;
  totalQuestions: number;
}

export function parseLastAttempt(raw: unknown): QuizLastAttempt | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
  return {
    attemptId: num(r.attempt_id),
    submittedAt: typeof r.submitted_at === 'string' ? r.submitted_at : null,
    graded: r.graded === true,
    correct: num(r.correct),
    incorrect: num(r.incorrect),
    skip: num(r.skip),
    score: num(r.score ?? r.percentage),
    totalQuestions: num(r.total_questions),
  };
}

export interface QuizResultSummary {
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  percentage: number;
  marksLabel: string;
}

export function summarizeResult(input: {
  total_questions: number;
  correct: number;
  incorrect: number;
  skip: number;
  score: number;
  total_marks?: number;
}): QuizResultSummary {
  const totalMarks = input.total_marks ?? input.total_questions;
  return {
    total: input.total_questions,
    correct: input.correct,
    incorrect: input.incorrect,
    skipped: input.skip,
    percentage: Math.max(0, Math.min(100, Math.round(input.score))),
    marksLabel: `${input.correct} / ${totalMarks}`,
  };
}
