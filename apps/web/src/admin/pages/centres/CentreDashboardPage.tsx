import { useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { FilterSelect } from '../students/list-chrome.js';
import { RevenueTrendCard, EnrollmentsCard } from './centre-dashboard-charts.js';
import { PERIOD_OPTIONS, toCentreDashboard, type DashboardPeriod } from './centre-dashboard-model.js';
import { ActionCard, ActivityCard, KpiRow, LowWalletsCard, PipelineCard, RenewalsCard } from './centre-dashboard-sections.js';
import { TopCentresCard } from './centre-dashboard-top-centres.js';

// Centre Dashboard (Naji 2026-10-22, CentreDashboardModule): TTII's overview
// across all centres — KPIs, the centre application pipeline, what needs
// action, money received, enrolments, the top-centres table, renewals, low
// wallets and recent activity. Everything comes from ONE read
// (GET /admin/centres/dashboard) and is narrowed by the Period (rolling 31 /
// 92 / 366 IST days) and Centre selects. Real data only: where the prototype
// fabricated a figure (a revenue baseline, per-application payments to TTII)
// the card shows the closest real source, labelled as such.

export default function CentreDashboardPage({ api, session, onNavigate }: AdminPageProps) {
  const [period, setPeriod] = useState<DashboardPeriod>('year');
  const [centreId, setCentreId] = useState('');

  const { data, loading, error, reload } = useAdminPageData(
    async () => toCentreDashboard(await api.loadCentreDashboard(session.token, { period, ...(centreId ? { centreId } : {}) })),
    [period, centreId],
    `admin:centres:dashboard:${period}:${centreId || 'all'}`,
  );

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Centre Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of all centres, applications, payments and affiliations.</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        {loading && data ? <RefreshCw aria-label="Updating" className="size-4 animate-spin text-muted-foreground" /> : null}
        <select
          aria-label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-36"
        >
          {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <FilterSelect
          label="Centre"
          value={centreId}
          onChange={setCentreId}
          allLabel="All centres"
          options={(data?.centres ?? []).map((c) => ({ value: String(c.id), label: c.name || c.code }))}
          className="w-full sm:w-52"
        />
      </div>
    </div>
  );

  if (loading && !data) return <DashboardLoader label="centre dashboard" />;
  if (error && !data) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
            {error}
            <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      {header}

      {!data.affiliationReady ? (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {data.affiliationMessage || 'Affiliation records are not set up yet.'} Affiliation expiry comes from the centre record only,
            and no affiliation fees are counted.
          </span>
        </p>
      ) : null}

      <KpiRow data={data} onNavigate={onNavigate} />

      <div className="grid gap-4 lg:grid-cols-3">
        <PipelineCard data={data} onNavigate={onNavigate} />
        <ActionCard data={data} onNavigate={onNavigate} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueTrendCard trend={data.trend} />
        <EnrollmentsCard rows={data.rows} />
      </div>

      <TopCentresCard key={centreId || 'all'} rows={data.rows} onNavigate={onNavigate} />

      <div className="grid gap-4 lg:grid-cols-3">
        <RenewalsCard data={data} onNavigate={onNavigate} />
        <LowWalletsCard data={data} onNavigate={onNavigate} />
        <ActivityCard data={data} />
      </div>
    </div>
  );
}
