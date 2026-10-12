import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, MoreHorizontal, Pencil, Search, Trash2, Users } from 'lucide-react';
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
import {
  EMPTY_COHORT_FILTERS,
  STATUS_LABEL,
  STATUS_TONE,
  optionsFrom,
  type CohortFilters,
  type CohortTab,
} from '../cohorts/cohort-list-model.js';
import { nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { ExportButtons } from '../cohorts/list-ui.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import {
  centreCohortCsvRows,
  centreCohortTabCounts,
  filterCentreCohorts,
  sortCentreCohorts,
  toCentreCohortRows,
  type CentreCohortRow,
  type CentreCohortSortKey,
} from './centre-cohorts-model.js';
import { usePendingPatches } from './use-pending-patches.js';
import { useRowSelection } from './use-row-selection.js';

// Centre Cohorts (TTII 2026-10-12), rebuilt after Naji's CentreCohortsModule:
// filter card, Active / Completed / All tabs with counts, export + search
// toolbar, sortable paged table with a "…" menu. The old page's View / Edit /
// Delete (confirm) row actions and the Cohort ID link are kept.

const PAGE_SIZE = 8;
const FIELD_LABEL = 'text-[11px] font-medium text-muted-foreground';
const TABS: Array<{ id: CohortTab; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
];

export default function CentreCohortsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  // Naji 2026-05-04: Active / Completed / All, default Active.
  const [filters, setFilters] = useState<CohortFilters>(EMPTY_COHORT_FILTERS);
  const [sort, setSort] = useState<{ key: CentreCohortSortKey; dir: SortDir }>({ key: 'cohortId', dir: 'desc' });
  const [page, setPage] = useState(1);
  const selection = useRowSelection();
  const [courses, setCourses] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    api.loadCourses(session.token)
      .then((list) => setCourses(list.map((c) => ({ value: asString(c.id), label: asString(c.title) })).filter((c) => c.value && c.label)))
      .catch(() => setCourses([]));
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toCentreCohortRows(await api.loadAdminCohorts(session.token)),
    [],
    'admin:centres:cohorts',
  );
  // A deleted cohort leaves the list at once; reload() revalidates in the background.
  const removed = usePendingPatches<true>(data);
  const isRemoved = removed.get;
  const rows = useMemo(() => (data ?? []).filter((c) => !isRemoved(c.id)), [data, isRemoved]);
  const counts = useMemo(() => centreCohortTabCounts(rows, filters), [rows, filters]);
  const filtered = useMemo(() => sortCentreCohorts(filterCentreCohorts(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const toOptions = (list: Array<{ id: string; label: string }>) => list.map((o) => ({ value: o.id, label: o.label }));
  const subjects = useMemo(() => {
    const scoped = filters.courseId ? rows.filter((c) => c.courseIds.includes(filters.courseId)) : rows;
    return toOptions(optionsFrom(scoped, (c) => c.subjectId, (c) => c.subject));
  }, [rows, filters.courseId]);
  const languages = useMemo(() => toOptions(optionsFrom(rows, (c) => c.languageId, (c) => c.language)), [rows]);
  const instructors = useMemo(() => toOptions(optionsFrom(rows, (c) => c.instructorId, (c) => c.instructor)), [rows]);
  const months = useMemo(
    () => toOptions(optionsFrom(rows, (c) => c.startYmd.slice(0, 7), (c) => c.month).sort((a, b) => b.id.localeCompare(a.id))),
    [rows],
  );

  const set = (patch: Partial<CohortFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters((f) => ({ ...EMPTY_COHORT_FILTERS, tab: f.tab })); setPage(1); };
  const onSort = (k: CentreCohortSortKey) => setSort((s) => nextSort(s, k));
  const view = (c: CentreCohortRow) => onNavigate(`/admin/cohorts/view/${c.id}`);

  const exportRows = selection.size > 0 ? filtered.filter((c) => selection.has(c.id)) : filtered;
  const exportCsv = () => downloadCsv('centre-cohorts.csv', toCsv(centreCohortCsvRows(exportRows)));

  const remove = async (c: CentreCohortRow) => {
    const ok = await confirm({
      title: `Delete "${c.title || 'this cohort'}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteCohort(session.token, c.id);
      if (res.status === 0) {
        toast.error(asString(res.message) || 'Failed to delete cohort');
        return;
      }
      toast.success(asString(res.message) || 'Cohort deleted.');
      removed.set(c.id, true);
      selection.drop(c.id);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete cohort');
    }
  };

  if (loading) return <PageLoader label="Loading centre cohorts..." />;
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

  const select = (label: string, value: string, onChange: (v: string) => void, allLabel: string, options: Array<{ value: string; label: string }>) => (
    <label className="block min-w-0">
      <span className={FIELD_LABEL}>{label}</span>
      <FilterSelect label={label} value={value} onChange={onChange} allLabel={allLabel} options={options} className="mt-1 w-full" />
    </label>
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Centre Cohorts" subtitle="Cohorts across all learning centres." />

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {select('Cohort Date', filters.month, (v) => set({ month: v }), 'All Dates', months)}
          {select('Course', filters.courseId, (v) => set({ courseId: v, subjectId: '' }), 'All Courses', courses)}
          {select('Subject', filters.subjectId, (v) => set({ subjectId: v }), 'All Subjects', subjects)}
          {select('Language', filters.languageId, (v) => set({ languageId: v }), 'All Languages', languages)}
          {select('Instructor', filters.instructorId, (v) => set({ instructorId: v }), 'All Instructors', instructors)}
          {select('Status', filters.status, (v) => set({ status: v as CohortFilters['status'] }), 'All Status', [
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'upcoming', label: 'Upcoming' },
          ])}
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="ghost" onClick={reset}>Clear</Button>
        </div>
      </Card>

      <div role="group" aria-label="Cohort status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
      </div>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <ExportButtons
            onCsv={exportCsv}
            disabled={exportRows.length === 0}
            csvLabel={selection.size > 0 ? `Export CSV (${selection.size})` : 'Export CSV'}
          />
          <div className="relative w-full md:w-64">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search cohorts" placeholder="Search…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
        </div>

        {current.length === 0 ? (
          <EmptyState
            icon={Users}
            title={rows.length === 0 ? 'No cohorts yet.' : 'No cohorts match your filters.'}
            action={rows.length === 0 ? undefined : <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 print:hidden">
                  <Checkbox
                    aria-label="Select all cohorts on this page"
                    checked={selection.allOf(current.map((c) => c.id))}
                    onCheckedChange={() => selection.togglePage(current.map((c) => c.id))}
                  />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Centre" k="centre" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Cohort ID" k="cohortId" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Cohort Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Cohort Date" k="month" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Subject" k="subject" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Language" k="language" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Instructor" k="instructor" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="No. of Students" k="students" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="No. of Live Classes" k="liveClasses" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <TableHead className="text-right text-xs print:hidden">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((c, i) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="print:hidden">
                    <Checkbox aria-label={`Select ${c.code || c.cohortId}`} checked={selection.has(c.id)} onCheckedChange={(v) => selection.toggle(c.id, v === true)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell><Pill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Pill></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.centre || '—'}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => view(c)} className="font-mono text-xs font-medium text-primary hover:underline">{c.cohortId}</button>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{c.code || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{c.month || '—'}</TableCell>
                  <TableCell className="max-w-[240px] text-sm">
                    {c.courses.length > 1 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.courses.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{t}</span>)}
                      </div>
                    ) : c.courses[0] || '—'}
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">{c.subject || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.language || '—'}</TableCell>
                  <TableCell className="text-sm">{c.instructor || '—'}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{c.students}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{c.liveClasses}</span>
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${c.code || c.cohortId}`}>
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => view(c)}><Eye aria-hidden="true" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onNavigate(`/admin/cohorts/edit/${c.id}`)}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => void remove(c)}><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <ListPager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>
    </div>
  );
}
