import type { ComponentType, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Building blocks of Naji's centre portal pages (the design's AppShell header,
// StatCard, PaginationBar and pill tabs), on the shared theme tokens so the
// centre-theme scope recolours them.

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** The design's AppShell page heading: title + subtitle, actions on the right. */
export function CentrePageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  /** Classes for the icon tile (the design's `tone`). */
  tone?: string;
  sub?: ReactNode;
}

export function StatCard({ label, value, icon: Icon, tone = 'bg-primary-soft text-primary', sub }: StatCardProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
        {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

interface PaginationBarProps {
  page: number;
  totalPages: number;
  showing: number;
  total: number;
  onPage: (page: number) => void;
  unit?: string;
}

export function PaginationBar({ page, totalPages, showing, total, onPage, unit = 'rows' }: PaginationBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{showing}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span> {unit}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="px-2 text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface PillTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string; count?: number }>;
  label: string;
}

/** The design's rounded pill filter row. */
export function PillTabs<T extends string>({ value, onChange, options, label }: PillTabsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === o.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
          {typeof o.count === 'number' && (
            <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', value === o.value ? 'bg-white/20' : 'bg-background/70')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** A full-width notice card for loading failures and honest empty states. */
export function NoticeCard({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <Card className="border-border/70 p-10 text-center shadow-[var(--shadow-soft)]">
      <div role={tone === 'error' ? 'alert' : undefined} className={cn('text-sm', tone === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
        {children}
      </div>
    </Card>
  );
}
