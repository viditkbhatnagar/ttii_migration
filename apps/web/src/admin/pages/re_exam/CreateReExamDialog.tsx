import { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ClassTimeInput } from '@/components/ui/class-time-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TONE } from '../../shared/components/ui-tones.js';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import {
  buildBatchItems, canSubmit, eligibleSubjects, errorsByExam, initialDrafts, subjectProblem, tickedStudentCount,
  toggleStudent, updateDraft, type BatchDrafts, type EligibleSubject, type SubjectDraft,
} from './create-re-exam-model.js';
import { ymdLabel } from './ScheduleReExamDialog.js';
import type { Sitting, StudentResult } from '../exam_result/exam-results-model.js';

// Create Re-exam for the whole exam (Naji 2026-10-27). Every closed subject with
// students who need a re-exam is a card with its own window; one submit schedules
// them all, or — if the server refuses any — none, with the reason under that card.

export function CreateReExamDialog({
  open, onClose, onScheduled, api, token, examTitle, sittings, students,
}: {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
  api: AdminPortalApi;
  token: string;
  examTitle: string;
  sittings: Sitting[];
  students: StudentResult[];
}) {
  const subjects = useMemo(() => eligibleSubjects(sittings, students), [sittings, students]);
  const [drafts, setDrafts] = useState<BatchDrafts>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState('');
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Seed on open only — a background reload of the page data must not wipe the admin's choices.
  useEffect(() => {
    if (!open) return;
    setDrafts(initialDrafts(subjects));
    setNotes('');
    setTopError('');
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const count = tickedStudentCount(subjects, drafts);
  const ready = canSubmit(subjects, drafts);

  const submit = async () => {
    if (!ready) return;
    setSubmitting(true);
    setTopError('');
    setErrors({});
    try {
      const res = await api.scheduleReExamBatch(token, buildBatchItems(subjects, drafts, notes));
      const message = asString(res.message) || 'Done.';
      if (asNumber(res.status) === 1) {
        toast.success(message);
        onScheduled();
        onClose();
      } else {
        setTopError(message);
        setErrors(errorsByExam(res.errors));
      }
    } catch (err) {
      setTopError(err instanceof Error ? err.message : 'Could not schedule the re-exams.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        style={{ width: 'min(880px, calc(100vw - 2rem))', maxWidth: 'min(880px, calc(100vw - 2rem))' }}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock aria-hidden="true" className="size-4" />
            </span>
            Create re-exam
          </DialogTitle>
          <DialogDescription>
            {examTitle}. Every subject with students who need a re-exam is listed. Give each subject its own window; students re-sit only the subjects ticked here.
          </DialogDescription>
        </DialogHeader>

        <div className="@container min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {topError ? (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{topError}</p>
          ) : null}

          {subjects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              No subject has students who need a re-exam.
            </p>
          ) : subjects.map((s) => {
            const d = drafts[s.examId];
            if (!d) return null;
            return (
              <SubjectCard
                key={s.examId}
                subject={s}
                draft={d}
                error={errors[s.examId] ?? ''}
                onPatch={(patch) => setDrafts((cur) => updateDraft(cur, s.examId, patch))}
                onToggleStudent={(userId) => setDrafts((cur) => toggleStudent(cur, s.examId, userId))}
              />
            );
          })}

          {subjects.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="create-reexam-notes">Note for all subjects (optional)</Label>
              <Input id="create-reexam-notes" maxLength={500} placeholder="e.g. Technical issue on 11 Aug — free re-exam" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <p className="text-xs text-muted-foreground">Students are emailed the date and time of each re-exam. Each window must be at least as long as its paper.</p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={!ready || submitting}>
            {submitting ? 'Saving…' : `Schedule ${count} re-exam${count === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubjectCard({
  subject, draft, error, onPatch, onToggleStudent,
}: {
  subject: EligibleSubject;
  draft: SubjectDraft;
  error: string;
  onPatch: (patch: Partial<SubjectDraft>) => void;
  onToggleStudent: (userId: number) => void;
}) {
  const thisYear = new Date().getFullYear();
  const id = `create-reexam-${subject.examId}`;
  const problem = draft.included ? subjectProblem(draft) : null;
  const allIds = subject.candidates.map((c) => c.userId);
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn('rounded-xl border bg-card', draft.included ? 'border-primary/40' : 'border-border opacity-80', error && 'border-rose-300')}
    >
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        <input
          id={`${id}-include`}
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={draft.included}
          onChange={(e) => onPatch({ included: e.target.checked })}
          aria-label={`Include ${subject.subjectTitle}`}
        />
        <div className="min-w-0 flex-1">
          <h3 id={`${id}-title`} className="truncate text-sm font-semibold text-foreground">{subject.subjectTitle}</h3>
          <p className="text-xs text-muted-foreground">{subject.date ? `held on ${ymdLabel(subject.date)}` : 'Original date unknown'}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{draft.selected.size} of {subject.candidates.length} students</span>
      </header>

      {error ? <p role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</p> : null}

      {draft.included ? (
        <div className="grid gap-4 px-4 py-4 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <fieldset className="min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Students</legend>
              {subject.candidates.length > 1 ? (
                <div className="flex gap-2 text-xs">
                  <button type="button" className="text-primary hover:underline" onClick={() => onPatch({ selected: new Set(allIds) })}>All</button>
                  <button type="button" className="text-muted-foreground hover:underline" onClick={() => onPatch({ selected: new Set() })}>None</button>
                </div>
              ) : null}
            </div>
            <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {subject.candidates.map((c) => (
                <li key={c.userId}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                    <input type="checkbox" className="size-4 accent-primary" checked={draft.selected.has(c.userId)} onChange={() => onToggleStudent(c.userId)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{c.studentCode}</span>
                    </span>
                    <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold', TONE[c.tone].pill)}>{c.note}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-date`}>Date</Label>
              <DmyDateInput id={`${id}-date`} value={draft.date} onChange={(date) => onPatch({ date })} minYear={thisYear} maxYear={thisYear + 1} />
            </div>
            <div className="grid gap-3 @md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Opens at (IST)</Label>
                <ClassTimeInput value={draft.startTime} onChange={(startTime) => onPatch({ startTime })} />
              </div>
              <div className="space-y-1.5">
                <Label>Closes at (IST)</Label>
                <ClassTimeInput value={draft.endTime} onChange={(endTime) => onPatch({ endTime })} />
              </div>
            </div>
            {problem ? <p className="text-xs text-muted-foreground">{problem}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
