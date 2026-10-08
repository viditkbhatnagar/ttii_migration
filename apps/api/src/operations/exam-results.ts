// Exam results — the pure calculation behind Exam → Result.
//
// TTII 2026-10-08 — Naji: "our team can complete pending exams and issue
// certificate". Students could sit exams and MCQs were scored, but nothing
// turned a score into a result: no pass/fail anywhere, no absent, no overall
// outcome for a subject-wise exam. This module is that step, and only that
// step — it takes rows already loaded and returns the result sheet, so the
// rules can be tested without a database.
//
// Rules (until TTII says otherwise):
//   - A sitting is passed when the score reaches its pass mark
//     (exam_subjects.pass_marks, e.g. 25 of 70).
//   - A student is ABSENT from a sitting only once its window has closed with
//     no submitted attempt. Before that the sitting is PENDING.
//   - Overall: every sitting passed → passed. Any sitting failed → failed.
//     Missed some sittings without failing any → incomplete. Missed every
//     sitting → absent. Anything still to be held → pending.
//   - An attempt that saved under 10% of its answers is FLAGGED: production
//     had papers submitted 1–5 minutes in with 0–2 answers, next to 60s/70 on
//     the same student's other subjects. Flags never change the result — they
//     tell staff to check before publishing.

export type SittingStatus = 'pass' | 'fail' | 'absent' | 'pending' | 'marks_only';
export type OverallResult = 'passed' | 'failed' | 'incomplete' | 'absent' | 'pending' | 'marks_only';

/** Below this share of answered questions an attempt is flagged for review. */
export const LOW_ANSWER_SHARE = 0.1;

export interface ResultSitting {
  examId: number;
  subjectTitle: string;
  /** YYYY-MM-DD, the sitting's date. Empty when unknown. */
  date: string;
  totalMarks: number;
  /** Null when the exam never set a pass mark — the sitting shows marks only. */
  passMarks: number | null;
  /** True once the sitting's window has closed. */
  closed: boolean;
}

export interface ResultStudent {
  userId: number;
  name: string;
  studentCode: string;
}

export interface ResultAttempt {
  attemptId: number;
  examId: number;
  userId: number;
  score: number;
  /** Questions issued to this attempt (exam_attempt.question_no). */
  questionCount: number;
  /** Questions left unanswered (exam_attempt.skip). */
  skipped: number;
  submitted: boolean;
  startTime: Date | null;
  endTime: Date | null;
}

export interface StudentSittingResult {
  examId: number;
  status: SittingStatus;
  score: number | null;
  totalMarks: number;
  passMarks: number | null;
  attemptId: number | null;
  answered: number | null;
  questionCount: number | null;
  minutesTaken: number | null;
  flag: string | null;
}

export interface StudentResult {
  userId: number;
  name: string;
  studentCode: string;
  sittings: StudentSittingResult[];
  obtained: number;
  maxMarks: number;
  percentage: number;
  subjectsPassed: number;
  subjectsTotal: number;
  overall: OverallResult;
  flagged: boolean;
}

export interface SubjectSummary {
  examId: number;
  subjectTitle: string;
  date: string;
  totalMarks: number;
  passMarks: number | null;
  closed: boolean;
  students: number;
  passed: number;
  failed: number;
  absent: number;
  pending: number;
  averageMarks: number;
  passPercentage: number;
}

export interface ResultTotals {
  students: number;
  passed: number;
  failed: number;
  incomplete: number;
  absent: number;
  pending: number;
  flagged: number;
  /** Passed as a share of those with a decided result (absent excluded). */
  passPercentage: number;
}

export interface ExamResultSheet {
  students: StudentResult[];
  subjects: SubjectSummary[];
  totals: ResultTotals;
  /** True once every sitting has closed — results may be published. */
  allSittingsClosed: boolean;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function minutesBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const ms = end.getTime() - start.getTime();
  return ms >= 0 ? Math.round(ms / 60000) : null;
}

/** The attempt that counts: the newest submitted one (a re-sit supersedes). */
function countingAttempt(attempts: ResultAttempt[]): ResultAttempt | null {
  let best: ResultAttempt | null = null;
  for (const a of attempts) {
    if (!a.submitted) continue;
    if (!best || a.attemptId > best.attemptId) best = a;
  }
  return best;
}

function lowAnswerFlag(answered: number, questionCount: number, minutes: number | null): string | null {
  if (questionCount <= 0 || answered / questionCount >= LOW_ANSWER_SHARE) return null;
  const time = minutes === null ? '' : ` in ${minutes} min`;
  return `Only ${answered} of ${questionCount} answers saved${time} — possible technical issue`;
}

export function sittingResult(sitting: ResultSitting, attempts: ResultAttempt[]): StudentSittingResult {
  const base = {
    examId: sitting.examId,
    totalMarks: sitting.totalMarks,
    passMarks: sitting.passMarks,
  };
  const attempt = countingAttempt(attempts);
  if (!attempt) {
    return {
      ...base,
      status: sitting.closed ? 'absent' : 'pending',
      score: null,
      attemptId: null,
      answered: null,
      questionCount: null,
      minutesTaken: null,
      flag: null,
    };
  }

  const answered = Math.max(0, attempt.questionCount - attempt.skipped);
  const minutes = minutesBetween(attempt.startTime, attempt.endTime);
  const status: SittingStatus = sitting.passMarks === null
    ? 'marks_only'
    : attempt.score >= sitting.passMarks ? 'pass' : 'fail';
  return {
    ...base,
    status,
    score: attempt.score,
    attemptId: attempt.attemptId,
    answered,
    questionCount: attempt.questionCount,
    minutesTaken: minutes,
    flag: lowAnswerFlag(answered, attempt.questionCount, minutes),
  };
}

export function overallResult(statuses: SittingStatus[]): OverallResult {
  if (statuses.length === 0) return 'pending';
  if (statuses.includes('pending')) return 'pending';
  if (statuses.every((s) => s === 'absent')) return 'absent';
  if (statuses.includes('fail')) return 'failed';
  if (statuses.includes('absent')) return 'incomplete';
  if (statuses.includes('marks_only')) return 'marks_only';
  return 'passed';
}

function summariseSubject(sitting: ResultSitting, cells: StudentSittingResult[]): SubjectSummary {
  const scored = cells.filter((c) => c.score !== null);
  const passed = cells.filter((c) => c.status === 'pass').length;
  const failed = cells.filter((c) => c.status === 'fail').length;
  const decided = passed + failed;
  return {
    examId: sitting.examId,
    subjectTitle: sitting.subjectTitle,
    date: sitting.date,
    totalMarks: sitting.totalMarks,
    passMarks: sitting.passMarks,
    closed: sitting.closed,
    students: cells.length,
    passed,
    failed,
    absent: cells.filter((c) => c.status === 'absent').length,
    pending: cells.filter((c) => c.status === 'pending').length,
    averageMarks: scored.length > 0
      ? round1(scored.reduce((sum, c) => sum + (c.score ?? 0), 0) / scored.length)
      : 0,
    passPercentage: decided > 0 ? Math.round((passed / decided) * 100) : 0,
  };
}

export function computeExamResults(
  sittings: ResultSitting[],
  students: ResultStudent[],
  attempts: ResultAttempt[],
): ExamResultSheet {
  const attemptsByKey = new Map<string, ResultAttempt[]>();
  for (const a of attempts) {
    const key = `${a.userId}:${a.examId}`;
    const list = attemptsByKey.get(key) ?? [];
    list.push(a);
    attemptsByKey.set(key, list);
  }

  const maxMarks = sittings.reduce((sum, s) => sum + s.totalMarks, 0);
  const studentResults: StudentResult[] = students.map((student) => {
    const cells = sittings.map((s) => sittingResult(s, attemptsByKey.get(`${student.userId}:${s.examId}`) ?? []));
    const obtained = cells.reduce((sum, c) => sum + (c.score ?? 0), 0);
    return {
      userId: student.userId,
      name: student.name,
      studentCode: student.studentCode,
      sittings: cells,
      obtained: round1(obtained),
      maxMarks,
      percentage: maxMarks > 0 ? round1((obtained / maxMarks) * 100) : 0,
      subjectsPassed: cells.filter((c) => c.status === 'pass').length,
      subjectsTotal: sittings.length,
      overall: overallResult(cells.map((c) => c.status)),
      flagged: cells.some((c) => c.flag !== null),
    };
  });

  const subjects = sittings.map((s, index) =>
    summariseSubject(s, studentResults.map((r) => r.sittings[index] as StudentSittingResult)),
  );

  const count = (o: OverallResult): number => studentResults.filter((r) => r.overall === o).length;
  const passed = count('passed');
  const failed = count('failed');
  const incomplete = count('incomplete');
  const decided = passed + failed + incomplete;
  return {
    students: studentResults,
    subjects,
    totals: {
      students: studentResults.length,
      passed,
      failed,
      incomplete,
      absent: count('absent'),
      pending: count('pending'),
      flagged: studentResults.filter((r) => r.flagged).length,
      passPercentage: decided > 0 ? Math.round((passed / decided) * 100) : 0,
    },
    allSittingsClosed: sittings.length > 0 && sittings.every((s) => s.closed),
  };
}
