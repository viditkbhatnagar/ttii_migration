import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, BookOpen, GraduationCap, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';
import { bankCounts, buildSections, toQuestionOption, type SubjectPlan } from './question-assign-model.js';
import {
  componentsPayload,
  derivedQuestionCount,
  subjectSetupIssues,
  summariseSubject,
  type ComponentRow,
  type ComponentType,
  type SetupSubject,
} from './question-setup-model.js';
import { ComponentCard } from './ComponentCard.js';
import type { StepProps } from './StepSchedule.js';
import { Banner, Chip, StepBody, StepHeader, StepLoading, StepNotice, WizardFooter } from './wizard-ui.js';

let componentRowSeq = 0;
const nextComponentUid = (): string => {
  componentRowSeq += 1;
  return `cr-${componentRowSeq}`;
};

type Bank = { mcq: number; descriptive: number };

/** Step 3 — per-subject question paper structure, in Naji's subject-rail layout. */
export function StepQuestionSetup({ api, authToken, examId, closeLabel, onSaved, onBack, onClose }: StepProps) {
  const confirm = useConfirm();
  const [subjects, setSubjects] = useState<SetupSubject[]>([]);
  const [rows, setRows] = useState<ComponentRow[]>([]);
  // exam_subject_id -> bank counts; null when the bank listing couldn't load.
  const [banks, setBanks] = useState<Map<number, Bank> | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [schedule, components, options] = await Promise.all([
          api.getExamSchedule(authToken, examId),
          api.getExamComponents(authToken, examId),
          // Advisory: the bank chips are a hint, so a failed listing hides
          // them rather than blocking the step.
          api.listExamQuestionOptions(authToken, examId).catch(() => null),
        ]);
        if (cancelled) return;
        const compBySubject = new Map<number, Record<string, unknown>[]>();
        for (const c of components) {
          const sid = asNumber(c.exam_subject_id);
          const arr = compBySubject.get(sid) ?? [];
          arr.push(c);
          compBySubject.set(sid, arr);
        }
        const subs: SetupSubject[] = [];
        const next: ComponentRow[] = [];
        for (const s of schedule) {
          const sid = asNumber(s.id);
          const subjectTitle = asString(s.subject_title);
          const totalMarks = asNumber(s.total_marks);
          subs.push({ exam_subject_id: sid, subject_id: s.subject_id ? asNumber(s.subject_id) : null, subject_title: subjectTitle, total_marks: totalMarks });
          // One question per mark is the only count Step 2 actually implies;
          // anything cleverer would be inventing data the admin never entered.
          const derived = derivedQuestionCount(totalMarks);
          const existing = compBySubject.get(sid) ?? [];
          if (existing.length > 0) {
            for (const c of existing) {
              next.push({
                uid: nextComponentUid(),
                exam_subject_id: sid,
                subject_title: subjectTitle,
                component_type: asString(c.component_type) === 'descriptive' ? 'descriptive' : 'mcq',
                configured: true,
                num_questions: asNumber(c.num_questions),
                marks_each: Number(c.marks_each ?? 0),
                negative_marks: Number(c.negative_marks ?? 0),
                shuffle_questions: Boolean(c.shuffle_questions),
                shuffle_options: Boolean(c.shuffle_options),
                word_limit: asNumber(c.word_limit),
                default_questions: derived,
              });
            }
          } else {
            next.push({ uid: nextComponentUid(), exam_subject_id: sid, subject_title: subjectTitle, component_type: 'mcq', configured: false, num_questions: derived, marks_each: 1, negative_marks: 0, shuffle_questions: false, shuffle_options: false, word_limit: 0, default_questions: derived });
          }
        }
        setSubjects(subs);
        setRows(next);
        setActiveId(subs[0]?.exam_subject_id ?? null);
        if (options) {
          const plans: SubjectPlan[] = subs.map((s) => ({ exam_subject_id: s.exam_subject_id, subject_id: s.subject_id, subject_title: s.subject_title, mcq_target: 0, descriptive_target: 0, total_target: 0, total_marks: s.total_marks, mcq_marks_each: 0, mcq_negative_marks: 0 }));
          const m = new Map<number, Bank>();
          for (const sec of buildSections(options.map(toQuestionOption), plans)) {
            if (sec.plan) m.set(sec.plan.exam_subject_id, bankCounts(sec.items));
          }
          setBanks(m);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  // Keyed by uid, not by array index: an index-keyed remove leaves React
  // reusing the removed row's DOM for its sibling — the "wrong numbers after
  // deleting a component" class of bug.
  const setRow = (uid: string, patch: Partial<ComponentRow>) =>
    setRows((cur) => cur.map((r) => r.uid === uid ? { ...r, ...patch } : r));
  const addComponent = (subject: SetupSubject, type: ComponentType) => {
    // An explicitly added component counts as configured — the admin asked for it.
    const fallback = rows.find((r) => r.exam_subject_id === subject.exam_subject_id)?.default_questions ?? derivedQuestionCount(subject.total_marks);
    setRows((cur) => [...cur, { uid: nextComponentUid(), exam_subject_id: subject.exam_subject_id, subject_title: subject.subject_title, component_type: type, configured: true, num_questions: type === 'mcq' ? fallback : 1, marks_each: 1, negative_marks: 0, shuffle_questions: false, shuffle_options: false, word_limit: type === 'descriptive' ? 200 : 0, default_questions: fallback }]);
  };
  const removeRow = (uid: string) => setRows((cur) => cur.filter((r) => r.uid !== uid));

  const perSubject = useMemo(() => subjects.map((s) => {
    const subjectRows = rows.filter((r) => r.exam_subject_id === s.exam_subject_id);
    const summary = summariseSubject(subjectRows);
    const bank = banks?.get(s.exam_subject_id) ?? (banks ? { mcq: 0, descriptive: 0 } : null);
    return { subject: s, rows: subjectRows, summary, bank, issues: subjectSetupIssues(summary, s.total_marks, bank) };
  }), [subjects, rows, banks]);

  const handleSave = async (then: 'next' | 'close') => {
    const mismatched = perSubject.filter((p) => p.issues.marksMismatch);
    if (mismatched.length > 0) {
      const ok = await confirm({
        title: "Marks don't add up",
        description: `${mismatched.map((p) => `${p.subject.subject_title}: ${p.summary.plannedMarks} planned vs ${p.subject.total_marks} total`).join('; ')}. Save anyway? You can still adjust marks per question in Step 4.`,
        confirmText: 'Save anyway',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await api.saveExamComponents(authToken, examId, componentsPayload(rows));
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) { toast.success(message); if (then === 'next') onSaved(); else onClose(); }
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save components.');
    } finally { setSaving(false); }
  };

  if (loading) return <StepLoading label="Loading components…" />;
  if (subjects.length === 0) {
    return (
      <StepNotice action={<Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}><ArrowLeft aria-hidden="true" className="size-4" /> Back to Step 2</Button>}>
        <p className="font-medium text-foreground">No subjects yet. Save the schedule (Step 2) first.</p>
      </StepNotice>
    );
  }

  const unconfiguredCount = rows.filter((r) => !r.configured).length;
  const active = perSubject.find((p) => p.subject.exam_subject_id === activeId) ?? perSubject[0];

  return (
    <>
      <StepBody>
        <StepHeader icon={BookOpen} title="Question Setup" subtitle="For each subject, configure one or more components (MCQ and/or Descriptive). Step 4 fills the paper from these counts." />

        {unconfiguredCount > 0 ? (
          <Banner tone="warning" icon={AlertTriangle}>
            {unconfiguredCount === 1 ? '1 subject has' : `${unconfiguredCount} subjects have`} no saved question setup yet. Those rows show a
            greyed-out suggested count as a placeholder, not a saved value — type a number to set it. Saving keeps the suggestion if you leave it blank.
          </Banner>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Subjects" className="h-fit space-y-1 rounded-xl border border-border bg-card p-2">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Subjects</p>
            {perSubject.map((p) => {
              const isActive = p.subject.exam_subject_id === active?.subject.exam_subject_id;
              const dot = p.issues.bankShort.length > 0 ? 'bg-rose-500' : p.issues.marksMismatch || p.rows.some((r) => !r.configured) ? 'bg-amber-500' : null;
              return (
                <button
                  key={p.subject.exam_subject_id}
                  type="button"
                  onClick={() => setActiveId(p.subject.exam_subject_id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition', isActive ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-muted')}
                >
                  <GraduationCap aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.subject.subject_title}</span>
                    <span className="block text-[10px] font-normal text-muted-foreground">{p.summary.questions} Q · {p.summary.plannedMarks}{p.subject.total_marks > 0 ? ` / ${p.subject.total_marks}` : ''} marks</span>
                  </span>
                  {dot ? <span className={cn('size-1.5 shrink-0 rounded-full', dot)} aria-label="Needs attention" /> : null}
                </button>
              );
            })}
          </nav>

          {active ? (
            <section aria-label={active.subject.subject_title} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{active.subject.subject_title}</h3>
                  <p className="text-xs text-muted-foreground">Configure the question paper structure for this subject.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => addComponent(active.subject, 'mcq')}><Plus aria-hidden="true" className="size-3.5" /> MCQ</Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => addComponent(active.subject, 'descriptive')}><Plus aria-hidden="true" className="size-3.5" /> Descriptive</Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {active.bank ? (
                  <Chip tone={active.issues.bankShort.length > 0 ? 'danger' : 'neutral'}>
                    Bank: <span className="font-semibold">{active.bank.mcq}</span> MCQ · <span className="font-semibold">{active.bank.descriptive}</span> Descriptive
                  </Chip>
                ) : <Chip>Bank counts unavailable</Chip>}
                <Chip tone="primary">Planned: {active.summary.mcqCount} MCQ · {active.summary.descriptiveCount} Descriptive</Chip>
                <Chip tone={active.subject.total_marks <= 0 ? 'neutral' : active.issues.marksMismatch ? 'warning' : 'success'}>
                  Marks: {active.summary.plannedMarks}{active.subject.total_marks > 0 ? ` / ${active.subject.total_marks}` : ''}
                </Chip>
              </div>

              {active.issues.bankShort.length > 0 || active.issues.marksMismatch ? (
                <Banner tone={active.issues.bankShort.length > 0 ? 'danger' : 'warning'} icon={AlertTriangle} title="Check this subject">
                  <ul className="ml-4 list-disc space-y-0.5">
                    {active.issues.bankShort.map((e) => <li key={e}>{e} Step 4 can only assign what the bank has.</li>)}
                    {active.issues.marksMismatch ? <li>{active.issues.marksMismatch}</li> : null}
                  </ul>
                </Banner>
              ) : null}

              {active.rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">No components. Add an MCQ or Descriptive component above.</p>
              ) : (
                <div className="space-y-3">
                  {active.rows.map((row, i) => (
                    <ComponentCard key={row.uid} row={row} index={i} onChange={(patch) => setRow(row.uid, patch)} onRemove={() => removeRow(row.uid)} />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </StepBody>
      <WizardFooter
        step={3}
        onBack={onBack}
        onSaveClose={() => { void handleSave('close'); }}
        onContinue={() => { void handleSave('next'); }}
        saving={saving}
        closeLabel={closeLabel}
      />
    </>
  );
}
