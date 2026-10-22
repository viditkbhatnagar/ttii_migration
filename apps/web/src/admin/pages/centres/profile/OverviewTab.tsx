import { useState } from 'react';
import {
  Building2, CalendarClock, CheckCircle2, Eye, EyeOff, GraduationCap, Landmark, Mail, MapPin, Pencil, Phone, ShieldCheck, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { expiryInfo } from '../centre-directory-model.js';
import { hasBankDetails, inr2, maskTail, type CentreProfile } from '../centre-profile-model.js';
import { InfoCard, InfoRow } from './profile-ui.js';

// Overview: Contact Person, Entity & Legal, Affiliation & Status, Bank Details.
// The account number AND the Aadhaar / Passport number are masked to their
// last 4 characters, each with its own Reveal / Hide.

function Reveal({ shown, onToggle, label }: { shown: boolean; onToggle: () => void; label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 shrink-0 gap-1.5 px-2"
      aria-pressed={shown}
      aria-label={`${shown ? 'Hide' : 'Reveal'} ${label}`}
      onClick={onToggle}
    >
      {shown ? <EyeOff aria-hidden="true" className="size-3.5" /> : <Eye aria-hidden="true" className="size-3.5" />}
      {shown ? 'Hide' : 'Reveal'}
    </Button>
  );
}

export function OverviewTab({ profile, today, onEdit }: { profile: CentreProfile; today: string; onEdit: () => void }) {
  const [showAccount, setShowAccount] = useState(false);
  const [showId, setShowId] = useState(false);
  const { centre: c, kyc: k } = profile;
  const expiry = expiryInfo(c.affiliationExpiry, today);
  const expiryTone = expiry.tone === 'expired' ? 'text-rose-700' : expiry.tone === 'soon' ? 'text-amber-700' : undefined;
  const phone = c.phone ? `${c.countryCode ? `${c.countryCode.startsWith('+') ? c.countryCode : `+${c.countryCode}`} ` : ''}${c.phone}` : '';
  const idNumber = k?.idNumber ?? '';
  const account = k?.accountNumber ?? '';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoCard title="Contact Person" icon={Phone}>
        <InfoRow icon={Phone} label="Contact Name" value={`${c.contactPerson}${c.designation ? ` · ${c.designation}` : ''}`} />
        <InfoRow icon={Phone} label="Mobile" value={phone} href={c.phone ? `tel:${phone.replace(/\s/g, '')}` : undefined} />
        <InfoRow icon={Mail} label="Email" value={c.email} href={c.email ? `mailto:${c.email}` : undefined} />
        <InfoRow icon={MapPin} label="Address" value={[c.address, k?.city ?? '', k?.pin ?? ''].filter(Boolean).join(', ')} />
      </InfoCard>

      <InfoCard title="Entity & Legal" icon={Building2}>
        <InfoRow icon={Building2} label="Legal Entity Name" value={k?.legalEntity} />
        <InfoRow icon={Building2} label="Entity Type" value={k?.entityType} />
        <InfoRow icon={ShieldCheck} label="GSTIN" value={k?.gstin} />
        <InfoRow icon={ShieldCheck} label="PAN" value={k?.pan} />
        <InfoRow
          icon={ShieldCheck}
          label="Aadhaar / Passport No."
          value={idNumber ? (showId ? idNumber : maskTail(idNumber)) : ''}
          tone="font-mono"
          action={idNumber ? <Reveal shown={showId} onToggle={() => setShowId((v) => !v)} label="Aadhaar / Passport number" /> : null}
        />
      </InfoCard>

      <InfoCard title="Affiliation & Status" icon={CalendarClock}>
        <InfoRow icon={CalendarClock} label="Affiliation Expiry" value={c.affiliationExpiry ? `${expiry.label}${expiry.chip ? ` · ${expiry.chip}` : ''}` : ''} tone={expiryTone} />
        <InfoRow icon={CheckCircle2} label="Status" value={c.status === 'active' ? 'Active' : 'Inactive'} />
        <InfoRow icon={Wallet} label="Wallet Balance" value={inr2(c.walletBalance)} />
        <InfoRow icon={GraduationCap} label="Total Enrollment" value={String(profile.students.length)} />
      </InfoCard>

      <InfoCard title="Bank Details" icon={Landmark}>
        {hasBankDetails(k) && k ? (
          <>
            <InfoRow icon={Landmark} label="Account Name" value={k.accountName} />
            <InfoRow
              icon={Landmark}
              label="Account Number"
              value={account ? (showAccount ? account : maskTail(account)) : ''}
              tone="font-mono"
              action={account ? <Reveal shown={showAccount} onToggle={() => setShowAccount((v) => !v)} label="account number" /> : null}
            />
            <InfoRow icon={Landmark} label="IFSC" value={k.ifsc} />
            <InfoRow icon={Landmark} label="Bank & Branch" value={[k.bank, k.branch].filter(Boolean).join(' · ')} />
          </>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">No bank details captured for this centre yet.</p>
            <p className="text-xs text-muted-foreground">Account Name, Account Number, IFSC, Bank and Branch can be added any time from the Edit Centre form.</p>
            {profile.kycReady ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
                <Pencil aria-hidden="true" className="size-4" /> Add Bank Details
              </Button>
            ) : null}
          </div>
        )}
      </InfoCard>
    </div>
  );
}
