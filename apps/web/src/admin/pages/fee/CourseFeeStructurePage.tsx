import { useEffect, useMemo, useState } from 'react';
import { Download, IndianRupee, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, PageTitle, Pill, type Tone } from '../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import { pageSlice } from '../cohorts/list-model.js';
import {
  EMPTY_FEE_STRUCTURE_FILTERS, FEE_PAGE_SIZE, capitalise, distinct, feeStructureCsvRows, filterFeeStructure,
  inr, rowNo, sortFeeStructure, statusCounts, toFeeStructureRows,
  type FeeStructureFilters, type FeeStructureSortKey, type SortDir,
} from './fee-model.js';

// Fee Information → Course Fee Structure, rebuilt after Naji's
// CourseFeeStructureModule (TTII 2026-10-12). Read-only, as before: one row
// per offering certificate package (or the offering itself when it has none),
// straight from /admin/fee_management/course_fee_structure. Pricing is edited
// under Courses → Course Offerings → Edit; this screen never writes.

const STATUS_ORDER = ['active', 'draft', 'inactive'];
const STATUS_TONE: Record<string, Tone> = { active: 'emerald', draft: 'amber', inactive: 'slate' };

export default function CourseFeeStructurePage({ api, session }: AdminPageProps) {
  const [filters, setFilters] = useState<FeeStructureFilters>(EMPTY_FEE_STRUCTURE_FILTERS);
  const [sortKey, setSortKey] = useState<FeeStructureSortKey>('course');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAdminPageData(() => api.listCourseFeeStructure(session.token), []);

  const rows = useMemo(() => toFeeStructureRows(data ?? []), [data]);
  const pills = useMemo(() => statusCounts(rows.map((r) => r.status.toLowerCase()), STATUS_ORDER), [rows]);
  const options = useMemo(() => ({
    course: distinct(rows.map((r) => r.course)),
    // Offerings narrow to the chosen course.
    offering: distinct(rows.filter((r) => !filters.course || r.course === filters.course).map((r) => r.offering)),
  }), [rows, filters.course]);
  const filtered = useMemo(
    () => sortFeeStructure(filterFeeStructure(rows, filters), sortKey, sortDir),
    [rows, filters, sortKey, sortDir],
  );
  const { current, pages, page: shownPage } = pageSlice(filtered, page, FEE_PAGE_SIZE);
  useEffect(() => { if (page !== shownPage) setPage(shownPage); }, [page, shownPage]);

  const set = (patch: Partial<FeeStructureFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_FEE_STRUCTURE_FILTERS); setPage(1); };
  const onSort = (k: FeeStructureSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const asOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

  if (loading && !data) return <PageLoader label="Loading fee structure..." />;
  if (error && !data) {
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
      <PageTitle
        title="Course Fee Structure"
        subtitle={`${filtered.length} of ${rows.length} packages`}
        actions={(
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={filtered.length === 0}
            onClick={() => downloadCsv('course_fee_structure.csv', toCsv(feeStructureCsvRows(filtered)))}
          >
            <Download aria-hidden="true" className="size-4" /> Export
          </Button>
        )}
      />
      <p className="-mt-3 text-sm text-muted-foreground">
        Read-only view of every offering and its certificate packages with the fee tier each carries.
        Edit per-offering pricing under <em>Courses → Course Offerings → Edit</em>.
      </p>

      <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <PillTab key={p.id} active={filters.status === p.id} label={p.id === 'all' ? 'All' : capitalise(p.id)} count={p.count} onClick={() => set({ status: p.id })} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_140px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search fee structure" placeholder="Search by course, offering or package…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Course" value={filters.course} onChange={(v) => set({ course: v, offering: '' })} allLabel="All Courses" options={asOptions(options.course)} />
          <FilterSelect label="Offering" value={filters.offering} onChange={(v) => set({ offering: v })} allLabel="All Offerings" options={asOptions(options.offering)} />
          <FilterSelect label="Type" value={filters.type} onChange={(v) => set({ type: v })} allLabel="All Types" options={[{ value: 'Paid', label: 'Paid' }, { value: 'Free', label: 'Free' }]} />
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={IndianRupee}
            title={rows.length === 0 ? 'No offerings priced yet.' : 'No packages match your filters.'}
            {...(rows.length === 0
              ? { body: 'Offerings and their certificate packages appear here once they are created under Course Offerings.' }
              : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Course" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course Offering" k="offering" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Type" k="type" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Base Fee" k="baseFee" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Discount" k="discount" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Fee (Before Tax)" k="beforeTax" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="GST" k="gst" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Fee Inc. Tax" k="incTax" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{rowNo(shownPage, FEE_PAGE_SIZE, i)}</TableCell>
                    <TableCell className="max-w-[220px] text-sm font-medium">{r.course || '—'}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="text-sm">{r.offering || '—'}</p>
                      {r.packageCode ? <p className="text-[11px] text-muted-foreground">Package: <span className="text-primary">{r.packageCode}</span></p> : null}
                    </TableCell>
                    <TableCell className="text-sm">{r.type}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{inr(r.baseFee, 2)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{inr(r.discount, 2)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{inr(r.beforeTax, 2)}</TableCell>
                    <TableCell className="text-sm">{r.gstLabel}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{inr(r.incTax, 2)}</TableCell>
                    <TableCell><Pill tone={STATUS_TONE[r.status.toLowerCase()] ?? 'slate'}>{r.status}</Pill></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={shownPage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>
    </div>
  );
}
