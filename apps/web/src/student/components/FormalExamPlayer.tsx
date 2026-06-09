// Naji UAT 2026-06-01 — native in-portal player for FORMAL exams (the
// `exam` table + eligibility/scheduling), distinct from the per-lesson quiz
// player (ExamPlayer). It talks to /exams/exam_take + /exams/exam_save_result,
// renders admin-authored HTML question/option bodies, and runs a mandatory
// countdown timer (auto-submits at zero). Formal-exam results are published
// later by an admin, so the completion screen shows attempt stats only — it
// never reveals correctness or score.
//
// EduPulse feature port 2026-06-04 — added browser proctoring (Naji): the exam
// opens in full screen on start; tab switches, window blur and full-screen
// exits are recorded as violations, surfaced as escalating warnings, and the
// exam auto-submits once the limit is reached. Frontend-only guard for now
// (no server persistence).
//
// EduPulse UI match 2026-06-09 (Naji) — the intro (instructions) and attempt
// screens were rebuilt to mirror the lovable reference exactly:
//   • /exams/ex-001/instructions → the intro phase (header card with stat
//     chips + proctoring banner, "Please read carefully" grid, agree gate)
//   • /exams/ex-001/attempt → the in_progress phase (focused top bar with the
//     student/enrolment + timer + submit, question card with pills + option
//     rows, right "Question Palette" + "Summary" sidebar)
// Only fields the backend actually provides are shown — pass marks, per-question
// marks and auto-save do not exist server-side, so they are deliberately omitted
// rather than faked.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Flag,
  X,
  GraduationCap,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  Maximize,
  ShieldCheck,
  Wifi,
  RefreshCw,
  Ban,
  AlertCircle,
  Lock,
  CalendarDays,
  Clock,
  FileText,
  Award,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Send,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
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

/** Extra exam context the list page already holds (the `exam_take` payload does
 * not carry course/subject/date/marks). All optional — the screens degrade
 * gracefully when a field is missing. */
export interface FormalExamMeta {
  code?: string;
  course?: string;
  subject?: string;
  dateLabel?: string;
  startLabel?: string;
  totalMarksLabel?: string;
  studentName?: string;
  enrollmentNo?: string;
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
  meta?: FormalExamMeta;
  /** Whether browser proctoring (full screen + focus tracking) is enforced. Defaults to on for formal exams. */
  proctored?: boolean;
  onClose: () => void;
}

// Proctoring: how many focus-loss / full-screen-exit events are allowed before
// the exam auto-submits. Frontend-only guard (no server persistence yet).
const PROCTOR_MAX_VIOLATIONS = 3;

// The "Please read carefully" rules. Each is true for this player: there is no
// auto-save (refresh loses answers), proctoring records tab/window switches,
// and the timer auto-submits at zero.
const EXAM_RULES: Array<{ icon: LucideIcon; text: string }> = [
  { icon: Wifi, text: 'A stable internet connection is required throughout the exam.' },
  { icon: RefreshCw, text: 'Do not refresh the page — your answers will be lost.' },
  { icon: Ban, text: 'Do not close the browser or switch tabs during the exam.' },
  { icon: Hourglass, text: 'Submit your exam before the timer ends.' },
  { icon: AlertCircle, text: 'Unanswered questions will be scored zero.' },
  { icon: Lock, text: 'The exam will auto-submit when the timer reaches zero.' },
];

function fmtHMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// Exam duration ships as a DB VARCHAR — could be plain minutes ("60"), "HH:MM"
// or "HH:MM:SS". Parse all three to whole minutes (a plain Number.parseInt on
// "01:00:00" wrongly yields 1).
function parseDurationMin(raw: string): number {
  const s = (raw ?? '').trim();
  if (s === '') return 0;
  if (/^\d+$/.test(s)) return Number.parseInt(s, 10);
  const parts = s.split(':').map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return Number.parseInt(s, 10) || 0;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function FormalExamPlayer({ api, authToken, examId, title: initialTitle, headerLabel, meta, proctored = true, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [tick, setTick] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const submittingRef = useRef(false);

  // ── Proctoring state ──────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);
  const [proctorAutoSubmit, setProctorAutoSubmit] = useState(false);
  const violationsRef = useRef(0);
  const lastViolationAtRef = useRef(0);
  const proctorActiveRef = useRef(false);

  const enterFullscreen = () => {
    if (!proctored) return;
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        /* user/agent denied — proctoring still tracks tab switches */
      });
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Record a proctoring violation (tab switch / window blur / full-screen exit).
  // De-duplicates rapid duplicate events and auto-submits once the limit is hit.
  const registerViolation = (reason: string) => {
    if (!proctorActiveRef.current) return;
    const now = Date.now();
    if (now - lastViolationAtRef.current < 800) return;
    lastViolationAtRef.current = now;
    violationsRef.current += 1;
    const count = violationsRef.current;
    setViolations(count);
    if (count >= PROCTOR_MAX_VIOLATIONS) {
      proctorActiveRef.current = false;
      setProctorWarning(
        `${reason} You have reached the limit of ${PROCTOR_MAX_VIOLATIONS} warnings — your exam is being submitted automatically.`,
      );
      setProctorAutoSubmit(true);
    } else {
      setProctorWarning(
        `${reason} Warning ${count} of ${PROCTOR_MAX_VIOLATIONS}. Leaving the exam screen again may auto-submit your exam.`,
      );
    }
  };

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
          durationMin: parseDurationMin(data.duration),
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

  // Proctoring: watch for tab switches, window blur and full-screen exits while
  // the exam is in progress. Each is recorded as a violation; the student is
  // prompted to return (and re-enter full screen).
  useEffect(() => {
    if (phase.kind !== 'in_progress' || !proctored) return;
    proctorActiveRef.current = true;

    const onVisibility = () => {
      if (document.hidden) registerViolation('You switched away from the exam tab.');
    };
    const onBlur = () => registerViolation('You left the exam window.');
    const onFullscreenChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (!fs) registerViolation('You exited full-screen mode.');
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('beforeunload', onBeforeUnload);
    setIsFullscreen(Boolean(document.fullscreenElement));

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [phase.kind, proctored]);

  // Exit full screen when the player unmounts.
  useEffect(() => () => { exitFullscreen(); }, []);

  const handleStart = () => {
    // Enter full screen on the start gesture (must run inside the click handler).
    enterFullscreen();
    violationsRef.current = 0;
    lastViolationAtRef.current = 0;
    proctorActiveRef.current = proctored;
    setViolations(0);
    setProctorWarning(null);
    setProctorAutoSubmit(false);
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
    proctorActiveRef.current = false;
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
      exitFullscreen();
      setProctorWarning(null);
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

  // Proctoring auto-submit (mirrors the timer auto-submit so `submit` is fresh).
  useEffect(() => {
    if (proctorAutoSubmit && phase.kind === 'in_progress' && !submittingRef.current) {
      void submit();
    }
  }, [proctorAutoSubmit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──────────────────────────────────────────────────────
  if (phase.kind === 'loading') {
    return (
      <CenterFrame onClose={onClose} title={initialTitle}>
        <div className="py-12 text-center text-sm text-student-muted">Loading exam…</div>
      </CenterFrame>
    );
  }
  if (phase.kind === 'error') {
    return (
      <CenterFrame onClose={onClose} title={initialTitle}>
        <div className="py-12 text-center">
          <p role="alert" className="text-sm text-red-600">{phase.message}</p>
          <Button variant="outline" className="mt-4" onClick={onClose}>Close</Button>
        </div>
      </CenterFrame>
    );
  }

  // ── Instructions screen (intro) — mirrors /exams/:id/instructions ──
  if (phase.kind === 'intro') {
    const subtitle = [meta?.course, meta?.subject].filter(Boolean).join(' · ');
    const chips: Array<{ icon: LucideIcon; label: string; value: string }> = [];
    if (meta?.dateLabel) chips.push({ icon: CalendarDays, label: 'Date', value: meta.dateLabel });
    if (meta?.startLabel) chips.push({ icon: Clock, label: 'Start', value: meta.startLabel });
    chips.push({ icon: FileText, label: 'Questions', value: String(phase.questions.length) });
    if (meta?.totalMarksLabel) chips.push({ icon: Award, label: 'Total Marks', value: meta.totalMarksLabel });

    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-student-muted transition-colors hover:text-student-text"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to exams
        </button>

        {/* Header card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-7">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-student-primary-light px-3 py-1 text-xs font-semibold text-student-primary">
                Exam Instructions
              </span>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-student-text sm:text-3xl">
                {phase.title}
              </h1>
              {subtitle ? <p className="mt-1 text-sm text-student-muted">{subtitle}</p> : null}
              {meta?.code ? <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">{meta.code}</p> : null}
            </div>
            {phase.durationMin > 0 ? (
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-student-muted">Duration</p>
                <p className="leading-none">
                  <span className="text-3xl font-bold text-student-primary">{phase.durationMin}</span>
                  <span className="ml-1 text-sm font-medium text-student-muted">min</span>
                </p>
              </div>
            ) : null}
          </div>

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-3 border-t border-slate-100 px-6 py-4 sm:px-7">
              {chips.map((c) => (
                <StatChip key={c.label} icon={c.icon} label={c.label} value={c.value} />
              ))}
            </div>
          ) : null}

          {proctored ? (
            <div className="flex items-center gap-2 border-t border-sky-100 bg-sky-50/70 px-6 py-3 text-sm text-sky-800 sm:px-7">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-sky-600" />
              <span>
                <strong className="font-semibold">Proctoring:</strong> this exam runs in full screen and your tab
                switches are monitored.
              </span>
            </div>
          ) : null}
        </div>

        {/* Please read carefully */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-student-text">Please read carefully</h2>
          <p className="mt-1 text-sm text-student-muted">
            You will not be able to start the exam until you agree to the instructions below.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {EXAM_RULES.map((rule) => {
              const Icon = rule.icon;
              return (
                <div
                  key={rule.text}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-student-primary-light text-student-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <p className="mt-1 text-sm text-slate-700">{rule.text}</p>
                </div>
              );
            })}
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-student-primary/40 bg-student-primary-light/40 p-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-student-primary focus:ring-student-primary"
            />
            <span className="text-sm text-slate-700">
              I have read and agree to the exam instructions. I understand that my exam will be
              monitored and auto-submitted when the timer ends.
            </span>
          </label>

          <div className="mt-5 flex flex-col-reverse items-stretch gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="ghost" onClick={onClose} className="text-student-muted hover:text-student-text">
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              disabled={!agreed}
              className="bg-gradient-to-br from-student-primary to-student-accent text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {proctored ? <Maximize aria-hidden="true" className="mr-2 size-4" /> : null}
              Start Exam Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Attempt screen (in_progress) + submitted ──────────────────────
  const inProgress = phase.kind === 'in_progress' ? phase : null;
  const submittedPhase = phase.kind === 'submitted' ? phase : null;
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
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const examTitle = inProgress?.title ?? submittedPhase?.title ?? initialTitle;
  const topSubtitle = [meta?.course, meta?.subject].filter(Boolean).join(' · ') || headerLabel || '';
  const currentFlagged = currentQ ? Boolean(inProgress?.flagged.has(currentQ.questionId)) : false;

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-student-bg sm:-m-6">
      {/* Focused top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-student-primary to-student-accent text-white shadow-sm">
              <GraduationCap aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-student-text">{examTitle}</h2>
              {topSubtitle ? <p className="truncate text-xs text-student-muted">{topSubtitle}</p> : null}
            </div>
          </div>

          {meta?.studentName ? (
            <div className="hidden items-center gap-6 md:flex">
              <TopMeta label="Student" value={meta.studentName} />
              {meta.enrollmentNo ? <TopMeta label="Enrollment" value={meta.enrollmentNo} mono /> : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {inProgress && proctored ? (
              <Pill
                icon={<ShieldCheck className="size-3.5" />}
                label="Proctored"
                value={`${violations}/${PROCTOR_MAX_VIOLATIONS}`}
                tone={violations === 0 ? 'neutral' : violations >= PROCTOR_MAX_VIOLATIONS - 1 ? 'red' : 'amber'}
              />
            ) : null}
            {inProgress && proctored && !isFullscreen ? (
              <button
                type="button"
                onClick={enterFullscreen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-student-primary/30 bg-student-primary/5 px-2.5 py-1.5 font-medium text-student-primary transition hover:bg-student-primary/10"
              >
                <Maximize className="size-3.5" /> Full screen
              </button>
            ) : null}
            {inProgress && timeLeftSec !== null ? (
              <Pill
                icon={<Hourglass className="size-3.5" />}
                label="Time Left"
                value={fmtHMS(timeLeftSec)}
                tone={timeLeftSec < 60 ? 'red' : timeLeftSec < 5 * 60 ? 'amber' : 'neutral'}
              />
            ) : null}
            {inProgress ? (
              <Button
                onClick={() => setSubmitConfirmOpen(true)}
                className="h-9 rounded-xl bg-gradient-to-br from-student-primary to-student-accent px-4 text-xs font-semibold text-white shadow-sm hover:opacity-95"
              >
                <Send aria-hidden="true" className="mr-1.5 size-3.5" /> Submit Exam
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        {submittedPhase ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </span>
            <h3 className="text-lg font-bold text-student-text">Exam submitted</h3>
            <p className="mt-1 text-sm text-student-muted">Your responses have been recorded. Results will be published by your institute.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Question card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {currentQ ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-student-primary-light px-3 py-1 text-xs font-semibold text-student-primary">
                      Question {currentIdx + 1} of {total}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                      {currentQ.qType === 1 ? 'MCQ · Single Answer' : 'MCQ'}
                    </span>
                  </div>

                  <div
                    className="prose prose-sm mt-3 max-w-none break-words text-lg font-medium leading-relaxed text-student-text [&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: currentQ.question }}
                  />

                  <div className="mt-5 space-y-3">
                    {currentQ.options.map((opt, idx) => {
                      const answered = inProgress?.answers.has(currentQ.questionId) ? inProgress.answers.get(currentQ.questionId) : null;
                      const isActive = answered === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => inProgress && select(currentQ.questionId, idx)}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm transition ${
                            isActive
                              ? 'border-student-primary bg-student-primary/5 text-student-text'
                              : 'border-slate-200 bg-slate-50/40 hover:border-student-primary/40 hover:bg-white'
                          }`}
                        >
                          <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                            isActive ? 'border-student-primary bg-student-primary text-white' : 'border-slate-300 text-slate-500'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="prose prose-sm min-w-0 max-w-none flex-1 break-words [&_img]:h-auto [&_img]:max-w-full [&_p]:m-0" dangerouslySetInnerHTML={{ __html: opt }} />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-5">
                    <Button variant="outline" onClick={goPrev} disabled={currentIdx === 0} className="rounded-xl">
                      <ChevronLeft aria-hidden="true" className="mr-1 size-4" /> Previous
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => clearResponse(currentQ.questionId)}
                        disabled={!inProgress?.answers.has(currentQ.questionId)}
                        className="rounded-xl text-slate-500 hover:text-slate-700"
                      >
                        <Eraser aria-hidden="true" className="mr-1.5 size-4" /> Clear Response
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => toggleFlag(currentQ.questionId)}
                        className={`rounded-xl ${currentFlagged ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'text-slate-600'}`}
                      >
                        <Flag aria-hidden="true" className={`mr-1.5 size-4 ${currentFlagged ? 'fill-amber-500 text-amber-600' : ''}`} />
                        {currentFlagged ? 'Marked' : 'Mark for Review'}
                      </Button>
                      <Button
                        onClick={goNext}
                        disabled={currentIdx === total - 1}
                        className="rounded-xl bg-gradient-to-br from-student-primary to-student-accent text-white shadow-sm hover:opacity-95"
                      >
                        Save &amp; Next <ChevronRight aria-hidden="true" className="ml-1 size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Right rail: palette + summary + submit */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-student-text">Question Palette</h4>
                  <span className="text-xs text-student-muted">{total} total</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentIdx;
                    const isAnswered = inProgress?.answers.has(q.questionId) && inProgress.answers.get(q.questionId) !== null;
                    const isFlagged = inProgress?.flagged.has(q.questionId);
                    const isVisited = inProgress?.visited.has(q.questionId);
                    let cls = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                    if (isCurrent) cls = 'bg-gradient-to-br from-student-primary to-student-accent text-white shadow-sm';
                    else if (isFlagged) cls = 'bg-amber-500 text-white hover:bg-amber-600';
                    else if (isAnswered) cls = 'bg-emerald-500 text-white hover:bg-emerald-600';
                    else if (isVisited) cls = 'bg-red-500 text-white hover:bg-red-600';
                    return (
                      <button
                        key={q.questionId}
                        type="button"
                        onClick={() => jumpTo(idx)}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`flex size-9 items-center justify-center rounded-xl text-xs font-semibold transition ${cls}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="mb-3 text-sm font-bold text-student-text">Summary</h4>
                <div className="space-y-2 text-sm">
                  <SummaryRow dot="bg-emerald-500" label="Answered" value={answeredCount} />
                  <SummaryRow dot="bg-red-500" label="Not Answered" value={visitedNotAnswered} />
                  <SummaryRow dot="bg-amber-500" label="Marked for Review" value={flaggedCount} />
                  <SummaryRow dot="bg-slate-400" label="Not Visited" value={notVisitedCount} />
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-student-muted">Progress</span>
                    <span className="font-semibold text-student-text">{progressPct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setSubmitConfirmOpen(true)}
                className="h-12 w-full rounded-[22px] bg-gradient-to-br from-student-primary to-student-accent text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                <Send aria-hidden="true" className="mr-2 size-4" /> Submit Exam
              </Button>
            </aside>
          </div>
        )}
      </div>

      {/* Proctoring warning */}
      <Dialog open={proctorWarning !== null} onOpenChange={(o) => { if (!o) setProctorWarning(null); }}>
        <DialogContent
          className="sm:max-w-[480px]"
          style={{ width: 'min(480px, calc(100vw - 2rem))', maxWidth: 'min(480px, calc(100vw - 2rem))' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="size-5" /> Stay on the exam screen
            </DialogTitle>
            <DialogDescription>{proctorWarning}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => { setProctorWarning(null); enterFullscreen(); }}
              className="bg-student-primary text-white hover:bg-student-primary/90"
            >
              <Maximize className="mr-2 size-4" /> Return to Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit confirmation */}
      <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <DialogContent
          className="sm:max-w-[560px]"
          style={{ width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
        >
          <DialogHeader>
            <DialogTitle>Submit your exam?</DialogTitle>
            <DialogDescription>Once submitted, you cannot change your answers.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <StatTile label="Total Questions" value={String(total)} />
            <StatTile label="Answered" value={String(answeredCount)} tone="emerald" />
            <StatTile label="Not Answered" value={String(total - answeredCount)} tone="red" />
            <StatTile label="Marked for Review" value={String(flaggedCount)} tone="amber" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitConfirmOpen(false)}>Continue Exam</Button>
            <Button
              onClick={() => { void submit(); }}
              className="bg-gradient-to-br from-student-primary to-student-accent text-white hover:opacity-95"
            >
              Confirm &amp; Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion modal (no score — formal results publish later) */}
      <Dialog
        open={resultOpen && phase.kind === 'submitted'}
        onOpenChange={(o) => { setResultOpen(o); if (!o) onClose(); }}
      >
        <DialogContent
          className="sm:max-w-[640px]"
          style={{ width: 'min(640px, calc(100vw - 2rem))', maxWidth: 'min(640px, calc(100vw - 2rem))' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600" /> Exam Submitted Successfully</DialogTitle>
            <DialogDescription>Your responses have been recorded. Results will be published by your institute.</DialogDescription>
          </DialogHeader>
          {phase.kind === 'submitted' ? (
            <div className="grid grid-cols-2 gap-3 py-2">
              <StatTile label="Total Questions" value={String(phase.total)} />
              <StatTile label="Answered" value={String(phase.answered)} tone="emerald" />
              <StatTile label="Not Answered" value={String(phase.total - phase.answered)} tone="red" />
              <StatTile label="Time Used" value={fmtHMS(phase.timeUsedSec)} />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => { setResultOpen(false); onClose(); }}
              className="bg-gradient-to-br from-student-primary to-student-accent text-white hover:opacity-95"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// A simple centred panel used for the loading / error states (the full screens
// are rendered inline for intro + attempt).
function CenterFrame({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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

function StatChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-student-primary-light text-student-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-student-muted">{label}</span>
        <span className="block truncate text-sm font-bold text-student-text">{value}</span>
      </span>
    </span>
  );
}

function TopMeta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-student-muted">{label}</span>
      <span className={`block max-w-[180px] truncate text-sm font-semibold text-student-text ${mono ? 'font-mono' : ''}`}>{value}</span>
    </span>
  );
}

function Pill({ icon, label, value, tone = 'neutral' }: { icon: React.ReactNode; label: string; value: string; tone?: 'neutral' | 'amber' | 'red' }) {
  const cls = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-white text-slate-700';
  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${cls}`}>
      <span className="text-slate-500">{icon}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <span className="font-mono text-xs font-semibold">{value}</span>
    </span>
  );
}

function SummaryRow({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600">
        <span className={`inline-block size-2.5 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="font-semibold text-student-text">{value}</span>
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
