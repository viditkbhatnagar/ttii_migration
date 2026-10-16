import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Eye, Mail, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { ExportButtons } from '../cohorts/list-ui.js';
import { FilterSelect, ListPager, SortHead } from '../students/list-chrome.js';
import {
  EMPTY_CENTRE_FILTERS,
  centreCsvRows,
  filterCentres,
  rupees,
  sortCentres,
  stateOptions,
  tallyFundRequests,
  toCentreRows,
  type CentreFilters,
  type CentreRow,
  type CentreSortKey,
} from './centre-list-model.js';
import { usePendingPatches } from './use-pending-patches.js';
import { useRowSelection } from './use-row-selection.js';

// Centre Directory (TTII 2026-10-12), rebuilt after Naji's CentreDirectoryModule:
// filter card, export + search toolbar, sortable paged table with a "…" menu.
// Every action of the old page survives: Add, View (name link + menu), Edit,
// Resend Login Email (confirm) and Delete (confirm). Fund Requests are counted
// from the Centre Payments feed — the centres list never returned them.

const PAGE_SIZE = 8;
const FIELD_LABEL = 'text-[11px] font-medium text-muted-foreground';

export default function CentreDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<CentreFilters>(EMPTY_CENTRE_FILTERS);
  const [sort, setSort] = useState<{ key: CentreSortKey; dir: SortDir }>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const selection = useRowSelection();

  const { data, loading, error, reload } = useAdminPageData(
    async () => {
      const [centres, payments] = await Promise.all([
        api.loadCentres(session.token),
        // The fund-request counts are a side column: a failure here must not hide the directory.
        api.loadAdminCentrePayments(session.token).catch(() => null),
      ]);
      return { rows: toCentreRows(centres), fundRequests: payments ? payments.fundRequests : null };
    },
    [],
    'admin:centres:directory',
  );
  // A deleted centre leaves the list at once; reload() revalidates in the background.
  const removed = usePendingPatches<true>(data);
  const isRemoved = removed.get;
  const rows = useMemo(() => (data?.rows ?? []).filter((c) => !isRemoved(c.id)), [data, isRemoved]);
  const tallies = useMemo(() => tallyFundRequests(data?.fundRequests ?? []), [data]);
  const hasTallies = data?.fundRequests != null;
  const states = useMemo(() => stateOptions(rows), [rows]);
  const filtered = useMemo(
    () => sortCentres(filterCentres(rows, filters), sort.key, sort.dir, tallies),
    [rows, filters, sort, tallies],
  );
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const set = (patch: Partial<CentreFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_CENTRE_FILTERS); setPage(1); };
  const onSort = (k: CentreSortKey) => setSort((s) => nextSort(s, k));
  const view = (c: CentreRow) => onNavigate(`/admin/centres/view/${c.id}`);

  const exportRows = selection.size > 0 ? filtered.filter((c) => selection.has(c.id)) : filtered;
  const exportCsv = () => downloadCsv('centres.csv', toCsv(centreCsvRows(exportRows, tallies)));

  // Naji UAT 2026-05-15 — Resend Login Email, same as every other user
  // directory: listCentres surfaces the role-7 login as `linked_user_id`.
  const resendLogin = async (c: CentreRow) => {
    const centreName = c.name || 'this centre';
    if (!c.linkedUserId) {
      toast.error(`No login is wired for ${centreName}. Edit the centre and re-save to provision one.`);
      return;
    }
    const ok = await confirm({
      title: `Resend login email to "${centreName}"?`,
      description: `A new temporary password will be generated and emailed to ${c.linkedUserEmail || c.email}. The previous password will stop working.`,
      confirmText: 'Resend',
      variant: 'default',
    });
    if (!ok) return;
    try {
      const res = await api.resendLoginCredentials(session.token, c.linkedUserId);
      const message = typeof res.message === 'string' ? res.message : 'Login email sent.';
      if (res.status === 1) toast.success(message);
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send login email');
    }
  };

  const remove = async (c: CentreRow) => {
    const ok = await confirm({
      title: 'Delete Centre',
      description: `Are you sure you want to delete ${c.name || 'this centre'}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteCentre(session.token, c.id);
      const message = asString(res.message);
      if (res.status === 0) {
        toast.error(message || 'Failed to delete centre');
        return;
      }
      toast.success(message || 'Centre deleted.');
      removed.set(c.id, true);
      selection.drop(c.id);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete centre');
    }
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

  const textFilter = (label: string, key: 'code' | 'name' | 'contact' | 'phone', placeholder: string) => (
    <label className="block">
      <span className={FIELD_LABEL}>{label}</span>
      <Input placeholder={placeholder} value={filters[key]} onChange={(e) => set({ [key]: e.target.value })} className="mt-1" />
    </label>
  );

  return (
    <div className="space-y-6">
      <PageTitle
        title="Centre Directory"
        subtitle={`${filtered.length} of ${rows.length} centres`}
        actions={(
          <Button size="sm" className="gap-1.5" onClick={() => onNavigate('/admin/centres/add')}>
            <Plus aria-hidden="true" className="size-4" /> Add Centres
          </Button>
        )}
      />

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {textFilter('Centre ID', 'code', 'Search by centre ID')}
          {textFilter('Centre Name', 'name', 'Search by centre name')}
          {textFilter('Contact Name', 'contact', 'Search by contact name')}
          {textFilter('Contact Phone', 'phone', 'Search by phone')}
          <label className="block">
            <span className={FIELD_LABEL}>State</span>
            <FilterSelect
              label="State"
              value={filters.state}
              onChange={(v) => set({ state: v })}
              allLabel={states.length > 0 ? 'All States' : 'No state on file'}
              options={states.map((s) => ({ value: s, label: s }))}
              className="mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className={FIELD_LABEL}>Status</span>
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => set({ status: v as CentreFilters['status'] })}
              allLabel="All Status"
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
              className="mt-1 w-full"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="ghost" onClick={reset}>Clear</Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <ExportButtons
            onCsv={exportCsv}
            disabled={exportRows.length === 0}
            csvLabel={selection.size > 0 ? `Export CSV (${selection.size})` : 'Export CSV'}
          />
          <div className="relative w-full md:w-64">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search centres" placeholder="Search…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
        </div>

        {current.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={rows.length === 0 ? 'No centres yet.' : 'No centres match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => onNavigate('/admin/centres/add')}>Add the first centre</Button>
              : <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 print:hidden">
                  <Checkbox
                    aria-label="Select all centres on this page"
                    checked={selection.allOf(current.map((c) => c.id))}
                    onCheckedChange={() => selection.togglePage(current.map((c) => c.id))}
                  />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Centre Name" k="name" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-xs">Contact Person</TableHead>
                <TableHead className="text-xs">Contact No</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <SortHead label="Total Students" k="students" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="Fund Requests" k="fundRequests" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="Wallet Balance" k="walletBalance" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <TableHead className="text-right text-xs print:hidden">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((c, i) => {
                const tally = tallies.get(c.id);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="print:hidden">
                      <Checkbox aria-label={`Select ${c.name || c.code}`} checked={selection.has(c.id)} onCheckedChange={(v) => selection.toggle(c.id, v === true)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => view(c)} className="text-left text-sm font-medium text-primary hover:underline">
                        {c.name || '—'}
                      </button>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {c.code ? <span className="font-mono text-[11px] text-muted-foreground">{c.code}</span> : null}
                        {c.status === 'inactive' ? <Pill tone="slate" className="px-1.5 py-0 text-[10px]">Inactive</Pill> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.contact || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{c.phone || '—'}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground" title={c.email || undefined}>{c.email || '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{c.students}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {!hasTallies ? '—' : (
                        <span className="inline-flex items-center justify-end gap-1.5">
                          {tally?.total ?? 0}
                          {tally && tally.pending > 0 ? <Pill tone="amber" className="px-1.5 py-0 text-[10px]">{tally.pending} pending</Pill> : null}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{rupees(c.walletBalance)}</TableCell>
                    <TableCell className="text-right print:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${c.name || c.code}`}>
                            <MoreHorizontal aria-hidden="true" className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => view(c)}><Eye aria-hidden="true" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onNavigate(`/admin/centres/edit/${c.id}`)}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void resendLogin(c)}><Mail aria-hidden="true" /> Resend Login Email</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => void remove(c)}><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <ListPager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>
    </div>
  );
}
