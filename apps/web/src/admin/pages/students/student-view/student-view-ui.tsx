import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Building blocks of Naji's student profile (ProfileInfoCard, Tabs, StatCard),
// on the admin theme tokens so the brand colour stays one edit in app.css.

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6', className)}>
      {children}
    </section>
  );
}

export function SectionHeader({
  icon: Icon, title, description, action,
}: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || value === '' || value === '-';
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
      <span className="max-w-[60%] break-words text-right text-xs font-medium text-foreground sm:text-sm">
        {empty ? <span className="text-muted-foreground">-</span> : value}
      </span>
    </div>
  );
}

export interface InfoField { label: string; value?: ReactNode }

export function ProfileInfoCard({
  icon, title, description, left, right, children,
}: { icon: LucideIcon; title: string; description?: string; left: InfoField[]; right: InfoField[]; children?: ReactNode }) {
  return (
    <Panel>
      <SectionHeader icon={icon} title={title} {...(description ? { description } : {})} />
      <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        <div>{left.map((f) => <InfoRow key={f.label} label={f.label} value={f.value} />)}</div>
        <div>{right.map((f) => <InfoRow key={f.label} label={f.label} value={f.value} />)}</div>
      </div>
      {children}
    </Panel>
  );
}

export interface TabItem { id: string; label: string; icon?: LucideIcon }

/** Naji's Tabs: `primary` = underline, `secondary` = segmented pill strip. */
export function ProfileTabs({
  tabs, active, onChange, variant = 'primary', label,
}: { tabs: TabItem[]; active: string; onChange: (id: string) => void; variant?: 'primary' | 'secondary'; label: string }) {
  if (variant === 'secondary') {
    return (
      <div role="tablist" aria-label={label} className="flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-secondary/70 p-1">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(t.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                on ? 'bg-card text-foreground shadow-[var(--shadow-soft)]' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.icon ? <t.icon aria-hidden="true" className="size-3.5" /> : null}
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="tablist" aria-label={label} className="flex w-full items-center gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              on ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.icon ? <t.icon aria-hidden="true" className="size-4" /> : null}
            {t.label}
            {on ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Naji's StatCard: icon tile, a delta pill, the number and its label. */
export function StatCard({
  icon: Icon, label, value, delta, tint,
}: { icon: LucideIcon; label: string; value: number | string; delta: { count: number; label: string }; tint: 'primary' | 'success' | 'info' }) {
  const tints = { primary: 'bg-primary/10 text-primary', success: 'bg-success-soft text-success', info: 'bg-info-soft text-info' };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <div className={cn('flex size-10 items-center justify-center rounded-xl', tints[tint])}>
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <span className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
          delta.count > 0 ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
        )}
        >
          {delta.count > 0 ? `+${delta.count}` : '0'} {delta.label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

/** A plain native select (keeps the dialogs' existing keyboard + mobile behaviour). */
export function NativeSelect({
  id, value, onChange, options, disabled, placeholder = '- Select -',
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  /** null = no empty option. */
  placeholder?: string | null;
}) {
  return (
    <select
      id={id}
      className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {placeholder !== null ? <option value="">{placeholder}</option> : null}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
