import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Building2, CheckCircle2, Download, Eye, Mail, MoreHorizontal, PauseCircle, Pencil, Plus,
  SlidersHorizontal, Trash2, UserCheck, UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, KpiTile, PageTitle } from '../../shared/components/ui-kit.js';
import { istTodayYmd, nextSort, pageSlice } from '../cohorts/list-model.js';
import { FilterSelect, ListPager, SortHead } from '../students/list-chrome.js';
import {
  DIRECTORY_PAGE_SIZE, DIRECTORY_QUERY_KEY, activeFilterCount, countryOptions, directoryCsvRows, directoryHref, directoryKpis,
  expiryInfo, filterDirectory, sortDirectory, stateOptions, toDirectoryRows, viewStateFromQuery, viewStateToQuery,
  type DirectoryFilters, type DirectoryRow, type DirectorySortKey, type DirectoryViewState,
} from './centre-directory-model.js';
import { rupees, type CentreStatus } from './centre-list-model.js';
import { CentreFormDialog, type CentreFormTarget } from './CentreFormDialog.js';
import { CentreStatusPill, ExpiryText, SearchBox } from './centre-ui.js';
import { useCentreActions, type CentreActionTarget } from './use-centre-actions.js';
import { usePendingPatches } from './use-pending-patches.js';

// Centre Directory (Naji 2026-10-22, CentreDirectoryModule): three KPI cards
// that double as filters, one search box + Country / State / Status, the
// sortable 8-per-page table and the row "⋯" menu (View, Edit, Resend Login
// Email, Activate / Deactivate, Delete). Add / Edit open the AddCentreDialog in
// place. Filters, sort and page live in the URL (and sessionStorage), so the
// profile's Back link returns to the same list.

interface RowPatch {
  removed?: true;
  status?: CentreStatus;
}

function rememberQuery(query: string): void {
  try { window.sessionStorage.setItem(DIRECTORY_QUERY_KEY, query); } catch { /* storage blocked: Back falls back to the plain list */ }
}

const actionTarget = (c: DirectoryRow): CentreActionTarget => ({
  id: c.id, name: c.name, status: c.status, loginUserId: c.linkedUserId, loginEmail: c.linkedUserEmail || c.email,
});

export default function CentreDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
  const [view, setView] = useState<DirectoryViewState>(() => viewStateFromQuery(window.location.search));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<CentreFormTarget | null>(null);
  const actions = useCentreActions(api, session.token);
  const today = istTodayYmd();

  const { data, loading, error, reload } = useAdminPageData(
    async () => toDirectoryRows(await api.loadCentres(session.token)),
    [],
    'admin:centres:directory:v2',
  );
  const patches = usePendingPatches<RowPatch>(data);
  const patchOf = patches.get;
  const rows = useMemo(
    () => (data ?? [])
      .filter((c) => !patchOf(c.id)?.removed)
      .map((c) => {
        const status = patchOf(c.id)?.status;
        return status ? { ...c, status } : c;
      }),
    [data, patchOf],
  );

  // Keep the URL (and the profile's Back link) in step with the view.
  useEffect(() => {
    const query = viewStateToQuery(view);
    window.history.replaceState(window.history.state, '', directoryHref(query));
    rememberQuery(query);
  }, [view]);

  const { filters, sort } = view;
  const kpis = useMemo(() => directoryKpis(rows, today), [rows, today]);
  const countries = useMemo(() => countryOptions(rows), [rows]);
  const states = useMemo(() => stateOptions(rows, filters.country), [rows, filters.country]);
  const filtered = useMemo(() => sortDirectory(filterDirectory(rows, filters, today), sort.key, sort.dir), [rows, filters, sort, today]);
  const { current, pages, page } = pageSlice(filtered, view.page, DIRECTORY_PAGE_SIZE);
  const activeCount = activeFilterCount(filters);
  // A page past the end (rows deleted, a stale link) settles on the last page once the rows are in.
  useEffect(() => {
    if (data && page !== view.page) setView((v) => ({ ...v, page }));
  }, [data, page, view.page]);

  const setFilters = useCallback((patch: Partial<DirectoryFilters>) => {
    setView((v) => ({ ...v, filters: { ...v.filters, ...patch }, page: 1 }));
  }, []);
  const clearFilters = () => setView((v) => ({ ...v, filters: { search: '', country: '', state: '', status: '', expiredOnly: false }, page: 1 }));
  const onSort = (k: DirectorySortKey) => setView((v) => ({ ...v, sort: nextSort(v.sort, k) }));
  const setPage = (p: number) => setView((v) => ({ ...v, page: p }));
  const open = (c: DirectoryRow) => onNavigate(`/admin/centres/view/${c.id}`);

  const toggleStatus = async (c: DirectoryRow) => {
    const next = await actions.toggleStatus(actionTarget(c));
    if (next) { patches.set(c.id, { status: next }); reload(); }
  };
  const remove = async (c: DirectoryRow) => {
    if (await actions.remove(actionTarget(c))) { patches.set(c.id, { removed: true }); reload(); }
  };

  if (loading) return <PageLoader label="Loading centre directory..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const kpiCards = [
    { key: 'active', label: 'Active Centres', value: kpis.active, icon: CheckCircle2, tone: 'emerald' as const, on: filters.status === 'active' },
    { key: 'inactive', label: 'Inactive Centres', value: kpis.inactive, icon: PauseCircle, tone: 'slate' as const, on: filters.status === 'inactive' },
    { key: 'expired', label: 'Expired Centres', value: kpis.expired, icon: AlertTriangle, tone: 'rose' as const, on: filters.expiredOnly },
  ];
  const onKpi = (key: string) => {
    if (key === 'expired') setFilters({ expiredOnly: !filters.expiredOnly });
    else setFilters({ status: filters.status === key ? '' : (key as CentreStatus) });
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Centre Directory"
        subtitle="All affiliated centres with contacts, enrollments and status."
        actions={(
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={filtered.length === 0}
              onClick={() => downloadCsv('centres.csv', toCsv(directoryCsvRows(filtered)))}
            >
              <Download aria-hidden="true" className="size-4" /> Export CSV
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setFormTarget({ mode: 'add' })}>
              <Plus aria-hidden="true" className="size-4" /> Add Centre
            </Button>
          </>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {kpiCards.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} icon={k.icon} tone={k.tone} active={k.on} onClick={() => onKpi(k.key)} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-5 md:items-end">
          <div className="flex items-center gap-2 md:col-span-2">
            <span className="min-w-0 flex-1" title="Search by centre code, name, contact, mobile or email">
              <SearchBox
                value={filters.search}
                onChange={(v) => setFilters({ search: v })}
                placeholder="Search centres…"
                label="Search by centre code, name, contact, mobile or email"
                className="sm:w-full"
                onClear={activeCount > 0 ? clearFilters : undefined}
              />
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 md:hidden"
              aria-expanded={filtersOpen}
              aria-label="Show filters"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              {activeCount > 0 ? <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{activeCount}</span> : null}
            </Button>
          </div>
          <div className={`${filtersOpen ? 'grid gap-3' : 'hidden'} md:contents`}>
            <FilterSelect
              label="Country"
              value={filters.country}
              onChange={(v) => setFilters({ country: v, state: '' })}
              allLabel="All Countries"
              options={countries.map((c) => ({ value: c, label: c }))}
              className="w-full"
            />
            <FilterSelect
              label="State"
              value={filters.state}
              onChange={(v) => setFilters({ state: v })}
              allLabel="All States"
              options={states.map((s) => ({ value: s, label: s }))}
              className="w-full"
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => setFilters({ status: v === 'active' || v === 'inactive' ? v : '' })}
              allLabel="All Status"
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No centres yet."
            action={<Button size="sm" onClick={() => setFormTarget({ mode: 'add' })}>Add the first centre</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Centre Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Centre Name" k="name" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="District, State" k="district" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Contact Name, Mobile" k="contact" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Email ID" k="email" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Total Enrollment" k="students" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                  <SortHead label="Wallet Balance" k="walletBalance" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                  <SortHead label="Affiliation Expiry" k="expiry" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-12 text-center text-sm text-muted-foreground">No centres match your filters.</TableCell>
                  </TableRow>
                ) : current.map((c, i) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{(page - 1) * DIRECTORY_PAGE_SIZE + i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{c.code || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => open(c)}
                        title={`Open full view of ${c.name || c.code}`}
                        className="text-left font-medium underline-offset-4 transition-colors hover:text-primary hover:underline motion-reduce:transition-none"
                      >
                        {c.name || '—'}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {c.district || '—'}{c.state ? <span className="text-muted-foreground">, {c.state}</span> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {c.contact || '—'}
                      <span className="block text-xs text-muted-foreground">{c.phone}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{c.students}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{rupees(c.walletBalance)}</TableCell>
                    <TableCell className="text-sm"><ExpiryText info={expiryInfo(c.expiry, today)} /></TableCell>
                    <TableCell><CentreStatusPill status={c.status} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${c.name || c.code}`}>
                            <MoreHorizontal aria-hidden="true" className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => open(c)}><Eye aria-hidden="true" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFormTarget({ mode: 'edit', centreId: c.id })}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void actions.resendLogin(actionTarget(c))}><Mail aria-hidden="true" /> Resend Login Email</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => void toggleStatus(c)}>
                            {c.status === 'active'
                              ? <><UserX aria-hidden="true" /> Deactivate</>
                              : <><UserCheck aria-hidden="true" /> Activate</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => void remove(c)}><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {rows.length > 0 ? <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} /> : null}
      </Card>

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
