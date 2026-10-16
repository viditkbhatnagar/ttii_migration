import { useMemo } from 'react';
import { ArrowLeft, FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { StepAllocation } from './wizard/StepAllocation.js';
import { StepAllocationSupplementary } from './wizard/StepAllocationSupplementary.js';
import { StepAssignQuestions } from './wizard/StepAssignQuestions.js';
import { StepBasic } from './wizard/StepBasic.js';
import { StepPublish } from './wizard/StepPublish.js';
import { StepQuestionSetup } from './wizard/StepQuestionSetup.js';
import { StepSchedule } from './wizard/StepSchedule.js';
import { Stepper } from './wizard/Stepper.js';
import { useExamDraft } from './wizard/useExamDraft.js';
import { Banner } from './wizard/wizard-ui.js';
import type { WizardStepId } from './wizard/wizard-model.js';

// Create / Edit Exam — a six-step PAGE wizard (routes /admin/exam/add and
// /admin/exam/edit/:id) in Naji's 2026-10 design: icon stepper, one card per
// step with a "Step n of N" footer, and a Review dialog + confirmation before
// Publish. The steps live in ./wizard; each saves through the same
// /admin/exam/draft/* endpoints as before the redesign.

export default function AddExamPage(props: AdminPageProps) {
  const { session } = props;
  const c = useExamDraft(props);
  const { draft, meta, activeStep, setActiveStep, goToList } = c;
  const courseTitles = useMemo(
    () => draft.course_ids.map((id) => c.courseOptions.find((o) => o.id === id)?.title || `#${id}`),
    [draft.course_ids, c.courseOptions],
  );
  const offeringTitles = useMemo(
    () => draft.offering_ids.map((id) => c.offeringOptions.find((o) => o.id === id)?.title || `#${id}`),
    [draft.offering_ids, c.offeringOptions],
  );
  // TTII 2026-10-16 — a supplementary exam's regular papers, for Step 4.
  const { supplementary } = c;
  const paperSource = useMemo(
    () => (supplementary ? { sourceTitle: supplementary.sourceTitle, avoidIds: new Set(supplementary.sourceQuestionIds) } : null),
    [supplementary],
  );

  if (c.loading) return <PageLoader label="Loading exam…" />;

  const go = (step: WizardStepId) => () => setActiveStep(step);
  const closeLabel = meta.is_published ? 'Save & Close' : 'Save Draft & Close';
  const common = { api: props.api, authToken: session.token, examId: draft.id, closeLabel, onClose: goToList };

  return (
    <div className="space-y-6">
      <PageTitle
        title={c.editId ? 'Edit Exam' : 'Create New Exam'}
        subtitle={c.editId ? 'Update details across each step and save your changes.' : 'Follow the guided steps to schedule and publish an examination.'}
        actions={<Button variant="outline" size="sm" className="gap-1.5" onClick={goToList}><ArrowLeft aria-hidden="true" className="size-4" /> Back to Exams</Button>}
      />

      {supplementary ? (
        <Banner tone="neutral" icon={FilePlus2} title={`Supplementary exam of “${supplementary.sourceTitle}”${supplementary.sourceExamCode ? ` (${supplementary.sourceExamCode})` : ''}`}>
          Its subjects and students were chosen from that exam’s results, subject by subject. Change dates, times or marks in Step 2,
          assign a new paper in Step 4, then review and publish: each student is emailed only their own subjects.
        </Banner>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <Stepper active={activeStep} hasDraft={Boolean(draft.id)} examCode={draft.exam_code} onSelect={setActiveStep} />

        {activeStep === 1 ? <StepBasic c={c} closeLabel={closeLabel} /> : null}
        {activeStep === 2 ? (
          <StepSchedule
            {...common}
            examWindow={{ from_date: draft.from_date, to_date: draft.to_date, from_time: draft.from_time, to_time: draft.to_time }}
            isSupplementary={supplementary !== null}
            onSaved={go(3)}
            onBack={go(1)}
          />
        ) : null}
        {activeStep === 3 ? <StepQuestionSetup {...common} onSaved={go(4)} onBack={go(2)} /> : null}
        {activeStep === 4 ? <StepAssignQuestions {...common} isPublished={meta.is_published} supplementary={paperSource} onSaved={go(5)} onBack={go(3)} /> : null}
        {activeStep === 5 && supplementary ? <StepAllocationSupplementary {...common} onSaved={go(6)} onBack={go(4)} /> : null}
        {activeStep === 5 && !supplementary ? <StepAllocation {...common} onSaved={go(6)} onBack={go(4)} /> : null}
        {activeStep === 6 ? (
          <StepPublish
            api={props.api}
            authToken={session.token}
            closeLabel={closeLabel}
            draft={draft}
            courses={courseTitles}
            offerings={offeringTitles}
            meta={meta}
            metaLoaded={c.metaLoaded}
            isSupplementary={supplementary !== null}
            onPublished={goToList}
            onBack={go(5)}
            onClose={goToList}
          />
        ) : null}
      </div>
    </div>
  );
}
