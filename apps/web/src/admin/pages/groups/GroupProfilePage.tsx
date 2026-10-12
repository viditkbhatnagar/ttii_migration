import { useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarDays, Eye, MoreHorizontal, Network, Pencil, ShieldCheck, Target, TrendingUp, UserCheck, Users, UsersRound, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, StatBox } from '../../shared/components/ui-kit.js';
import { istYmd } from '../../shared/utils/ist-date.js';
import { formatYmd } from '../counsellor/staff-model.js';
import { toGroupDetail, topAndLowest, type GroupTeam } from '../teams/org-model.js';
import {
  HeaderStat, InfoRow, OrgApplicationsTable, OrgStatusPill, PerformerList, SectionCard, SectionTabs,
} from '../teams/org-ui.js';
import { ComparisonCard, TrendCard } from '../teams/org-charts.js';
import { useOrgActions } from '../teams/use-org-actions.js';
import { GroupFormDialog, ManageTeamsDialog } from './group-dialogs.js';

// Group profile (Naji's GroupProfile, TTII 2026-10-12): header with the
// group's real numbers, then Overview / Teams / Performance / Applications /
// Students. KPIs are the applications of every counsellor in the group's
// teams. Organisational only.
// NOT copied: Targets tab, Active Target, Pending Reg. Fee and Revenue (need
// product decisions); Activity Timeline (no history is recorded for groups);
// "Transfer Group" is the Group Manager field of Edit Group.

type Tab = 'overview' | 'teams' | 'performance' | 'applications' | 'students';

function groupIdFromPath(): string {
  return /^\/admin\/groups\/view\/(\d+)/.exec(window.location.pathname)?.[1] ?? '';
}

const ymd = (iso: string) => formatYmd(istYmd(iso)) || '—';

export default function GroupProfilePage({ api, session, onNavigate }: AdminPageProps) {
  const id = useMemo(groupIdFromPath, []);
  const { data, loading, error, reload } = useAdminPageData(
    () => (id ? api.loadCounsellorGroup(session.token, id) : Promise.reject(new Error('Group not found.'))),
    [id],
  );
  const actions = useOrgActions(api, session.token);
  const [tab, setTab] = useState<Tab>('overview');
  const [dialog, setDialog] = useState<'edit' | 'teams' | null>(null);
  const detail = useMemo(() => (data ? toGroupDetail(data) : null), [data]);
  const back = () => onNavigate('/admin/groups/index');

  if (loading) return <PageLoader label="Loading group..." />;
  if (error || !detail) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error || 'Group not found.'}
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={back}>Back to Groups</Button>
            <Button variant="outline" onClick={reload}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { group, kpis, teams } = detail;
  const ranked = topAndLowest(teams.map((t) => ({ id: t.id, name: t.name, subtitle: `${t.code} · ${t.members} counsellor${t.members === 1 ? '' : 's'}`, kpis: t.kpis })));
  const viewTeam = (teamId: string) => onNavigate(`/admin/teams/view/${teamId}`);
  const viewApplication = (appId: string) => onNavigate(`/admin/applications/view/${appId}`);
  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'teams', label: 'Teams', count: teams.length },
    { id: 'performance', label: 'Performance' },
    { id: 'applications', label: 'Applications', count: kpis.applications },
    { id: 'students', label: 'Students', count: kpis.enrolled },
  ];
  const removeTeam = (t: GroupTeam) => { void actions.removeTeam(group.id, t).then((ok) => { if (ok) reload(); }); };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" onClick={back}>
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to Groups
      </Button>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-4 ring-primary/5">
              <Network aria-hidden="true" className="size-9" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{group.name}</h1>
                <OrgStatusPill status={group.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-primary">{group.code}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="size-3.5" /> Created {ymd(group.createdAt)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeaderStat icon={UserCheck} label="Group Manager" value={group.managerName || '—'} />
                <HeaderStat icon={UsersRound} label="Total Teams" value={String(teams.length)} />
                <HeaderStat icon={Users} label="Total Counsellors" value={String(group.counsellors)} />
                <HeaderStat icon={Target} label="Enrolled" value={`${kpis.enrolled} · ${kpis.conversion}%`} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialog('edit')}><Pencil aria-hidden="true" className="size-4" /> Edit Group</Button>
              <Button size="sm" className="gap-1.5" onClick={() => setDialog('teams')}><UsersRound aria-hidden="true" className="size-4" /> Manage Teams</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="size-8" aria-label={`More actions for ${group.name}`}><MoreHorizontal aria-hidden="true" className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { void actions.deleteGroup(group).then((ok) => { if (ok) back(); }); }}>
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <SectionTabs tabs={tabs} active={tab} onChange={setTab} label="Group sections" />
      </Card>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Total Teams" value={teams.length} tone="primary" />
            <StatBox label="Total Counsellors" value={group.counsellors} tone="blue" />
            <StatBox label="Total Applications" value={kpis.applications} tone="amber" />
            <StatBox label="Conversion Rate" value={`${kpis.conversion}%`} tone="emerald" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Group Information" icon={ShieldCheck}>
              <dl>
                <InfoRow label="Group Name" value={group.name} />
                <InfoRow label="Group Code" value={group.code} mono />
                <InfoRow label="Group Manager" value={group.managerName || '—'} />
                <InfoRow label="Total Teams" value={teams.length} />
                <InfoRow label="Created" value={`${ymd(group.createdAt)}${group.createdBy ? ` by ${group.createdBy}` : ''}`} />
                <InfoRow label="Status" value={<OrgStatusPill status={group.status} />} />
                {group.description ? <InfoRow label="Description" value={<span className="whitespace-pre-line">{group.description}</span>} /> : null}
              </dl>
            </SectionCard>
            <SectionCard title="Performance Snapshot" icon={TrendingUp}>
              <dl>
                <InfoRow label="Applications Handled" value={kpis.applications} />
                <InfoRow label="Enrolled (converted)" value={kpis.enrolled} />
                <InfoRow label="Pending" value={kpis.pending} />
                <InfoRow label="Rejected" value={kpis.rejected} />
                <InfoRow label="Conversion Rate" value={`${kpis.conversion}%`} />
              </dl>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'teams' && (
        <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{teams.length} team{teams.length === 1 ? '' : 's'}</p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog('teams')}><UsersRound aria-hidden="true" className="size-4" /> Assign Teams</Button>
          </div>
          {teams.length === 0 ? (
            <EmptyState icon={UsersRound} title="No teams in this group yet." action={<Button size="sm" onClick={() => setDialog('teams')}>Assign Teams</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs">Team ID</TableHead>
                    <TableHead className="text-xs">Team Name</TableHead>
                    <TableHead className="text-xs">Leader</TableHead>
                    <TableHead className="text-right text-xs">Counsellors</TableHead>
                    <TableHead className="text-right text-xs">Applications</TableHead>
                    <TableHead className="text-right text-xs">Enrolled</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{t.code}</TableCell>
                      <TableCell>
                        <button type="button" className="text-left text-sm font-semibold hover:text-primary hover:underline" onClick={() => viewTeam(t.id)}>{t.name}</button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.leaderName || '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{t.members}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{t.kpis.applications}</TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                        <span className="font-semibold">{t.kpis.enrolled}</span> <span className="text-xs text-muted-foreground">({t.kpis.conversion}%)</span>
                      </TableCell>
                      <TableCell><OrgStatusPill status={t.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="size-8" title="View team" aria-label={`View ${t.name}`} onClick={() => viewTeam(t.id)}><Eye aria-hidden="true" className="size-4" /></Button>
                          <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" title="Remove from group" aria-label={`Remove ${t.name} from the group`} onClick={() => removeTeam(t)}>
                            <X aria-hidden="true" className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {tab === 'performance' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Applications Created" value={kpis.applications} tone="primary" />
            <StatBox label="Enrolled" value={kpis.enrolled} tone="emerald" />
            <StatBox label="Pending" value={kpis.pending} tone="amber" />
            <StatBox label="Rejected" value={kpis.rejected} tone="rose" />
          </div>
          <TrendCard trend={detail.trend} />
          <ComparisonCard title="Team Comparison" icon={UsersRound} rows={teams} />
          <div className="grid gap-5 lg:grid-cols-2">
            <PerformerList title="Top Performing Teams" items={ranked.top} tone="emerald" />
            <PerformerList title="Lowest Performing Teams" items={ranked.lowest} tone="rose" />
          </div>
        </div>
      )}

      {tab === 'applications' && <OrgApplicationsTable apps={detail.applications} total={kpis.applications} onView={viewApplication} />}
      {tab === 'students' && <OrgApplicationsTable apps={detail.applications} total={kpis.applications} onView={viewApplication} studentsOnly />}

      <GroupFormDialog open={dialog === 'edit'} group={group} api={api} token={session.token} onClose={() => setDialog(null)} onSaved={reload} />
      <ManageTeamsDialog open={dialog === 'teams'} group={group} api={api} token={session.token} onClose={() => setDialog(null)} onSaved={reload} />
    </div>
  );
}
