import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Clock, Landmark, Link2Off, MapPin, ShieldCheck, User,
} from 'lucide-react';
import {
  firstStepWithError, validateCentreApplicationStep, validateCentreApplication,
  type CentreApplication, type CentreApplicationErrors,
} from '@ttii/shared-types';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import { locationErrors } from '../../admin/pages/centres/onboarding/location-rules.js';
import { DocViewerDialog } from '../../admin/pages/centres/onboarding/DocViewerDialog.js';
import { fmtDate } from '../../admin/pages/centres/onboarding/onboarding-model.js';
import type { ViewerDoc } from '../../admin/pages/centres/onboarding/onboarding-ui.js';
import { loadCentreForm, submitCentreForm, type CentreFormState } from './centre-form-api.js';
import { AddressStep, BankStep, CentreDetailsStep, ContactStep, ReviewStep, type StepProps } from './centre-form-steps.js';

// Public centre application form (/centre-form/{token}) — Naji's
// CentreApplicationForm, made real (Centres v2, 2026-10-22): prefilled from
// the lead, real uploads, the same validation as the server, and a submit that
// moves the lead to Under Review. Invalid / expired / already-submitted links
// show a closed state. No "(Preview)" wording.

const STEPS = [
  { title: 'Centre details', icon: Building2 },
  { title: 'Address', icon: MapPin },
  { title: 'Contact & identity', icon: User },
  { title: 'Bank details', icon: Landmark },
  { title: 'Review', icon: ShieldCheck },
];

type Phase = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'form'; state: CentreFormState } | { kind: 'done'; ref: string; email: string; centreName: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30 sm:px-8 sm:py-10">
      <div className="mx-auto min-w-0 max-w-5xl overflow-hidden bg-background sm:rounded-lg sm:border sm:border-border">{children}</div>
    </div>
  );
}

function Header({ subtitle }: { subtitle: string }) {
  return (
    <header className="border-b border-border bg-card px-4 py-5 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logos/ttii-icon-color.svg" alt="" width={40} height={40} className="size-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-semibold">TTII</p>
            <p className="text-xs text-muted-foreground">Centre affiliation</p>
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Application form</span>
      </div>
      <h1 className="mt-7 text-2xl font-semibold">Centre Application</h1>
      <p className="mt-2 break-words text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}

function Message({ icon: Icon, tone, title, body }: { icon: typeof CheckCircle2; tone: 'success' | 'muted'; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center sm:py-20">
      <Icon aria-hidden="true" className={cn('mx-auto size-14', tone === 'success' ? 'text-emerald-600' : 'text-muted-foreground')} />
      <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

const CLOSED_TITLE: Record<string, string> = {
  invalid: 'This link is not valid',
  expired: 'This link has expired',
  submitted: 'Application already submitted',
  unavailable: 'The form is not available right now',
};

export default function CentreFormPage({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  useEffect(() => {
    document.title = 'Centre Application | TTII Affiliation';
    let alive = true;
    loadCentreForm(token)
      .then((state) => { if (alive) setPhase({ kind: 'form', state }); })
      .catch((err: unknown) => { if (alive) setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'The form could not be loaded.' }); });
    return () => { alive = false; };
  }, [token]);

  if (phase.kind === 'loading') return <PageLoader label="Loading your application..." />;
  if (phase.kind === 'error') {
    return <Shell><Header subtitle="Prospective centre" /><Message icon={AlertTriangle} tone="muted" title="Something went wrong" body={phase.message} /></Shell>;
  }
  if (phase.kind === 'done') {
    return (
      <Shell>
        <Header subtitle={`${phase.centreName} · ${phase.ref}`} />
        <Message icon={CheckCircle2} tone="success" title="Application submitted" body={`Thank you. TTII has received the application for ${phase.centreName} (${phase.ref}). We will review it and get in touch at ${phase.email}.`} />
      </Shell>
    );
  }
  const s = phase.state;
  if (s.state === 'closed') {
    return (
      <Shell>
        <Header subtitle="Prospective centre" />
        <Message icon={s.reason === 'expired' ? Clock : s.reason === 'submitted' ? CheckCircle2 : Link2Off} tone="muted" title={CLOSED_TITLE[s.reason] ?? CLOSED_TITLE.invalid ?? ''} body={s.message} />
      </Shell>
    );
  }
  return (
    <Wizard
      token={token}
      open={s}
      onDone={(ref, form) => setPhase({ kind: 'done', ref, email: form.email, centreName: form.centreName })}
      onClosed={(message) => setPhase({ kind: 'form', state: { state: 'closed', reason: 'submitted', message } })}
    />
  );
}

function Wizard({ token, open, onDone, onClosed }: {
  token: string;
  open: Extract<CentreFormState, { state: 'open' }>;
  onDone: (ref: string, form: CentreApplication) => void;
  onClosed: (message: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CentreApplication>(open.prefill);
  const [errors, setErrors] = useState<CentreApplicationErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [doc, setDoc] = useState<ViewerDoc | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const previous = useRef(step);

  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    heading.current?.scrollIntoView({ block: 'start' });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  const set = useCallback((patch: Partial<CentreApplication>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof CentreApplicationErrors];
      return next;
    });
  }, []);

  const stepErrors = (n: number): CentreApplicationErrors => {
    const e = validateCentreApplicationStep(n, form);
    if (n === 1) {
      const loc = locationErrors(form, true);
      for (const k of ['country', 'state', 'district'] as const) if (loc[k] && !e[k]) e[k] = loc[k];
    }
    return e;
  };

  const next = async () => {
    setNotice('');
    if (step < 4) {
      const e = stepErrors(step);
      setErrors(e);
      if (Object.keys(e).length === 0) setStep(step + 1);
      return;
    }
    const all = { ...validateCentreApplication(form, confirmed), ...stepErrors(1) };
    setErrors(all);
    const first = firstStepWithError(all);
    if (first >= 0) { setStep(first); return; }
    setSubmitting(true);
    try {
      const res = await submitCentreForm(token, form, confirmed);
      if (res.ok) { onDone(res.ref || open.ref, form); return; }
      if (Object.keys(res.errors).length > 0) {
        setErrors(res.errors);
        setNotice(res.message);
        const at = firstStepWithError(res.errors);
        if (at >= 0) setStep(at);
      } else {
        onClosed(res.message);
      }
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'The application could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const props: StepProps = { form, errors, set, token, onView: setDoc };
  const StepIcon = STEPS[step]?.icon ?? Building2;

  return (
    <Shell>
      <Header subtitle={`${open.centreName || 'Prospective centre'} · ${open.ref}`} />
      {open.remarks ? (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:px-8">
          <p className="font-semibold">TTII asked for these changes</p>
          <p className="mt-1 whitespace-pre-line">{open.remarks}</p>
        </div>
      ) : null}
      <div className="grid md:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Application steps" className="min-w-0 border-b border-border bg-muted/30 px-4 py-3 md:border-b-0 md:border-r md:p-5">
          <ol className="grid grid-cols-5 gap-2 md:grid-cols-1 md:gap-3">
            {STEPS.map((st, i) => (
              <li key={st.title} className="min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Step ${i + 1}: ${st.title}`}
                  disabled={i > step}
                  aria-current={i === step ? 'step' : undefined}
                  onClick={() => { setStep(i); setErrors({}); }}
                  className={cn('h-11 w-full justify-center gap-3 px-0 text-xs md:h-auto md:justify-start md:px-2 md:py-3', i === step && 'bg-primary/10 text-primary')}
                >
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-full border border-border', i < step && 'border-emerald-500 bg-emerald-50 text-emerald-700', i === step && 'border-primary')}>
                    {i < step ? <Check aria-hidden="true" className="size-3.5" /> : i + 1}
                  </span>
                  <span className="hidden md:inline">{st.title}</span>
                </Button>
              </li>
            ))}
          </ol>
        </nav>
        <main className="min-w-0 p-4 sm:p-8">
          <div ref={heading} tabIndex={-1} className="mb-6 flex scroll-mt-4 items-center gap-3 outline-none">
            <StepIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Step {step + 1} of 5</p>
              <h2 className="text-lg font-semibold">{STEPS[step]?.title}</h2>
            </div>
            {step === 3 ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">Optional</span> : null}
          </div>
          {notice ? <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{notice}</p> : null}
          <div className="space-y-5">
            {step === 0 ? <CentreDetailsStep {...props} /> : null}
            {step === 1 ? <AddressStep {...props} /> : null}
            {step === 2 ? <ContactStep {...props} /> : null}
            {step === 3 ? <BankStep {...props} /> : null}
            {step === 4 ? <ReviewStep p={props} goTo={setStep} confirmed={confirmed} onConfirm={(v) => { setConfirmed(v); setErrors(({ declaration: _cleared, ...rest }) => rest); }} /> : null}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5 pb-[env(safe-area-inset-bottom)]">
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0 || submitting} className="h-11 gap-2 sm:h-9">
              <ArrowLeft aria-hidden="true" className="size-4" />{step === 0 ? 'Back' : 'Previous'}
            </Button>
            <Button type="button" onClick={() => { void next(); }} disabled={submitting} className="h-11 min-w-0 gap-2 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
              {step === 4 ? (submitting ? 'Submitting...' : 'Submit Application') : step === 3 ? 'Continue to Review' : 'Continue'}
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Button>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">This link is open until {fmtDate(open.expiresAt)}.</p>
        </main>
      </div>
      <DocViewerDialog doc={doc} onClose={() => setDoc(null)} />
    </Shell>
  );
}
