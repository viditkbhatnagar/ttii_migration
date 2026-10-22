import { CalendarClock, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatYmd } from '../../layout/centre-shell-model.js';
import {
  countdown, currentAgreement, daysBetweenYmd, periodUsedPct, type AffiliationStatus, type ProfileAgreement, type ProfileData,
} from './centre-profile-model.js';

const STATUS_CLASS: Record<AffiliationStatus, string> = {
  Active: 'bg-success-soft text-success',
  'Pending Renewal': 'bg-warning-soft text-warning-foreground',
  Expired: 'bg-destructive/10 text-destructive',
};
const TONE_CLASS = { success: 'text-success', warning: 'text-warning-foreground', danger: 'text-destructive', neutral: 'text-muted-foreground' } as const;

function Field({ label, value, tone }: { label: string; value: string; tone?: keyof typeof TONE_CLASS }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-sm font-medium', tone && TONE_CLASS[tone])}>{value || '—'}</p>
    </div>
  );
}

function FileLinks({ url, name }: { url: string; name: string }) {
  if (!url) return <span className="text-xs text-muted-foreground">No file</span>;
  return (
    <span className="flex gap-2">
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />View</a>
      </Button>
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a href={url} download={name || undefined} target="_blank" rel="noopener noreferrer"><Download aria-hidden="true" className="h-3.5 w-3.5" />Download</a>
      </Button>
    </span>
  );
}

function AgreementCard({ agreement, today }: { agreement: ProfileAgreement; today: string }) {
  const c = countdown(daysBetweenYmd(today, agreement.expiryDate));
  const used = periodUsedPct(agreement.effectiveDate, agreement.expiryDate, today);
  return (
    <Card className="space-y-5 p-6 lg:col-span-2">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="font-semibold">TTII Affiliation Agreement</p>
          <p className="truncate text-xs text-muted-foreground">{agreement.agreementNo}</p>
        </div>
        <Badge variant="outline" className={cn('ml-auto border-transparent', STATUS_CLASS[agreement.status])}>{agreement.status}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Valid From" value={agreement.effectiveDate ? formatYmd(agreement.effectiveDate) : ''} />
        <Field label="Valid Until" value={agreement.expiryDate ? formatYmd(agreement.expiryDate) : ''} />
        <Field label="Days Remaining" value={c.text} tone={c.tone} />
      </div>
      {used !== null ? (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Agreement period used</span><span>{used}%</span></div>
          <Progress value={used} aria-label="Agreement period used" />
        </div>
      ) : null}
      <FileLinks url={agreement.fileUrl} name={agreement.fileName} />
    </Card>
  );
}

export function ProfileAffiliationTab({ profile }: { profile: ProfileData }) {
  const agreement = currentAgreement(profile);
  const { agreements, certificates, expiry, daysLeft } = profile.affiliation;
  const overall = countdown(daysLeft);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {agreement ? <AgreementCard agreement={agreement} today={profile.today} /> : (
          <Card className="space-y-2 p-6 lg:col-span-2">
            <p className="font-semibold">TTII Affiliation Agreement</p>
            <p className="text-sm text-muted-foreground">No signed agreement is on file yet. TTII adds it to your profile once it is signed.</p>
            {expiry ? <p className="text-sm">Affiliation valid until <span className="font-medium">{formatYmd(expiry)}</span> · <span className={TONE_CLASS[overall.tone]}>{overall.text}</span></p> : null}
          </Card>
        )}
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2"><CalendarClock aria-hidden="true" className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold">Agreement History</p></div>
          {agreements.length === 0 ? <p className="text-sm text-muted-foreground">No agreements yet.</p> : agreements.map((a) => (
            <div key={a.id} className="flex items-start gap-3 text-sm">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium">{a.agreementNo}</p>
                <p className="text-xs text-muted-foreground">{formatYmd(a.effectiveDate)} → {formatYmd(a.expiryDate)} · {a.status}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card className="space-y-3 p-6">
        <p className="text-sm font-semibold">Affiliation Certificates</p>
        {certificates.length === 0 ? <p className="text-sm text-muted-foreground">No affiliation certificate has been issued yet.</p> : (
          <ul className="divide-y divide-border">
            {certificates.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.certificateNo}</p>
                  <p className="text-xs text-muted-foreground">{formatYmd(c.validFrom)} → {formatYmd(c.validTo)}</p>
                </div>
                <Badge variant="outline" className={cn('border-transparent', c.status === 'Valid' ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive')}>{c.status}</Badge>
                <FileLinks url={c.fileUrl} name={c.certificateNo} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
