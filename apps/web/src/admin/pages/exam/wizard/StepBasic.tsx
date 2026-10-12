import { CalendarDays, FileText, GraduationCap, Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
// Risha UAT 2026-08-06 — a native <input type="date"> rejects a typed
// dd/mm/yyyy and a native <input type="time"> silently files "2:00" as 02:00
// (that is how 21 live classes ended up at 2 AM). The calendar button is
// hidden here: DmyDatePicker's trigger is labelled "Change date of birth",
// which is wrong wording for an exam date.
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { ClassTimeInput } from '@/components/ui/class-time-input';
import { cn } from '@/lib/utils';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';
import type { ExamDraftController, PickOption } from './useExamDraft.js';
import { EXAM_YEAR_MAX, EXAM_YEAR_MIN, formatMinutes } from './wizard-model.js';
import { Field, ReadOnlyValue, StepBody, StepHeader, SwitchCard, WizardFooter } from './wizard-ui.js';

function MultiPickerList({ name, options, selected, onToggle, emptyText }: {
  name: string;
  options: PickOption[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyText: string;
}) {
  if (options.length === 0) {
    return <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div role="group" aria-label={name} className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-border bg-card p-2 sm:grid-cols-2">
      {options.map((o) => {
        const isOn = selected.includes(o.id);
        const id = `${name}-${o.id}`;
        return (
          <label key={o.id} htmlFor={id} className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition', isOn ? 'bg-primary/10' : 'hover:bg-muted/60')}>
            <Checkbox id={id} checked={isOn} onCheckedChange={() => onToggle(o.id)} />
            <span className={cn('flex-1', isOn ? 'font-medium text-foreground' : 'text-muted-foreground')}>{o.title || `#${o.id}`}</span>
          </label>
        );
      })}
    </div>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: typeof FileText; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon aria-hidden="true" className="size-3.5" /> {children}
    </p>
  );
}

export function StepBasic({ c, closeLabel }: { c: ExamDraftController; closeLabel: string }) {
  const { draft, patchDraft } = c;
  return (
    <>
      <StepBody>
        <StepHeader icon={FileText} title="Add Exam" subtitle="Name the exam, pick its courses and offerings, and set the exam window (IST)." />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
          <Field label="Exam Title *" htmlFor="ex-title">
            <Input
              id="ex-title"
              value={draft.title}
              onChange={(e) => patchDraft({ title: e.target.value })}
              onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) patchDraft({ title: next }); }}
              placeholder="e.g. Mid-Semester Examination — November 2026"
            />
          </Field>
          <Field label="Exam Code (auto)">
            <ReadOnlyValue mono>{draft.exam_code || <span className="font-sans text-muted-foreground">Auto-generated on first save</span>}</ReadOnlyValue>
          </Field>
        </div>

        <div className="space-y-2">
          <SectionLabel icon={GraduationCap}>Courses * <span className="font-normal normal-case tracking-normal">({draft.course_ids.length} selected)</span></SectionLabel>
          <MultiPickerList name="course" options={c.courseOptions} selected={draft.course_ids} onToggle={c.toggleCourse} emptyText="No courses found." />
        </div>

        <div className="space-y-2">
          <SectionLabel icon={Layers}>Offerings <span className="font-normal normal-case tracking-normal">({draft.offering_ids.length} selected — pick a course first)</span></SectionLabel>
          <MultiPickerList
            name="offering"
            options={c.offeringOptions}
            selected={draft.offering_ids}
            onToggle={c.toggleOffering}
            emptyText={draft.course_ids.length === 0 ? 'Pick a course first.' : 'No active offerings for the selected courses.'}
          />
        </div>

        <div className="space-y-3">
          <SectionLabel icon={CalendarDays}>Exam window (IST)</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Start Date *" htmlFor="ex-fdate">
              <DmyDateInput id="ex-fdate" value={draft.from_date} onChange={(iso) => patchDraft({ from_date: iso })} hidePicker minYear={EXAM_YEAR_MIN} maxYear={EXAM_YEAR_MAX} />
            </Field>
            <Field label="End Date *" htmlFor="ex-tdate">
              <DmyDateInput id="ex-tdate" value={draft.to_date} onChange={(iso) => patchDraft({ to_date: iso })} hidePicker minYear={EXAM_YEAR_MIN} maxYear={EXAM_YEAR_MAX} />
            </Field>
            <Field label="Start Time *">
              <ClassTimeInput value={draft.from_time} onChange={(hhmm) => patchDraft({ from_time: hhmm })} />
            </Field>
            <Field label="End Time *">
              <ClassTimeInput value={draft.to_time} onChange={(hhmm) => patchDraft({ to_time: hhmm })} />
            </Field>
          </div>
          <Field label="Duration (auto)">
            <ReadOnlyValue>
              {draft.duration_minutes > 0
                ? `${draft.duration_minutes} minute${draft.duration_minutes === 1 ? '' : 's'} (${formatMinutes(draft.duration_minutes)})`
                : <span className="text-muted-foreground">Computed from Start + End once both are set.</span>}
            </ReadOnlyValue>
          </Field>
        </div>

        {/* Risha UAT 2026-05-27 — Shuffle Questions toggle. ON makes every
            student get a fresh random order of the same questions; OFF
            (default) keeps the saved sequence. */}
        <SwitchCard
          id="ex-shuffle"
          label="Shuffle questions for each student"
          desc="When on, every learner attempting this exam sees the questions in a different random order. Off (default) keeps the saved sequence the same for everyone. The order is locked in once a learner starts the attempt, so resuming the same attempt shows the same order."
          checked={draft.shuffle_questions}
          onChange={(v) => patchDraft({ shuffle_questions: v })}
        />
      </StepBody>
      <WizardFooter
        step={1}
        onSaveClose={() => { void c.saveDraft('list'); }}
        onContinue={() => { void c.saveDraft('next'); }}
        saving={c.saving}
        closeLabel={closeLabel}
      />
    </>
  );
}
