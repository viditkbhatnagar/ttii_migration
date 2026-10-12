import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Eye, FileText, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { Pager, SortHead } from '../cohorts/list-ui.js';
import {
  filterPartners,
  partnerCsvRows,
  sortPartners,
  statusCounts,
  toCombinationRows,
  toPartnerRows,
  type PartnerFilters,
  type PartnerRow,
  type PartnerSortKey,
} from './partner-model.js';
import { PartnerLogo, StatusPill, StatusPills } from './partner-ui.js';
import { PartnerFormDialog } from './PartnerFormDialog.js';

// Partner Management → Certification Partners (TTII 2026-10-12), rebuilt after
// Naji's CertificationPartnersModule: All / Active / Inactive pills, a filter
// card, a selectable sortable table (row opens the partner page), export and
// the New / Edit dialog. Kept: View (partner page), Edit, Delete with confirm.

const PAGE_SIZE = 10;
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const EMPTY_FILTERS: PartnerFilters = { tab: 'all', search: '', country: '' };

export default function CertificationPartnersPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: PartnerSortKey; dir: SortDir }>({ key: 'position', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ editing: PartnerRow | null } | null>(null);

  const { data, loading, error, reload } = useAdminPageData(async () => {
    const [partners, combos] = await Promise.all([
      api.listCertificationPartners(session.token),
      // Only feeds the Combinations count; the list still loads without it.
      api.listCertificateCombinations(session.token).catch(() => [] as Record<string, unknown>[]),
    ]);
    return toPartnerRows(partners, toCombinationRows(combos));
  }, []);

  const rows = useMemo(() => data ?? [], [data]);
  const countries = useMemo(() => [...new Set(rows.map((r) => r.country).filter(Boolean))].sort(), [rows]);
  const counts = useMemo(() => statusCounts(filterPartners(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(() => sortPartners(filterPartners(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const set = (patch: Partial<PartnerFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const onSort = (k: PartnerSortKey) => setSort((s) => nextSort(s, k));
  const view = (p: PartnerRow) => onNavigate(`/admin/partners/view/${p.id}`);

  const allOnPage = current.length > 0 && current.every((p) => selected.has(p.id));
  const togglePage = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) current.forEach((p) => next.delete(p.id));
    else current.forEach((p) => next.add(p.id));
    return next;
  });
  const toggleOne = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  });
  const exportRows = selected.size > 0 ? filtered.filter((p) => selected.has(p.id)) : filtered;

  const remove = async (p: PartnerRow) => {
    const ok = await confirm({
      title: `Delete partner "${p.name}"?`,
      description: p.combinations > 0
        ? `${p.combinations} certificate combination${p.combinations === 1 ? '' : 's'} list this partner. This action cannot be undone.`
        : 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteCertificationPartner(session.token, p.id);
      toast.success(asString(res.message) || 'Partner deleted.');
      setSelected((prev) => { const next = new Set(prev); next.delete(p.id); return next; });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete partner');
    }
  };

  if (loading) return <PageLoader label="Loading certification partners..." />;
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

  return (
    <div className="space-y-6">
      <PageTitle
        title="Certification Partners"
        subtitle="Academic partners and certification authorities that award certificates"
        actions={(
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={exportRows.length === 0}
              onClick={() => downloadCsv('certification-partners.csv', toCsv(partnerCsvRows(exportRows)))}
            >
              <FileText aria-hidden="true" className="size-4" /> {selected.size > 0 ? `Export (${selected.size})` : 'Export'}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setDialog({ editing: null })}>
              <Plus aria-hidden="true" className="size-4" /> Add Partner
            </Button>
          </>
        )}
      />

      <StatusPills label="Partner status" value={filters.tab} counts={counts} onChange={(tab) => set({ tab })} />

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_160px]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search partners" placeholder="Search by code, name, country or description…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <select aria-label="Country" className={SELECT_CLASS} value={filters.country} onChange={(e) => set({ country: e.target.value })}>
            <option value="">All Countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            aria-label="Status"
            className={SELECT_CLASS}
            value={filters.tab}
            onChange={(e) => set({ tab: e.target.value === 'active' || e.target.value === 'inactive' ? e.target.value : 'all' })}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={rows.length === 0 ? 'No certification partners yet.' : 'No partners match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => setDialog({ editing: null })}>Add the first partner</Button>
              : <Button variant="outline" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Reset filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox aria-label="Select all partners on this page" checked={allOnPage} onCheckedChange={togglePage} />
                </TableHead>
                <SortHead label="#" k="position" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-xs">Logo</TableHead>
                <SortHead label="Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Name" k="name" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Country" k="country" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Description" k="description" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Combinations" k="combinations" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((p, i) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => view(p)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox aria-label={`Select ${p.code || p.name}`} checked={selected.has(p.id)} onCheckedChange={(v) => toggleOne(p.id, v === true)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell><PartnerLogo logo={p.logo} code={p.code} /></TableCell>
                  <TableCell className="font-mono text-xs font-semibold">{p.code}</TableCell>
                  <TableCell className="text-sm font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm">{p.country || '—'}</TableCell>
                  <TableCell className="max-w-md whitespace-normal">
                    <p title={p.description} className="line-clamp-2 break-words text-xs text-muted-foreground">{p.description || '—'}</p>
                  </TableCell>
                  <TableCell className="text-sm">{p.combinations}</TableCell>
                  <TableCell><StatusPill status={p.status} /></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${p.code || p.name}`}>
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => view(p)}><Eye aria-hidden="true" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDialog({ editing: p })}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => void remove(p)}><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="partners" onPage={setPage} />
      </Card>

      <PartnerFormDialog
        open={dialog !== null}
        editing={dialog?.editing ?? null}
        partners={rows}
        api={api}
        token={session.token}
        onClose={() => setDialog(null)}
        onSaved={() => { setDialog(null); reload(); }}
      />
    </div>
  );
}
