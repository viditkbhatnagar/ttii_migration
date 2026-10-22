import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SearchBox } from '../centre-ui.js';

// Building blocks of the Centre Profile 360 (Naji 2026-10-22,
// CentreProfileModule): hero stat tiles, info cards and rows, the wallet mini
// stats, the tab toolbar and the in-card empty state.

export function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon aria-hidden="true" className="size-4" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-lg font-bold leading-tight tabular-nums">{value}</p>
    </div>
  );
}

export function InfoCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />{title}
      </h3>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

export function InfoRow({
  icon: Icon, label, value, href, tone, action,
}: { icon: LucideIcon; label: string; value?: string | undefined; href?: string | undefined; tone?: string | undefined; action?: React.ReactNode }) {
  const v = value && value.trim() && value !== '—' ? value : '—';
  const has = v !== '—';
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
      <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />{label}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-2">
        {has && href ? (
          <a href={href} className="min-w-0 break-words text-right text-sm font-medium underline-offset-4 hover:underline">{v}</a>
        ) : (
          <span className={cn('min-w-0 break-words text-right text-sm font-medium', !has && 'text-muted-foreground', tone)}>{v}</span>
        )}
        {action}
      </span>
    </div>
  );
}

export function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />{label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </Card>
  );
}

/** Search on the left, the tab's selects on the right (stacked on phones). */
export function TabToolbar({ search, onSearch, placeholder, children }: { search: string; onSearch: (v: string) => void; placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_auto_auto]">
      <SearchBox value={search} onChange={onSearch} placeholder={placeholder} className="sm:w-full" />
      {children}
    </div>
  );
}

export function TabEmpty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div role="status" className="grid place-items-center gap-2 p-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Icon aria-hidden="true" className="size-5" /></div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export const TAB_CARD = 'gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]';
export const FILTER_SELECT = 'w-full md:w-52';
