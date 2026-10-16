import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, UserCog, Users, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, KpiTile, PageTitle } from '../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, SortHead } from '../students/list-chrome.js';
import {
  EMPTY_ORG_FILTERS, filterTeams, ownerOptions, sortTeams, teamCsvRows, toTeamList,
  type OrgFilters, type TeamRow, type TeamSortKey,
} from './org-model.js';
import { NotReadyNotice, OrgStatusPill } from './org-ui.js';
import { TeamFormDialog } from './team-dialogs.js';
import { useOrgActions } from './use-org-actions.js';

// Counsellor Management → Teams (Naji's TeamsModule, TTII 2026-10-12): KPI
// tiles, a filter card (search / group / status), a sortable, selectable,
// paged table with Export, Create / Edit dialogs and a profile per team.
// Organisational only — teams do not change what a counsellor can see.
// NOT copied: "Active Monthly Target" (team targets need a product decision);
// the Applications / Enrolled columns show real pipeline data instead.

const PAGE_SIZE = 10;

export default function TeamsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadCounsellorTeams(session.token), []);
  const actions = useOrgActions(api, session.token);
  const [filters, setFilters] = useState<OrgFilters>(EMPTY_ORG_FILTERS);
  const [sortKey, setSortKey] = useState<TeamSortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ team: TeamRow | null } | null>(null);

  const list = useMemo(() => toTeamList(data), [data]);
  const filtered = useMemo(() => sortTeams(filterTeams(list.teams, filters), sortKey, sortDir), [list, filters, sortKey, sortDir]);
  const groups = useMemo(() => ownerOptions(list.teams, (t) => ({ value: t.groupId, label: t.groupName })), [list]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedRows = filtered.filter((r) => selected.has(r.id));

  const set = (patch: Partial<OrgFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_ORG_FILTERS); setPage(1); };
  const onSort = (k: TeamSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const view = (id: string) => onNavigate(`/admin/teams/view/${id}`);
  const allOnPage = current.length > 0 && current.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    current.forEach((r) => { if (allOnPage) next.delete(r.id); else next.add(r.id); });
    return next;
  });
  const toggleOne = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  const exportCsv = (rows: TeamRow[]) => downloadCsv('teams.csv', toCsv(teamCsvRows(rows)));

  if (loading) return <PageLoader label="Loading teams..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Counsellor Management</p>
        <PageTitle
          title="Teams"
          subtitle="Manage teams and team leaders."
          actions={(
            <>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={() => exportCsv(selectedRows.length ? selectedRows : filtered)}>
                <Download aria-hidden="true" className="size-4" /> Export{selectedRows.length ? ` (${selectedRows.length})` : ''}
              </Button>
              <Button size="sm" className="gap-1.5" disabled={!list.ready} onClick={() => setForm({ team: null })}>
                <Plus aria-hidden="true" className="size-4" /> Create Team
              </Button>
            </>
          )}
        />
      </div>

      {!list.ready ? <NotReadyNotice message={list.message} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile icon={UsersRound} label="Total Teams" value={list.totals.teams} tone="primary" active={filters.status === ''} onClick={() => set({ status: '' })} />
        <KpiTile icon={ShieldCheck} label="Active Teams" value={list.totals.active} tone="emerald" active={filters.status === 'active'} onClick={() => set({ status: filters.status === 'active' ? '' : 'active' })} />
        <KpiTile icon={Users} label={`Counsellors in Teams (of ${list.totals.counsellors})`} value={list.totals.inTeams} tone="blue" />
        <KpiTile icon={UserCog} label="Team Leaders" value={list.totals.leaders} tone="amber" />
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_180px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search teams" placeholder="Search team, ID, leader or group…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Group" value={filters.owner} onChange={(v) => set({ owner: v })} allLabel="All Groups" options={[{ value: 'none', label: 'No group' }, ...groups]} />
          <FilterSelect label="Status" value={filters.status} onChange={(v) => set({ status: v as OrgFilters['status'] })} allLabel="All Statuses" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <Button variant="ghost" size="sm" className="justify-self-end" onClick={reset}>Clear filters</Button>
        </div>
      </Card>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="font-semibold text-foreground">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={selectedRows.length === 0} onClick={() => exportCsv(selectedRows)}>Export selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={list.teams.length === 0 ? 'No teams yet.' : 'No teams found.'}
            body={list.teams.length === 0 ? 'Create a team to group counsellors under a team leader.' : 'Try adjusting your filters.'}
            action={list.teams.length === 0
              ? (list.ready ? <Button size="sm" onClick={() => setForm({ team: null })}>Create Team</Button> : undefined)
              : <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10"><Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="w-12 text-xs">Sl No</TableHead>
                  <SortHead label="Team ID" k="code" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Team Name" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Team Leader" k="leader" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Group" k="group" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Counsellors" k="members" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Applications" k="applications" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Enrolled" k="enrolled" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((t, i) => (
                  <TableRow key={t.id} className="hover:bg-muted/30" data-state={selected.has(t.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox aria-label={`Select ${t.name}`} checked={selected.has(t.id)} onCheckedChange={(v) => toggleOne(t.id, v === true)} /></TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{t.code}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => view(t.id)} className="flex items-center gap-3 text-left hover:text-primary">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UsersRound aria-hidden="true" className="size-4" /></span>
                        <span className="max-w-[200px] truncate text-sm font-semibold" title={t.name}>{t.name}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{t.leaderName || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.groupName || '—'}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground"><Users aria-hidden="true" className="size-3" />{t.members}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{t.kpis.applications}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                      <span className="font-semibold">{t.kpis.enrolled}</span> <span className="text-xs text-muted-foreground">({t.kpis.conversion}%)</span>
                    </TableCell>
                    <TableCell><OrgStatusPill status={t.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-8" title="View team" aria-label={`View ${t.name}`} onClick={() => view(t.id)}><Eye aria-hidden="true" className="size-4" /></Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Edit team" aria-label={`Edit ${t.name}`} onClick={() => setForm({ team: t })}><Pencil aria-hidden="true" className="size-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8" title="More" aria-label={`More actions for ${t.name}`}><MoreHorizontal aria-hidden="true" className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { void actions.deleteTeam(t).then((ok) => { if (ok) reload(); }); }}>
                              Delete Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="teams" onPage={setPage} />
      </Card>

      <TeamFormDialog
        open={form !== null}
        team={form?.team ?? null}
        api={api}
        token={session.token}
        onClose={() => setForm(null)}
        onSaved={reload}
      />
    </div>
  );
}
