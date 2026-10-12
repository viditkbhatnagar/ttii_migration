import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from './wizard-model.js';

// Shared pieces of the Create / Edit Exam wizard in Naji's design: the step
// header, the "Step n of N" footer bar, notification-style switch cards,
// banners and labelled fields. Brand colour only through the theme's
// `primary`; status colours stay semantic.

export function StepHeader({ icon: Icon, title, subtitle, actions }: { icon: LucideIcon; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** The scrolling body of a step. */
export function StepBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-5 px-4 py-5 sm:px-6', className)}>{children}</div>;
}

/** Loading / empty states inside the wizard card. */
export function StepNotice({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 px-6 py-14 text-center text-sm text-muted-foreground">
      {children}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function StepLoading({ label }: { label: string }) {
  return (
    <StepNotice>
      <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
      <p>{label}</p>
    </StepNotice>
  );
}

interface FooterProps {
  step: number;
  onBack?: (() => void) | undefined;
  onSaveClose: () => void;
  onContinue: () => void;
  saving: boolean;
  closeLabel: string;
  continueLabel?: string | undefined;
  continueIcon?: LucideIcon | undefined;
  /** Disables both save buttons (e.g. while another request runs). */
  busy?: boolean | undefined;
  /** Which button shows the spinner while `saving` (Step 6 saves on Close). */
  savingTarget?: 'close' | 'continue' | undefined;
}

/** Naji's footer bar: "Step n of N" on the left, Back / Save Draft & Close / Save & Continue on the right. */
export function WizardFooter({ step, onBack, onSaveClose, onContinue, saving, closeLabel, continueLabel = 'Save & Continue', continueIcon, busy = false, savingTarget = 'continue' }: FooterProps) {
  const ContinueIcon = continueIcon ?? ArrowRight;
  const spinner = <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Saving…</>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        {onBack ? (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="size-4" /> Back
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Step <span className="font-medium text-foreground">{step}</span> of {WIZARD_STEPS.length}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onSaveClose} disabled={saving || busy}>{saving && savingTarget === 'close' ? spinner : closeLabel}</Button>
        <Button size="sm" className="gap-1.5" onClick={onContinue} disabled={saving || busy}>
          {saving && savingTarget === 'continue' ? spinner : <>{continueLabel} <ContinueIcon aria-hidden="true" className="size-4" /></>}
        </Button>
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, hint, children, className }: { label: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A read-only value styled like an input (Exam Code, Duration). */
export function ReadOnlyValue({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <div className={cn('flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-foreground', mono && 'font-mono')}>
      {children}
    </div>
  );
}

/** Naji's notification channel card: label + description + switch. */
export function SwitchCard({ id, label, desc, checked, onChange, tone = 'default' }: { id: string; label: string; desc: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; tone?: 'default' | 'warning' }) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors',
      tone === 'warning' ? 'border-amber-200 bg-amber-50' : checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
    )}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className={cn('block text-sm font-medium', tone === 'warning' ? 'text-amber-900' : 'text-foreground')}>{label}</span>
        <span className={cn('mt-0.5 block text-xs', tone === 'warning' ? 'text-amber-800' : 'text-muted-foreground')}>{desc}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export type BannerTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

const BANNER_TONE: Record<BannerTone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  neutral: 'border-border bg-muted/40 text-foreground',
};

export function Banner({ tone, icon: Icon, title, children, alert = false }: { tone: BannerTone; icon?: LucideIcon; title?: React.ReactNode; children?: React.ReactNode; alert?: boolean }) {
  return (
    <div role={alert ? 'alert' : undefined} className={cn('flex items-start gap-3 rounded-xl border p-4 text-sm', BANNER_TONE[tone])}>
      {Icon ? <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn('text-xs', title ? 'mt-0.5' : '')}>{children}</div> : null}
      </div>
    </div>
  );
}

/** Small count chip ("Bank: 60 MCQ"). */
export function Chip({ children, tone = 'neutral', title }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary'; title?: string }) {
  const cls = {
    neutral: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-800',
    danger: 'bg-rose-50 text-rose-700',
    primary: 'bg-primary/10 text-primary',
  }[tone];
  return <span title={title} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium', cls)}>{children}</span>;
}
