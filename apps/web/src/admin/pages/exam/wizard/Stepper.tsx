import type { LucideIcon } from 'lucide-react';
import { BookOpen, Check, ClipboardList, FileText, ListChecks, Megaphone, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS, type WizardStepId } from './wizard-model.js';

// Naji's icon stepper: numbered pills that turn into a green check once done.
// Every step after the first needs a saved draft (it reads the exam id), so
// those stay disabled until Step 1 has been saved once.

const STEP_ICON: Record<WizardStepId, LucideIcon> = {
  1: FileText,
  2: ClipboardList,
  3: BookOpen,
  4: ListChecks,
  5: Users,
  6: Megaphone,
};

export function Stepper({ active, hasDraft, examCode, onSelect }: {
  active: WizardStepId;
  hasDraft: boolean;
  examCode: string;
  onSelect: (step: WizardStepId) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-4 sm:px-6">
      <ol aria-label="Exam setup steps" className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
        {WIZARD_STEPS.map((s, i) => {
          const isActive = active === s.id;
          const isDone = active > s.id || (hasDraft && s.id === 1);
          const enabled = s.id === 1 || hasDraft;
          const Icon = STEP_ICON[s.id];
          return (
            <li key={s.id} className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => { if (enabled) onSelect(s.id); }}
                disabled={!enabled}
                aria-current={isActive ? 'step' : undefined}
                title={enabled ? undefined : 'Save Step 1 first'}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isActive && 'border-primary bg-primary text-primary-foreground shadow-sm',
                  !isActive && isDone && 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                  !isActive && !isDone && 'border-border bg-card text-muted-foreground hover:text-foreground',
                  !enabled && 'cursor-not-allowed opacity-60 hover:text-muted-foreground',
                )}
              >
                <span className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[10px] font-semibold',
                  isActive ? 'bg-white/25' : isDone ? 'bg-emerald-500 text-white' : 'bg-muted',
                )}>
                  {isDone && !isActive ? <Check aria-hidden="true" className="size-3" /> : s.id}
                </span>
                <Icon aria-hidden="true" className="size-3.5" />
                {s.label}
              </button>
              {i < WIZARD_STEPS.length - 1 ? <span aria-hidden="true" className="h-px w-5 bg-border" /> : null}
            </li>
          );
        })}
      </ol>
      {examCode ? (
        <span className="shrink-0 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          Exam ID <span className="ml-1 font-mono font-medium text-foreground">{examCode}</span>
        </span>
      ) : null}
    </div>
  );
}
