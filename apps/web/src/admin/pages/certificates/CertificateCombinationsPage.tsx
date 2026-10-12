import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, FileText, Layers, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { DetailsDialog } from '../../shared/components/DetailsDialog.js';
import { nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { Pager, SortHead } from '../cohorts/list-ui.js';
import {
  combinationCsvRows,
  filterCombinations,
  gstLabel,
  sortCombinations,
  statusCounts,
  statusLabel,
  toCombinationRows,
  type CombinationFilters,
  type CombinationRow,
  type CombinationSortKey,
} from './partner-model.js';
import { Chip, StatusPill, StatusPills } from './partner-ui.js';
import { CombinationFormDialog, type Option, type PartnerOption } from './CombinationFormDialog.js';

// Partner Management → Certificate Combinations (TTII 2026-10-12), rebuilt
// after Naji's CertificateCombinationsModule: status pills, a filter card
// (program / course / partner / GST), a selectable sortable table, export, a
// read-only View dialog and the New / Edit dialog. Kept: Edit, Delete + confirm.

const PAGE_SIZE = 10;
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const EMPTY_FILTERS: CombinationFilters = { tab: 'all', search: '', programId: '', courseId: '', partnerId: '', gst: '' };

export default function CertificateCombinationsPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<CombinationFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: CombinationSortKey; dir: SortDir }>({ key: 'course', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ editing: CombinationRow | null } | null>(null);
  const [viewing, setViewing] = useState<CombinationRow | null>(null);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toCombinationRows(await api.listCertificateCombinations(session.token)),
    [],
  );
  const { data: programsData } = useAdminPageData(() => api.listPrograms(session.token), []);
  const { data: coursesData } = useAdminPageData(() => api.loadCourses(session.token), []);
  const { data: partnersData } = useAdminPageData(() => api.listCertificationPartners(session.token), []);

  const rows = useMemo(() => data ?? [], [data]);
  const programs: Option[] = useMemo(
    () => toRecords(programsData)
      .map((p) => ({ id: asString(p.id), label: asString(p.name) || asString(p.title) || asString(p.code) }))
      .filter((p) => p.id),
    [programsData],
  );
  const courses: Option[] = useMemo(
    () => toRecords(coursesData)
      .map((c) => ({ id: asString(c.id), label: asString(c.title), programId: asString(c.category_id) }))
      .filter((c) => c.id),
    [coursesData],
  );
  const partners: PartnerOption[] = useMemo(
    () => toRecords(partnersData)
      .map((p) => ({ id: asString(p.id), code: asString(p.partner_code), name: asString(p.name), shortName: asString(p.short_name), status: asString(p.status) || 'active' }))
      .filter((p) => p.id),
    [partnersData],
  );
  // Filter dropdowns list only what the combinations actually use.
  const usedPrograms = useMemo(() => uniqueOptions(rows.map((r) => ({ id: r.programId, label: r.program }))), [rows]);
  const usedCourses = useMemo(() => uniqueOptions(rows.map((r) => ({ id: r.courseId, label: r.course }))), [rows]);
  const usedPartners = useMemo(() => uniqueOptions(rows.flatMap((r) => r.partners.map((p) => ({ id: p.id, label: p.code || p.name })))), [rows]);

  const counts = useMemo(() => statusCounts(filterCombinations(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(() => sortCombinations(filterCombinations(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const set = (patch: Partial<CombinationFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const onSort = (k: CombinationSortKey) => setSort((s) => nextSort(s, k));

  const allOnPage = current.length > 0 && current.every((r) => selected.has(r.id));
  const togglePage = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) current.forEach((r) => next.delete(r.id));
    else current.forEach((r) => next.add(r.id));
    return next;
  });
  const toggleOne = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  });
  const exportRows = selected.size > 0 ? filtered.filter((r) => selected.has(r.id)) : filtered;

  const remove = async (r: CombinationRow) => {
    const ok = await confirm({
      title: `Delete combination "${r.code}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteCertificateCombination(session.token, r.id);
      toast.success(asString(res.message) || 'Combination deleted.');
      setSelected((prev) => { const next = new Set(prev); next.delete(r.id); return next; });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete combination');
    }
  };

  if (loading) return <PageLoader label="Loading certificate combinations..." />;
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
        title="Certificate Combinations"
        subtitle="Partner combinations students can choose when they apply or enroll in a course"
        actions={(
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={exportRows.length === 0}
              onClick={() => downloadCsv('certificate-combinations.csv', toCsv(combinationCsvRows(exportRows)))}
            >
              <FileText aria-hidden="true" className="size-4" /> {selected.size > 0 ? `Export (${selected.size})` : 'Export'}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setDialog({ editing: null })}>
              <Plus aria-hidden="true" className="size-4" /> Create Combination
            </Button>
          </>
        )}
      />

      <StatusPills label="Combination status" value={filters.tab} counts={counts} onChange={(tab) => set({ tab })} />

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_200px_150px_130px]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search combinations" placeholder="Search by code, program, course or partner…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <select aria-label="Program" className={SELECT_CLASS} value={filters.programId} onChange={(e) => set({ programId: e.target.value })}>
            <option value="">All Programs</option>
            {usedPrograms.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select aria-label="Course" className={SELECT_CLASS} value={filters.courseId} onChange={(e) => set({ courseId: e.target.value })}>
            <option value="">All Courses</option>
            {usedCourses.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select aria-label="Partner" className={SELECT_CLASS} value={filters.partnerId} onChange={(e) => set({ partnerId: e.target.value })}>
            <option value="">All Partners</option>
            {usedPartners.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select
            aria-label="GST"
            className={SELECT_CLASS}
            value={filters.gst}
            onChange={(e) => set({ gst: e.target.value === 'yes' || e.target.value === 'no' ? e.target.value : '' })}
          >
            <option value="">GST: All</option>
            <option value="yes">GST: Yes</option>
            <option value="no">GST: No</option>
          </select>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={rows.length === 0 ? 'No certificate combinations yet.' : 'No combinations match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => setDialog({ editing: null })}>Create the first combination</Button>
              : <Button variant="outline" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Reset filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox aria-label="Select all combinations on this page" checked={allOnPage} onCheckedChange={togglePage} />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Program" k="program" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Partners" k="partners" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="GST" k="gst" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((r, i) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewing(r)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox aria-label={`Select ${r.code}`} checked={selected.has(r.id)} onCheckedChange={(v) => toggleOne(r.id, v === true)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="text-sm font-semibold">{r.code}</TableCell>
                  <TableCell className="text-sm">{r.program || '—'}</TableCell>
                  <TableCell className="max-w-[240px] text-sm">{r.course || '—'}</TableCell>
                  <TableCell>
                    {r.partners.length === 0 ? <span className="text-muted-foreground">—</span> : (
                      <div className="flex flex-wrap gap-1">{r.partners.map((p) => <Chip key={p.id}>{p.code || p.name}</Chip>)}</div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{gstLabel(r)}</TableCell>
                  <TableCell><StatusPill status={r.status} /></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${r.code}`}>
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(r)}><Eye aria-hidden="true" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDialog({ editing: r })}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => void remove(r)}><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="combinations" onPage={setPage} />
      </Card>

      <CombinationFormDialog
        open={dialog !== null}
        editing={dialog?.editing ?? null}
        rows={rows}
        programs={programs}
        courses={courses}
        partners={partners}
        api={api}
        token={session.token}
        onClose={() => setDialog(null)}
        onSaved={() => { setDialog(null); reload(); }}
      />

      <DetailsDialog
        open={viewing !== null}
        title={viewing?.code ?? ''}
        subtitle={viewing?.course || 'No course'}
        onClose={() => setViewing(null)}
        rows={viewing ? [
          { label: 'Program', value: viewing.program },
          { label: 'Course', value: viewing.course },
          { label: 'Partners', value: viewing.partners.map((p) => (p.code ? `${p.code} — ${p.name}` : p.name)).join('\n') },
          { label: 'GST', value: gstLabel(viewing) },
          { label: 'Status', value: statusLabel(viewing.status) },
        ] : []}
        footer={viewing ? (
          <Button variant="outline" className="gap-1.5" onClick={() => { const v = viewing; setViewing(null); setDialog({ editing: v }); }}>
            <Pencil aria-hidden="true" className="size-4" /> Edit
          </Button>
        ) : null}
      />
    </div>
  );
}

function uniqueOptions(list: Array<{ id: string; label: string }>): Array<{ id: string; label: string }> {
  const map = new Map<string, string>();
  for (const o of list) if (o.id && !map.has(o.id)) map.set(o.id, o.label || `#${o.id}`);
  return [...map].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
}
