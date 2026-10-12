import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Check, Clock, GraduationCap, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asBoolean, asNumber } from '../../../shared/utils/admin-data-utils.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import { formatHm, formatYmd } from '../../exam_result/exam-results-model.js';
import { toQuestionOption, toSubjectPlan } from './question-assign-model.js';
import { buildReviewSummary, publishConfirmMessage, type ReviewSummary } from './review-model.js';
import { ReviewBody, type ReviewExtras } from './ReviewBody.js';
import { toScheduleRow, type DraftState } from './wizard-model.js';

function InfoTile({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value || '—'}</p>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: AdminPageProps['api'];
  authToken: string;
  draft: DraftState;
  courses: string[];
  extras: ReviewExtras;
  publishing: boolean;
  /** Runs the publish; resolves true on success (the page then navigates away). */
  onPublish: () => Promise<boolean>;
}

/**
 * Naji's Review Exam dialog, then a Publish confirmation. Publishing emails
 * every allocated student on the first publish, so it never happens on one
 * click: the admin sees the whole exam, then confirms who will be emailed.
 * Everything is re-read from the server when the dialog opens, so it shows
 * what is SAVED, not what is on screen in an earlier step.
 */
export function ReviewExamDialog({ open, onOpenChange, api, authToken, draft, courses, extras, publishing, onPublish }: Props) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const examId = draft.id;
  const { notifyEmail, notifyInapp, isPublished, resendNotification } = extras;

  useEffect(() => {
    if (!open || !examId) return;
    let cancelled = false;
    setSummary(null);
    setError('');
    void Promise.all([
      api.getExamSchedule(authToken, examId),
      api.getExamQuestionPlan(authToken, examId).catch(() => [] as Record<string, unknown>[]),
      api.listExamQuestionOptions(authToken, examId),
      api.getExamQuestions(authToken, examId),
      api.getExamAllocations(authToken, examId),
    ])
      .then(([schedule, plan, options, assigned, allocations]) => {
        if (cancelled) return;
        setSummary(buildReviewSummary({
          schedule: schedule.map(toScheduleRow),
          plans: plan.map(toSubjectPlan),
          options: options.map(toQuestionOption),
          assigned: assigned.map((a) => ({ question_id: asNumber(a.question_id), deleted: asBoolean(a.question_deleted) })),
          allocatedCount: allocations.length,
          notifyEmail,
          notifyInapp,
          isPublished,
          resendNotification,
        }));
      })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the exam summary.'); });
    return () => { cancelled = true; };
  }, [open, examId, api, authToken, notifyEmail, notifyInapp, isPublished, resendNotification, attempt]);

  const confirmPublish = useCallback(async () => {
    const ok = await onPublish();
    setConfirmOpen(false);
    if (!ok) onOpenChange(false);
  }, [onPublish, onOpenChange]);

  const session = draft.from_time && draft.to_time ? `${formatHm(draft.from_time)} – ${formatHm(draft.to_time)}` : '';
  const width = 'min(1024px, calc(100vw - 2rem))';

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!publishing) onOpenChange(o); }}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0" style={{ width, maxWidth: width }}>
          <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-5 pt-6 text-left">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {draft.exam_code ? <span className="rounded-md border border-border bg-background/60 px-2 py-0.5 font-medium text-muted-foreground">{draft.exam_code}</span> : null}
              <Pill tone={isPublished ? 'emerald' : 'amber'}>{isPublished ? 'Published — re-publish' : 'Ready to Publish'}</Pill>
            </div>
            <DialogTitle className="mt-2 text-2xl font-bold tracking-tight">{draft.title || 'Untitled Exam'}</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5 text-sm">
              <GraduationCap aria-hidden="true" className="size-4 shrink-0" /> {courses.join(', ') || 'No course linked'}
            </DialogDescription>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <InfoTile icon={CalendarDays} label="From" value={formatYmd(draft.from_date)} />
              <InfoTile icon={CalendarDays} label="To" value={formatYmd(draft.to_date)} />
              <InfoTile icon={Clock} label="Session (IST)" value={session} />
              <InfoTile icon={BookOpen} label="Subjects" value={summary ? String(summary.subjects.length) : '…'} />
            </div>
          </DialogHeader>

          {summary ? <ReviewBody summary={summary} x={extras} /> : (
            <div role="status" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center text-sm text-muted-foreground">
              {error ? (
                <>
                  <p className="text-rose-700">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>
                </>
              ) : <><Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" /> Loading the exam summary…</>}
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={publishing}>Back to Edit</Button>
            <Button size="sm" className="gap-1.5" onClick={() => setConfirmOpen(true)} disabled={!summary || publishing}>
              <Send aria-hidden="true" className="size-4" /> {isPublished ? 'Update & Re-publish' : 'Publish Exam'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!publishing) setConfirmOpen(o); }}>
        <DialogContent style={{ width: 'min(440px, calc(100vw - 2rem))', maxWidth: 'min(440px, calc(100vw - 2rem))' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send aria-hidden="true" className="size-4 text-primary" /> {isPublished ? 'Re-publish this exam?' : 'Publish this exam?'}
            </DialogTitle>
            <DialogDescription>
              {summary ? publishConfirmMessage(summary, isPublished, notifyEmail) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} disabled={publishing}>Cancel</Button>
            <Button size="sm" className="gap-1.5" onClick={() => { void confirmPublish(); }} disabled={publishing} autoFocus>
              {publishing ? <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Publishing…</> : <><Check aria-hidden="true" className="size-4" /> Yes, {isPublished ? 'Re-publish' : 'Publish'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
