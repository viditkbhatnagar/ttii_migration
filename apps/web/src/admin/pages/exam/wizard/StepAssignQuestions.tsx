import { AlertTriangle, ArrowLeft, FilePlus2, Info, ListChecks, Search, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { missingIn, type QuestionOption, type QuestionSection } from './question-assign-model.js';
import { QuestionSectionBlock } from './QuestionSectionBlock.js';
import type { StepProps } from './StepSchedule.js';
import { useAssignQuestions, type AssignQuestionsController } from './useAssignQuestions.js';
import { Banner, Field, StepBody, StepHeader, StepLoading, StepNotice, WizardFooter } from './wizard-ui.js';

// Step 4 — Assign Questions. Not in Naji's five-step prototype; ours keeps it
// because the student player only serves exam_questions (Naji 2026-06-09).

function SubjectProgress({ q }: { q: AssignQuestionsController }) {
  const planned = q.sections.filter((s) => s.plan !== null);
  if (planned.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {planned.map((s) => {
        const stats = q.statsForSection(s);
        const target = s.plan?.total_target ?? 0;
        const pick = q.picks.get(s.key);
        const missing = pick ? missingIn(pick) : 0;
        // Summed from the pick itself so the two numbers can't disagree with
        // each other if a plan's total drifts from its per-type counts.
        const plannedCount = pick ? pick.parts.reduce((n, p) => n + p.wanted, 0) : 0;
        const available = pick ? pick.parts.reduce((n, p) => n + p.got, 0) : 0;
        const tone = target <= 0
          ? 'border-border bg-muted/40 text-muted-foreground'
          : stats.count === target
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : stats.count > target
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-border bg-card text-muted-foreground';
        return (
          <div key={s.key} className={cn('rounded-xl border px-3 py-2', tone)}>
            <p className="truncate text-xs font-semibold">{s.title}</p>
            <p className="text-[11px]">
              {stats.count}{target > 0 ? ` / ${target}` : ''} questions · {stats.marks}{(s.plan?.total_marks ?? 0) > 0 ? ` / ${s.plan?.total_marks}` : ''} marks
            </p>
            {/* Without this the card reads as an admin who simply hasn't
                finished picking, when the bank cannot reach the target. */}
            {missing > 0 ? <p className="text-[11px] font-medium text-amber-800">Bank short {missing} — max {available} of {plannedCount}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

/** TTII 2026-10-16 — the exam this supplementary exam re-examines, for Step 4. */
export interface SupplementaryPaperSource {
  sourceTitle: string;
  avoidIds: ReadonlySet<number>;
}

function SupplementaryNote({ q, source }: { q: AssignQuestionsController; source: SupplementaryPaperSource }) {
  return (
    <Banner tone={q.reused > 0 ? 'warning' : 'info'} icon={FilePlus2} title="Supplementary exam: a new paper, not the regular one">
      The {source.avoidIds.size} question{source.avoidIds.size === 1 ? '' : 's'} on the regular papers of “{source.sourceTitle}” are listed last in each subject
      and marked <span className="font-semibold">On the regular paper</span>. Auto-fill and Select first take them only when a subject has too few others.
      {q.reused > 0
        ? ` ${q.reused} of the ${q.selected.size} picked question${q.selected.size === 1 ? ' is' : 's are'} on the regular paper — add more questions to the Question Bank, or keep them knowingly.`
        : ' None of the picked questions is on the regular paper.'}
    </Banner>
  );
}

function Notices({ q, isPublished }: { q: AssignQuestionsController; isPublished: boolean }) {
  const totalMissing = q.shortfalls.reduce((n, r) => n + r.missing, 0);
  const { autoFill, savedCount, deletedSavedCount } = q;
  return (
    <>
      {/* Risha UAT 2026-08-06 — the fill is a PROPOSAL. It is loud about being
          unsaved, because a paper that looks assigned but never reached
          exam_questions is an exam nobody can sit. */}
      {autoFill ? (
        <Banner tone="info" icon={Sparkles} title={autoFill.origin === 'auto' ? 'Auto-filled from your Step 3 plan — review and Save' : 'Re-filled from your Step 3 plan — review and Save'}>
          {autoFill.picked} question{autoFill.picked === 1 ? '' : 's'} picked for {autoFill.label}, using the number of questions each subject was given in Step 3.
          {' '}Nothing is stored until you press Save &amp; Continue or Save &amp; Close — until then this exam still has {savedCount === 0 ? 'no questions' : `its ${savedCount} saved question${savedCount === 1 ? '' : 's'}`}.
          {autoFill.shortfall > 0 ? ` ${autoFill.shortfall} could not be filled — the question bank is short; see below.` : ''}
          {' '}Tick, untick or change marks freely before saving.
        </Banner>
      ) : null}

      {deletedSavedCount > 0 ? (
        <Banner tone="danger" icon={XCircle} alert title={`${deletedSavedCount} saved question${deletedSavedCount === 1 ? ' was' : 's were'} deleted from the Question Bank`}>
          {deletedSavedCount === 1 ? 'It was' : 'They were'} saved on this exam and later deleted from the Question Bank (for
          example when a subject’s questions were re-uploaded). Students would not see {deletedSavedCount === 1 ? 'it' : 'them'},
          so {deletedSavedCount === 1 ? 'it is' : 'they are'} left out below. Press Auto-fill from plan to pick from the current
          bank, then Save.
          {isPublished ? ' This exam is already published: after saving, re-publish it in Step 6 so the live subject sittings pick up the change.' : ''}
        </Banner>
      ) : null}

      {/* Honest under-fill: which subjects are short, and by how much. */}
      {totalMissing > 0 ? (
        <Banner tone="warning" icon={AlertTriangle} title={`Question bank is short for ${q.shortfalls.length} subject${q.shortfalls.length === 1 ? '' : 's'} — ${totalMissing} question${totalMissing === 1 ? '' : 's'} missing.`}>
          <ul className="mt-1.5 space-y-1">
            {q.shortfalls.map((r) => (
              <li key={r.key}>
                <span className="font-medium">{r.title}</span> — bank has {r.detail}
                <span className="ml-1 rounded bg-amber-200/70 px-1.5 py-0.5 font-medium">{r.missing} short</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Auto-fill takes everything the bank does have, so a subject with some questions will publish under its planned count.
            A subject with none at all cannot be published until questions are added to the Question Bank or its Step 3 count is set to 0.
            Add the missing questions in Question Bank and re-run Auto-fill, or lower the count in Step 3.
          </p>
        </Banner>
      ) : null}
    </>
  );
}

export function StepAssignQuestions({
  api, authToken, examId, closeLabel, isPublished, supplementary = null, onSaved, onBack, onClose,
}: StepProps & { isPublished: boolean; supplementary?: SupplementaryPaperSource | null }) {
  const q = useAssignQuestions({ api, authToken, examId, isPublished, avoidIds: supplementary?.avoidIds, onSaved, onClose });

  if (!examId) {
    return <StepNotice action={<Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}><ArrowLeft aria-hidden="true" className="size-4" /> Back</Button>}><p>Save Step 1 first to assign questions.</p></StepNotice>;
  }
  if (q.loading) return <StepLoading label="Loading questions…" />;
  if (q.options.length === 0) {
    return (
      <StepNotice action={(
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}><ArrowLeft aria-hidden="true" className="size-4" /> Back</Button>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      )}>
        <p className="font-medium text-foreground">No questions found for this exam’s course(s).</p>
        <p className="text-xs">Add questions in the Question Bank for the exam’s course, then revisit this step.</p>
      </StepNotice>
    );
  }

  const search = q.query.trim().toLowerCase();
  const visibleIn = (s: QuestionSection): QuestionOption[] => (search ? s.items.filter((o) => o.title.toLowerCase().includes(search)) : s.items);
  const matchCount = q.sections.reduce((sum, s) => sum + visibleIn(s).length, 0);
  const totalMarks = [...q.selected.values()].reduce((s, m) => s + (Number.isFinite(m) ? m : 0), 0);
  const { dirty, savedCount } = q;

  return (
    <>
      <StepBody>
        <StepHeader
          icon={ListChecks}
          title="Assign Questions"
          subtitle={(
            <>
              Selected: <strong className="text-foreground">{q.selected.size}</strong> · Total marks: <strong className="text-foreground">{totalMarks}</strong>
              {/* Saved, edited or proposed — never left to guesswork. */}
              <span className={cn('mt-0.5 block', dirty ? 'font-medium text-amber-700' : '')}>
                {dirty
                  ? savedCount > 0
                    ? `Not saved yet — ${savedCount} question${savedCount === 1 ? '' : 's'} currently stored on this exam.`
                    : 'Not saved yet — nothing is stored on this exam.'
                  : savedCount > 0
                    ? 'Showing the questions saved on this exam.'
                    : 'No questions saved on this exam yet.'}
              </span>
            </>
          )}
          actions={(
            <div className="flex flex-wrap items-start gap-3">
              <Field label="Default mark" htmlFor="q-default-mark" hint="Used only where Step 3 sets no marks." className="w-28">
                <Input id="q-default-mark" type="number" step="0.5" min={0} value={q.defaultMark} onChange={(e) => q.setDefaultMark(Number(e.target.value) || 0)} className="h-9" />
              </Field>
              <div className="space-y-1.5 pt-[22px]">
                <Button
                  variant="outline"
                  className="h-9 gap-1.5"
                  onClick={() => { void q.autoFillWholeExam(); }}
                  disabled={!q.hasPlan}
                  title={q.hasPlan
                    ? "Fills every subject with the number of questions Step 3 planned for it, taking them from the top of that subject's bank."
                    : 'Needs a subject schedule (Step 2) and question setup (Step 3).'}
                >
                  <Sparkles aria-hidden="true" className="size-4" /> Auto-fill from plan
                </Button>
                <p className="text-[11px] text-muted-foreground">{q.hasPlan ? 'Re-run after changing Step 3.' : 'Set up Steps 2 and 3 to use this.'}</p>
              </div>
            </div>
          )}
        />

        {supplementary ? <SupplementaryNote q={q} source={supplementary} /> : null}
        <Notices q={q} isPublished={isPublished} />
        <SubjectProgress q={q} />

        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search questions" placeholder="Search questions…" value={q.query} onChange={(e) => q.setQuery(e.target.value)} className="h-9 pl-9" />
        </div>

        <div className="max-h-[480px] overflow-y-auto rounded-xl border border-border bg-card">
          {matchCount === 0 ? (
            <p className="flex items-center justify-center gap-2 py-6 text-center text-xs text-muted-foreground"><Info aria-hidden="true" className="size-3.5" /> No questions match.</p>
          ) : q.sections.map((s) => <QuestionSectionBlock key={s.key} s={s} q={q} visible={visibleIn(s)} search={search} />)}
        </div>
      </StepBody>
      <WizardFooter
        step={4}
        onBack={onBack}
        onSaveClose={() => { void q.handleSave('close'); }}
        onContinue={() => { void q.handleSave('next'); }}
        saving={q.saving}
        closeLabel={closeLabel}
      />
    </>
  );
}
