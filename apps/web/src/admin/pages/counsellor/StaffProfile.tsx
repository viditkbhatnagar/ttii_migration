import { useState } from 'react';
import {
  ArrowLeft, Briefcase, Building2, CalendarDays, FileText, GraduationCap, Mail, MoreHorizontal,
  Pencil, Phone, RefreshCw,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { Pill } from '../../shared/components/ui-kit.js';
import type { StaffKind } from './StaffFormDialog.js';
import type { TargetRow } from './counsellor-target-model.js';
import { formatYmd, initialsOf, type StaffRow } from './staff-model.js';
import { EMPTY_PROFILE_STATS, toProfileStats } from './staff-profile-model.js';
import {
  ActivityTab, ApplicationsTab, OverviewTab, PerformanceTab, StudentsTab, TargetsTab,
} from './staff-profile-tabs.js';
import type { StaffActions } from './use-staff-actions.js';
import { CounsellorOrgLine } from '../teams/CounsellorOrgLine.js';

// Counsellor / Associate profile (Naji's CounsellorProfile / AssociateProfile),
// opened from the directory. Header with contact + the same actions the list
// row has, then tabs on real data: Overview, Performance, Targets (counsellors),
// Applications, Students, Activity Timeline. Read-only apart from the existing
// row actions (Edit, Resend Login Email, Enable/Disable, Delete).

type Tab = 'overview' | 'performance' | 'targets' | 'applications' | 'students' | 'activity';

interface StaffProfileProps {
  kind: StaffKind;
  row: StaffRow;
  api: AdminPortalApi;
  token: string;
  /** The counsellor's targets (counsellors only). */
  targets?: TargetRow[];
  actions: StaffActions;
  onBack: () => void;
  onEdit: () => void;
  onNavigate: (href: string) => void;
}

export function StaffProfile({ kind, row, api, token, targets, actions, onBack, onEdit, onNavigate }: StaffProfileProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const noun = kind === 'counsellor' ? 'Counsellor' : 'Associate';
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadStaffProfileStats(token, kind === 'counsellor' ? 'counsellor' : 'associates', row.id),
    [row.id, kind],
  );
  const stats = data ? toProfileStats(data) : EMPTY_PROFILE_STATS;
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    ...(targets ? [{ id: 'targets' as const, label: 'Targets' }] : []),
    { id: 'applications', label: 'Applications' },
    { id: 'students', label: 'Students' },
    { id: 'activity', label: 'Activity Timeline' },
  ];
  const conversion = stats.kpis.applications > 0 ? Math.round((stats.kpis.enrolled / stats.kpis.applications) * 100) : row.conversion;
  const viewApplication = (id: string) => onNavigate(`/admin/applications/view/${id}`);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" onClick={onBack}>
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to {noun}s
      </Button>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <Avatar className="size-20 ring-4 ring-primary/10">
              {row.photo ? <AvatarImage src={row.photo} alt="" className="object-cover" /> : null}
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">{initialsOf(row.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{row.name || 'N/A'}</h1>
                <Pill tone={row.isActive ? 'emerald' : 'rose'}>
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />{row.statusLabel}
                </Pill>
                {row.loginDisabled ? <Pill tone="rose">Login disabled</Pill> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-primary">#{row.id}</span>
                <span className="inline-flex items-center gap-1"><Briefcase aria-hidden="true" className="size-3.5" /> {noun}</span>
                {row.email ? <span className="inline-flex items-center gap-1"><Mail aria-hidden="true" className="size-3.5" /> {row.email}</span> : null}
                {row.phone ? <span className="inline-flex items-center gap-1"><Phone aria-hidden="true" className="size-3.5" /> {row.phone}</span> : null}
                {kind === 'counsellor' ? <CounsellorOrgLine api={api} token={token} userId={row.id} onNavigate={onNavigate} /> : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeaderStat icon={Building2} label="Centre" value={row.centre || '—'} />
                <HeaderStat icon={CalendarDays} label="Joined" value={formatYmd(row.joined) || '—'} />
                <HeaderStat icon={FileText} label="Applications" value={String(loading && !data ? row.applications : stats.kpis.applications)} />
                <HeaderStat icon={GraduationCap} label="Enrolled" value={`${loading && !data ? row.converted : stats.kpis.enrolled} · ${conversion}%`} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {row.email ? <Button variant="outline" size="sm" asChild><a href={`mailto:${row.email}`}><Mail aria-hidden="true" className="mr-1.5 size-4" />Email</a></Button> : null}
              <Button size="sm" className="gap-1.5" onClick={onEdit}><Pencil aria-hidden="true" className="size-4" />Edit Profile</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="size-8" aria-label={`More actions for ${row.name}`}>
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => { void actions.resendCredentials(row); }}>Resend Login Email</DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>Change Username/Password</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className={cn(!row.loginDisabled && 'text-destructive focus:text-destructive')} onClick={() => { void actions.toggleLogin(row); }}>
                    {row.loginDisabled ? 'Enable' : 'Disable'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => { void actions.remove(row).then((gone) => { if (gone) onBack(); }); }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div role="group" aria-label="Profile sections" className="flex gap-1 overflow-x-auto border-t border-border px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {error && tab !== 'overview' && tab !== 'targets' ? (
        <Card role="alert" className="items-center gap-3 border-rose-200 p-6 text-center text-sm text-rose-700">
          {error}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={reload}><RefreshCw aria-hidden="true" className="size-4" />Retry</Button>
        </Card>
      ) : loading && !data && tab !== 'overview' && tab !== 'targets' ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {tab === 'overview' ? <OverviewTab row={row} noun={noun} stats={data ? stats : { ...stats, kpis: { ...stats.kpis, applications: row.applications, enrolled: row.converted } }} /> : null}
          {tab === 'performance' ? <PerformanceTab stats={stats} /> : null}
          {tab === 'targets' && targets ? <TargetsTab targets={targets} /> : null}
          {tab === 'applications' ? <ApplicationsTab apps={stats.applications} total={stats.kpis.applications} onView={viewApplication} /> : null}
          {tab === 'students' ? <StudentsTab apps={stats.applications} total={stats.kpis.applications} enrolled={stats.kpis.enrolled} onView={viewApplication} /> : null}
          {tab === 'activity' ? <ActivityTab activity={stats.activity} /> : null}
        </>
      )}
    </div>
  );
}

function HeaderStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden="true" className="size-3" /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground" title={value}>{value}</p>
    </div>
  );
}
