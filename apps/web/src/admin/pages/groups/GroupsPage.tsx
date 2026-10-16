import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, MoreHorizontal, Network, Pencil, Plus, Search, ShieldCheck, Users, UsersRound } from 'lucide-react';
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
  EMPTY_ORG_FILTERS, filterGroups, groupCsvRows, ownerOptions, sortGroups, toGroupList,
  type GroupRow, type GroupSortKey, type OrgFilters,
} from '../teams/org-model.js';
import { NotReadyNotice, OrgStatusPill } from '../teams/org-ui.js';
import { useOrgActions } from '../teams/use-org-actions.js';
import { GroupFormDialog } from './group-dialogs.js';

// Counsellor Management → Groups (Naji's GroupsModule, TTII 2026-10-12): a
// group holds teams under a manager. KPI tiles, filter card (search / manager
// / status), sortable selectable paged table, Export, Create / Edit and a
// profile per group. Organisational only.
// NOT copied: "Active Target" (group targets need a product decision); the
// Applications / Enrolled columns show the members' real pipeline instead.

const PAGE_SIZE = 10;

export default function GroupsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadCounsellorGroups(session.token), []);
  const actions = useOrgActions(api, session.token);
  const [filters, setFilters] = useState<OrgFilters>(EMPTY_ORG_FILTERS);
  const [sortKey, setSortKey] = useState<GroupSortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ group: GroupRow | null } | null>(null);

  const list = useMemo(() => toGroupList(data), [data]);
  const filtered = useMemo(() => sortGroups(filterGroups(list.groups, filters), sortKey, sortDir), [list, filters, sortKey, sortDir]);
  const managers = useMemo(() => ownerOptions(list.groups, (g) => ({ value: g.managerId, label: g.managerName })), [list]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedRows = filtered.filter((r) => selected.has(r.id));

  const set = (patch: Partial<OrgFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_ORG_FILTERS); setPage(1); };
  const onSort = (k: GroupSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const view = (id: string) => onNavigate(`/admin/groups/view/${id}`);
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
  const exportCsv = (rows: GroupRow[]) => downloadCsv('groups.csv', toCsv(groupCsvRows(rows)));

  if (loading) return <PageLoader label="Loading groups..." />;
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
          title="Groups"
          subtitle="Manage multiple teams."
          actions={(
            <>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={() => exportCsv(selectedRows.length ? selectedRows : filtered)}>
                <Download aria-hidden="true" className="size-4" /> Export{selectedRows.length ? ` (${selectedRows.length})` : ''}
              </Button>
              <Button size="sm" className="gap-1.5" disabled={!list.ready} onClick={() => setForm({ group: null })}>
                <Plus aria-hidden="true" className="size-4" /> Create Group
              </Button>
            </>
          )}
        />
      </div>

      {!list.ready ? <NotReadyNotice message={list.message} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile icon={Network} label="Total Groups" value={list.totals.groups} tone="primary" active={filters.status === ''} onClick={() => set({ status: '' })} />
        <KpiTile icon={ShieldCheck} label="Active Groups" value={list.totals.active} tone="emerald" active={filters.status === 'active'} onClick={() => set({ status: filters.status === 'active' ? '' : 'active' })} />
        <KpiTile icon={UsersRound} label="Teams in Groups" value={list.totals.teams} tone="blue" />
        <KpiTile icon={Users} label="Counsellors in Groups" value={list.totals.counsellors} tone="amber" />
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_180px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search groups" placeholder="Search group, ID or manager…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Manager" value={filters.owner} onChange={(v) => set({ owner: v })} allLabel="All Managers" options={managers} />
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
            icon={Network}
            title={list.groups.length === 0 ? 'No groups yet.' : 'No groups found.'}
            body={list.groups.length === 0 ? 'Create a group to bring several teams under one manager.' : 'Try adjusting your filters.'}
            action={list.groups.length === 0
              ? (list.ready ? <Button size="sm" onClick={() => setForm({ group: null })}>Create Group</Button> : undefined)
              : <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10"><Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="w-12 text-xs">Sl No</TableHead>
                  <SortHead label="Group ID" k="code" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Group Name" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Manager" k="manager" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Total Teams" k="teams" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Total Counsellors" k="counsellors" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Applications" k="applications" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Enrolled" k="enrolled" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((g, i) => (
                  <TableRow key={g.id} className="hover:bg-muted/30" data-state={selected.has(g.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox aria-label={`Select ${g.name}`} checked={selected.has(g.id)} onCheckedChange={(v) => toggleOne(g.id, v === true)} /></TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{g.code}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => view(g.id)} className="flex items-center gap-3 text-left hover:text-primary">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Network aria-hidden="true" className="size-4" /></span>
                        <span className="max-w-[200px] truncate text-sm font-semibold" title={g.name}>{g.name}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{g.managerName || '—'}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground"><UsersRound aria-hidden="true" className="size-3" />{g.teams}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground"><Users aria-hidden="true" className="size-3" />{g.counsellors}</span>
                      {g.direct > 0 ? <span className="mt-0.5 block text-[11px] text-muted-foreground">incl. {g.direct} direct</span> : null}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{g.kpis.applications}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                      <span className="font-semibold">{g.kpis.enrolled}</span> <span className="text-xs text-muted-foreground">({g.kpis.conversion}%)</span>
                    </TableCell>
                    <TableCell><OrgStatusPill status={g.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-8" title="View group" aria-label={`View ${g.name}`} onClick={() => view(g.id)}><Eye aria-hidden="true" className="size-4" /></Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Edit group" aria-label={`Edit ${g.name}`} onClick={() => setForm({ group: g })}><Pencil aria-hidden="true" className="size-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8" title="More" aria-label={`More actions for ${g.name}`}><MoreHorizontal aria-hidden="true" className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { void actions.deleteGroup(g).then((ok) => { if (ok) reload(); }); }}>
                              Delete Group
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
        <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="groups" onPage={setPage} />
      </Card>

      <GroupFormDialog open={form !== null} group={form?.group ?? null} api={api} token={session.token} onClose={() => setForm(null)} onSaved={reload} />
    </div>
  );
}
