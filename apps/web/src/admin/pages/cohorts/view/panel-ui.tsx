import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Card header used by every cohort detail panel (title left, actions right). */
export function PanelHeader({ title, subtitle, children }: { title: React.ReactNode; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

const ICON_TONE = {
  muted: 'text-muted-foreground hover:bg-muted',
  info: 'text-primary hover:bg-primary/10',
  success: 'text-emerald-600 hover:bg-emerald-50',
  danger: 'text-destructive hover:bg-destructive/10',
} as const;

export function IconBtn({
  icon: Icon, tone, label, onClick, disabled,
}: { icon: LucideIcon; tone: keyof typeof ICON_TONE; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn('rounded-lg p-1.5 transition disabled:pointer-events-none disabled:opacity-40', ICON_TONE[tone])}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

export function SegmentedToggle<T extends string>({
  value, options, onChange, label,
}: { value: T; options: Array<{ id: T; label: string; icon?: LucideIcon }>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-full border border-border bg-card p-0.5 text-xs">
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition',
              value === o.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
