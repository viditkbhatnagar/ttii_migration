import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { describeParts, missingIn, type QuestionOption, type QuestionSection } from './question-assign-model.js';
import type { AssignQuestionsController } from './useAssignQuestions.js';

const TONE = {
  neutral: 'bg-muted text-muted-foreground',
  good: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-800',
} as const;

/** One subject's collapsible block in the Step 4 picker. */
export function QuestionSectionBlock({ s, q, visible, search }: {
  s: QuestionSection;
  q: AssignQuestionsController;
  visible: QuestionOption[];
  search: string;
}) {
  const isOpen = !q.collapsed.has(s.key);
  const stats = q.statsForSection(s);
  const target = s.plan?.total_target ?? 0;
  const planMarks = s.plan?.total_marks ?? 0;
  const pick = q.picks.get(s.key);
  const missing = pick ? missingIn(pick) : 0;
  const countTone = target <= 0 ? TONE.neutral : stats.count === target ? TONE.good : stats.count > target ? TONE.warn : TONE.neutral;
  const markTone = planMarks <= 0 ? TONE.neutral : stats.marks === planMarks ? TONE.good : TONE.warn;
  // "12 still to pick" is a lie when only 4 of those 12 exist in the bank, so
  // the shortfall is named in the same breath.
  const hint = target <= 0
    ? ''
    : stats.count === target
      ? 'Matches the plan.'
      : stats.count > target
        ? `${stats.count - target} more than planned.`
        : missing > 0
          ? `${target - stats.count} still to pick — the bank is ${missing} short of the plan.`
          : `${target - stats.count} still to pick.`;
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <section className="border-b border-border last:border-b-0">
      {/* Sticky so the subject's counts stay on screen while its own questions scroll past. */}
      <div className={cn('sticky top-0 z-10 border-b border-border px-3 py-2.5 backdrop-blur', s.unscheduled ? 'bg-muted/90' : 'bg-card/95')}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button type="button" onClick={() => q.toggleSection(s.key)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <Chevron aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">{s.title}</span>
              <span className="block text-[11px] text-muted-foreground">
                {s.plan
                  ? `Plan: ${s.plan.mcq_target} MCQ · ${s.plan.descriptive_target} descriptive · ${s.plan.total_marks} marks`
                  : s.unscheduled
                    ? 'These subjects have no sitting in Step 2 — assigning them is usually a mistake.'
                    : `${s.items.length} question${s.items.length === 1 ? '' : 's'} in the bank`}
              </span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            {missing > 0 ? (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800" title={`Bank has ${describeParts(pick?.parts ?? [])}.`}>
                bank short {missing}
              </span>
            ) : null}
            <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', countTone)}>
              {stats.count}{target > 0 ? ` / ${target}` : ''} picked
            </span>
            <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', markTone)}>
              {stats.marks}{planMarks > 0 ? ` / ${planMarks}` : ''} marks
            </span>
          </div>
        </div>
        {isOpen ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Per-subject re-run, for when only one subject's Step 3 setup
                changed. Splits by type the way the plan does, which "Select
                first N" (a flat list slice) cannot. */}
            {pick ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-primary/30 bg-primary/5 px-2 text-xs text-primary hover:bg-primary/10"
                title={`Replaces this subject's selection with its Step 3 plan (${describeParts(pick.parts)}).`}
                onClick={() => { void q.autoFillSubject(s); }}
              >
                <Sparkles aria-hidden="true" className="size-3.5" /> Auto-fill {pick.ids.length}
              </Button>
            ) : null}
            {target > 0 ? (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" title={`Replaces this subject's selection with the first ${target} questions listed.`} onClick={() => q.selectFirstN(s, visible, target)}>
                Select first {target}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => q.selectAllIn(s, visible)}>
              Select all{search ? ` shown (${visible.length})` : ` (${s.items.length})`}
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => q.clearSection(s)} disabled={stats.count === 0}>
              Clear
            </Button>
            {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
            {search ? <span className="text-[11px] text-muted-foreground">Bulk actions apply to the search results; Clear empties the whole subject.</span> : null}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className="space-y-1 p-2">
          {visible.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">{search ? 'No questions match the search in this subject.' : 'No questions in the bank for this subject.'}</p>
          ) : visible.map((o) => {
            const isOn = q.selected.has(o.id);
            const cid = `q-${o.id}`;
            return (
              <div key={o.id} className={cn('flex items-center gap-3 rounded-lg p-2 text-sm transition', isOn ? 'bg-primary/5' : 'hover:bg-muted/50')}>
                <label htmlFor={cid} className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                  <Checkbox id={cid} checked={isOn} onCheckedChange={() => q.toggle(s, o.id)} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className={cn('block truncate', isOn ? 'font-medium text-foreground' : 'text-muted-foreground')}>{o.title || `Question #${o.id}`}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {/* Step 3 plans MCQ and Descriptive counts separately, so
                          the admin has to be able to tell them apart. */}
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', o.q_type === 1 ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-700')}>
                        {o.q_type === 1 ? 'Descriptive' : 'MCQ'}
                      </span>
                      {o.subject_title ? <span className="text-xs text-muted-foreground">{o.subject_title}</span> : null}
                      {/* A supplementary exam's paper should be new to the students who sat the regular one. */}
                      {q.usedOnRegular.has(o.id) ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">On the regular paper</span> : null}
                    </span>
                  </span>
                </label>
                {isOn ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-xs text-muted-foreground">marks</span>
                    <Input aria-label={`Marks for question ${o.id}`} type="number" step="0.5" min={0} value={q.selected.get(o.id) ?? 0} onChange={(e) => q.setMark(o.id, Number(e.target.value) || 0)} className="h-8 w-20" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
