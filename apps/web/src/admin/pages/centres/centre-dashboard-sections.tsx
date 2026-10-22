import { AlertTriangle, ArrowRight, Building2, Clock, FileText, IndianRupee, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pill } from '../../shared/components/ui-kit.js';
import {
  AFFILIATION_TONE, HREF, activityText, daysLeftLabel, expiryLabel, inr, istDateTime, periodLabel, pipelineBars, renewalState,
  type CentreDashboardData,
} from './centre-dashboard-model.js';
import { DashCard, DashTitle } from './centre-dashboard-ui.js';

// KPI row, pipeline, action list and the three bottom lists of the Centre
// Dashboard (Naji's CentreDashboardModule), on the /admin/centres/dashboard
// payload. Every card that navigates is a real button.

type Go = (href: string) => void;

interface KpiDef { icon: LucideIcon; label: string; value: string; sub: string; href: string }

// Each sub-line says its scope: the selected period, or "All time".
function kpiDefs(d: CentreDashboardData): KpiDef[] {
  const k = d.kpis;
  const inPeriod = periodLabel(d.period).toLowerCase();
  return [
    { icon: Building2, label: 'Total Centres', value: String(k.totalCentres), sub: `${k.activeCentres} active · ${k.inactiveCentres} inactive`, href: HREF.directory },
    { icon: Users, label: 'Total Enrollments', value: k.enrollments.toLocaleString('en-IN'), sub: 'All time · across selected centres', href: HREF.directory },
    { icon: FileText, label: 'Applications in progress', value: String(k.inProgress), sub: `Lead to Approval Waiting · ${inPeriod}`, href: HREF.applications },
    { icon: Clock, label: 'Awaiting TTII Approval', value: String(k.awaitingApproval), sub: 'All time · needs your decision', href: HREF.applications },
    { icon: IndianRupee, label: 'Collected from Centres', value: inr(k.collected), sub: `Wallet top-ups + affiliation fees · ${inPeriod}`, href: HREF.topUps },
    { icon: Wallet, label: 'Total Wallet Balance', value: inr(k.walletTotal), sub: `${k.pendingTopUps} pending top-ups`, href: HREF.wallets },
  ];
}

export function KpiRow({ data, onNavigate }: { data: CentreDashboardData; onNavigate: Go }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {kpiDefs(data).map((k) => (
        <button
          key={k.label}
          type="button"
          onClick={() => onNavigate(k.href)}
          className="group rounded-2xl border border-border bg-card p-5 text-left shadow-[var(--shadow-soft)] transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-safe:hover:-translate-y-0.5"
        >
          <span className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <k.icon aria-hidden="true" className="size-5" />
            </span>
            <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          </span>
          <span className="mt-4 block text-2xl font-semibold tracking-tight tabular-nums text-foreground">{k.value}</span>
          <span className="mt-1 block text-xs font-medium text-foreground">{k.label}</span>
          <span className="block text-[11px] text-muted-foreground">{k.sub}</span>
        </button>
      ))}
    </div>
  );
}

export function PipelineCard({ data, onNavigate }: { data: CentreDashboardData; onNavigate: Go }) {
  const bars = pipelineBars(data.pipeline);
  return (
    <DashCard className="lg:col-span-2">
      <DashTitle aside={<span className="text-[11px] text-muted-foreground">Centre applications created {periodLabel(data.period).toLowerCase()}</span>}>
        Application pipeline
      </DashTitle>
      <div className="space-y-2.5">
        {bars.map((p) => (
          <button
            key={p.stage}
            type="button"
            onClick={() => onNavigate(HREF.applications)}
            className="flex w-full items-center gap-3 rounded-lg px-1 py-0.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="w-32 shrink-0 text-xs text-muted-foreground sm:w-36">{p.label}</span>
            <span className="h-6 flex-1 overflow-hidden rounded-md bg-muted" aria-hidden="true">
              <span className={cn('block h-full rounded-md transition-[width] duration-700', p.barClass)} style={{ width: `${p.width}%` }} />
            </span>
            <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">{p.count} · {p.pct}%</span>
          </button>
        ))}
      </div>
    </DashCard>
  );
}

export function ActionCard({ data, onNavigate }: { data: CentreDashboardData; onNavigate: Go }) {
  const a = data.actions;
  const items = [
    { n: a.awaitingApproval, text: 'applications waiting for TTII approval', href: HREF.applications },
    { n: a.pendingTopUps, text: 'wallet top-up requests pending', href: HREF.pendingTopUps },
    { n: a.expiringSoon, text: 'affiliations expiring in 60 days', href: HREF.affiliation },
    { n: a.expired, text: 'affiliations already expired', href: HREF.directory },
  ];
  return (
    <DashCard>
      <DashTitle>Action needed</DashTitle>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.text} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="flex items-center gap-2.5">
              <AlertTriangle aria-hidden="true" className={cn('size-4 shrink-0', it.n ? 'text-amber-600' : 'text-muted-foreground')} />
              <span className="text-sm"><span className="font-semibold tabular-nums">{it.n}</span> {it.text}</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => onNavigate(it.href)} aria-label={`Go: ${it.text}`}>Go</Button>
          </li>
        ))}
      </ul>
    </DashCard>
  );
}

export function RenewalsCard({ data, onNavigate }: { data: CentreDashboardData; onNavigate: Go }) {
  return (
    <DashCard>
      <DashTitle aside={<span className="text-[11px] text-muted-foreground">Active centres</span>}>Affiliation renewals due</DashTitle>
      {data.renewals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No affiliation expiry dates on record.</p>
      ) : (
        <ul className="space-y-2.5">
          {data.renewals.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">
                <button type="button" onClick={() => onNavigate(HREF.centre(r.id))} className="block truncate font-medium hover:text-primary hover:underline">
                  {r.name || '—'}
                </button>
                <span className="block text-xs text-muted-foreground">{expiryLabel(r.expiry)}</span>
              </span>
              <Pill tone={AFFILIATION_TONE[renewalState(r.daysLeft)]}>{daysLeftLabel(r.daysLeft)}</Pill>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
}

export function LowWalletsCard({ data, onNavigate }: { data: CentreDashboardData; onNavigate: Go }) {
  return (
    <DashCard>
      <DashTitle aside={<span className="text-[11px] text-muted-foreground">Active centres</span>}>Low wallet balances (under ₹5,000)</DashTitle>
      {data.lowWallets.length === 0 ? (
        <p className="text-sm text-muted-foreground">All wallets are healthy.</p>
      ) : (
        <ul className="space-y-2.5">
          {data.lowWallets.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 text-sm">
              <button type="button" onClick={() => onNavigate(HREF.centre(w.id))} className="min-w-0 truncate text-left font-medium hover:text-primary hover:underline">
                {w.name || '—'}
              </button>
              <span className="shrink-0 font-semibold tabular-nums text-destructive">{inr(w.balance)}</span>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
}

export function ActivityCard({ data }: { data: CentreDashboardData }) {
  return (
    <DashCard>
      <DashTitle>Recent activity</DashTitle>
      {data.activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-2.5">
          {data.activity.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="truncate">
                <span className="font-medium">{e.who || '—'}</span>{' '}
                {e.ref ? <span className="text-muted-foreground">({e.ref})</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">{activityText(e)} · {istDateTime(e.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
}
