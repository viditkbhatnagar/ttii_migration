import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE, type Tone } from './ui-tones.js';

export type { Tone } from './ui-tones.js';

// The admin design kit for Naji's new UI (TTII 2026-10): KPI tiles, stat boxes
// and status pills, shared by every rebuilt module.
//
// Colour rule (Naji 2026-10-11 — "changing the color for all LMS in easy step
// rather than doing for all modules separately"): the brand colour is ONLY ever
// the theme's `primary` token (app.css --primary), so a recolour is one edit.
// The other tones are SEMANTIC — green is good, red is a problem, amber needs a
// look, sky is informational, slate is neutral — and stay fixed across themes.

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', TONE[tone].pill, className)}>
      {children}
    </span>
  );
}

/** A KPI that doubles as a filter: click to narrow the list, click again to clear. */
export function KpiTile({
  label, value, icon: Icon, tone, active = false, onClick,
}: { label: string; value: number | string; icon: LucideIcon; tone: Tone; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'border-primary ring-2 ring-primary/20' : 'border-border',
      )}
    >
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE[tone].tile)}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none tabular-nums text-foreground">{value}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

export function StatBox({ label, value, tone }: { label: string; value: number | string; tone: Tone }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-bold tabular-nums', TONE[tone].text)}>{value}</p>
    </div>
  );
}

/** Page title block used at the top of every rebuilt module. */
export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Empty state inside a list card. */
export function EmptyState({
  icon: Icon, title, body, action,
}: { icon: LucideIcon; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body ? <p className="max-w-md text-sm text-muted-foreground">{body}</p> : null}
      {action}
    </div>
  );
}
