import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Building2, CalendarClock, ClipboardList, CreditCard, FileText, GraduationCap, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { istTodayYmd } from '../cohorts/list-model.js';
import { DIRECTORY_QUERY_KEY, directoryHref } from './centre-directory-model.js';
import type { CentreStatus } from './centre-list-model.js';
import { activeCohortCount, docsOnFile, toProfile } from './centre-profile-model.js';
import { CentreFormDialog, SetupNotice, type CentreFormTarget } from './CentreFormDialog.js';
import { useCentreActions } from './use-centre-actions.js';
import { ActivityTab } from './profile/ActivityTab.js';
import { ApplicationsTab } from './profile/ApplicationsTab.js';
import { CohortsTab } from './profile/CohortsTab.js';
import { DocumentsTab } from './profile/DocumentsTab.js';
import { FeesTab } from './profile/FeesTab.js';
import { OverviewTab } from './profile/OverviewTab.js';
import { ProfileHero } from './profile/ProfileHero.js';
import { StudentsTab } from './profile/StudentsTab.js';
import { WalletTab } from './profile/WalletTab.js';

// Centre Profile 360 (Naji 2026-10-22, CentreProfileModule) at
// /admin/centres/view/:id. One call (GET /admin/centres/profile) feeds the
// hero and every tab with REAL data. Not shown, because nothing real backs
// them: the prototype's Offerings tab (centres have no offerings of their own
// yet) and its student Certificates tab (no issued-certificate records exist).

type TabId = 'overview' | 'fees' | 'applications' | 'students' | 'cohorts' | 'wallet' | 'documents' | 'activity';
const TAB_IDS: readonly TabId[] = ['overview', 'fees', 'applications', 'students', 'cohorts', 'wallet', 'documents', 'activity'];

function centreIdFromPath(): string {
  const m = /\/admin\/centres\/view\/([^/?#]+)/.exec(window.location.pathname);
  return m?.[1] ? decodeURIComponent(m[1]) : '';
}

function tabFromQuery(): TabId {
  const t = new URLSearchParams(window.location.search).get('tab') ?? '';
  return (TAB_IDS as readonly string[]).includes(t) ? (t as TabId) : 'overview';
}

function directoryBackHref(): string {
  try {
    return directoryHref(window.sessionStorage.getItem(DIRECTORY_QUERY_KEY) ?? '');
  } catch {
    return directoryHref('');
  }
}

export default function ViewCentrePage({ api, session, onNavigate }: AdminPageProps) {
  const centreId = useMemo(centreIdFromPath, []);
  const [tab, setTab] = useState<TabId>(tabFromQuery);
  const [formTarget, setFormTarget] = useState<CentreFormTarget | null>(null);
  const [statusOverride, setStatusOverride] = useState<{ base: unknown; status: CentreStatus } | null>(null);
  const actions = useCentreActions(api, session.token);
  const today = istTodayYmd();

  const { data, loading, error, reload } = useAdminPageData(
    async () => toProfile(await api.loadCentreProfile(session.token, centreId)),
    [centreId],
    `admin:centres:profile:${centreId}`,
  );

  // The open tab lives in the URL, so a refresh or a shared link lands on it.
  useEffect(() => {
    const url = tab === 'overview' ? window.location.pathname : `${window.location.pathname}?tab=${tab}`;
    window.history.replaceState(window.history.state, '', url);
  }, [tab]);

  const profile = useMemo(() => {
    if (!data) return null;
    if (statusOverride && statusOverride.base === data) return { ...data, centre: { ...data.centre, status: statusOverride.status } };
    return data;
  }, [data, statusOverride]);

  const back = () => onNavigate(directoryBackHref());

  if (loading) return <PageLoader label="Loading centre..." />;
  if (error || !profile) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error || 'Centre not found.'}
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={back}>Back to Centre Directory</Button>
            <Button variant="outline" onClick={reload}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const c = profile.centre;
  const edit = () => setFormTarget({ mode: 'edit', centreId, profile });
  const toggleStatus = async () => {
    const next = await actions.toggleStatus({ id: centreId, name: c.name, status: c.status, loginUserId: profile.login?.userId ?? '', loginEmail: profile.login?.email ?? c.email });
    if (next) { setStatusOverride({ base: data, status: next }); reload(); }
  };

  const tabs: Array<{ id: TabId; label: string; icon: LucideIcon; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'fees', label: 'Course & Fee Structure', icon: CreditCard, count: profile.plans.length },
    { id: 'applications', label: 'Applications', icon: ClipboardList, count: profile.applications.length },
    { id: 'students', label: 'Students', icon: GraduationCap, count: profile.students.length },
    { id: 'cohorts', label: 'Cohorts', icon: Users, count: profile.cohorts.length },
    { id: 'wallet', label: 'Wallet', icon: Wallet, count: profile.transactions.length + profile.fundRequests.length },
    { id: 'documents', label: 'Documents', icon: FileText, count: profile.documents.length },
    { id: 'activity', label: 'Activity', icon: CalendarClock },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back to Centre Directory"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>
        <nav aria-label="Breadcrumb" className="min-w-0 text-xs text-muted-foreground">
          <button type="button" onClick={back} className="hover:text-foreground">Centre Directory</button>
          <span aria-hidden="true" className="mx-1.5">/</span>
          <span aria-current="page" className="font-medium text-foreground">{c.name || c.code}</span>
        </nav>
      </div>

      {profile.kycReady ? null : <SetupNotice text={profile.notice} />}

      <ProfileHero
        api={api}
        token={session.token}
        profile={profile}
        activeCohorts={activeCohortCount(profile.cohorts)}
        docsOnFile={docsOnFile(profile.documents)}
        onEdit={edit}
        onToggleStatus={() => void toggleStatus()}
        onLogoSaved={reload}
      />

      <div className="rounded-2xl border border-border bg-muted/40 p-1.5">
        <div role="tablist" aria-label="Centre profile sections" className="flex gap-1 overflow-x-auto sm:flex-wrap">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  on ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-card hover:text-foreground',
                )}
              >
                <t.icon aria-hidden="true" className="size-4" />
                {t.label}
                {typeof t.count === 'number' ? (
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', on ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{t.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel">
        {tab === 'overview' ? <OverviewTab profile={profile} today={today} onEdit={edit} /> : null}
        {tab === 'fees' ? <FeesTab plans={profile.plans} /> : null}
        {tab === 'applications' ? <ApplicationsTab applications={profile.applications} /> : null}
        {tab === 'students' ? <StudentsTab students={profile.students} onOpen={(id) => onNavigate(`/admin/students/view/${id}`)} /> : null}
        {tab === 'cohorts' ? <CohortsTab cohorts={profile.cohorts} onOpen={(id) => onNavigate(`/admin/cohorts/view/${id}`)} /> : null}
        {tab === 'wallet' ? <WalletTab balance={profile.walletBalance} transactions={profile.transactions} fundRequests={profile.fundRequests} /> : null}
        {tab === 'documents' ? (
          <DocumentsTab
            api={api}
            token={session.token}
            centreId={centreId}
            centreName={c.name}
            documents={profile.documents}
            canUpload={profile.kycReady}
            onChanged={reload}
          />
        ) : null}
        {tab === 'activity' ? <ActivityTab activity={profile.activity} /> : null}
      </div>

      <CentreFormDialog
        api={api}
        token={session.token}
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={() => { setFormTarget(null); reload(); }}
      />
    </div>
  );
}
