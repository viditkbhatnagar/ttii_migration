// Naji 2026-05-09 — Exam Player redesigned to match the new design:
// header card with title / subject / marks / timer; two-column layout
// with the question pane on the left and a Question Navigator panel
// on the right (Attempted / Missed visited / Flagged / Not visited
// status legend); flag-question control; Submit confirmation modal;
// Submitted result modal with attempt stats. Drop-in replacement for
// the old QuizPlayer — same props, same /student/quiz/* endpoints.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, X, GraduationCap, Calendar, Clock, Hourglass, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StudentPortalApi } from '../student-portal-api.js';
import { summarizeResult, type QuizLastAttempt, type QuizResultSummary } from '../lib/quiz-result-model.js';

interface QuizQuestion {
  id: number;
  question: string;
  question_type: number;
  options: string[];
}

type ExamPhase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'intro';
      title: string;
      description: string;
      questions: QuizQuestion[];
      lastAttempt: QuizLastAttempt | null;
    }
  | {
      kind: 'in_progress';
      title: string;
      questions: QuizQuestion[];
      attemptId: string;
      current: number;
      answers: Map<number, Selection>;
      visited: Set<number>;
      flagged: Set<number>;
      startedAt: number; // epoch ms
    }
  | {
      kind: 'submitted';
      title: string;
      questions: QuizQuestion[];
      timeUsedSec: number;
      summary: QuizResultSummary;
    };

// One pick (single answer) or several (question_type 1); null = unanswered.
type Selection = number | number[] | null;

const isAnswered = (sel: Selection | undefined): boolean =>
  Array.isArray(sel) ? sel.length > 0 : sel !== null && sel !== undefined;

interface Props {
  api: StudentPortalApi;
  authToken: string;
  lessonFileId: string;
  title: string;
  // Optional metadata — populated by formal exams; practice quizzes
  // pass nothing and the corresponding chips hide.
  meta?: {
    headerLabel?: string;       // e.g. "Northfield University" / course name
    subject?: string;           // e.g. "CS-301 Data Structures & Algorithms"
    totalMarks?: number;
    passMarks?: number;
    examDateLabel?: string;     // e.g. "09 May 2026"
    startTimeLabel?: string;    // e.g. "10:00 AM"
    durationMinutes?: number;   // drives the Time Left countdown
  };
  onClose: () => void;
  // Called after a graded submit so the course player refreshes its progress.
  onSubmitted?: () => void;
}

function fmtHMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function ExamPlayer({
  api, authToken, lessonFileId, title: initialTitle, meta, onClose, onSubmitted,
}: Props) {
  const [phase, setPhase] = useState<ExamPhase>({ kind: 'loading' });
  const [tick, setTick] = useState(0); // forces re-render once a second for timer
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const submittingRef = useRef(false);

  // Load the exam questions on mount.
  useEffect(() => {
    let cancelled = false;
    setPhase({ kind: 'loading' });
    api
      .loadQuiz(authToken, lessonFileId)
      .then((data) => {
        if (cancelled) return;
        if (data.questions.length === 0) {
          setPhase({ kind: 'error', message: 'This exam has no questions yet.' });
          return;
        }
        setPhase({
          kind: 'intro',
          title: data.title || initialTitle,
          description: data.description,
          questions: data.questions,
          lastAttempt: data.lastAttempt,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to load exam.' });
      });
    return () => { cancelled = true; };
  }, [api, authToken, lessonFileId, initialTitle]);

  // Tick the clock every second while in-progress so the timer updates.
  useEffect(() => {
    if (phase.kind !== 'in_progress') return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [phase.kind]);

  const startAttempt = async (title: string, questions: QuizQuestion[]) => {
    try {
      const attemptId = await api.startStudentQuiz(authToken, lessonFileId);
      const firstId = questions[0]?.id;
      setPhase({
        kind: 'in_progress',
        title,
        questions,
        attemptId,
        current: 0,
        answers: new Map(),
        visited: new Set(firstId !== undefined ? [firstId] : []),
        flagged: new Set(),
        startedAt: Date.now(),
      });
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Could not start the exam.' });
    }
  };

  const handleStart = async () => {
    if (phase.kind !== 'intro') return;
    await startAttempt(phase.title, phase.questions);
  };

  const handleRetake = async () => {
    if (phase.kind !== 'submitted') return;
    await startAttempt(phase.title, phase.questions);
  };

  // Auto-mark visited when the current index changes.
  useEffect(() => {
    setPhase((p) => {
      if (p.kind !== 'in_progress') return p;
      const cur = p.questions[p.current];
      if (!cur || p.visited.has(cur.id)) return p;
      const visited = new Set(p.visited);
      visited.add(cur.id);
      return { ...p, visited };
    });
  }, [(phase as { kind: string; current?: number }).current, phase.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (qid: number, optionIndex: number, multi: boolean) => {
    setPhase((p) => {
      if (p.kind !== 'in_progress') return p;
      const next = new Map(p.answers);
      if (multi) {
        const cur = next.get(qid);
        const list = Array.isArray(cur) ? cur : [];
        const updated = list.includes(optionIndex)
          ? list.filter((v) => v !== optionIndex)
          : [...list, optionIndex].sort((a, b) => a - b);
        next.set(qid, updated.length > 0 ? updated : null);
      } else {
        next.set(qid, optionIndex);
      }
      return { ...p, answers: next };
    });
  };

  const toggleFlag = (qid: number) => {
    setPhase((p) => {
      if (p.kind !== 'in_progress') return p;
      const next = new Set(p.flagged);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return { ...p, flagged: next };
    });
  };

  const goNext = () => setPhase((p) => p.kind === 'in_progress' && p.current < p.questions.length - 1 ? { ...p, current: p.current + 1 } : p);
  const goPrev = () => setPhase((p) => p.kind === 'in_progress' && p.current > 0 ? { ...p, current: p.current - 1 } : p);
  const jumpTo = (index: number) => setPhase((p) => p.kind === 'in_progress' && index >= 0 && index < p.questions.length ? { ...p, current: index } : p);

  const submit = async () => {
    if (phase.kind !== 'in_progress' || submittingRef.current) return;
    submittingRef.current = true;
    const answersArr = phase.questions.map((q) => ({
      question_id: q.id,
      selected: phase.answers.get(q.id) ?? null,
    }));
    const startedAt = phase.startedAt;
    try {
      const result = await api.submitStudentQuiz(authToken, {
        lessonFileId,
        attemptId: phase.attemptId,
        answers: answersArr,
      });
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setPhase({
        kind: 'submitted',
        title: phase.title,
        questions: phase.questions,
        timeUsedSec: elapsedSec,
        summary: summarizeResult(result),
      });
      setSubmitConfirmOpen(false);
      onSubmitted?.();
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Submission failed.' });
    } finally {
      submittingRef.current = false;
    }
  };

  // Time-left countdown (formal exams only).
  const timeLeftSec = useMemo(() => {
    if (phase.kind !== 'in_progress' || !meta?.durationMinutes) return null;
    void tick;
    const elapsed = Math.floor((Date.now() - phase.startedAt) / 1000);
    return Math.max(0, meta.durationMinutes * 60 - elapsed);
  }, [phase, tick, meta?.durationMinutes]);

  // Auto-submit when the timer hits zero.
  useEffect(() => {
    if (timeLeftSec === 0 && phase.kind === 'in_progress' && !submittingRef.current) {
      void submit();
    }
  }, [timeLeftSec]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──────────────────────────────────────────────────────
  if (phase.kind === 'loading') {
    return <Frame onClose={onClose} title={initialTitle}><div className="py-12 text-center text-sm text-slate-500">Loading exam…</div></Frame>;
  }
  if (phase.kind === 'error') {
    return <Frame onClose={onClose} title={initialTitle}><p role="alert" className="py-12 text-center text-sm text-red-600">{phase.message}</p></Frame>;
  }
  if (phase.kind === 'intro') {
    const last = phase.lastAttempt;
    return (
      <Frame onClose={onClose} title={phase.title}>
        <div className="mx-auto max-w-xl space-y-4 py-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-student-primary/10 text-student-primary">
            <GraduationCap aria-hidden="true" className="size-7" />
          </div>
          <h2 className="text-lg font-semibold text-student-text">{phase.title}</h2>
          {phase.description ? <p className="text-sm leading-relaxed text-student-muted">{phase.description.replace(/<[^>]+>/g, '')}</p> : null}
          <p className="text-sm text-student-muted">{phase.questions.length} question{phase.questions.length === 1 ? '' : 's'}{meta?.durationMinutes ? ` · ${meta.durationMinutes} min` : ''}</p>
          {last ? <PreviousAttempt attempt={last} /> : null}
          <Button onClick={() => { void handleStart(); }} className="bg-student-primary hover:bg-student-primary/90">
            {last ? (<><RotateCcw aria-hidden="true" className="mr-1.5 size-4" />Retake Quiz</>) : 'Start Examination'}
          </Button>
        </div>
      </Frame>
    );
  }
  if (phase.kind === 'submitted') {
    const sm = phase.summary;
    return (
      <Frame onClose={onClose} title={phase.title}>
        <div className="mx-auto max-w-2xl space-y-5 py-4" role="status">
          <div className="text-center">
            <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
            <h2 className="mt-2 text-lg font-semibold text-student-text">Quiz submitted</h2>
            <p className="mt-1 text-sm text-student-muted">Your score for this attempt</p>
            <p className="mt-2 text-5xl font-bold text-student-text">{sm.percentage}%</p>
            <p className="mt-1 text-sm text-student-muted">{sm.marksLabel} marks</p>
          </div>
          <div className="grid grid-cols-2 gap-3 @xl:grid-cols-4">
            <StatTile label="Total Questions" value={String(sm.total)} />
            <StatTile label="Correct" value={String(sm.correct)} tone="emerald" />
            <StatTile label="Incorrect" value={String(sm.incorrect)} tone="red" />
            <StatTile label="Skipped" value={String(sm.skipped)} tone="amber" />
          </div>
          <p className="text-center text-xs text-student-muted">Time used {fmtHMS(phase.timeUsedSec)}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => { void handleRetake(); }} variant="outline">
              <RotateCcw aria-hidden="true" className="mr-1.5 size-4" />Retake
            </Button>
            <Button onClick={onClose} className="bg-slate-900 text-white hover:bg-slate-800">Done</Button>
          </div>
        </div>
      </Frame>
    );
  }

  // Only in_progress reaches here (loading / error / intro / submitted return above).
  const inProgress = phase;
  const questions = inProgress.questions;
  const currentIdx = inProgress.current;
  const currentQ = questions[currentIdx];
  const total = questions.length;
  const answeredCount = questions.filter((q) => isAnswered(inProgress.answers.get(q.id))).length;
  const flaggedCount = inProgress.flagged.size;
  const visitedNotAnswered = questions.filter((q) => inProgress.visited.has(q.id) && !isAnswered(inProgress.answers.get(q.id))).length;
  const notVisitedCount = questions.filter((q) => !inProgress.visited.has(q.id)).length;

  return (
    <Frame onClose={onClose} title={inProgress.title}>
      {/* Header card with metadata + timer chip */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 @xl:flex-row @xl:items-start @xl:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <GraduationCap className="size-6" />
            </div>
            <div className="min-w-0">
              {meta?.headerLabel ? <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{meta.headerLabel}</p> : null}
              <h2 className="text-base font-semibold text-slate-900">{inProgress.title}</h2>
              {meta?.subject ? <p className="text-xs text-slate-500">Subject: {meta.subject}</p> : null}
              {meta?.totalMarks !== undefined || meta?.passMarks !== undefined ? (
                <p className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                  {meta?.totalMarks !== undefined ? <span>Total Marks: <strong className="text-slate-700">{meta.totalMarks}</strong></span> : null}
                  {meta?.passMarks !== undefined ? <span>Pass Marks: <strong className="text-slate-700">{meta.passMarks}</strong></span> : null}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-xs">
            {meta?.examDateLabel ? <Pill icon={<Calendar className="size-3.5" />} label="Date" value={meta.examDateLabel} /> : null}
            {meta?.startTimeLabel ? <Pill icon={<Clock className="size-3.5" />} label="Start" value={meta.startTimeLabel} /> : null}
            {timeLeftSec !== null ? (
              <Pill
                icon={<Hourglass className="size-3.5" />}
                label="Time Left"
                value={fmtHMS(timeLeftSec)}
                tone={timeLeftSec < 60 ? 'red' : timeLeftSec < 5 * 60 ? 'amber' : 'neutral'}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* TTII 2026-10-26 — side by side only when THIS player is wide enough.
          It renders in the course player's middle column (between the lesson
          list and the right sidebar), which on a laptop is ~450px even though
          the viewport is past lg; the 280px navigator then left the question
          ~150px wide, one word per line. Container query, not viewport. */}
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,1fr)_260px]">
        {/* Question pane */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {currentQ ? (
            <>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Question {currentIdx + 1} of {total}</p>
                  <h3 className="mt-1 text-base font-semibold leading-relaxed text-slate-900">{currentQ.question}</h3>
                </div>
                {inProgress ? (
                  <button
                    type="button"
                    onClick={() => toggleFlag(currentQ.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${inProgress.flagged.has(currentQ.id) ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'}`}
                  >
                    <Flag className={`size-3.5 ${inProgress.flagged.has(currentQ.id) ? 'fill-amber-500 text-amber-600' : ''}`} />
                    {inProgress.flagged.has(currentQ.id) ? 'Flagged' : 'Flag'}
                  </button>
                ) : null}
              </div>

              {currentQ.question_type === 1 ? (
                <p className="mb-2 text-xs font-medium text-student-muted">Select all that apply.</p>
              ) : null}
              <div className="space-y-2">
                {currentQ.options.map((opt, idx) => {
                  const answered = inProgress.answers.get(currentQ.id) ?? null;
                  const multi = currentQ.question_type === 1;
                  const isActive = Array.isArray(answered) ? answered.includes(idx) : answered === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => select(currentQ.id, idx, multi)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                        isActive
                          ? 'border-student-primary bg-student-primary/5 text-slate-900'
                          : 'border-slate-200 hover:border-student-primary/40 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                        isActive ? 'border-student-primary bg-student-primary text-white' : 'border-slate-300 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="min-w-0 flex-1 break-words">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {inProgress ? (
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <Button variant="outline" onClick={goPrev} disabled={currentIdx === 0}>‹ Previous</Button>
                  <Button onClick={goNext} disabled={currentIdx === total - 1} className="bg-slate-900 text-white hover:bg-slate-800">
                    Next ›
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Question Navigator */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Question Navigator</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const isAnsweredQ = isAnswered(inProgress.answers.get(q.id));
                const isFlagged = inProgress.flagged.has(q.id);
                const isVisited = inProgress.visited.has(q.id);
                let cls = 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50';
                if (isFlagged) cls = 'bg-amber-500 text-white hover:bg-amber-600';
                else if (isAnsweredQ) cls = 'bg-emerald-500 text-white hover:bg-emerald-600';
                else if (isVisited) cls = 'bg-red-500 text-white hover:bg-red-600';
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => jumpTo(idx)}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={`size-10 rounded-md text-sm font-semibold transition ${cls} ${isCurrent ? 'ring-2 ring-student-primary ring-offset-1' : ''}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Status legend */}
            <div className="mt-4 space-y-1.5 text-xs text-slate-600">
              <Legend swatch="bg-emerald-500" label="Attempted" value={answeredCount} />
              <Legend swatch="bg-red-500" label="Missed (visited)" value={visitedNotAnswered} />
              <Legend swatch="bg-amber-500" label="Flagged" value={flaggedCount} />
              <Legend swatch="border border-slate-300 bg-white" label="Not visited" value={notVisitedCount} />
            </div>
          </div>

          {inProgress ? (
            <Button
              onClick={() => setSubmitConfirmOpen(true)}
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              Submit Examination
            </Button>
          ) : null}
        </aside>
      </div>

      {/* Submit confirmation modal */}
      <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        {/* Risha UAT 2026-08-06 — mobile-safe modal box: modal-maxh bounds it (so
            a tall confirm panel scrolls instead of overflowing a short screen,
            e.g. a phone held in landscape) and top-2/translate-y-0 keeps it clear
            of the browser toolbars, which the fixed top:50% centring cannot
            account for. Confirm & Submit must never sit below the fold. */}
        <DialogContent
          className="top-2 modal-maxh translate-y-0 overflow-y-auto sm:top-[50%] sm:translate-y-[-50%] sm:max-w-[560px]"
          style={{ width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
        >
          <DialogHeader>
            <DialogTitle>Submit your exam?</DialogTitle>
            <DialogDescription>
              Once submitted, you will not be able to change your answers. Please review the summary below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <StatTile label="Total Questions" value={String(total)} />
            <StatTile label="Answered" value={String(answeredCount)} tone="emerald" />
            <StatTile label="Missed" value={String(total - answeredCount)} tone="red" />
            <StatTile label="Flagged" value={String(flaggedCount)} tone="amber" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitConfirmOpen(false)}>Continue Exam</Button>
            <Button onClick={() => { void submit(); }} className="bg-slate-900 text-white hover:bg-slate-800">
              Confirm &amp; Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Frame>
  );
}

function Frame({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="@container">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-student-muted">Exam</p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-student-text">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function PreviousAttempt({ attempt }: { attempt: QuizLastAttempt }) {
  const when = attempt.submittedAt ? new Date(attempt.submittedAt) : null;
  const whenLabel = when && !Number.isNaN(when.getTime())
    ? when.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  if (!attempt.graded) {
    // Attempts from before the grading fix stored no answers and were marked by
    // a faulty grader, so we do not show their numbers.
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left" role="status">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 aria-hidden="true" className="size-4" /> Completed{whenLabel ? ` on ${whenLabel}` : ''}
        </p>
        <p className="mt-1 text-xs text-emerald-900/80">
          Retake the quiz to see your score, correct and incorrect answers.
        </p>
      </div>
    );
  }
  const sm = summarizeResult({
    total_questions: attempt.totalQuestions,
    correct: attempt.correct,
    incorrect: attempt.incorrect,
    skip: attempt.skip,
    score: attempt.score,
  });
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" role="status">
      <p className="text-xs font-semibold uppercase tracking-wider text-student-muted">
        Your latest result{whenLabel ? ` - ${whenLabel}` : ''}
      </p>
      <p className="mt-1 text-3xl font-bold text-student-text">{sm.percentage}%</p>
      <div className="mt-3 grid grid-cols-2 gap-2 @md:grid-cols-4">
        <StatTile label="Total" value={String(sm.total)} />
        <StatTile label="Correct" value={String(sm.correct)} tone="emerald" />
        <StatTile label="Incorrect" value={String(sm.incorrect)} tone="red" />
        <StatTile label="Skipped" value={String(sm.skipped)} tone="amber" />
      </div>
    </div>
  );
}

function Pill({ icon, label, value, tone = 'neutral' }: { icon: React.ReactNode; label: string; value: string; tone?: 'neutral' | 'amber' | 'red' }) {
  const cls = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-white text-slate-700';
  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 ${cls}`}>
      <span className="text-slate-500">{icon}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <span className="font-mono text-xs font-semibold">{value}</span>
    </span>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2"><span className={`inline-block size-3 rounded-sm ${swatch}`} />{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function StatTile({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'emerald' | 'red' | 'amber' }) {
  const valCls = tone === 'emerald' ? 'text-emerald-600'
    : tone === 'red' ? 'text-red-600'
    : tone === 'amber' ? 'text-amber-600'
    : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valCls}`}>{value}</p>
    </div>
  );
}
