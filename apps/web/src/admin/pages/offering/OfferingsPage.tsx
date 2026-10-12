import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Eye, GraduationCap, MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, messageFromError, toRecords } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle, Pill, type Tone } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import { dmy, pageSlice } from '../cohorts/list-model.js';
import { capitalise, statusCounts, type SortDir } from '../fee/fee-model.js';
import {
  EMPTY_OFFERING_FILTERS, OFFERING_STATUS_ORDER, filterOfferings, modeOptions, offeringCsvRows, offeringTotals,
  sortOfferings, toOfferingRows,
  type OfferingFilters, type OfferingRow, type OfferingSortKey,
} from './offering-list-model.js';
import { OfferingDetailsDialog } from './OfferingDetailsDialog.js';

// Courses → Course Offerings, rebuilt after Naji's CourseOfferingsModule
// (TTII 2026-10-12): KPI tiles, status pills, a filter card and a sortable,
// selectable, paged table with CSV export. Same /admin/offerings list, same
// Edit (full page, which also manages certificate-package pricing) and the
// same confirmed soft Delete. "View" is a new read-only details dialog.

const PAGE_SIZE = 10;
const STATUS_TONE: Record<string, Tone> = {
  active: 'emerald', published: 'blue', draft: 'amber', completed: 'slate', inactive: 'slate', archived: 'rose',
};

export default function OfferingsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<OfferingFilters>(EMPTY_OFFERING_FILTERS);
  const [sortKey, setSortKey] = useState<OfferingSortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<OfferingRow | null>(null);

  const { data: coursesData } = useAdminPageData(() => api.loadCourses(session.token), []);
  const courseOptions = useMemo(
    () => toRecords(coursesData).map((c) => ({ value: asString(c.id), label: asString(c.title) })),
    [coursesData],
  );

  const { data, loading, error, reload } = useAdminPageData(() => api.listOfferings(session.token), []);

  const rows = useMemo(() => toOfferingRows(toRecords(data)), [data]);
  const totals = useMemo(() => offeringTotals(rows), [rows]);
  const pills = useMemo(() => statusCounts(rows.map((r) => r.status), OFFERING_STATUS_ORDER), [rows]);
  const modes = useMemo(() => modeOptions(rows), [rows]);
  const filtered = useMemo(() => sortOfferings(filterOfferings(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const { current, pages, page: shownPage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== shownPage) setPage(shownPage); }, [page, shownPage]);

  const set = (patch: Partial<OfferingFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_OFFERING_FILTERS); setPage(1); };
  const onSort = (k: OfferingSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const edit = (id: string) => onNavigate(`/admin/offerings/edit/${id}`);

  const allOnPage = current.length > 0 && current.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) current.forEach((r) => next.delete(r.id));
    else current.forEach((r) => next.add(r.id));
    return next;
  });
  const toggleOne = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  const exportCsv = () => {
    const picked = selected.size > 0 ? filtered.filter((r) => selected.has(r.id)) : filtered;
    downloadCsv('course_offerings.csv', toCsv(offeringCsvRows(picked)));
  };

  const handleDelete = useCallback(async (row: OfferingRow) => {
    if (!(await confirm({
      title: `Delete offering "${row.title}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.deleteOffering(session.token, row.id);
      const status = (res as { status?: unknown }).status;
      const message = asString((res as { message?: unknown }).message);
      if (status !== undefined && Number(status) !== 1) { toast.error(message || 'Could not delete the offering.'); return; }
      toast.success(message && message !== 'success' ? message : 'Offering deleted');
      setSelected((prev) => { const next = new Set(prev); next.delete(row.id); return next; });
      reload();
    } catch (err) {
      toast.error(messageFromError(err) || 'Could not delete the offering.');
    }
  }, [api, session.token, reload, confirm]);

  if (loading && !data) return <PageLoader label="Loading offerings..." />;
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
        title="Course Offerings"
        subtitle={`${filtered.length} of ${rows.length} offerings`}
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={exportCsv}>
              <Download aria-hidden="true" className="size-4" /> Export{selected.size ? ` (${selected.size})` : ''}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => onNavigate('/admin/offerings/add')}>
              <Plus aria-hidden="true" className="size-4" /> New Offering
            </Button>
          </>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total Offerings" value={totals.total} tone="slate" icon={GraduationCap} />
        <StatTile label="Active" value={totals.active} tone="emerald" icon={GraduationCap} />
        <StatTile label="Total Enrolled" value={totals.enrolled} tone="primary" icon={Users} />
      </div>

      <div role="group" aria-label="Offering status" className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <PillTab key={p.id} active={filters.status === p.id} label={p.id === 'all' ? 'All' : capitalise(p.id)} count={p.count} onClick={() => set({ status: p.id })} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_240px_150px_140px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search offerings" placeholder="Search by offering title, code or course…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Course" value={filters.courseId} onChange={(v) => set({ courseId: v })} allLabel="All Courses" options={courseOptions} />
          <FilterSelect label="Mode" value={filters.mode} onChange={(v) => set({ mode: v })} allLabel="All Modes" options={modes} />
          <FilterSelect label="Pricing" value={filters.pricing} onChange={(v) => set({ pricing: v })} allLabel="All Pricing" options={[{ value: 'Paid', label: 'Paid' }, { value: 'Free', label: 'Free' }]} />
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={rows.length === 0 ? 'No offerings yet.' : 'No offerings match your filters.'}
            {...(rows.length === 0
              ? { action: <Button size="sm" onClick={() => onNavigate('/admin/offerings/add')}>New Offering</Button> }
              : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Offering" k="title" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Mode" k="mode" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Start Date" k="start" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="End Date" k="end" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Enrolments Ends" k="enrolEnd" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Pricing Type" k="pricing" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Enrollments" k="enrolled" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30" data-state={selected.has(r.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox aria-label={`Select ${r.title || 'offering'}`} checked={selected.has(r.id)} onCheckedChange={(v) => toggleOne(r.id, v === true)} />
                    </TableCell>
                    <TableCell className="text-xs font-medium text-primary">{(shownPage - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell className="max-w-xs">
                      <button type="button" className="text-left text-sm font-medium hover:text-primary hover:underline" onClick={() => setViewing(r)}>
                        {r.title || '—'}
                      </button>
                      {r.code ? <p className="font-mono text-[11px] text-muted-foreground">{r.code}</p> : null}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">{r.course || '—'}</TableCell>
                    <TableCell className="text-sm">{r.modeLabel || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dmy(r.startYmd) || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dmy(r.endYmd) || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dmy(r.enrolEndYmd) || '-'}</TableCell>
                    <TableCell className="text-sm">{r.pricing}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{r.enrolled}</TableCell>
                    <TableCell><Pill tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status}</Pill></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${r.title || 'offering'}`}>
                            <MoreHorizontal aria-hidden="true" className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setViewing(r)}><Eye aria-hidden="true" className="mr-2 size-4" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => edit(r.id)}><Pencil aria-hidden="true" className="mr-2 size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { void handleDelete(r); }}>
                            <Trash2 aria-hidden="true" className="mr-2 size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={shownPage} pages={pages} shown={current.length} total={filtered.length} noun="offerings" onPage={setPage} />
      </Card>

      <OfferingDetailsDialog row={viewing} onClose={() => setViewing(null)} onEdit={edit} />
    </div>
  );
}

function StatTile({ label, value, tone, icon: Icon }: { label: string; value: number; tone: Tone; icon: typeof GraduationCap }) {
  return (
    <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn('mt-2 text-3xl font-bold tabular-nums', tone === 'slate' ? 'text-foreground' : TONE[tone].text)}>{value}</p>
        </div>
        <span className={cn('flex size-10 items-center justify-center rounded-xl', TONE[tone].tile)}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
    </Card>
  );
}
