import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Award, FileSignature, Upload, X } from 'lucide-react';
import { addAgreementTerm, istTodayYmd } from '@ttii/shared-types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { messageFromError } from '../../../shared/utils/admin-data-utils.js';
import {
  agreementFileError, agreementPayload, emptyAgreementForm, fmtDate, validateAgreementForm,
  type AgreementErrors, type AgreementForm, type OnbDetail,
} from './onboarding-model.js';
import { CancelButton, Field, ModalShell, SELECT_CLASS, TEXTAREA_CLASS } from './onboarding-ui.js';
import { useOnboardingAction } from './use-onboarding-action.js';

// Upload Signed Agreement and Generate Affiliation Certificate (Naji's
// AgreementDialog + CertDialog). Real: the PDF is stored, the agreement is
// numbered AGR-YYYY-### by the server, and "Issue & Complete Onboarding"
// creates the centre, its login and the certificate PDF. The signed-on date
// and both signatories (in Naji's plan, missing from the prototype dialog)
// are captured; "Fee paid" asks for the date it was paid.

interface DialogBase {
  open: boolean;
  detail: OnbDetail | null;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onDone: () => void;
}

function useNextNumbers(api: AdminPortalApi, token: string, open: boolean) {
  const [numbers, setNumbers] = useState({ agreementNo: '', certificateNo: '' });
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    api.loadAffiliationNumbers(token)
      .then((d) => {
        if (alive) setNumbers({ agreementNo: typeof d.agreementNo === 'string' ? d.agreementNo : '', certificateNo: typeof d.certificateNo === 'string' ? d.certificateNo : '' });
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [api, token, open]);
  return numbers;
}

export function AgreementDialog({ open, detail, api, token, onClose, onDone }: DialogBase) {
  const today = istTodayYmd();
  const thisYear = Number(today.slice(0, 4));
  const [f, setF] = useState<AgreementForm>(emptyAgreementForm(today));
  const [errors, setErrors] = useState<AgreementErrors>({});
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { agreementNo } = useNextNumbers(api, token, open);
  const { run, busy } = useOnboardingAction(api, token);
  const record = detail?.record;

  useEffect(() => {
    if (!open) return;
    setF(emptyAgreementForm(istTodayYmd(), record?.contactName ?? ''));
    setErrors({});
  }, [open, record?.contactName]);

  if (!record) return null;
  const expiry = addAgreementTerm(f.effectiveDate, Number(f.term));
  const set = <K extends keyof AgreementForm>(k: K, v: AgreementForm[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const choose = async (file: File | undefined) => {
    if (!file) return;
    const bad = agreementFileError(file);
    if (bad) { setErrors((e) => ({ ...e, file: bad })); return; }
    setUploading(true);
    try {
      const up = await api.uploadCentreAgreementFile(token, record.id, file);
      setF((s) => ({ ...s, fileUrl: up.url, fileName: up.name, fileSig: up.sig }));
      setErrors((e) => ({ ...e, file: undefined }));
    } catch (err: unknown) {
      setErrors((e) => ({ ...e, file: messageFromError(err) }));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async () => {
    const e = validateAgreementForm(f, today);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    const res = await run('upload_agreement', agreementPayload(record.id, f));
    if (res) { onDone(); onClose(); }
  };

  return (
    <ModalShell
      open={open}
      width={760}
      busy={busy || uploading}
      onClose={onClose}
      icon={<FileSignature aria-hidden="true" className="size-4" />}
      title={`Upload Signed Agreement — ${record.centreName}`}
      footer={(
        <>
          <CancelButton onClick={onClose} disabled={busy} />
          <Button type="button" disabled={busy || uploading} onClick={() => { void save(); }}>{busy ? 'Saving...' : 'Save & Continue'}</Button>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Agreement No. (auto)" htmlFor="agr-no">
          <Input id="agr-no" readOnly value={agreementNo} placeholder="Assigned on save" />
        </Field>
        <Field label="Effective Date" htmlFor="agr-effective" required error={errors.effectiveDate}>
          <DmyDateInput id="agr-effective" value={f.effectiveDate} maxYear={thisYear + 5} onChange={(v) => set('effectiveDate', v)} />
        </Field>
        <Field label="Term" htmlFor="agr-term">
          <select id="agr-term" className={SELECT_CLASS} value={f.term} onChange={(e) => set('term', e.target.value)}>
            {['1', '2', '3', '5'].map((t) => <option key={t} value={t}>{t} Year{t === '1' ? '' : 's'}</option>)}
          </select>
        </Field>
        <Field label="Expiry Date (auto)" htmlFor="agr-expiry">
          <Input id="agr-expiry" readOnly value={expiry ? fmtDate(expiry) : ''} />
        </Field>
        <Field label="Signed on" htmlFor="agr-signed" error={errors.signedOn}>
          <DmyDateInput id="agr-signed" value={f.signedOn} onChange={(v) => set('signedOn', v)} />
        </Field>
        <Field label="Affiliation Fee (₹)" htmlFor="agr-fee" required error={errors.fee}>
          <Input id="agr-fee" type="number" min={0} step="0.01" inputMode="decimal" value={f.fee} aria-invalid={Boolean(errors.fee)} onChange={(e) => set('fee', e.target.value)} />
        </Field>
        <Field label="TTII signatory" htmlFor="agr-ttii">
          <Input id="agr-ttii" value={f.ttiiSignatory} maxLength={150} onChange={(e) => set('ttiiSignatory', e.target.value)} />
        </Field>
        <Field label="Centre signatory" htmlFor="agr-centre">
          <Input id="agr-centre" value={f.centreSignatory} maxLength={150} onChange={(e) => set('centreSignatory', e.target.value)} />
        </Field>
        <div className="grid content-end gap-2 pb-1">
          <div className="flex items-center gap-2">
            <Checkbox id="agr-paid" checked={f.feePaid} onCheckedChange={(v) => set('feePaid', v === true)} />
            <Label htmlFor="agr-paid" className="text-sm">Fee paid</Label>
          </div>
        </div>
        {f.feePaid ? (
          <Field label="Paid on" htmlFor="agr-paid-on" required error={errors.feePaidOn}>
            <DmyDateInput id="agr-paid-on" value={f.feePaidOn} onChange={(v) => set('feePaidOn', v)} />
          </Field>
        ) : null}
      </div>
      <Field label="Signed Agreement (PDF, max 10 MB)" required error={errors.file}>
        {f.fileUrl ? (
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <FileSignature aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">{f.fileName}</span>
            <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Remove file" onClick={() => setF((s) => ({ ...s, fileUrl: '', fileName: '', fileSig: '' }))}>
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ) : (
          <label className={cn('flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/40', errors.file ? 'border-destructive' : 'border-border')}>
            <Upload aria-hidden="true" className="size-4" />
            {uploading ? 'Uploading...' : 'Choose file'}
            <input ref={fileInput} type="file" accept="application/pdf" className="sr-only" disabled={uploading} onChange={(e) => { void choose(e.target.files?.[0]); }} />
          </label>
        )}
      </Field>
      <Field label="Notes" htmlFor="agr-notes">
        <textarea id="agr-notes" rows={2} maxLength={2000} className={TEXTAREA_CLASS} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </ModalShell>
  );
}

export function CertificateDialog({ open, detail, api, token, onClose, onDone }: DialogBase) {
  const { certificateNo } = useNextNumbers(api, token, open);
  const { run, busy } = useOnboardingAction(api, token);
  const [error, setError] = useState('');
  useEffect(() => { if (open) setError(''); }, [open]);
  if (!detail) return null;
  const r = detail.record;
  const a = detail.agreement;
  const location = [r.district || detail.form?.city || '', r.state].filter(Boolean).join(', ');

  const issue = async () => {
    if (!a?.effectiveDate || !a.expiryDate) { setError('Agreement dates are missing'); return; }
    const res = await run('complete', { id: r.id }, { quiet: true });
    if (!res) return;
    toast.success(`${r.centreName} onboarded — added to Centre Directory`);
    if (res.emailDelivered === false) toast.warning(`The login details could not be emailed to ${r.email}. The centre can use Forgot Password on admissions.teachersindia.in to set a password.`);
    else toast.success(`Login details emailed to ${r.email}`);
    if (res.pdfReady === false) toast.warning('The certificate PDF could not be generated yet: use Regenerate PDF on the certificate.');
    onDone();
    onClose();
  };

  return (
    <ModalShell
      open={open}
      width={900}
      busy={busy}
      onClose={onClose}
      icon={<Award aria-hidden="true" className="size-4" />}
      title="Generate Affiliation Certificate"
      footer={(
        <>
          <CancelButton onClick={onClose} disabled={busy} />
          <Button type="button" className="gap-1.5" disabled={busy} onClick={() => { void issue(); }}>
            <Award aria-hidden="true" className="size-4" />{busy ? 'Issuing...' : 'Issue & Complete Onboarding'}
          </Button>
        </>
      )}
    >
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Field label="Certificate Number" htmlFor="cert-no"><Input id="cert-no" readOnly value={certificateNo} placeholder="Assigned on issue" /></Field>
          <Field label="Centre Name" htmlFor="cert-centre"><Input id="cert-centre" readOnly value={r.centreName} /></Field>
          <Field label="Centre Code" htmlFor="cert-code"><Input id="cert-code" readOnly value={r.centreCode || '—'} /></Field>
          <Field label="District and State" htmlFor="cert-loc"><Input id="cert-loc" readOnly value={location} /></Field>
          <Field label="Valid From" htmlFor="cert-from"><Input id="cert-from" readOnly value={a ? fmtDate(a.effectiveDate) : ''} /></Field>
          <Field label="Valid To" htmlFor="cert-to"><Input id="cert-to" readOnly value={a ? fmtDate(a.expiryDate) : ''} /></Field>
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          <p className="text-xs text-muted-foreground">Issuing creates the centre in the Centre Directory and emails its login to {r.email}.</p>
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Preview</p>
          <div aria-label="Affiliation certificate preview" className="flex aspect-[210/297] w-full flex-col items-center justify-between border-4 border-double border-primary/40 bg-card p-6 text-center">
            <div className="w-full">
              <Award aria-hidden="true" className="mx-auto size-10 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">TTII</p>
              <p className="mt-2 text-xs uppercase text-muted-foreground">Affiliation Certificate</p>
            </div>
            <div className="w-full space-y-4">
              <p className="text-xs text-muted-foreground">This is to certify that</p>
              <p className="break-words text-xl font-semibold">{r.centreName}</p>
              <p className="text-xs text-muted-foreground">{location}</p>
              <p className="text-xs font-medium">Centre Code: {r.centreCode || '—'}</p>
              <p className="text-sm">is an affiliated centre of TTII.</p>
            </div>
            <div className="w-full space-y-2 text-[11px] text-muted-foreground">
              <p>Certificate Number: {certificateNo || '—'}</p>
              <p>Valid {a ? fmtDate(a.effectiveDate) : '—'} – {a ? fmtDate(a.expiryDate) : '—'}</p>
              <p>Agreement {a?.agreementNo ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
