import { useEffect, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, ClipboardCheck, Info, Layers, Megaphone, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import { InstructionTemplatesCard, TEXTAREA_CLASS } from './InstructionTemplatesCard.js';
import { ReviewExamDialog } from './ReviewExamDialog.js';
import type { StepProps } from './StepSchedule.js';
import type { DraftMeta, DraftState } from './wizard-model.js';
import { Banner, Field, StepBody, StepHeader, SwitchCard, WizardFooter } from './wizard-ui.js';

interface Props extends Omit<StepProps, 'onSaved' | 'examId'> {
  draft: DraftState;
  courses: string[];
  offerings: string[];
  meta: DraftMeta;
  metaLoaded: boolean;
  onPublished: () => void;
}

/** Step 6 — instructions, notification channels, then Review → confirm → Publish. */
export function StepPublish({ api, authToken, closeLabel, draft, courses, offerings, meta, metaLoaded, onPublished, onBack, onClose }: Props) {
  const examId = draft.id;
  const [instructions, setInstructions] = useState(meta.instructions);
  // Only a real edit is worth sending. Publishing used to post the (empty)
  // textarea back over the stored instructions every time — Risha's "it was
  // saved before" disappearance. Untouched => omit => the backend keeps them.
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  // Risha UAT 2026-08-06 — these two switches are the exam's STORED preference
  // and nothing else, so they round-trip verbatim. "Don't email again for THIS
  // re-publish" is the separate, non-persisted Re-send switch below — a save
  // must never turn off a preference the admin didn't turn off.
  // exam.notify_email/notify_inapp default to 1, so a stored 0 is always a
  // deliberate un-tick; no "looks unset, force it back ON" guess is warranted.
  const [notifyEmail, setNotifyEmail] = useState(meta.notify_email);
  const [notifyInapp, setNotifyInapp] = useState(meta.notify_inapp);
  // A tick the admin made outranks a late-arriving draft — same rule as the
  // instructions textarea, whose initialiser was otherwise the final word.
  const [notifyDirty, setNotifyDirty] = useState(false);
  const [resendNotification, setResendNotification] = useState(false);
  const [sittings, setSittings] = useState<number | null>(null);
  const [allocated, setAllocated] = useState<number | null>(null);
  const [publishError, setPublishError] = useState('');
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Keep in step with a late-arriving draft, but never overwrite typing.
  useEffect(() => {
    if (instructionsDirty) return;
    setInstructions(meta.instructions);
  }, [meta.instructions, instructionsDirty]);

  // Same for the notification preference — without this the useState
  // initialiser is the final word, and a draft that resolves after Step 6
  // mounts would be silently ignored.
  useEffect(() => {
    if (notifyDirty) return;
    setNotifyEmail(meta.notify_email);
    setNotifyInapp(meta.notify_inapp);
  }, [meta.notify_email, meta.notify_inapp, notifyDirty]);

  // Publishing materialises one exam row per Step 2 subject, so say how many
  // sittings it is about to create — and how many students it reaches.
  useEffect(() => {
    if (!examId) { setSittings(0); setAllocated(0); return; }
    let cancelled = false;
    void api.getExamSchedule(authToken, examId)
      .then((rows) => { if (!cancelled) setSittings(rows.length); })
      .catch(() => { if (!cancelled) setSittings(null); });
    void api.getExamAllocations(authToken, examId)
      .then((ids) => { if (!cancelled) setAllocated(ids.length); })
      .catch(() => { if (!cancelled) setAllocated(null); });
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  const editInstructions = (value: string) => {
    setInstructions(value);
    setInstructionsDirty(true);
  };

  // Risha UAT 2026-08-06 — publishing was the only way to persist the
  // instructions, which is what forced a re-publish (and a second round of
  // emails) for a wording tweak.
  const handleSaveInstructions = async () => {
    // Save & Close always writes the textarea. When the draft fetch failed
    // the box is blank for want of data — saving would blank instructions
    // nobody touched, the exact disappearance this step set out to fix.
    if (!metaLoaded && !instructionsDirty) {
      toast.error('Couldn’t load this exam’s saved instructions. Reload the page before saving, or type the instructions you want stored.');
      return;
    }
    setSavingInstructions(true);
    try {
      const res = await api.saveExamInstructions(authToken, examId, { instructions, notify_email: notifyEmail, notify_inapp: notifyInapp });
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) { toast.success(message); onClose(); }
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save instructions.');
    } finally { setSavingInstructions(false); }
  };

  /** Same request as before the Review dialog existed; resolves true on success. */
  const handlePublish = async (): Promise<boolean> => {
    setPublishing(true);
    setPublishError('');
    try {
      const res = await api.publishExam(authToken, examId, {
        ...(instructionsDirty ? { instructions } : {}),
        notify_email: notifyEmail,
        notify_inapp: notifyInapp,
        ...(meta.is_published ? { resend_notification: resendNotification } : {}),
      });
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Done.';
      if (status === 1) {
        toast.success(message);
        onPublished();
        return true;
      }
      // A refusal names the subjects missing a date or time. A toast is too
      // short-lived for that, so keep it on the page as well.
      setPublishError(message);
      toast.error(message);
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish.';
      setPublishError(msg);
      toast.error(msg);
      return false;
    } finally { setPublishing(false); }
  };

  const emailsOnPublish = notifyEmail && (!meta.is_published || resendNotification);

  return (
    <>
      <StepBody>
        <StepHeader icon={Megaphone} title="Instructions & Notification" subtitle="What students read before the exam, and how they hear about it." />

        {meta.is_published ? (
          <Banner tone="success" icon={CheckCircle2} title="This exam is already published.">
            {meta.child_count > 0
              ? `${meta.child_count} subject sitting${meta.child_count === 1 ? '' : 's'} ${meta.child_count === 1 ? 'is' : 'are'} live for allocated students.`
              : 'It is live for allocated students.'}
            {' '}Re-publishing applies your edits to the sittings. Allocated students have already been notified — they only get another email if you turn on “Re-send notification” below.
          </Banner>
        ) : null}

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-2.5">
            <BellRing aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">
                {allocated === null
                  ? 'Couldn’t read the allocated students.'
                  : emailsOnPublish
                    ? `${allocated} allocated student${allocated === 1 ? '' : 's'} will be emailed when you publish.`
                    : `${allocated} student${allocated === 1 ? '' : 's'} allocated — no emails will be sent on this publish.`}
              </p>
              <p className="mt-0.5 text-muted-foreground">Recipients are the students in the <span className="font-medium text-foreground">Added Students</span> list of the previous step. You review everything and confirm before anything is sent.</p>
            </div>
          </div>
        </div>

        {!metaLoaded ? (
          <Banner tone="warning" icon={AlertTriangle} title="Couldn’t load this exam’s saved instructions.">
            Anything you type below replaces them. Publishing without typing leaves whatever is stored untouched.
          </Banner>
        ) : null}

        {/* Untouched, rewritten and deliberately-cleared are three different
            intents. Untouched sends nothing so the stored text survives; a
            clear is a real write, and Publish can't carry it yet (the publish
            route still reads '' as "no instructions supplied"). */}
        <Field
          label="Instructions to Learners"
          htmlFor="ex-instr"
          hint={!instructionsDirty
            ? 'Showing the instructions saved on this exam.'
            : instructions.trim()
              ? 'Edited — Save & Close or Publish will store this text.'
              : 'Cleared — Save & Close will remove the saved instructions.'}
        >
          <textarea id="ex-instr" value={instructions} onChange={(e) => editInstructions(e.target.value)} rows={7} className={TEXTAREA_CLASS} placeholder="Write the instructions students will see before starting the exam." />
        </Field>

        <InstructionTemplatesCard api={api} authToken={authToken} instructions={instructions} onUse={editInstructions} />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Notification Channels</h3>
          {/* These are the exam's saved preference — the reminder job reads the
              same Email switch, so leaving it off also silences the 24h/1h nudges. */}
          <p className="text-xs text-muted-foreground">Saved on the exam. The Email switch also controls the 24-hour and 1-hour exam reminders.</p>
          <div className="grid gap-2 md:grid-cols-2">
            <SwitchCard id="ex-notify-email" label="Email" desc="Send the exam schedule to each student's registered address." checked={notifyEmail} onChange={(v) => { setNotifyEmail(v); setNotifyDirty(true); }} />
            <SwitchCard id="ex-notify-inapp" label="In-app notification" desc="Notification in the learner portal." checked={notifyInapp} onChange={(v) => { setNotifyInapp(v); setNotifyDirty(true); }} />
          </div>
          {meta.is_published ? (
            <SwitchCard id="ex-resend" tone="warning" label="Re-send notification to allocated students" desc="Leave off to change this exam without emailing everyone a second time." checked={resendNotification} onChange={setResendNotification} />
          ) : null}
        </section>

        {/* What Publish actually does — one exam row per Step 2 subject. */}
        <Banner tone="neutral" icon={sittings === null ? Info : Layers}>
          <span className="text-sm">
            {sittings === null ? (
              'Couldn’t read this exam’s subject schedule. Check Step 2 before publishing.'
            ) : sittings > 0 ? (
              <>
                Publishing will {meta.is_published ? 'update' : 'create'} <strong>{sittings}</strong> subject sitting{sittings === 1 ? '' : 's'} — one per subject scheduled in Step 2.
                Students see the individual sittings, each with its own date, time, duration and marks.
              </>
            ) : (
              'No per-subject schedule on this exam, so publishing makes it live as a single sitting using the Step 1 dates.'
            )}
          </span>
        </Banner>

        {publishError ? (
          <Banner tone="danger" icon={XCircle} alert title="Couldn’t publish">
            <span className="whitespace-pre-wrap">{publishError}</span>
          </Banner>
        ) : null}
      </StepBody>
      <WizardFooter
        step={6}
        onBack={onBack}
        onSaveClose={() => { void handleSaveInstructions(); }}
        onContinue={() => setReviewOpen(true)}
        saving={savingInstructions}
        busy={publishing}
        savingTarget="close"
        closeLabel={closeLabel}
        continueLabel="Review Exam"
        continueIcon={ClipboardCheck}
      />
      <ReviewExamDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        api={api}
        authToken={authToken}
        draft={draft}
        courses={courses}
        extras={{ offerings, instructions, notifyEmail, notifyInapp, isPublished: meta.is_published, resendNotification }}
        publishing={publishing}
        onPublish={handlePublish}
      />
    </>
  );
}
