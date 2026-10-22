import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Copy, Mail, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { LocationFields } from './LocationFields.js';
import { locationErrors } from './location-rules.js';
import {
  SOURCE_OPTIONS, leadFormOf, leadPayload, validateLeadForm,
  type LeadErrors, type LeadForm, type OnbRow,
} from './onboarding-model.js';
import { CancelButton, Field, ModalShell, SELECT_CLASS, TEXTAREA_CLASS } from './onboarding-ui.js';
import { copyText, useOnboardingAction } from './use-onboarding-action.js';

// Add / Edit Centre Lead, Send / Resend Application Form Link, Reject and
// Request Changes (Naji's LeadDialog, SendDialog, ReasonDialog). Real data:
// the lead is saved, the link is a real tokenised link and "Email" really
// sends it. Naji's plan fields Mobile (optional), District and Notes are here
// too; WhatsApp is not offered (no WhatsApp sender exists in the LMS).

interface DialogBase {
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onDone: () => void;
}

export function LeadDialog({ open, row, api, token, onClose, onDone }: DialogBase & { open: boolean; row: OnbRow | null }) {
  const [f, setF] = useState<LeadForm>(leadFormOf(row));
  const [errors, setErrors] = useState<LeadErrors>({});
  const [dup, setDup] = useState({ email: '', mobile: '' });
  const { run, busy } = useOnboardingAction(api, token);

  useEffect(() => {
    if (!open) return;
    setF(leadFormOf(row));
    setErrors({});
    setDup({ email: '', mobile: '' });
  }, [open, row]);

  // Non-blocking duplicate hint against other leads and existing centres.
  useEffect(() => {
    if (!open) return undefined;
    const email = f.email.trim();
    const mobile = f.mobile.trim();
    if (!email && !mobile) { setDup({ email: '', mobile: '' }); return undefined; }
    const handle = window.setTimeout(() => {
      api.checkCentreLeadDuplicates(token, { email, mobile, excludeId: row?.id ?? '0' })
        .then((d) => setDup({ email: typeof d.email === 'string' ? d.email : '', mobile: typeof d.mobile === 'string' ? d.mobile : '' }))
        .catch(() => setDup({ email: '', mobile: '' }));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [open, f.email, f.mobile, api, token, row]);

  const set = <K extends keyof LeadForm>(k: K, v: LeadForm[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = async () => {
    const e: LeadErrors = { ...validateLeadForm(f), ...locationErrors(f, false) };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    const res = await run(row ? 'update' : 'create', row ? { id: row.id, ...leadPayload(f) } : leadPayload(f));
    if (res) { onDone(); onClose(); }
  };

  return (
    <ModalShell
      open={open}
      width={720}
      busy={busy}
      onClose={onClose}
      icon={row ? <Pencil aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
      title={row ? 'Edit Centre Lead' : 'Add Centre Lead'}
      footer={(
        <>
          <CancelButton onClick={onClose} disabled={busy} />
          <Button type="button" disabled={busy} onClick={() => { void save(); }}>{busy ? 'Saving...' : row ? 'Save Changes' : 'Add Lead'}</Button>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Centre Name" htmlFor="lead-centre" required error={errors.centreName}>
          <Input id="lead-centre" value={f.centreName} maxLength={250} aria-invalid={Boolean(errors.centreName)} onChange={(e) => set('centreName', e.target.value)} />
        </Field>
        <Field label="Contact Name" htmlFor="lead-contact" required error={errors.contactName}>
          <Input id="lead-contact" value={f.contactName} maxLength={150} aria-invalid={Boolean(errors.contactName)} onChange={(e) => set('contactName', e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="lead-email" required error={errors.email}>
          <Input id="lead-email" type="email" value={f.email} maxLength={50} aria-invalid={Boolean(errors.email)} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Mobile" htmlFor="lead-mobile" error={errors.mobile}>
          <Input id="lead-mobile" type="tel" value={f.mobile} maxLength={20} aria-invalid={Boolean(errors.mobile)} onChange={(e) => set('mobile', e.target.value)} />
        </Field>
        <LocationFields
          idPrefix="lead"
          value={{ country: f.country, state: f.state, district: f.district }}
          errors={{ country: errors.country, state: errors.state, district: errors.district }}
          onChange={(loc) => { setF((s) => ({ ...s, ...loc })); setErrors((e) => ({ ...e, country: undefined, state: undefined, district: undefined })); }}
        />
        <Field label="Source" htmlFor="lead-source" required error={errors.source}>
          <select id="lead-source" className={SELECT_CLASS} value={f.source} aria-invalid={Boolean(errors.source)} onChange={(e) => set('source', e.target.value)}>
            <option value="" disabled>Select source</option>
            {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Notes" htmlFor="lead-notes" error={errors.notes} className="sm:col-span-2">
          <textarea id="lead-notes" rows={3} className={TEXTAREA_CLASS} value={f.notes} maxLength={2000} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      {dup.email || dup.mobile ? (
        <div role="status" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {dup.email ? <p className="flex items-center gap-2"><AlertTriangle aria-hidden="true" className="size-4 shrink-0" />This email already belongs to: {dup.email}</p> : null}
          {dup.mobile ? <p className="flex items-center gap-2"><AlertTriangle aria-hidden="true" className="size-4 shrink-0" />This mobile already belongs to: {dup.mobile}</p> : null}
        </div>
      ) : null}
    </ModalShell>
  );
}

/**
 * Send / Resend Application Form Link. "Email" emails a NEW link; "Copy Link"
 * creates a NEW link and copies it. Either way every earlier link stops
 * working. The link already out (if any) is shown with its own Copy button.
 */
export function SendLinkDialog({ open, row, api, token, onClose, onDone }: DialogBase & { open: boolean; row: OnbRow | null }) {
  const [current, setCurrent] = useState('');
  const { run, busy } = useOnboardingAction(api, token);
  const resend = Boolean(row?.linkSentAt);

  useEffect(() => {
    if (!open || !row) return undefined;
    setCurrent('');
    if (!row.linkSentAt) return undefined;
    let alive = true;
    api.loadCentreOnboardingRecord(token, row.id)
      .then((d) => {
        const link = d.link && typeof d.link === 'object' ? (d.link as Record<string, unknown>) : null;
        if (alive && link && link.open === true && typeof link.url === 'string') setCurrent(link.url);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [open, row, api, token]);

  if (!row) return null;

  const send = async (via: 'email' | 'copy') => {
    const res = await run('send_link', { id: row.id, via }, { quiet: true });
    if (!res) return;
    const link = typeof res.link === 'string' ? res.link : '';
    onDone();
    if (via === 'copy') {
      setCurrent(link);
      if (await copyText(link)) {
        toast.success(`Form link ${resend ? 'resent' : 'sent'} via Copy link (copied)`);
        onClose();
      } else {
        toast.info('The new link is below: copy it from the box.');
      }
      return;
    }
    if (res.emailDelivered === false) {
      // The link exists and works; only the email failed. Keep the dialog open on it.
      setCurrent(link);
      toast.warning('The link was created, but the email could not be sent. Copy the link below and share it.');
      return;
    }
    toast.success(`Form link ${resend ? 'resent' : 'sent'} via Email`);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      width={520}
      busy={busy}
      onClose={onClose}
      title={`${resend ? 'Resend' : 'Send'} Application Form Link`}
      footer={<Button type="button" variant="outline" onClick={onClose} disabled={busy}>Close</Button>}
    >
      <p className="text-sm text-muted-foreground">Send {row.centreName} ({row.contactName}) the centre application form.</p>
      {current ? (
        <div className="flex gap-2">
          <Input readOnly value={current} aria-label="Application form link" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" variant="outline" size="icon" aria-label="Copy link" title="Copy link" onClick={() => { void copyText(current).then((ok) => (ok ? toast.success('Link copied') : toast.info('Select the link and copy it.'))); }}>
            <Copy aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {resend ? 'The previous link is no longer open.' : 'The link is created when you send it.'}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="gap-1.5" disabled={busy} onClick={() => { void send('email'); }}>
          <Mail aria-hidden="true" className="size-4" /> Email
        </Button>
        <Button type="button" variant="outline" className="gap-1.5" disabled={busy} onClick={() => { void send('copy'); }}>
          <Copy aria-hidden="true" className="size-4" /> Copy Link
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Email sends the link to {row.email}. Both buttons create a new link; {resend ? 'the link sent earlier stops working.' : 'it stays open for 30 days.'}
      </p>
    </ModalShell>
  );
}

/** Reject (reason) or Request Changes (remarks emailed to the centre with a fresh link). */
export function ReasonDialog({ open, kind, row, api, token, onClose, onDone }: DialogBase & { open: boolean; kind: 'reject' | 'changes'; row: OnbRow | null }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const { run, busy } = useOnboardingAction(api, token);
  useEffect(() => { if (open) { setText(''); setError(''); } }, [open]);
  if (!row) return null;
  const reject = kind === 'reject';
  const submit = async () => {
    if (!text.trim()) { setError('Required'); return; }
    const res = await run(reject ? 'reject' : 'request_changes', reject ? { id: row.id, reason: text.trim() } : { id: row.id, remarks: text.trim() }, { quiet: !reject });
    if (!res) return;
    if (!reject) {
      if (res.emailDelivered === false) toast.warning(`Sent back for changes, but the email to ${row.email} could not be sent. Use Copy Link on the record to share the form.`);
      else toast.success('Sent back to centre for changes');
    }
    onDone();
    onClose();
  };
  return (
    <ModalShell
      open={open}
      width={480}
      busy={busy}
      onClose={onClose}
      title={reject ? `Reject ${row.centreName}` : 'Request Changes'}
      {...(reject ? {} : { description: 'The centre gets these remarks by email with a new link to its application.' })}
      footer={(
        <>
          <CancelButton onClick={onClose} disabled={busy} />
          <Button type="button" variant={reject ? 'destructive' : 'default'} disabled={busy} onClick={() => { void submit(); }}>{reject ? 'Reject' : 'Send Back'}</Button>
        </>
      )}
    >
      <Field label={reject ? 'Reason' : 'What should the centre change?'} htmlFor="reason-text" required error={error}>
        <textarea id="reason-text" rows={4} maxLength={2000} className={TEXTAREA_CLASS} value={text} aria-invalid={Boolean(error)} onChange={(e) => { setText(e.target.value); setError(''); }} />
      </Field>
    </ModalShell>
  );
}
