import { cn } from '@/lib/utils';
import { TONE, type Tone } from '../../shared/components/ui-tones.js';

// Building blocks shared by the Fee Information screens in Naji's design.
// The list chrome itself (pills, sortable headers, pager, filter selects)
// comes from students/list-chrome.tsx, the wave-2 house style.

const CARD_TONE: Record<Tone, string> = {
  primary: 'border-primary/30 bg-primary/5',
  emerald: 'border-emerald-200 bg-emerald-50/70',
  rose: 'border-rose-200 bg-rose-50/70',
  amber: 'border-amber-200 bg-amber-50/70',
  blue: 'border-sky-200 bg-sky-50/70',
  slate: 'border-border bg-card',
};

/**
 * A money summary card (Naji's StatCard): label, amount, caption. With
 * onClick it doubles as a filter, like the old Payment Status cards did.
 */
export function SummaryCard({
  label, value, caption, tone, active = false, onClick,
}: { label: string; value: string; caption: string; tone: Tone; active?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className={cn('block text-[11px] font-bold uppercase tracking-wide', TONE[tone].text)}>{label}</span>
      <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{value}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{caption}</span>
    </>
  );
  const base = cn('block w-full rounded-xl border p-4 text-left shadow-[var(--shadow-soft)]', CARD_TONE[tone]);
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        base,
        'transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active && 'ring-2 ring-primary/30',
      )}
    >
      {body}
    </button>
  );
}

/** Two-column label / value grid used by the read-only detail dialogs. */
export function DetailGrid({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0 rounded-lg border border-border p-2.5">
          <dt className="text-[11px] text-muted-foreground">{k}</dt>
          <dd className="break-words font-medium text-foreground">{v === '' || v === null || v === undefined ? '—' : v}</dd>
        </div>
      ))}
    </dl>
  );
}
