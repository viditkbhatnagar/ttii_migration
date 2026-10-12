import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, FileText, MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
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
  cohortCsvRows,
  cohortTabCounts,
  filterCohorts,
  filterCohortsIgnoringTab,
  optionsFrom,
  sortCohorts,
  toCohortRows,
  type CohortFilters,
  type CohortRow,
  type CohortSortKey,
  type CohortTab,
} from './cohort-list-model.js';
import { CohortFormDialog } from './CohortFormDialog.js';
import { nextSort, pageSlice, type SortDir } from './list-model.js';
import { Pager, PillTab, SortHead } from './list-ui.js';

// Cohorts (TTII 2026-10-12), rebuilt after Naji's CohortsModule: Active /
// Completed / All pills, a filter card, a selectable sortable table with an
// action menu, export, and the Add / Edit Cohort dialog. Filters now run on the
// loaded rows — four of the old page's six filters were never read by the API.

const PAGE_SIZE = 8;
const SELECT_CLASS = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const TABS: Array<{ id: CohortTab; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
];

export default function CohortsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<CohortFilters>({ ...EMPTY_COHORT_FILTERS, tab: 'all' });
  const [sort, setSort] = useState<{ key: CohortSortKey; dir: SortDir }>({ key: 'cohortId', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ cohortId: string | null } | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    api.loadCourses(session.token)
      .then((list) => setCourses(list.map((c) => ({ id: asString(c.id), label: asString(c.title) })).filter((c) => c.id && c.label)))
      .catch(() => setCourses([]));
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toCohortRows(await api.loadAdminCohorts(session.token)),
    [],
    'admin:cohorts:list',
  );
  const rows = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => cohortTabCounts(filterCohortsIgnoringTab(rows, filters)), [rows, filters]);
  const filtered = useMemo(() => sortCohorts(filterCohorts(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const subjects = useMemo(() => optionsFrom(rows, (c) => c.subjectId, (c) => c.subject), [rows]);
  const languages = useMemo(() => optionsFrom(rows, (c) => c.languageId, (c) => c.language), [rows]);
  const instructors = useMemo(() => optionsFrom(rows, (c) => c.instructorId, (c) => c.instructor), [rows]);
  const months = useMemo(
    () => optionsFrom(rows, (c) => c.startYmd.slice(0, 7), (c) => c.month).sort((a, b) => b.id.localeCompare(a.id)),
    [rows],
  );

  const set = (patch: Partial<CohortFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters((f) => ({ ...EMPTY_COHORT_FILTERS, tab: f.tab })); setPage(1); };
  const view = (c: CohortRow) => onNavigate(`/admin/cohorts/view/${c.id}`);

  const allOnPage = current.length > 0 && current.every((c) => selected.has(c.id));
  const togglePage = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) current.forEach((c) => next.delete(c.id));
    else current.forEach((c) => next.add(c.id));
    return next;
  });
  const toggleOne = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  });

  const exportRows = selected.size > 0 ? filtered.filter((c) => selected.has(c.id)) : filtered;
  const exportCsv = () => downloadCsv('cohorts.csv', toCsv(cohortCsvRows(exportRows)));

  const remove = async (c: CohortRow) => {
    const ok = await confirm({
      title: `Delete "${c.title || c.code || c.cohortId}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteCohort(session.token, c.id);
      toast.success(asString(res.message) || 'Cohort deleted.');
      setSelected((prev) => { const next = new Set(prev); next.delete(c.id); return next; });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete cohort');
    }
  };

  if (loading) return <PageLoader label="Loading cohorts…" />;
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
        title="Cohorts"
        subtitle={`${filtered.length} of ${rows.length} cohorts`}
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={exportRows.length === 0} onClick={exportCsv}>
              <FileText aria-hidden="true" className="size-4" /> {selected.size > 0 ? `Export (${selected.size})` : 'Export'}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setDialog({ cohortId: null })}>
              <Plus aria-hidden="true" className="size-4" /> Add Cohort
            </Button>
          </>
        )}
      />

      <div role="tablist" aria-label="Cohort status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_150px_190px_180px_150px_170px]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search cohorts" placeholder="Search by cohort, code, subject, course or instructor…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <select aria-label="Cohort date" className={SELECT_CLASS} value={filters.month} onChange={(e) => set({ month: e.target.value })}>
            <option value="">All Dates</option>
            {months.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <select aria-label="Course" className={SELECT_CLASS} value={filters.courseId} onChange={(e) => set({ courseId: e.target.value })}>
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select aria-label="Subject" className={SELECT_CLASS} value={filters.subjectId} onChange={(e) => set({ subjectId: e.target.value })}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select aria-label="Language" className={SELECT_CLASS} value={filters.languageId} onChange={(e) => set({ languageId: e.target.value })}>
            <option value="">All Languages</option>
            {languages.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <select aria-label="Instructor" className={SELECT_CLASS} value={filters.instructorId} onChange={(e) => set({ instructorId: e.target.value })}>
            <option value="">All Instructors</option>
            {instructors.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <select aria-label="Status" className={`${SELECT_CLASS} md:w-40`} value={filters.status} onChange={(e) => set({ status: e.target.value as CohortFilters['status'] })}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="upcoming">Upcoming</option>
          </select>
          <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={Users}
            title={rows.length === 0 ? 'No cohorts yet.' : 'No cohorts match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => setDialog({ cohortId: null })}>Add the first cohort</Button>
              : <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox aria-label="Select all cohorts on this page" checked={allOnPage} onCheckedChange={togglePage} />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Cohort ID" k="cohortId" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Cohort Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Cohort Date" k="month" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Subject" k="subject" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Programs" k="course" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Language" k="language" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Instructor" k="instructor" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="No. of Students" k="students" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} className="text-right" />
                <SortHead label="Live Classes" k="liveClasses" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} className="text-right" />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((c, i) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox aria-label={`Select ${c.code}`} checked={selected.has(c.id)} onCheckedChange={(v) => toggleOne(c.id, v === true)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{String((safePage - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</TableCell>
                  <TableCell><Pill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Pill></TableCell>
                  <TableCell>
                    <button type="button" onClick={() => view(c)} className="font-mono text-xs font-medium text-primary hover:underline">{c.cohortId}</button>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{c.code || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{c.month || '—'}</TableCell>
                  <TableCell className="max-w-[220px] text-sm">{c.subject || '—'}</TableCell>
                  <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                    {c.courses.length > 1 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.courses.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{t}</span>)}
                      </div>
                    ) : c.courses[0] || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.language || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.instructor || '—'}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{c.students}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{c.liveClasses}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${c.code || c.cohortId}`}>
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => view(c)}><Eye aria-hidden="true" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDialog({ cohortId: c.id })}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => view(c)}><Users aria-hidden="true" /> Students</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => void remove(c)}><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="cohorts" onPage={setPage} />
      </Card>

      <CohortFormDialog
        open={dialog !== null}
        cohortId={dialog?.cohortId ?? null}
        api={api}
        token={session.token}
        onClose={() => setDialog(null)}
        onSaved={() => { setDialog(null); reload(); }}
      />
    </div>
  );
}
