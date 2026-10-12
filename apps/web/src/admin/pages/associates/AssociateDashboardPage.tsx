import { useMemo, useRef } from 'react';
import { ArrowRight, GraduationCap, IndianRupee, ShieldCheck, Trophy, UserCheck, UserPlus, Users } from 'lucide-react';
import { EChart } from '@/components/EChart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { AssocAvatar, LoadError, StatCard } from './associate-mgmt-ui.js';
import { toDashboard, trendChartOption, type DashboardTrendPoint } from './associate-mgmt-model.js';
import { useThemeColors } from './use-theme-colors.js';

// Admin → Associate Management → Dashboard, after Naji's
// AssociateDashboardModule (TTII 2026-10-12). Real data only:
//   - KPIs: live associates, Active (users.status = 1, as the directory's pill),
//     leads created this IST month, lifetime enrolments (is_converted = 1);
//   - Leads vs Enrolments over the last 6 IST months;
//   - Top performers by enrolments with conversion %.
// Not shown: Commission Paid / Pending and per-person "earned" — there are no
// commission rules or payouts in the LMS, so a card links to the Commissions
// set-up page instead. Naji's "Onboarding requests awaiting review" needs an
// onboarding approval flow we do not have; its card links to Onboarding.

export default function AssociateDashboardPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssociateDashboard(session.token),
    [],
    'associate-dashboard',
  );
  const d = useMemo(() => toDashboard(data ?? {}), [data]);
  const hasTrend = d.trend.some((t) => t.leads > 0 || t.enrolments > 0);

  if (loading && !data) return <PageLoader label="Loading associate dashboard..." />;
  if (error) return <LoadError message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageTitle title="Associate Dashboard" subtitle="Freelance counsellor performance at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Associates" value={d.kpis.total} icon={Users} />
        <StatCard label="Active" value={d.kpis.active} hint={`${d.kpis.total - d.kpis.active} inactive`} icon={UserCheck} />
        <StatCard label="Leads this month" value={d.kpis.leadsThisMonth} icon={UserPlus} />
        <StatCard label="Enrolments" value={d.kpis.enrolments} hint={`${d.kpis.enrolmentsThisMonth} this month`} icon={GraduationCap} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)] lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Leads vs Enrolments (last 6 months)</h2>
          {hasTrend ? (
            <TrendChart trend={d.trend} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No associate leads in the last 6 months.</p>
          )}
        </Card>

        <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy aria-hidden="true" className="size-4 text-muted-foreground" />Top Performers
          </h2>
          {d.top.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No associate has a lead yet.</p>
          ) : (
            <ol className="space-y-3">
              {d.top.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <AssocAvatar name={p.name} photo={p.photo} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.applications} lead{p.applications === 1 ? '' : 's'} · {p.conversion}% conv.</p>
                  </div>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">{p.enrolled}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">enrolled</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NotSetUpCard
          icon={IndianRupee}
          title="Commissions not set up yet"
          body="Commission rules, approvals and payouts are not in the LMS yet, so no commission figures are shown. The Commissions page lists the confirmed enrolments they would be calculated on."
          action="Open Commissions"
          onClick={() => onNavigate('/admin/associates/commissions')}
        />
        <NotSetUpCard
          icon={ShieldCheck}
          title="Onboarding review not set up yet"
          body="There is no KYC or approval step for new associates yet. The Onboarding page lists every associate account with when it was created and first signed in."
          action="Open Onboarding"
          onClick={() => onNavigate('/admin/associates/onboarding')}
        />
      </div>
    </div>
  );
}

/** Leads vs Enrolments on the shared ECharts wrapper, coloured from the theme tokens. */
function TrendChart({ trend }: { trend: DashboardTrendPoint[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const colors = useThemeColors(ref);
  const option = useMemo(() => trendChartOption(trend, colors), [trend, colors]);
  const summary = trend.map((t) => `${t.label}: ${t.leads} leads, ${t.enrolments} enrolments`).join('; ');
  return (
    <div ref={ref}>
      <EChart option={option} className="h-64 w-full" ariaLabel={`Leads and enrolments per month for the last six months. ${summary}`} />
    </div>
  );
}

function NotSetUpCard({ icon: Icon, title, body, action, onClick }: {
  icon: typeof Users; title: string; body: string; action: string; onClick: () => void;
}) {
  return (
    <Card className="gap-0 border-dashed border-border p-5 shadow-none">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{body}</p>
          <Button variant="link" size="sm" className="mt-1 h-auto gap-1 px-0" onClick={onClick}>
            {action} <ArrowRight aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
