import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, BookOpen, Eye, Layers, Pencil, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import {
  allSelected, distinctValues, envelopeMessage, errorMessage, exportLabel, nextSort, pageSlice, rowsToExport, statusLabel, statusPills, statusTone, toggleId, togglePage, type SortDir,
} from './catalog-list-model.js';
import { FILTER_CARD, ListHeader, LoadError, PAGE_CARD, Pager, RowActions, SELECT_CLASS, SelectCell, SortHead, StatusPills } from './catalog-ui.js';
import {
  COURSE_STATUS_ORDER, EMPTY_COURSE_FILTERS, courseCsvRows, filterCourses, sortCourses, toCourseRows,
  type CourseFilters, type CourseRow, type CourseSortKey,
} from './course-list-model.js';

// Courses → Course Directory (TTII 2026-10-12), rebuilt after Naji's
// CoursesModule: status pills, search / status / level filters, a sortable
// paged table with selection + CSV export, and the row "…" menu. View, Edit,
// Subjects and Archive keep their existing routes and endpoint.

const PAGE_SIZE = 8;

export default function CourseDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<CourseFilters>(EMPTY_COURSE_FILTERS);
  const [sort, setSort] = useState<{ key: CourseSortKey; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, loading, error, reload } = useAdminPageData(() => api.listCoursesAdmin(session.token), [session.token]);

  const rows = useMemo(() => toCourseRows(data ?? []), [data]);
  const pills = useMemo(() => statusPills(rows.map((c) => c.status), COURSE_STATUS_ORDER), [rows]);
  const levels = useMemo(() => distinctValues(rows.map((c) => c.level)), [rows]);
  const filtered = useMemo(() => sortCourses(filterCourses(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const slice = pageSlice(filtered, page, PAGE_SIZE);
  const pageIds = slice.current.map((c) => c.id);

  const set = (patch: Partial<CourseFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const clear = () => { setFilters(EMPTY_COURSE_FILTERS); setPage(1); };
  const onSort = (k: CourseSortKey) => setSort((s) => nextSort(s, k));

  const archive = useCallback(async (c: CourseRow) => {
    if (!(await confirm({
      title: `Archive course "${c.title}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Archive',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.archiveCourse(session.token, c.id);
      toast.success(envelopeMessage(res, 'Course archived.'));
      setSelected((s) => toggleId(s, c.id, false));
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to archive course'));
    }
  }, [api, session.token, reload, confirm]);

  const exportCsv = () => downloadCsv('courses.csv', toCsv(courseCsvRows(rowsToExport(filtered, selected))));
  const view = (c: CourseRow) => onNavigate(`/admin/course/view/${c.id}`);

  if (loading) return <PageLoader label="Loading course directory..." />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <ListHeader
        crumb="Dashboard › Courses › Course Directory"
        title="Course Directory"
        shown={filtered.length}
        total={rows.length}
        noun="courses"
        exportLabel={exportLabel(selected.size)}
        onExport={exportCsv}
        newLabel="Create Course"
        onNew={() => onNavigate('/admin/course/add')}
      />

      <StatusPills label="Course status" pills={pills} total={rows.length} active={filters.status} onChange={(status) => set({ status })} />

      <Card className={FILTER_CARD}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search courses" placeholder="Search by course title or code…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <select aria-label="Status" className={`${SELECT_CLASS} md:w-40`} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All Status</option>
            {pills.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select aria-label="Level" className={`${SELECT_CLASS} md:w-44`} value={filters.level} onChange={(e) => set({ level: e.target.value })}>
            <option value="">All Levels</option>
            {levels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clear}>
            <X aria-hidden="true" className="size-4" /> Clear
          </Button>
        </div>
      </Card>

      <Card className={PAGE_CARD}>
        {slice.current.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={rows.length === 0 ? 'No courses yet.' : 'No courses match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => onNavigate('/admin/course/add')}>Create the first course</Button>
              : <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <SelectCell label="Select all courses on this page" checked={allSelected(selected, pageIds)} onChange={() => setSelected((s) => togglePage(s, pageIds))} />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Course Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course Title" k="title" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course Level" k="level" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course Duration" k="duration" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.current.map((c, i) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <SelectCell label={`Select ${c.title}`} checked={selected.has(c.id)} onChange={(on) => setSelected((s) => toggleId(s, c.id, on))} />
                  </TableCell>
                  <TableCell className="text-xs font-medium text-primary">{(slice.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="text-sm font-medium">{c.code || '—'}</TableCell>
                  <TableCell className="max-w-[320px] text-sm">
                    <button type="button" onClick={() => view(c)} className="text-left font-medium text-primary hover:underline">{c.title}</button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.level || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.duration || '—'}</TableCell>
                  <TableCell><Pill tone={statusTone(c.status)}>{statusLabel(c.status)}</Pill></TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      name={c.title}
                      actions={[
                        { label: 'View', icon: Eye, onSelect: () => view(c) },
                        { label: 'Edit', icon: Pencil, onSelect: () => onNavigate(`/admin/course/edit/${c.id}`) },
                        { label: 'Subjects', icon: Layers, onSelect: () => onNavigate(`/admin/course/subjects/${c.id}`) },
                        { label: 'Archive Course', icon: Archive, destructive: true, onSelect: () => void archive(c) },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager shown={slice.current.length} total={filtered.length} page={slice.page} pages={slice.pages} onPage={setPage} />
      </Card>
    </div>
  );
}
