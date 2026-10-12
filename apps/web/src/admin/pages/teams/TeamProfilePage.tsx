import { useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, Building2, CalendarDays, MoreHorizontal, Pencil, ShieldCheck, Target, TrendingUp,
  UserCheck, UserMinus, Users, UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, Pill, StatBox } from '../../shared/components/ui-kit.js';
import { istDateTime, istYmd } from '../../shared/utils/ist-date.js';
import { formatYmd } from '../counsellor/staff-model.js';
import { toTeamDetail, topAndLowest, type TeamMember } from './org-model.js';
import {
  HeaderStat, InfoRow, OrgApplicationsTable, OrgStatusPill, PerformerList, SectionCard, SectionTabs,
} from './org-ui.js';
import { ComparisonCard, TrendCard } from './org-charts.js';
import { ManageMembersDialog, TeamFormDialog } from './team-dialogs.js';
import { useOrgActions } from './use-org-actions.js';

// Team profile (Naji's TeamProfile, TTII 2026-10-12): header with the team's
// real numbers, then Overview / Members / Performance / Applications /
// Students / Activity Timeline. KPIs come from the members' applications
// (applications.pipeline_user). Organisational only.
// NOT copied: Targets tab, Monthly Target, Pending Reg. Fee and Revenue
// (team targets and revenue attribution need product decisions); "Transfer
// Team" is the Parent Group field of Edit Team. Activity shows what is
// recorded: when the team was created and when each member joined.

type Tab = 'overview' | 'members' | 'performance' | 'applications' | 'students' | 'activity';

function teamIdFromPath(): string {
  return /^\/admin\/teams\/view\/(\d+)/.exec(window.location.pathname)?.[1] ?? '';
}

const ymd = (iso: string) => formatYmd(istYmd(iso)) || '—';

export default function TeamProfilePage({ api, session, onNavigate }: AdminPageProps) {
  const id = useMemo(teamIdFromPath, []);
  const { data, loading, error, reload } = useAdminPageData(
    () => (id ? api.loadCounsellorTeam(session.token, id) : Promise.reject(new Error('Team not found.'))),
    [id],
  );
  const actions = useOrgActions(api, session.token);
  const [tab, setTab] = useState<Tab>('overview');
  const [dialog, setDialog] = useState<'edit' | 'members' | null>(null);
  const detail = useMemo(() => (data ? toTeamDetail(data) : null), [data]);
  const back = () => onNavigate('/admin/teams/index');

  if (loading) return <PageLoader label="Loading team..." />;
  if (error || !detail) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error || 'Team not found.'}
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={back}>Back to Teams</Button>
            <Button variant="outline" onClick={reload}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { team, kpis } = detail;
  const current = detail.members.filter((m) => m.current);
  const ranked = topAndLowest(current.map((m) => ({ id: m.id, name: m.name, subtitle: m.email || m.phone || `#${m.id}`, kpis: m.kpis })));
  const viewApplication = (appId: string) => onNavigate(`/admin/applications/view/${appId}`);
  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members', count: current.length },
    { id: 'performance', label: 'Performance' },
    { id: 'applications', label: 'Applications', count: kpis.applications },
    { id: 'students', label: 'Students', count: kpis.enrolled },
    { id: 'activity', label: 'Activity Timeline' },
  ];
  const removeMember = (m: TeamMember) => { void actions.removeMember(team.id, m).then((ok) => { if (ok) reload(); }); };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" onClick={back}>
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to Teams
      </Button>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-4 ring-primary/5">
              <UsersRound aria-hidden="true" className="size-9" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{team.name}</h1>
                <OrgStatusPill status={team.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-primary">{team.code}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="size-3.5" /> Created {ymd(team.createdAt)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeaderStat icon={UserCheck} label="Team Leader" value={team.leaderName || '—'} />
                <HeaderStat icon={Building2} label="Parent Group" value={team.groupName || 'No group'} />
                <HeaderStat icon={Users} label="Total Counsellors" value={String(current.length)} />
                <HeaderStat icon={Target} label="Enrolled" value={`${kpis.enrolled} · ${kpis.conversion}%`} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialog('edit')}><Pencil aria-hidden="true" className="size-4" /> Edit Team</Button>
              <Button size="sm" className="gap-1.5" onClick={() => setDialog('members')}><UsersRound aria-hidden="true" className="size-4" /> Manage Members</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="size-8" aria-label={`More actions for ${team.name}`}><MoreHorizontal aria-hidden="true" className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => { void actions.deleteTeam({ id: team.id, name: team.name, members: current.length }).then((ok) => { if (ok) back(); }); }}
                  >
                    Delete Team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <SectionTabs tabs={tabs} active={tab} onChange={setTab} label="Team sections" />
      </Card>

      {tab !== 'members' && tab !== 'activity' ? (
        <p className="-mt-3 text-xs text-muted-foreground">Figures cover current members only.</p>
      ) : null}

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Total Counsellors" value={current.length} tone="primary" />
            <StatBox label="Total Applications" value={kpis.applications} tone="blue" />
            <StatBox label="Pending Applications" value={kpis.pending} tone="amber" />
            <StatBox label="Conversion Rate" value={`${kpis.conversion}%`} tone="emerald" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Team Information" icon={ShieldCheck}>
              <dl>
                <InfoRow label="Team Name" value={team.name} />
                <InfoRow label="Team Code" value={team.code} mono />
                <InfoRow label="Team Leader" value={team.leaderName || '—'} />
                <InfoRow label="Parent Group" value={team.groupName || 'No group'} />
                <InfoRow label="Created" value={`${ymd(team.createdAt)}${team.createdBy ? ` by ${team.createdBy}` : ''}`} />
                <InfoRow label="Status" value={<OrgStatusPill status={team.status} />} />
                {team.description ? <InfoRow label="Description" value={<span className="whitespace-pre-line">{team.description}</span>} /> : null}
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

      {tab === 'members' && (
        <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{current.length} counsellor{current.length === 1 ? '' : 's'}</p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog('members')}><UsersRound aria-hidden="true" className="size-4" /> Add Members</Button>
          </div>
          {detail.members.length === 0 ? (
            <EmptyState icon={Users} title="No counsellors in this team yet." action={<Button size="sm" onClick={() => setDialog('members')}>Add Members</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs">Counsellor</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Joined Team</TableHead>
                    <TableHead className="text-right text-xs">Applications</TableHead>
                    <TableHead className="text-right text-xs">Enrolled</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.members.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="text-sm font-semibold">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">{m.email || `#${m.id}`}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{m.phone || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{ymd(m.joinedAt)}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{m.kpis.applications}</TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                        <span className="font-semibold">{m.kpis.enrolled}</span> <span className="text-xs text-muted-foreground">({m.kpis.conversion}%)</span>
                      </TableCell>
                      <TableCell>
                        {!m.current ? <Pill tone="slate">No longer a counsellor</Pill> : m.loginDisabled ? <Pill tone="rose">Login disabled</Pill> : <Pill tone="emerald">Active</Pill>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" title="Remove from team" aria-label={`Remove ${m.name} from the team`} onClick={() => removeMember(m)}>
                          <UserMinus aria-hidden="true" className="size-4" />
                        </Button>
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
          <ComparisonCard title="Counsellor Comparison" icon={Users} rows={current} firstWord />
          <div className="grid gap-5 lg:grid-cols-2">
            <PerformerList title="Top Performers" items={ranked.top} tone="emerald" />
            <PerformerList title="Lowest Performers" items={ranked.lowest} tone="rose" />
          </div>
        </div>
      )}

      {tab === 'applications' && <OrgApplicationsTable apps={detail.applications} total={kpis.applications} onView={viewApplication} />}
      {tab === 'students' && <OrgApplicationsTable apps={detail.applications} total={kpis.applications} onView={viewApplication} studentsOnly />}

      {tab === 'activity' && (
        <SectionCard title="Activity Timeline" icon={Activity}>
          {detail.activity.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded yet.</p> : (
            <ol className="relative space-y-4 border-l-2 border-border pl-6">
              {detail.activity.map((a) => (
                <li key={a.id} className="relative">
                  <span aria-hidden="true" className="absolute -left-[33px] grid size-7 place-items-center rounded-full bg-primary/10 text-primary ring-4 ring-card">
                    {a.type === 'joined' ? <Users className="size-3.5" /> : <UsersRound className="size-3.5" />}
                  </span>
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground">{istDateTime(a.at) || '—'}</p>
                    </div>
                    {a.detail ? <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      )}

      <TeamFormDialog open={dialog === 'edit'} team={team} api={api} token={session.token} onClose={() => setDialog(null)} onSaved={reload} />
      <ManageMembersDialog open={dialog === 'members'} team={team} api={api} token={session.token} onClose={() => setDialog(null)} onSaved={reload} />
    </div>
  );
}
