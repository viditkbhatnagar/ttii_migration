import { AlertTriangle, Eye, FileText, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Pill } from '../../../shared/components/ui-kit.js';
import { TONE } from '../../../shared/components/ui-tones.js';
import { ageingDays, ageingTone, stageLabel, stageTone, type OnbRow } from './onboarding-model.js';

// Shared pieces of the Centres v2 onboarding / affiliation screens.

export function StageBadge({ row }: { row: Pick<OnbRow, 'stage' | 'linkSentAt'> }) {
  return <Pill tone={stageTone(row)}>{stageLabel(row)}</Pill>;
}

export function AgeingBadge({ row, today }: { row: Pick<OnbRow, 'stage' | 'stageSince'>; today: string }) {
  const days = ageingDays(row, today);
  if (days === null) return <span className="text-xs text-muted-foreground">—</span>;
  const tone = ageingTone(days);
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', TONE[tone].tile)}>
      <Timer aria-hidden="true" className="size-3" />{days}d in stage
    </span>
  );
}

export function NotSetUpNotice({ message }: { message: string }) {
  return (
    <div role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message || 'Centre onboarding is not set up yet.'}</span>
    </div>
  );
}

export function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value || '—'}</dd>
    </div>
  );
}

export interface ViewerDoc {
  title: string;
  subtitle: string;
  url: string;
}

/** An uploaded file's name: opens it in the in-app viewer. */
export function DocLink({ name, url, subtitle, onOpen }: { name: string; url: string; subtitle: string; onOpen: (d: ViewerDoc) => void }) {
  if (!url) return <span className="text-sm">{name || '—'}</span>;
  return (
    <button
      type="button"
      onClick={() => onOpen({ title: name, subtitle, url })}
      title="Click to view"
      className="inline-flex max-w-full items-center gap-1.5 text-left text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <FileText aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{name}</span>
      <Eye aria-hidden="true" className="size-3 shrink-0 opacity-60" />
    </button>
  );
}

/** A labelled form field with Naji's red asterisk and the error underneath. */
export function Field({ label, htmlFor, required, error, className, children }: {
  label: string; htmlFor?: string; required?: boolean; error?: string | undefined; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn('grid min-w-0 content-start gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export const TEXTAREA_CLASS = 'flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-[invalid=true]:border-destructive';
export const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-[invalid=true]:border-destructive';

/**
 * Modal chrome (house rules): inline width, the mobile-safe .modal-maxh cap,
 * fixed header + footer, only the body scrolls (min-h-0 on the flex scroller).
 */
export function ModalShell({ open, title, description, width = 640, busy, onClose, footer, children, icon }: {
  open: boolean; title: string; description?: string; width?: number; busy?: boolean; onClose: () => void;
  footer: React.ReactNode; children: React.ReactNode; icon?: React.ReactNode;
}) {
  const size = `min(${width}px, calc(100vw - 2rem))`;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent style={{ width: size, maxWidth: size }} className="modal-maxh flex flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 pr-6 text-lg font-semibold">{icon}{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}

export function CancelButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <Button type="button" variant="outline" onClick={onClick} disabled={disabled}>Cancel</Button>;
}
