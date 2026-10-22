import { useState } from 'react';
import { Building2, Eye, EyeOff, Headset, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatYmd } from '../../layout/centre-shell-model.js';
import { maskNumber, type ProfileData } from './centre-profile-model.js';

function Field({ label, value, children }: { label: string; value?: string | undefined; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 break-words text-sm font-medium">{children ?? (value || '—')}</div>
    </div>
  );
}

/** A number shown masked, with a Reveal / Hide toggle. */
function SensitiveField({ label, value }: { label: string; value: string }) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label}>
      {value ? (
        <span className="flex items-center gap-2">
          <span className="font-mono tabular-nums">{shown ? value : maskNumber(value)}</span>
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={`${shown ? 'Hide' : 'Reveal'} ${label}`}
            className="inline-flex items-center gap-1 rounded text-xs font-normal text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {shown ? <EyeOff aria-hidden="true" className="h-3.5 w-3.5" /> : <Eye aria-hidden="true" className="h-3.5 w-3.5" />}
            {shown ? 'Hide' : 'Reveal'}
          </button>
        </span>
      ) : '—'}
    </Field>
  );
}

export function ProfileCentreTab({ profile, onContactSupport }: { profile: ProfileData; onContactSupport: () => void }) {
  const { centre, kyc } = profile;
  const address = [centre.address, kyc?.city, kyc?.pincode ? `– ${kyc.pincode}` : ''].filter(Boolean).join(', ').replace(', –', ' –');
  const place = [centre.district, centre.state].filter(Boolean).join(', ');
  return (
    <div className="space-y-4">
      <p role="note" className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        To change these details, contact TTII support.
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-6 p-6 lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
              <Building2 aria-hidden="true" className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{centre.name || 'Centre'}</h2>
              <p className="text-sm text-muted-foreground">{[centre.code && `Centre ID ${centre.code}`, kyc?.entityType].filter(Boolean).join(' · ')}</p>
            </div>
            <Badge variant="outline" className={centre.active ? 'ml-auto border-transparent bg-success-soft text-success' : 'ml-auto border-transparent bg-muted text-muted-foreground'}>
              {centre.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal Entity" value={kyc?.legalEntityName} />
            <Field label="Entity Type" value={kyc?.entityType} />
            <Field label="Address" value={address} />
            <Field label="District / State" value={place} />
            <Field label="GSTIN" value={kyc?.gstin} />
            <Field label="PAN" value={kyc?.pan} />
            <SensitiveField label="Aadhaar / ID Number" value={kyc?.idNumber ?? ''} />
            <Field label="Registered On" value={centre.registrationDate ? formatYmd(centre.registrationDate) : ''} />
          </div>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-semibold">Contact Person</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name" value={[centre.contactPerson, centre.designation && `(${centre.designation})`].filter(Boolean).join(' ')} />
              <Field label="Phone" value={centre.phone} />
              <Field label="Email" value={centre.email} />
            </div>
          </div>
          {!profile.kycReady ? <p className="text-xs text-muted-foreground">KYC details are not available yet.</p> : null}
        </Card>
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Landmark aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Bank Details</p>
          </div>
          <Field label="Account Name" value={kyc?.bankAccountName} />
          <SensitiveField label="Account Number" value={kyc?.bankAccountNumber ?? ''} />
          <Field label="IFSC" value={kyc?.bankIfsc} />
          <Field label="Bank / Branch" value={[kyc?.bankName, kyc?.bankBranch].filter(Boolean).join(', ')} />
          <Button variant="outline" className="w-full gap-2" onClick={onContactSupport}>
            <Headset aria-hidden="true" className="h-4 w-4" /> Contact TTII support
          </Button>
          <p className="text-[11px] text-muted-foreground">Centre and bank details are managed by TTII.</p>
        </Card>
      </div>
    </div>
  );
}
