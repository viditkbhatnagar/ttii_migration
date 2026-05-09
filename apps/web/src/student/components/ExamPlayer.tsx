// Naji 2026-05-09 — Exam Player redesigned to match the new design:
// header card with title / subject / marks / timer; two-column layout
// with the question pane on the left and a Question Navigator panel
// on the right (Attempted / Missed visited / Flagged / Not visited
// status legend); flag-question control; Submit confirmation modal;
// Submitted result modal with attempt stats. Drop-in replacement for
// the old QuizPlayer — same props, same /student/quiz/* endpoints.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, X, GraduationCap, Calendar, Clock, Hourglass, CheckCircle2 } from 'lucide-react';
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
    }
  | {
      kind: 'in_progress';
      title: string;
      questions: QuizQuestion[];
      attemptId: string;
      current: number;
      answers: Map<number, number | null>;
      visited: Set<number>;
      flagged: Set<number>;
      startedAt: number; // epoch ms
    }
  | {
      kind: 'submitted';
      title: string;
      questions: QuizQuestion[];
      timeUsedSec: number;
      timeLeftSec: number | null;
      result: {
        correct: number;
        incorrect: number;
        skip: number;
        score: number;
        total_questions: number;
        review: Array<{ question_id: number; selected: number | null; correct: number[]; isCorrect: boolean | null }>;
      };
    };

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
}

function fmtHMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function ExamPlayer({
  api, authToken, lessonFileId, title: initialTitle, meta, onClose,
}: Props) {
  const [phase, setPhase] = useState<ExamPhase>({ kind: 'loading' });
  const [tick, setTick] = useState(0); // forces re-render once a second for timer
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
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

  const handleStart = async () => {
    if (phase.kind !== 'intro') return;
    try {
      const attemptId = await api.startStudentQuiz(authToken, lessonFileId);
      const firstId = phase.questions[0]?.id;
      setPhase({
        kind: 'in_progress',
        title: phase.title,
        questions: phase.questions,
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

  const select = (qid: number, optionIndex: number) => {
    setPhase((p) => {
      if (p.kind !== 'in_progress') return p;
      const next = new Map(p.answers);
      next.set(qid, optionIndex);
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
      selected: phase.answers.has(q.id) ? phase.answers.get(q.id) ?? null : null,
    }));
    const startedAt = phase.startedAt;
    try {
      const result = await api.submitStudentQuiz(authToken, {
        lessonFileId,
        attemptId: phase.attemptId,
        answers: answersArr,
      });
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const totalSec = (meta?.durationMinutes ?? 0) * 60;
      const timeLeftSec = totalSec > 0 ? Math.max(0, totalSec - elapsedSec) : null;
      setPhase({
        kind: 'submitted',
        title: phase.title,
        questions: phase.questions,
        timeUsedSec: elapsedSec,
        timeLeftSec,
        result,
      });
      setResultOpen(true);
      setSubmitConfirmOpen(false);
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
    return (
      <Frame onClose={onClose} title={phase.title}>
        <div className="mx-auto max-w-md space-y-4 py-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-student-primary/10 text-student-primary">
            <GraduationCap aria-hidden="true" className="size-7" />
          </div>
          <h2 className="text-lg font-semibold text-student-text">{phase.title}</h2>
          {phase.description ? <p className="text-sm leading-relaxed text-student-muted">{phase.description.replace(/<[^>]+>/g, '')}</p> : null}
          <p className="text-sm text-student-muted">{phase.questions.length} question{phase.questions.length === 1 ? '' : 's'}{meta?.durationMinutes ? ` · ${meta.durationMinutes} min` : ''}</p>
          <Button onClick={() => { void handleStart(); }} className="bg-student-primary hover:bg-student-primary/90">
            Start Examination
          </Button>
        </div>
      </Frame>
    );
  }

  // in_progress / submitted share the layout
  const inProgress = phase.kind === 'in_progress' ? phase : null;
  const submitted = phase.kind === 'submitted' ? phase : null;

  const questions = inProgress?.questions ?? submitted?.questions ?? [];
  const currentIdx = inProgress?.current ?? 0;
  const currentQ = questions[currentIdx];
  const total = questions.length;
  const answeredCount = inProgress
    ? questions.filter((q) => inProgress.answers.has(q.id) && inProgress.answers.get(q.id) !== null).length
    : submitted?.result.correct ?? 0;
  const flaggedCount = inProgress?.flagged.size ?? 0;
  const visitedNotAnswered = inProgress
    ? questions.filter((q) => inProgress.visited.has(q.id) && (!inProgress.answers.has(q.id) || inProgress.answers.get(q.id) === null)).length
    : 0;
  const notVisitedCount = inProgress
    ? questions.filter((q) => !inProgress.visited.has(q.id)).length
    : 0;

  return (
    <Frame onClose={onClose} title={inProgress ? inProgress.title : submitted?.title ?? initialTitle}>
      {/* Header card with metadata + timer chip */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <GraduationCap className="size-6" />
            </div>
            <div className="min-w-0">
              {meta?.headerLabel ? <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{meta.headerLabel}</p> : null}
              <h2 className="text-base font-semibold text-slate-900">{(inProgress ?? submitted)?.title ?? initialTitle}</h2>
              {meta?.subject ? <p className="text-xs text-slate-500">Subject: {meta.subject}</p> : null}
              {meta?.totalMarks !== undefined || meta?.passMarks !== undefined ? (
                <p className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                  {meta?.totalMarks !== undefined ? <span>Total Marks: <strong className="text-slate-700">{meta.totalMarks}</strong></span> : null}
                  {meta?.passMarks !== undefined ? <span>Pass Marks: <strong className="text-slate-700">{meta.passMarks}</strong></span> : null}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Question pane */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {currentQ ? (
            <>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
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

              <div className="space-y-2">
                {currentQ.options.map((opt, idx) => {
                  const answered = inProgress?.answers.has(currentQ.id) ? inProgress.answers.get(currentQ.id) : null;
                  const isActive = answered === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!inProgress}
                      onClick={() => inProgress && select(currentQ.id, idx)}
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
                      <span className="flex-1">{opt}</span>
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
                const isAnswered = inProgress?.answers.has(q.id) && inProgress.answers.get(q.id) !== null;
                const isFlagged = inProgress?.flagged.has(q.id);
                const isVisited = inProgress?.visited.has(q.id);
                let cls = 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50';
                if (isFlagged) cls = 'bg-amber-500 text-white hover:bg-amber-600';
                else if (isAnswered) cls = 'bg-emerald-500 text-white hover:bg-emerald-600';
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
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))]">
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

      {/* Submitted result modal */}
      <Dialog
        open={resultOpen && submitted !== null}
        onOpenChange={(o) => {
          setResultOpen(o);
          if (!o) onClose();
        }}
      >
        <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-w-[min(640px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600" /> Exam Submitted Successfully</DialogTitle>
            <DialogDescription>Your responses have been recorded. Here is a summary of your attempt.</DialogDescription>
          </DialogHeader>
          {submitted ? (
            <div className="grid grid-cols-2 gap-3 py-2">
              <StatTile label="Total Questions" value={String(submitted.questions.length)} />
              <StatTile label="Answered" value={String(submitted.questions.length - submitted.result.skip)} tone="emerald" />
              <StatTile label="Missed" value={String(submitted.result.skip)} tone="red" />
              <StatTile label="Flagged" value={String(flaggedCount)} tone="amber" />
              <StatTile label="Time Used" value={fmtHMS(submitted.timeUsedSec)} />
              <StatTile label="Time Left" value={submitted.timeLeftSec !== null ? fmtHMS(submitted.timeLeftSec) : '—'} />
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => { setResultOpen(false); onClose(); }} className="bg-slate-900 text-white hover:bg-slate-800">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Frame>
  );
}

function Frame({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div>
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
