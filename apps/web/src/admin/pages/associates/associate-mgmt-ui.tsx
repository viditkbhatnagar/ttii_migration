import type { LucideIcon } from 'lucide-react';
import { ClipboardList } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { initialsOf } from '../counsellor/staff-model.js';

// Shared pieces of the Associate Management pages (Naji's associate-ui.tsx),
// on the admin theme tokens only.

/** Naji's associate Kpi: a static figure (not a filter) with its icon. */
export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: string; icon: LucideIcon }) {
  return (
    <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon aria-hidden="true" className="size-4" /></span>
      </div>
    </Card>
  );
}

export function AssocAvatar({ name, photo, className = 'size-9' }: { name: string; photo?: string; className?: string }) {
  return (
    <Avatar className={className}>
      {photo ? <AvatarImage src={photo} alt="" /> : null}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}

/** A full-page error card with Retry, as on the other rebuilt pages. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
        {message}
        <div className="mt-4"><Button variant="outline" onClick={onRetry}>Retry</Button></div>
      </CardContent>
    </Card>
  );
}

/**
 * "Set-up needed": what the page will do and the exact product decisions it
 * waits on. Used where Naji's prototype shows data we do not hold (KYC, bank
 * details, commission rules) — nothing is invented in the meantime.
 */
export function SetupNeededCard({ title, what, decisions, className }: {
  title: string; what: string; decisions: string[]; className?: string;
}) {
  return (
    <Card className={cn('gap-0 border-dashed border-primary/40 bg-primary/5 p-5 shadow-none', className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Set-up needed</p>
            <h2 className="mt-0.5 text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{what}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Decisions needed before this can be switched on</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {decisions.map((d) => <li key={d}>{d}</li>)}
            </ol>
          </div>
        </div>
      </div>
    </Card>
  );
}
