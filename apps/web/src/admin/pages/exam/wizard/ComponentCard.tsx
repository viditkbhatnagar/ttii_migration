import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ComponentRow, ComponentType } from './question-setup-model.js';
import { Field } from './wizard-ui.js';

const TYPES: Array<{ value: ComponentType; label: string }> = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'descriptive', label: 'Descriptive' },
];

/** One Step 3 component (an MCQ or Descriptive block of a subject's paper). */
export function ComponentCard({ row, index, onChange, onRemove }: {
  row: ComponentRow;
  index: number;
  onChange: (patch: Partial<ComponentRow>) => void;
  onRemove: () => void;
}) {
  const id = `cmp-${row.uid}`;
  // Every edit marks the row configured, exactly as before the restyle.
  const set = (patch: Partial<ComponentRow>) => onChange({ ...patch, configured: true });
  return (
    <div className={cn('space-y-4 rounded-xl border p-4', row.configured ? 'border-border bg-muted/20' : 'border-amber-200 bg-amber-50/40')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label={`Component ${index + 1} type`} className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={row.component_type === t.value}
              onClick={() => set({ component_type: t.value })}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition',
                row.component_type === t.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove component ${index + 1}`} onClick={onRemove}>
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field
          label="No. of Questions"
          htmlFor={`${id}-n`}
          hint={!row.configured ? <span className="text-amber-800">Not set — saves as {row.default_questions}.</span> : undefined}
        >
          {/* Empty + placeholder, never a fake value: Risha read the old
              hardcoded 10 as her saved 70 having been lost. */}
          <Input
            id={`${id}-n`}
            type="number"
            min={0}
            value={row.configured ? row.num_questions : ''}
            placeholder={String(row.default_questions)}
            onChange={(e) => set({ num_questions: Number(e.target.value) || 0 })}
            className="h-9"
          />
        </Field>
        <Field label="Marks each" htmlFor={`${id}-m`}>
          <Input id={`${id}-m`} type="number" step="0.5" min={0} value={row.marks_each} onChange={(e) => set({ marks_each: Number(e.target.value) || 0 })} className="h-9" />
        </Field>
        {row.component_type === 'mcq' ? (
          <Field label="Negative Marks" htmlFor={`${id}-neg`}>
            <Input id={`${id}-neg`} type="number" step="0.25" min={0} value={row.negative_marks} onChange={(e) => set({ negative_marks: Number(e.target.value) || 0 })} className="h-9" />
          </Field>
        ) : (
          <Field label="Word Limit" htmlFor={`${id}-wl`}>
            <Input id={`${id}-wl`} type="number" min={0} value={row.word_limit} onChange={(e) => set({ word_limit: Number(e.target.value) || 0 })} className="h-9" />
          </Field>
        )}
      </div>

      {row.component_type === 'mcq' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow id={`${id}-sq`} label="Shuffle questions" desc="Randomize question order in this block." checked={row.shuffle_questions} onChange={(v) => set({ shuffle_questions: v })} />
          <ToggleRow id={`${id}-so`} label="Shuffle options" desc="Randomize the answer options." checked={row.shuffle_options} onChange={(v) => set({ shuffle_options: v })} />
        </div>
      ) : null}
    </div>
  );
}

function ToggleRow({ id, label, desc, checked, onChange }: { id: string; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-xs font-medium text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{desc}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
