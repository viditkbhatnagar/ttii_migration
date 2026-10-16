import { useEffect, useState } from 'react';
import { Info, Users } from 'lucide-react';
import { toSupplementaryWizardInfo, type SupplementaryWizardInfo } from '../../exam_supplementary/supplementary-model.js';
import type { StepProps } from './StepSchedule.js';
import { Banner, Chip, StepBody, StepHeader, StepLoading, WizardFooter } from './wizard-ui.js';

// Step 5 for a SUPPLEMENTARY exam (TTII 2026-10-16). Its students were chosen
// subject by subject when it was created, and each sitting keeps its own list
// — one exam-wide list (the regular Step 5) would enter everyone for every
// subject, so this step only shows them. Nothing is saved here. Read fresh on
// opening: removing a subject in Step 2 removes its students.

export function StepAllocationSupplementary({ api, authToken, examId, closeLabel, onSaved, onBack, onClose }: StepProps) {
  const [info, setInfo] = useState<SupplementaryWizardInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getSupplementaryInfo(authToken, examId)
      .then((raw) => { if (!cancelled) setInfo(toSupplementaryWizardInfo(raw)); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  if (!info && !failed) return <StepLoading label="Loading the students…" />;
  const subjects = info?.subjects ?? [];
  const everyone = new Set(subjects.flatMap((s) => s.students.map((st) => st.userId)));

  return (
    <>
      <StepBody>
        <StepHeader
          icon={Users}
          title="Students, subject by subject"
          subtitle={info ? `Chosen from the results of “${info.sourceTitle}” when this supplementary exam was created. Each student sits only their own subjects.` : undefined}
          actions={<Chip tone="primary">{everyone.size} student{everyone.size === 1 ? '' : 's'}</Chip>}
        />
        {failed ? (
          <Banner tone="warning" icon={Info}>Couldn’t load the students. They are kept with the exam; reload the page to see them.</Banner>
        ) : (
          <Banner tone="info" icon={Info}>
            These lists cannot be edited here. To change them, delete this exam and create the supplementary exam again from the Result page.
            Removing a subject in Step 2 removes its students from this exam.
          </Banner>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map((s) => (
            <section key={s.examSubjectId} className="rounded-xl border border-border bg-card">
              <h3 className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">
                <span className="truncate">{s.subjectTitle}</span>
                <Chip>{s.students.length}</Chip>
              </h3>
              {s.students.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">No students. Publishing is refused until this subject is removed in Step 2.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {s.students.map((st) => (
                    <li key={st.userId} className="px-4 py-2">
                      <p className="truncate text-sm font-medium text-foreground">{st.name}</p>
                      <p className="text-[11px] text-muted-foreground">{st.studentCode || '—'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </StepBody>
      <WizardFooter step={5} onBack={onBack} onSaveClose={onClose} onContinue={onSaved} saving={false} closeLabel={closeLabel} continueLabel="Continue" />
    </>
  );
}
