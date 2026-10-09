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
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';

// Schedule (or move) a re-exam: one subject, one or more students, a window of
// its own in IST. Shared by Exam → Result and Exam → Re-Examination. The server
// re-checks everything (allocation, window vs paper length, original sitting
// finished) and its message is shown as-is when it refuses.

export interface ReExamSubjectOption {
  examId: number;
  subjectTitle: string;
  /** YYYY-MM-DD of the original sitting. */
  date: string;
}

export type CandidateTone = 'rose' | 'amber' | 'slate' | 'violet' | 'emerald';

export interface ReExamCandidate {
  userId: number;
  name: string;
  studentCode: string;
  /** Why they are listed, e.g. "Failed · 17/70". */
  note: string;
  tone: CandidateTone;
  preselect: boolean;
}

export interface ReExamWindowDraft {
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

const NOTE_TONE: Record<CandidateTone, string> = {
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  violet: 'border-primary/20 bg-primary/5 text-primary',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

function ymdLabel(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function ScheduleReExamDialog({
  open, onClose, onScheduled, api, token, examTitle, subjects, initialExamId, candidatesFor, initialWindow, mode = 'schedule',
}: {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
  api: AdminPortalApi;
  token: string;
  examTitle: string;
  subjects: ReExamSubjectOption[];
  initialExamId: number | null;
  candidatesFor: (examId: number) => ReExamCandidate[];
  initialWindow?: ReExamWindowDraft | undefined;
  mode?: 'schedule' | 'reschedule';
}) {
  const [examId, setExamId] = useState<number | null>(initialExamId);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setExamId(initialExamId ?? subjects[0]?.examId ?? null);
    setDate(initialWindow?.date ?? '');
    setStartTime(initialWindow?.startTime ?? '');
    setEndTime(initialWindow?.endTime ?? '');
    setNotes(initialWindow?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const candidates = useMemo(() => (examId === null ? [] : candidatesFor(examId)), [examId, candidatesFor]);

  // Seed the ticks when the dialog opens or the subject changes — never on a
  // background reload of the page data, which would wipe the admin's choices.
  useEffect(() => {
    if (!open || examId === null) return;
    setSelected(new Set(candidatesFor(examId).filter((c) => c.preselect).map((c) => c.userId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, examId]);

  const toggle = (userId: number) => setSelected((cur) => {
    const next = new Set(cur);
    if (next.has(userId)) next.delete(userId); else next.add(userId);
    return next;
  });

  const problem = !examId
    ? 'Choose the subject.'
    : selected.size === 0
      ? 'Select at least one student.'
      : !date || !startTime || !endTime
        ? 'Enter the date, start time and end time.'
        : endTime <= startTime
          ? 'The end time must be after the start time.'
          : null;

  const submit = async () => {
    if (problem || examId === null) return;
    setSubmitting(true);
    try {
      const res = await api.scheduleReExams(token, {
        exam_id: examId,
        user_ids: [...selected],
        date,
        start_time: startTime,
        end_time: endTime,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      const message = asString(res.message) || 'Done.';
      if (asNumber(res.status) === 1) {
        toast.success(message);
        onScheduled();
        onClose();
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not schedule the re-exam.');
    } finally {
      setSubmitting(false);
    }
  };

  const thisYear = new Date().getFullYear();
  const subject = subjects.find((s) => s.examId === examId);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        style={{ width: 'min(640px, calc(100vw - 2rem))', maxWidth: 'min(640px, calc(100vw - 2rem))' }}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock aria-hidden="true" className="size-4" />
            </span>
            {mode === 'reschedule' ? 'Reschedule re-exam' : 'Schedule re-exam'}
          </DialogTitle>
          <DialogDescription>
            {examTitle}. The student re-sits only this subject, inside the window below. Their new paper replaces the old mark.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="reexam-subject">Subject</Label>
            {subjects.length > 1 ? (
              <select
                id="reexam-subject"
                value={examId ?? ''}
                onChange={(e) => setExamId(Number(e.target.value) || null)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.examId} value={s.examId}>
                    {s.subjectTitle}{s.date ? ` (sat ${ymdLabel(s.date)})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p id="reexam-subject" className="text-sm font-medium text-foreground">
                {subject?.subjectTitle ?? '—'}{subject?.date ? ` (sat ${ymdLabel(subject.date)})` : ''}
              </p>
            )}
          </div>

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium text-foreground">Students</legend>
              {candidates.length > 1 ? (
                <div className="flex gap-2 text-xs">
                  <button type="button" className="text-primary hover:underline" onClick={() => setSelected(new Set(candidates.map((c) => c.userId)))}>All</button>
                  <button type="button" className="text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>None</button>
                </div>
              ) : null}
            </div>
            {candidates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                No student needs a re-exam in this subject.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {candidates.map((c) => (
                  <li key={c.userId}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
                      <input type="checkbox" className="size-4 accent-primary" checked={selected.has(c.userId)} onChange={() => toggle(c.userId)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{c.studentCode}</span>
                      </span>
                      <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold', NOTE_TONE[c.tone])}>{c.note}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="reexam-date">Date</Label>
              <DmyDateInput id="reexam-date" value={date} onChange={setDate} minYear={thisYear} maxYear={thisYear + 1} />
            </div>
            <div className="space-y-1.5">
              <Label>Opens at (IST)</Label>
              <ClassTimeInput value={startTime} onChange={setStartTime} />
            </div>
            <div className="space-y-1.5">
              <Label>Closes at (IST)</Label>
              <ClassTimeInput value={endTime} onChange={setEndTime} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            The window must be at least as long as the paper. Students are emailed the date and time.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="reexam-notes">Note (optional)</Label>
            <Input id="reexam-notes" maxLength={500} placeholder="e.g. Technical issue on 11 Aug — free re-exam" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          {problem && selected.size > 0 ? <p className="mr-auto self-center text-xs text-muted-foreground">{problem}</p> : null}
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={problem !== null || submitting}>
            {submitting ? 'Saving…' : mode === 'reschedule' ? 'Reschedule' : `Schedule${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
