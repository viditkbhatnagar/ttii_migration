import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FilePlus2, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import {
  SUPPLEMENTARY_STATUS_LABEL,
  choiceProblem,
  createPayload,
  dialogProblem,
  initialChoice,
  istToday,
  selectedStudentCount,
  toSupplementaryDraft,
  type SubjectChoice,
  type SupplementaryDraft,
} from './supplementary-model.js';
import { SupplementarySubjectCard } from './SupplementarySubjectCard.js';

// Create Supplementary Exam (Risha, TTII 2026-10-16). Opened from Exam →
// Result (results ready or published) and from the Exams list (completed
// exams). The server lists the subjects someone failed, missed or has a
// flagged paper in, from the Result page's own sheet; the admin names the exam,
// keeps or changes the subjects and students, and dates each sitting. It is
// created as a DRAFT and the wizard opens at Step 4 to pick its questions.

type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; draft: SupplementaryDraft };

function Note({ tone, icon: Icon, children }: { tone: 'amber' | 'sky'; icon: typeof Info; children: React.ReactNode }) {
  const cls = tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50 text-sky-900';
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${cls}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function CreateSupplementaryDialog({
  sourceExamId, onClose, onCreated, api, token,
}: {
  /** The exam to create it from; null keeps the dialog closed. */
  sourceExamId: number | null;
  onClose: () => void;
  /** Called with the new exam's id once it exists (the page opens the wizard). */
  onCreated: (examId: number) => void;
  api: AdminPortalApi;
  token: string;
}) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [title, setTitle] = useState('');
  const [choices, setChoices] = useState<Map<number, SubjectChoice>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const open = sourceExamId !== null;

  useEffect(() => {
    if (sourceExamId === null) return;
    let cancelled = false;
    setLoad({ state: 'loading' });
    api.getSupplementaryDraft(token, sourceExamId)
      .then((res) => {
        if (cancelled) return;
        if (asNumber(res.status) !== 1) {
          setLoad({ state: 'error', message: asString(res.message) || 'This exam cannot have a supplementary exam yet.' });
          return;
        }
        const draft = toSupplementaryDraft(res.data);
        setTitle(draft.suggestedTitle);
        setChoices(new Map(draft.subjects.map((s) => [s.sittingExamId, initialChoice(s)])));
        setLoad({ state: 'ready', draft });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoad({ state: 'error', message: err instanceof Error ? err.message : 'Could not load this exam\'s results.' });
      });
    return () => { cancelled = true; };
  }, [api, token, sourceExamId, attempt]);

  const draft = load.state === 'ready' ? load.draft : null;
  const today = istToday();
  const problem = useMemo(() => (draft ? dialogProblem(title, draft.subjects, choices, today) : null), [draft, title, choices, today]);
  const subjectsChosen = draft ? draft.subjects.filter((s) => choices.get(s.sittingExamId)?.selected).length : 0;
  const students = selectedStudentCount(choices);

  const setChoice = useCallback((sittingExamId: number, next: SubjectChoice) => {
    setChoices((cur) => new Map(cur).set(sittingExamId, next));
  }, []);

  const submit = async () => {
    if (!draft || problem || !draft.setUp) return;
    setSubmitting(true);
    try {
      const res = await api.createSupplementaryExam(token, createPayload(draft.sourceExamId, title, draft.subjects, choices));
      const message = asString(res.message) || 'Done.';
      const examId = asNumber((res.data as Record<string, unknown> | undefined)?.examId);
      if (asNumber(res.status) === 1 && examId > 0) {
        toast.success(message);
        onCreated(examId);
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the supplementary exam.');
    } finally {
      setSubmitting(false);
    }
  };

  const width = 'min(880px, calc(100vw - 2rem))';
  const thisYear = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0" style={{ width, maxWidth: width }}>
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FilePlus2 aria-hidden="true" className="size-4" />
            </span>
            Create Supplementary Exam
          </DialogTitle>
          <DialogDescription>
            {draft ? `From "${draft.sourceTitle}". ` : ''}A separate exam for the students who did not pass some subjects, each entered only for those subjects.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {load.state === 'loading' ? (
            <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" /> Reading this exam's results…
            </p>
          ) : null}
          {load.state === 'error' ? (
            <div role="alert" className="space-y-3 py-8 text-center text-sm text-rose-700">
              <p>{load.message}</p>
              <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>
            </div>
          ) : null}

          {draft ? (
            <>
              {!draft.setUp ? (
                <Note tone="amber" icon={AlertTriangle}>
                  Supplementary exams are not set up yet: the database migration 2026-10-16-exam-supplementary.sql has not been run. You can look through the subjects, but creating is not possible until it runs.
                </Note>
              ) : null}
              {draft.existing.length > 0 ? (
                <Note tone="sky" icon={Info}>
                  Already created from this exam:{' '}
                  {draft.existing.map((e, i) => (
                    <span key={e.examId}>{i > 0 ? '; ' : ''}<strong>{e.title}</strong> ({SUPPLEMENTARY_STATUS_LABEL[e.status]}, {e.students} student{e.students === 1 ? '' : 's'})</span>
                  ))}
                  . Students already in one are listed but not ticked.
                </Note>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="supp-title">Exam name</Label>
                <Input id="supp-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Change the month or year if the supplementary is held later.</p>
              </div>

              {draft.subjects.length === 0 ? (
                <p role="status" className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                  Every student passed every subject, so there is nothing to re-examine.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Subjects with a failed student are ticked, with those students. Subjects where students were only absent or have a flagged paper are listed unticked.
                  </p>
                  {draft.subjects.map((s) => {
                    const choice = choices.get(s.sittingExamId);
                    if (!choice) return null;
                    return (
                      <SupplementarySubjectCard
                        key={s.sittingExamId}
                        subject={s}
                        choice={choice}
                        onChange={(next) => setChoice(s.sittingExamId, next)}
                        problem={choice.selected ? choiceProblem(choice, today) ?? '' : ''}
                        thisYear={thisYear}
                      />
                    );
                  })}
                </div>
              )}

              <Note tone="sky" icon={Info}>
                <strong>Question paper:</strong> each subject keeps its question plan (number of questions and marks), but the regular exam's questions are not reused.
                After creating, the wizard opens at Step 4, where Auto-fill picks new questions from the Question Bank and leaves out the regular papers' questions wherever the bank has enough others.
                Review, then publish as for any exam: students are emailed only their own subjects.
              </Note>
            </>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          {draft && problem && subjectsChosen > 0 ? <p className="mr-auto self-center text-xs text-muted-foreground">{problem}</p> : null}
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={!draft || !draft.setUp || problem !== null || submitting}>
            {submitting ? 'Creating…' : `Create${subjectsChosen > 0 ? ` (${subjectsChosen} subject${subjectsChosen === 1 ? '' : 's'}, ${students} student${students === 1 ? '' : 's'})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
