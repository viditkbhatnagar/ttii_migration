// Naji UAT 2026-06-01 — native in-portal player for FORMAL exams (the
// `exam` table + eligibility/scheduling), distinct from the per-lesson quiz
// player (ExamPlayer). It talks to /exams/exam_take + /exams/exam_save_result,
// renders admin-authored HTML question/option bodies, and runs a mandatory
// countdown timer (auto-submits at zero). Formal-exam results are published
// later by an admin, so the completion screen shows attempt stats only — it
// never reveals correctness or score.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, X, GraduationCap, Hourglass, CheckCircle2 } from 'lucide-react';
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

interface ExamQuestion {
  questionId: string;
  qType: number;
  question: string;
  options: string[];
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'intro'; attemptId: string; title: string; durationMin: number; questions: ExamQuestion[] }
  | {
      kind: 'in_progress';
      attemptId: string;
      title: string;
      durationMin: number;
      questions: ExamQuestion[];
      current: number;
      answers: Map<string, number | null>;
      visited: Set<string>;
      flagged: Set<string>;
      startedAt: number;
    }
  | { kind: 'submitted'; title: string; total: number; answered: number; flagged: number; timeUsedSec: number; timeLeftSec: number | null };

interface Props {
  api: StudentPortalApi;
  authToken: string;
  examId: string;
  title: string;
  headerLabel?: string;
  onClose: () => void;
}

function fmtHMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function FormalExamPlayer({ api, authToken, examId, title: initialTitle, headerLabel, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [tick, setTick] = useState(0);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const submittingRef = useRef(false);

  // Load the exam (this also starts/resumes the attempt on the server).
  useEffect(() => {
    let cancelled = false;
    setPhase({ kind: 'loading' });
    api
      .loadExamForTaking(authToken, examId)
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setPhase({ kind: 'error', message: data.error });
          return;
        }
        if (data.questions.length === 0) {
          setPhase({ kind: 'error', message: 'This exam has no questions yet.' });
          return;
        }
        setPhase({
          kind: 'intro',
          attemptId: data.attemptId,
          title: data.title || initialTitle,
          durationMin: Number.parseInt(data.duration, 10) || 0,
          questions: data.questions,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to load exam.' });
      });
    return () => { cancelled = true; };
  }, [api, authToken, examId, initialTitle]);

  // Tick once a second while in progress so the countdown updates.
  useEffect(() => {
    if (phase.kind !== 'in_progress') return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [phase.kind]);

  const handleStart = () => {
    setPhase((p) => {
      if (p.kind !== 'intro') return p;
      const firstId = p.questions[0]?.questionId;
      return {
        kind: 'in_progress',
        attemptId: p.attemptId,
        title: p.title,
        durationMin: p.durationMin,
        questions: p.questions,
        current: 0,
        answers: new Map(),
        visited: new Set(firstId !== undefined ? [firstId] : []),
        flagged: new Set(),
        startedAt: Date.now(),
      };
    });
  };

  // Mark current question visited when the index changes.
  useEffect(() => {
    setPhase((p) => {
      if (p.kind !== 'in_progress') return p;
      const cur = p.questions[p.current];
      if (!cur || p.visited.has(cur.questionId)) return p;
      const visited = new Set(p.visited);
      visited.add(cur.questionId);
      return { ...p, visited };
    });
  }, [(phase as { kind: string; current?: number }).current, phase.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (qid: string, optionIndex: number) => {
    setPhase((p) => {
      if (p.kind !== 'in_progress') return p;
      const next = new Map(p.answers);
      next.set(qid, optionIndex);
      return { ...p, answers: next };
    });
  };

  const toggleFlag = (qid: string) => {
    setPhase((p) => {
      if (p.kind !== 'in_progress') return p;
      const next = new Set(p.flagged);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return { ...p, flagged: next };
    });
  };

  const clearResponse = (qid: string) => {
    setPhase((p) => {
      if (p.kind !== 'in_progress') return p;
      const next = new Map(p.answers);
      next.delete(qid);
      return { ...p, answers: next };
    });
  };

  const goNext = () => setPhase((p) => (p.kind === 'in_progress' && p.current < p.questions.length - 1 ? { ...p, current: p.current + 1 } : p));
  const goPrev = () => setPhase((p) => (p.kind === 'in_progress' && p.current > 0 ? { ...p, current: p.current - 1 } : p));
  const jumpTo = (index: number) => setPhase((p) => (p.kind === 'in_progress' && index >= 0 && index < p.questions.length ? { ...p, current: index } : p));

  const submit = async () => {
    if (phase.kind !== 'in_progress' || submittingRef.current) return;
    submittingRef.current = true;
    const snapshot = phase;
    // answer is the 1-based option index, matching question_bank.correct_answers.
    const userAnswers = snapshot.questions.map((q) => {
      const selected = snapshot.answers.has(q.questionId) ? snapshot.answers.get(q.questionId) ?? null : null;
      return {
        question_id: q.questionId,
        answer: selected !== null ? [String(selected + 1)] : [],
      };
    });
    const answeredCount = snapshot.questions.filter(
      (q) => snapshot.answers.has(q.questionId) && snapshot.answers.get(q.questionId) !== null,
    ).length;
    try {
      await api.submitExamAttempt(authToken, snapshot.attemptId, userAnswers);
      const elapsedSec = Math.max(0, Math.floor((Date.now() - snapshot.startedAt) / 1000));
      const totalSec = snapshot.durationMin * 60;
      setPhase({
        kind: 'submitted',
        title: snapshot.title,
        total: snapshot.questions.length,
        answered: answeredCount,
        flagged: snapshot.flagged.size,
        timeUsedSec: elapsedSec,
        timeLeftSec: totalSec > 0 ? Math.max(0, totalSec - elapsedSec) : null,
      });
      setResultOpen(true);
      setSubmitConfirmOpen(false);
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Submission failed.' });
    } finally {
      submittingRef.current = false;
    }
  };

  // Countdown (auto-submit at zero).
  const timeLeftSec = useMemo(() => {
    if (phase.kind !== 'in_progress' || phase.durationMin <= 0) return null;
    void tick;
    const elapsed = Math.floor((Date.now() - phase.startedAt) / 1000);
    return Math.max(0, phase.durationMin * 60 - elapsed);
  }, [phase, tick]);

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
    return (
      <Frame onClose={onClose} title={initialTitle}>
        <div className="py-12 text-center">
          <p role="alert" className="text-sm text-red-600">{phase.message}</p>
          <Button variant="outline" className="mt-4" onClick={onClose}>Close</Button>
        </div>
      </Frame>
    );
  }
  if (phase.kind === 'intro') {
    return (
      <Frame onClose={onClose} title={phase.title}>
        <div className="mx-auto max-w-md space-y-4 py-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-student-primary/10 text-student-primary">
            <GraduationCap aria-hidden="true" className="size-7" />
          </div>
          <h2 className="text-lg font-semibold text-student-text">{phase.title}</h2>
          <p className="text-sm text-student-muted">
            {phase.questions.length} question{phase.questions.length === 1 ? '' : 's'}
            {phase.durationMin > 0 ? ` · ${phase.durationMin} min` : ''}
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
            Once you start, the timer runs continuously. Submit before time runs out — the exam auto-submits at zero. Your results will be published by your institute.
          </div>
          <Button onClick={handleStart} className="bg-student-primary hover:bg-student-primary/90">Start Exam</Button>
        </div>
      </Frame>
    );
  }

  const inProgress = phase.kind === 'in_progress' ? phase : null;
  const questions = inProgress?.questions ?? [];
  const currentIdx = inProgress?.current ?? 0;
  const currentQ = questions[currentIdx];
  const total = questions.length;
  const answeredCount = inProgress
    ? questions.filter((q) => inProgress.answers.has(q.questionId) && inProgress.answers.get(q.questionId) !== null).length
    : 0;
  const flaggedCount = inProgress?.flagged.size ?? 0;
  const visitedNotAnswered = inProgress
    ? questions.filter((q) => inProgress.visited.has(q.questionId) && (!inProgress.answers.has(q.questionId) || inProgress.answers.get(q.questionId) === null)).length
    : 0;
  const notVisitedCount = inProgress ? questions.filter((q) => !inProgress.visited.has(q.questionId)).length : 0;

  return (
    <Frame onClose={onClose} title={inProgress?.title ?? initialTitle}>
      {/* Header card with timer chip */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <GraduationCap className="size-6" />
            </div>
            <div className="min-w-0">
              {headerLabel ? <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{headerLabel}</p> : null}
              <h2 className="text-base font-semibold text-slate-900">{inProgress?.title ?? initialTitle}</h2>
              <p className="mt-1 text-[11px] text-slate-500">Total Questions: <strong className="text-slate-700">{total}</strong></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
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
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Question {currentIdx + 1} of {total}</p>
                  <div
                    className="prose prose-sm mt-1 max-w-none text-base font-semibold leading-relaxed text-slate-900"
                    dangerouslySetInnerHTML={{ __html: currentQ.question }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toggleFlag(currentQ.questionId)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${inProgress?.flagged.has(currentQ.questionId) ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'}`}
                >
                  <Flag className={`size-3.5 ${inProgress?.flagged.has(currentQ.questionId) ? 'fill-amber-500 text-amber-600' : ''}`} />
                  {inProgress?.flagged.has(currentQ.questionId) ? 'Marked' : 'Mark for Review'}
                </button>
              </div>

              <div className="space-y-2">
                {currentQ.options.map((opt, idx) => {
                  const answered = inProgress?.answers.has(currentQ.questionId) ? inProgress.answers.get(currentQ.questionId) : null;
                  const isActive = answered === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => inProgress && select(currentQ.questionId, idx)}
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
                      <span className="prose prose-sm max-w-none flex-1 [&_p]:m-0" dangerouslySetInnerHTML={{ __html: opt }} />
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <Button variant="outline" onClick={goPrev} disabled={currentIdx === 0}>‹ Previous</Button>
                <Button
                  variant="ghost"
                  onClick={() => clearResponse(currentQ.questionId)}
                  disabled={!inProgress?.answers.has(currentQ.questionId)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear Response
                </Button>
                <Button onClick={goNext} disabled={currentIdx === total - 1} className="bg-slate-900 text-white hover:bg-slate-800">Save &amp; Next ›</Button>
              </div>
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
                const isAnswered = inProgress?.answers.has(q.questionId) && inProgress.answers.get(q.questionId) !== null;
                const isFlagged = inProgress?.flagged.has(q.questionId);
                const isVisited = inProgress?.visited.has(q.questionId);
                let cls = 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50';
                if (isFlagged) cls = 'bg-amber-500 text-white hover:bg-amber-600';
                else if (isAnswered) cls = 'bg-emerald-500 text-white hover:bg-emerald-600';
                else if (isVisited) cls = 'bg-red-500 text-white hover:bg-red-600';
                return (
                  <button
                    key={q.questionId}
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
            <div className="mt-4 space-y-1.5 text-xs text-slate-600">
              <Legend swatch="bg-emerald-500" label="Attempted" value={answeredCount} />
              <Legend swatch="bg-red-500" label="Missed (visited)" value={visitedNotAnswered} />
              <Legend swatch="bg-amber-500" label="Marked" value={flaggedCount} />
              <Legend swatch="border border-slate-300 bg-white" label="Not visited" value={notVisitedCount} />
            </div>
          </div>
          <Button onClick={() => setSubmitConfirmOpen(true)} className="w-full bg-slate-900 text-white hover:bg-slate-800">Submit Exam</Button>
        </aside>
      </div>

      {/* Submit confirmation */}
      <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Submit your exam?</DialogTitle>
            <DialogDescription>Once submitted, you cannot change your answers.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <StatTile label="Total Questions" value={String(total)} />
            <StatTile label="Answered" value={String(answeredCount)} tone="emerald" />
            <StatTile label="Missed" value={String(total - answeredCount)} tone="red" />
            <StatTile label="Marked" value={String(flaggedCount)} tone="amber" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitConfirmOpen(false)}>Continue Exam</Button>
            <Button onClick={() => { void submit(); }} className="bg-slate-900 text-white hover:bg-slate-800">Confirm &amp; Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion modal (no score — formal results publish later) */}
      <Dialog
        open={resultOpen && phase.kind === 'submitted'}
        onOpenChange={(o) => { setResultOpen(o); if (!o) onClose(); }}
      >
        <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-w-[min(640px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600" /> Exam Submitted Successfully</DialogTitle>
            <DialogDescription>Your responses have been recorded. Results will be published by your institute.</DialogDescription>
          </DialogHeader>
          {phase.kind === 'submitted' ? (
            <div className="grid grid-cols-2 gap-3 py-2">
              <StatTile label="Total Questions" value={String(phase.total)} />
              <StatTile label="Answered" value={String(phase.answered)} tone="emerald" />
              <StatTile label="Missed" value={String(phase.total - phase.answered)} tone="red" />
              <StatTile label="Time Used" value={fmtHMS(phase.timeUsedSec)} />
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
        <button type="button" onClick={onClose} title="Close" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
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
