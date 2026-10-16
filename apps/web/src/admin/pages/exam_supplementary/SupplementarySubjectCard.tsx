import { ClassTimeInput } from '@/components/ui/class-time-input';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Pill } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import {
  GROUP_META,
  GROUP_ORDER,
  candidateNote,
  togglePicked,
  withTimes,
  type DraftSubject,
  type SubjectChoice,
} from './supplementary-model.js';

// One subject in the Create Supplementary Exam dialog: tick it, give its
// sitting a date and IST window (paper length and marks copied from the
// regular sitting, editable), and choose its students — failed ones ticked,
// absent / flagged / re-exam ones listed unticked in groups of their own.

const NUMBER_CLASS = 'h-9 text-right tabular-nums';

function NumberField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type="number" min={0} step={1} inputMode="numeric" value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(Number(e.target.value))} className={NUMBER_CLASS} />
    </div>
  );
}

export function SupplementarySubjectCard({
  subject, choice, onChange, problem, thisYear,
}: {
  subject: DraftSubject;
  choice: SubjectChoice;
  onChange: (next: SubjectChoice) => void;
  /** What still needs doing before this subject can be created ('' when ready). */
  problem: string;
  thisYear: number;
}) {
  const id = `supp-${subject.sittingExamId}`;
  const counts = GROUP_ORDER.map((g) => ({ g, n: subject.candidates.filter((c) => c.group === g).length })).filter((x) => x.n > 0);
  const plan = [
    subject.mcqQuestions > 0 ? `${subject.mcqQuestions} MCQ${subject.marksEach > 0 ? ` × ${subject.marksEach} mark${subject.marksEach === 1 ? '' : 's'}` : ''}` : '',
    subject.descriptiveQuestions > 0 ? `${subject.descriptiveQuestions} descriptive` : '',
  ].filter(Boolean).join(' + ');

  return (
    <section className={cn('rounded-xl border transition-colors', choice.selected ? 'border-primary/40 bg-primary/[0.03]' : 'border-border bg-card')}>
      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-primary"
          checked={choice.selected}
          onChange={(e) => onChange({ ...choice, selected: e.target.checked })}
        />
        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-sm font-semibold text-foreground">{subject.subjectTitle}</span>
          <span className="block text-[11px] text-muted-foreground">
            Regular sitting {formatYmd(subject.date) || '—'} · {subject.totalMarks} marks{subject.passMarks !== null ? ` · pass ${subject.passMarks}` : ''}
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {counts.map(({ g, n }) => <Pill key={g} tone={GROUP_META[g].tone}>{n} {GROUP_META[g].label.toLowerCase()}</Pill>)}
        </div>
      </div>

      {choice.selected ? (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
              <Label htmlFor={`${id}-date`} className="text-xs">Date</Label>
              <DmyDateInput id={`${id}-date`} value={choice.date} onChange={(date) => onChange({ ...choice, date })} minYear={thisYear} maxYear={thisYear + 1} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Opens (IST)</Label>
              <ClassTimeInput value={choice.startTime} onChange={(startTime) => onChange(withTimes(choice, { startTime }))} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Closes (IST)</Label>
              <ClassTimeInput value={choice.endTime} onChange={(endTime) => onChange(withTimes(choice, { endTime }))} className="h-9" />
            </div>
            <NumberField id={`${id}-duration`} label="Paper (min)" value={choice.durationMinutes} onChange={(n) => onChange({ ...choice, durationMinutes: n, durationTouched: true })} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField id={`${id}-total`} label="Marks" value={choice.totalMarks} onChange={(totalMarks) => onChange({ ...choice, totalMarks })} />
              <NumberField id={`${id}-pass`} label="Pass" value={choice.passMarks} onChange={(passMarks) => onChange({ ...choice, passMarks })} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Question plan copied from the regular paper{plan ? `: ${plan}` : ''}. If you change the marks, adjust the plan in Step 3.
          </p>

          {GROUP_ORDER.map((g) => {
            const people = subject.candidates.filter((c) => c.group === g);
            if (people.length === 0) return null;
            return (
              <fieldset key={g} className="space-y-1.5">
                <legend className="text-xs font-semibold text-foreground">
                  {GROUP_META[g].label} ({people.length})
                  <span className="ml-1.5 font-normal text-muted-foreground">{GROUP_META[g].hint}</span>
                </legend>
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {people.map((c) => (
                    <li key={c.userId}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                        <input type="checkbox" className="size-4 accent-primary" checked={choice.picked.has(c.userId)} onChange={() => onChange(togglePicked(choice, c.userId))} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {c.studentCode}{c.alreadyIn ? ` · already in "${c.alreadyIn}"` : ''}
                          </span>
                        </span>
                        <span className={cn('max-w-[45%] shrink-0 truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold', TONE[GROUP_META[g].tone].pill)} title={candidateNote(c)}>
                          {candidateNote(c)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            );
          })}
          {problem ? <p role="status" className="text-xs font-medium text-amber-800">{problem}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
