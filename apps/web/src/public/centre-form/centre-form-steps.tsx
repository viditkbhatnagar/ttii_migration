import { useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { CENTRE_ENTITY_TYPES, type CentreApplication, type CentreApplicationErrors, type CentreDocKey, type CentreFormDoc } from '@ttii/shared-types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationFields } from '../../admin/pages/centres/onboarding/LocationFields.js';
import type { ViewerDoc } from '../../admin/pages/centres/onboarding/onboarding-ui.js';
import { uploadCentreFormFile, uploadFileError } from './centre-form-api.js';

// The five steps of Naji's CentreApplicationForm, on real uploads.

type ValueKey = Exclude<keyof CentreApplication, CentreDocKey>;

export interface StepProps {
  form: CentreApplication;
  errors: CentreApplicationErrors;
  set: (patch: Partial<CentreApplication>) => void;
  token: string;
  onView: (d: ViewerDoc) => void;
}

function FormField({ id, label, required, error, children }: { id?: string; label: string; required?: boolean; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}{required ? <span className="text-destructive"> *</span> : null}</Label>
      {children}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function TextField({ k, label, required, type = 'text', p }: { k: ValueKey; label: string; required?: boolean; type?: string; p: StepProps }) {
  const id = `cf-${k}`;
  const numeric = k === 'pin' || k === 'accountNumber';
  return (
    <FormField id={id} label={label} required={required ?? false} error={p.errors[k]}>
      <Input
        id={id}
        className="h-11 sm:h-9"
        type={type}
        value={p.form[k]}
        aria-invalid={Boolean(p.errors[k])}
        {...(numeric ? { inputMode: 'numeric' as const } : {})}
        onChange={(e) => p.set({ [k]: e.target.value })}
      />
    </FormField>
  );
}

function UploadField({ k, label, required, p }: { k: CentreDocKey; label: string; required?: boolean; p: StepProps }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const doc = p.form[k];
  const choose = async (file: File | undefined) => {
    if (!file) return;
    const bad = uploadFileError(file);
    if (bad) { setError(bad); return; }
    setBusy(true);
    setError('');
    try {
      const uploaded: CentreFormDoc = await uploadCentreFormFile(p.token, file);
      p.set({ [k]: uploaded });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormField label={label} required={required ?? false} error={error || p.errors[k]}>
      {doc ? (
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-border px-3 py-2">
          <FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <Button type="button" variant="link" className="h-auto min-h-11 min-w-0 flex-1 justify-start p-0 sm:min-h-7" onClick={() => p.onView({ title: doc.name, subtitle: label, url: doc.url })}>
            <span className="truncate">{doc.name}</span>
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 sm:size-7" aria-label={`Remove ${label}`} onClick={() => p.set({ [k]: null })}>
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input bg-muted/30 px-3 py-4 text-xs text-muted-foreground hover:bg-muted/50 focus-within:ring-2 focus-within:ring-primary/40">
          <Upload aria-hidden="true" className="size-4 shrink-0" />
          <span>{busy ? 'Uploading...' : 'Choose PDF or image'}</span>
          <input aria-label={label} type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" disabled={busy} onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      )}
    </FormField>
  );
}

export function CentreDetailsStep(p: StepProps) {
  return (
    <>
      <TextField k="centreName" label="Centre Name" required p={p} />
      <TextField k="legalEntity" label="Legal Entity Name" required p={p} />
      <FormField id="cf-entityType" label="Entity Type" required error={p.errors.entityType}>
        <select
          id="cf-entityType"
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-9"
          value={p.form.entityType}
          aria-invalid={Boolean(p.errors.entityType)}
          onChange={(e) => p.set({ entityType: e.target.value })}
        >
          <option value="" disabled>Select entity type</option>
          {CENTRE_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </FormField>
      <UploadField k="registrationDoc" label="Registration Document" p={p} />
    </>
  );
}

export function AddressStep(p: StepProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationFields
          idPrefix="cf"
          requireDistrict
          value={{ country: p.form.country, state: p.form.state, district: p.form.district }}
          errors={{ country: p.errors.country, state: p.errors.state, district: p.errors.district }}
          onChange={(loc) => p.set(loc)}
        />
        <TextField k="city" label="City" required p={p} />
        <TextField k="pin" label="PIN / Postal Code" required p={p} />
      </div>
      <TextField k="address1" label="Address" required p={p} />
    </>
  );
}

export function ContactStep(p: StepProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField k="contactName" label="Contact Name" required p={p} />
        <TextField k="designation" label="Designation" required p={p} />
        <TextField k="mobile" label="Mobile" required type="tel" p={p} />
        <TextField k="email" label="Contact Email" required type="email" p={p} />
      </div>
      <div className="space-y-4 border-t border-border pt-5">
        <TextField k="idNumber" label="Aadhaar / Passport Number" required p={p} />
        <UploadField k="idDoc" label="Aadhaar / Passport Document" required p={p} />
        <TextField k="pan" label="PAN" required p={p} />
        <UploadField k="panDoc" label="PAN Document" required p={p} />
        <TextField k="gstin" label="GSTIN" p={p} />
      </div>
    </>
  );
}

export function BankStep(p: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField k="accountName" label="Account Name" p={p} />
      <TextField k="accountNumber" label="Account Number" p={p} />
      <TextField k="ifsc" label="IFSC" p={p} />
      <TextField k="bank" label="Bank" p={p} />
      <TextField k="branch" label="Branch" p={p} />
    </div>
  );
}

const REVIEW: Array<{ title: string; index: number; rows: Array<[string, ValueKey]> }> = [
  { title: 'Centre details', index: 0, rows: [['Centre Name', 'centreName'], ['Legal Entity', 'legalEntity'], ['Entity Type', 'entityType']] },
  { title: 'Address', index: 1, rows: [['Country', 'country'], ['State', 'state'], ['District', 'district'], ['City', 'city'], ['PIN / Postal Code', 'pin'], ['Address', 'address1']] },
  { title: 'Contact & identity', index: 2, rows: [['Contact Name', 'contactName'], ['Designation', 'designation'], ['Mobile', 'mobile'], ['Email', 'email'], ['Aadhaar / Passport', 'idNumber'], ['PAN', 'pan'], ['GSTIN', 'gstin']] },
  { title: 'Bank details', index: 3, rows: [['Account Name', 'accountName'], ['Account Number', 'accountNumber'], ['IFSC', 'ifsc'], ['Bank', 'bank'], ['Branch', 'branch']] },
];

const DOC_LABELS: Array<[CentreDocKey, string]> = [['registrationDoc', 'Registration Document'], ['idDoc', 'Aadhaar / Passport Document'], ['panDoc', 'PAN Document']];

export function ReviewStep({ p, goTo, confirmed, onConfirm }: { p: StepProps; goTo: (step: number) => void; confirmed: boolean; onConfirm: (v: boolean) => void }) {
  const docs = DOC_LABELS.map(([k, label]) => ({ label, doc: p.form[k] })).filter((d): d is { label: string; doc: CentreFormDoc } => d.doc !== null);
  return (
    <>
      {REVIEW.map((section) => (
        <section key={section.title} className="border-b border-border pb-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{section.title}</h3>
            <Button type="button" variant="link" className="h-11 px-3 text-xs sm:h-auto sm:p-0" onClick={() => goTo(section.index)}>Edit</Button>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {section.rows.map(([label, key]) => (
              <div key={key} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="break-words text-sm">{p.form[key] || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Documents</h3>
        <div className="space-y-2">
          {docs.map(({ label, doc }) => (
            <Button key={label} type="button" variant="link" className="flex h-auto min-h-11 max-w-full justify-start gap-2 p-0 sm:min-h-9" onClick={() => p.onView({ title: doc.name, subtitle: label, url: doc.url })}>
              <FileText aria-hidden="true" className="size-4 shrink-0" /><span className="truncate">{label}: {doc.name}</span>
            </Button>
          ))}
        </div>
      </section>
      <div className="flex items-start gap-3 border-t border-border pt-5">
        <Checkbox id="centre-declaration" checked={confirmed} onCheckedChange={(v) => onConfirm(v === true)} />
        <Label htmlFor="centre-declaration" className="text-sm leading-5">I confirm that the information and documents provided are accurate and authorise TTII to verify them.</Label>
      </div>
      {p.errors.declaration ? <p role="alert" className="text-xs text-destructive">{p.errors.declaration}</p> : null}
    </>
  );
}
