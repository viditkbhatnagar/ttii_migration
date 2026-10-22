import { useRef, useState } from 'react';
import { Camera, FileText, GraduationCap, Loader2, Mail, MapPin, Pencil, Power, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { initialsOf, inr0, locationLine, type CentreProfile } from '../centre-profile-model.js';
import { CentreStatusPill } from '../centre-ui.js';
import { StatTile } from './profile-ui.js';

// The profile hero (Naji's CentreProfileModule header card): logo, "Centre ·
// {code}", name, status, entity type, location, Edit / Email / Activate-
// Deactivate, and the four stat tiles. The logo is stored in centre_kyc.logo.

const LOGO_MAX_BYTES = 8 * 1024 * 1024;

function CentreLogo({
  api, token, centreId, name, logo, canEdit, onSaved,
}: { api: AdminPortalApi; token: string; centreId: string; name: string; logo: string; canEdit: boolean; onSaved: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choose a JPG or PNG image.'); return; }
    if (file.size > LOGO_MAX_BYTES) { toast.error('Image must be 8 MB or smaller.'); return; }
    setBusy(true);
    try {
      const { url } = await api.uploadFile(token, file);
      const res = await api.setCentreLogo(token, centreId, url);
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative size-20 shrink-0">
      <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary/10 text-xl font-bold text-primary shadow-sm">
        {logo ? <img src={logo} alt={`${name} logo`} className="size-full object-cover" /> : <span aria-hidden="true">{initialsOf(name)}</span>}
      </div>
      {canEdit ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label={logo ? 'Change centre logo' : 'Upload centre logo'}
            title={logo ? 'Change logo' : 'Upload logo'}
            className="absolute -bottom-1.5 -right-1.5 flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Camera aria-hidden="true" className="size-4" />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label="Choose a centre logo"
            onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }}
          />
        </>
      ) : null}
    </div>
  );
}

export function ProfileHero({
  api, token, profile, activeCohorts, docsOnFile, onEdit, onToggleStatus, onLogoSaved,
}: {
  api: AdminPortalApi;
  token: string;
  profile: CentreProfile;
  activeCohorts: number;
  docsOnFile: number;
  onEdit: () => void;
  onToggleStatus: () => void;
  onLogoSaved: () => void;
}) {
  const c = profile.centre;
  const where = locationLine(c);
  const active = c.status === 'active';
  return (
    <Card className="relative gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--primary) 8%, transparent), color-mix(in oklab, var(--primary) 4%, transparent) 55%, transparent)' }}
      />
      <div className="relative grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <CentreLogo
            api={api}
            token={token}
            centreId={c.id}
            name={c.name}
            logo={profile.kyc?.logo ?? ''}
            canEdit={profile.kycReady}
            onSaved={onLogoSaved}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Centre · {c.code || '—'}</p>
            <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-foreground">{c.name || 'Centre'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CentreStatusPill status={c.status} dot />
              {profile.kyc?.entityType ? (
                <span className="rounded-full border border-border bg-card/70 px-2 py-0.5 text-[11px] font-medium text-foreground">{profile.kyc.entityType}</span>
              ) : null}
              {where ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3" />{where}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" className="gap-1.5" onClick={onEdit}><Pencil aria-hidden="true" className="size-4" /> Edit Centre</Button>
              {c.email ? (
                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                  <a href={`mailto:${c.email}`}><Mail aria-hidden="true" className="size-4" /> Email</a>
                </Button>
              ) : null}
              <Button size="sm" variant={active ? 'outline' : 'default'} className={cn('gap-1.5')} onClick={onToggleStatus}>
                <Power aria-hidden="true" className="size-4" /> {active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:w-auto md:grid-cols-2">
          <StatTile icon={GraduationCap} label="Enrollment" value={profile.students.length} />
          <StatTile icon={Users} label="Active Cohorts" value={activeCohorts} />
          <StatTile icon={Wallet} label="Wallet" value={inr0(c.walletBalance)} />
          <StatTile icon={FileText} label="Docs On File" value={docsOnFile} />
        </div>
      </div>
    </Card>
  );
}
