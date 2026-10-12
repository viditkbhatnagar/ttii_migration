import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Pill } from '../../shared/components/ui-kit.js';
import { isActiveStatus, statusLabel, type StatusTab } from './partner-model.js';

// Small pieces shared by the Partner Management screens (Naji's partner-ui).

const TABS: Array<{ id: StatusTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

/** All / Active / Inactive pills with counts (plain toggle buttons). */
export function StatusPills({ value, counts, onChange, label }: {
  value: StatusTab;
  counts: Record<StatusTab, number>;
  onChange: (v: StatusTab) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const on = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', on ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground')}>
              {counts[t.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={isActiveStatus(status) ? 'emerald' : 'slate'}>{statusLabel(status)}</Pill>;
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">{children}</span>;
}

/** The uploaded logo, or the first letters of the code on a tinted tile. */
export function PartnerLogo({ logo, code, className }: { logo: string; code: string; className?: string }) {
  return (
    <div className={cn('grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-primary/5 text-[11px] font-bold text-primary', className)}>
      {logo ? <img src={logo} alt={`${code || 'Partner'} logo`} className="size-full bg-white object-contain p-0.5" /> : (code.slice(0, 4) || '—')}
    </div>
  );
}
