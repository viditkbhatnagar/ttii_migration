import { Loader2, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { COUNTRY_NAMES, districtsFor, statesFor } from '@/lib/location-tree';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '../../shared/components/SearchableSelect.js';
import { ENTITY_TYPES, UPLOAD_ACCEPT, fileLabel, isRequired, type FormKey, type FormMode } from './centre-form-model.js';
import type { CentreFormController } from './use-centre-form.js';

// The Add / Edit Centre sections, field for field from Naji's AddCentreDialog:
// Centre & Entity, Address, Contact Person, Identity, Tax Details, Bank Details
// (Optional). Rendered inside the dialog and on the /add, /edit/:id pages.
// Grids follow the CONTAINER (the dialog body), not the viewport.

const FIELD_ERROR = 'mt-0.5 text-[11px] text-destructive';
const SELECT_CLASS = 'mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @3xl:grid-cols-3">{children}</div>
    </section>
  );
}

function RequiredMark({ on }: { on: boolean }) {
  return on ? <span className="text-destructive"> *</span> : null;
}

interface FieldsProps {
  ctl: CentreFormController;
  mode: FormMode;
  idPrefix: string;
}

export function CentreFormFields({ ctl, mode, idPrefix }: FieldsProps) {
  const { form: f, errors, set } = ctl;
  const req = (k: FormKey) => isRequired(k, mode);
  const fid = (k: FormKey) => `${idPrefix}-${k}`;

  const field = (k: FormKey, label: string, opts: { placeholder?: string; upper?: boolean; span?: string; type?: string; inputMode?: 'numeric' | 'email' | 'tel' } = {}) => (
    <div className={opts.span}>
      <Label htmlFor={fid(k)} className="text-xs">{label}<RequiredMark on={req(k)} /></Label>
      <Input
        id={fid(k)}
        value={f[k]}
        type={opts.type ?? 'text'}
        {...(opts.inputMode ? { inputMode: opts.inputMode } : {})}
        placeholder={opts.placeholder}
        onChange={(e) => set(k, opts.upper ? e.target.value.toUpperCase() : e.target.value)}
        className={cn('mt-1 h-9', errors[k] && 'border-destructive')}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${fid(k)}-error` : undefined}
      />
      {errors[k] ? <p id={`${fid(k)}-error`} className={FIELD_ERROR}>{errors[k]}</p> : null}
    </div>
  );

  const docUpload = (k: FormKey, label: string) => {
    const busy = !!ctl.uploading[k];
    return (
      <div>
        <Label htmlFor={fid(k)} className="text-xs">{label}<RequiredMark on={req(k)} /></Label>
        <label
          className={cn(
            'mt-1 flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50 focus-within:ring-2 focus-within:ring-primary/40',
            errors[k] && 'border-destructive',
          )}
        >
          {busy ? <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" /> : <Upload aria-hidden="true" className="size-4 shrink-0" />}
          <span className={cn('truncate', f[k] && 'text-foreground')}>
            {busy ? 'Uploading…' : f[k] ? fileLabel(f[k]) : 'Upload file (PDF or image)'}
          </span>
          <input
            id={fid(k)}
            type="file"
            accept={UPLOAD_ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={(e) => { void ctl.upload(k, e.target.files?.[0]); e.target.value = ''; }}
          />
        </label>
        {f[k] && !busy ? (
          <div className="mt-1 flex items-center gap-3">
            <a href={f[k]} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-primary hover:underline">View file</a>
            <button type="button" onClick={() => set(k, '')} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <X aria-hidden="true" className="size-3" /> Remove file
            </button>
          </div>
        ) : null}
        {errors[k] ? <p className={FIELD_ERROR}>{errors[k]}</p> : null}
      </div>
    );
  };

  const states = statesFor(f.country);
  const districts = districtsFor(f.country, f.state);
  const location = (k: 'country' | 'state' | 'district', label: string, options: readonly string[], disabled: boolean, placeholder: string) => (
    <div>
      <SearchableSelect
        label={`${label}${req(k) ? ' *' : ''}`}
        value={f[k]}
        options={[...options]}
        strict={options.length > 0}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(v) => ctl.pickLocation(k, v)}
      />
      {errors[k] ? <p className={FIELD_ERROR}>{errors[k]}</p> : null}
    </div>
  );

  return (
    <div className="@container space-y-6">
      <Section title="Centre & Entity">
        {field('centreId', 'Centre ID', { placeholder: 'e.g. TTC0002', upper: true })}
        {field('name', 'Centre Name')}
        {mode.kycReady ? field('legalEntity', 'Legal Entity Name') : null}
        {mode.kycReady ? (
          <div>
            <Label htmlFor={fid('entityType')} className="text-xs">Entity Type<RequiredMark on={req('entityType')} /></Label>
            <select
              id={fid('entityType')}
              value={f.entityType}
              onChange={(e) => set('entityType', e.target.value)}
              className={cn(SELECT_CLASS, !f.entityType && 'text-muted-foreground', errors.entityType && 'border-destructive')}
              aria-invalid={!!errors.entityType}
            >
              <option value="">Select type</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.entityType ? <p className={FIELD_ERROR}>{errors.entityType}</p> : null}
          </div>
        ) : null}
        {docUpload('registrationDoc', 'Registration Document')}
        <div>
          <Label htmlFor={fid('affiliationExpiry')} className="text-xs">Affiliation Expiry</Label>
          <div className="mt-1">
            <DmyDateInput
              id={fid('affiliationExpiry')}
              value={f.affiliationExpiry}
              onChange={(iso) => set('affiliationExpiry', iso)}
              maxYear={new Date().getFullYear() + 15}
              className="h-9"
            />
          </div>
          {errors.affiliationExpiry ? <p className={FIELD_ERROR}>{errors.affiliationExpiry}</p> : null}
        </div>
      </Section>

      <Section title="Address">
        {field('address1', 'Address Line 1', { span: '@lg:col-span-2 @3xl:col-span-3' })}
        {location('country', 'Country', COUNTRY_NAMES, false, 'Select country')}
        {location('state', 'State', states, !f.country, f.country ? 'Select state' : 'Select country first')}
        {location('district', 'District', districts, !f.state, f.state ? 'Select district' : 'Select state first')}
        {mode.kycReady ? field('city', 'City') : null}
        {mode.kycReady ? field('pin', 'PIN Code', f.country === 'India' ? { placeholder: '6 digits', inputMode: 'numeric' } : { placeholder: 'Postal code' }) : null}
      </Section>

      <Section title="Contact Person">
        {field('contactName', 'Contact Name')}
        {field('designation', 'Designation')}
        {field('mobile', 'Contact Mobile', { placeholder: f.country === 'India' ? '10 digits' : '7–15 digits', type: 'tel', inputMode: 'tel' })}
        {field('email', 'Contact Email', { span: '@lg:col-span-2 @3xl:col-span-1', type: 'email', inputMode: 'email' })}
      </Section>

      {mode.kycReady ? (
        <>
          <Section title="Identity (Aadhaar / Passport / PAN)">
            {field('idNumber', 'Aadhaar / Passport No.')}
            {docUpload('idDoc', 'Upload Aadhaar / Passport')}
            {field('pan', 'PAN', { upper: true, placeholder: 'AAAAA0000A' })}
            {docUpload('panDoc', 'Upload PAN')}
          </Section>

          <Section title="Tax Details">
            {field('gstin', 'GSTIN', { upper: true, placeholder: '22AAAAA0000A1Z5' })}
          </Section>

          <Section title="Bank Details (Optional)">
            {field('accountName', 'Account Name')}
            {field('accountNumber', 'Account Number', { inputMode: 'numeric' })}
            {field('ifsc', 'IFSC', { upper: true, placeholder: 'SBIN0001234' })}
            {field('bank', 'Bank Name')}
            {field('branch', 'Branch')}
          </Section>
        </>
      ) : null}
    </div>
  );
}
