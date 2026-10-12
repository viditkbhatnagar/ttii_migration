import { useMemo, useState } from 'react';
import { BookOpen, Eye, Hammer, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import {
  allSelected, dialogStyle, exportLabel, nextSort, pageSlice, rowsToExport, toggleId, togglePage, type SortDir,
} from '../course/catalog-list-model.js';
import { Chips, DIALOG_CLASS, FILTER_CARD, ListHeader, LoadError, PAGE_CARD, Pager, RowActions, SELECT_CLASS, SelectCell, SortHead } from '../course/catalog-ui.js';
import {
  EMPTY_LESSON_FILTERS, builderHref, filterLessons, lessonCourseOptions, lessonCsvRows, lessonSubjectOptions, sortLessons, toLessonRows,
  type AccessFilter, type LessonFilters, type LessonRow, type LessonSortKey,
} from './lesson-list-model.js';

// Courses → Lessons (TTII 2026-10-12), rebuilt after Naji's LessonsModule.
// Flat table of every live lesson (Naji 2026-04-30); Add / Edit go to the
// Lesson Builder, which owns files, rename and save-on-drop reorder. Lessons
// have no publish status, so the status pills of the prototype are left out.

const PAGE_SIZE = 10;

function AccessPill({ free }: { free: boolean }) {
  return <Pill tone={free ? 'emerald' : 'slate'}>{free ? 'Free' : 'Paid'}</Pill>;
}

function LessonViewDialog({ lesson, onClose, onBuilder }: { lesson: LessonRow | null; onClose: () => void; onBuilder: (l: LessonRow) => void }) {
  const facts: Array<[string, React.ReactNode]> = lesson
    ? [
        ['Subject', lesson.subjectTitle || '—'],
        ['Courses', <Chips key="c" names={lesson.courses.map((c) => c.title)} max={6} />],
        ['Files', lesson.files],
        ['Access', <AccessPill key="a" free={lesson.free} />],
        ['Order in subject', lesson.order],
      ]
    : [];
  return (
    <Dialog open={lesson !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={DIALOG_CLASS} style={dialogStyle(640)}>
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
          <DialogTitle>{lesson?.title || 'Lesson'}</DialogTitle>
          <DialogDescription>Lesson details</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Summary</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{lesson?.summary || '—'}</p>
          </div>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {lesson ? (
            <Button className="gap-1.5" onClick={() => onBuilder(lesson)}>
              <Hammer aria-hidden="true" className="size-4" /> Open Builder
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LessonsListPage({ api, session, onNavigate }: AdminPageProps) {
  const [filters, setFilters] = useState<LessonFilters>(EMPTY_LESSON_FILTERS);
  const [sort, setSort] = useState<{ key: LessonSortKey; dir: SortDir }>({ key: 'subject', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<LessonRow | null>(null);

  const { data, loading, error, reload } = useAdminPageData(() => api.listAllLessonsAdmin(session.token), []);

  const rows = useMemo(() => toLessonRows(data ?? []), [data]);
  const courseOptions = useMemo(() => lessonCourseOptions(rows), [rows]);
  const subjectOptions = useMemo(() => lessonSubjectOptions(rows, filters.course), [rows, filters.course]);
  const filtered = useMemo(() => sortLessons(filterLessons(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const slice = pageSlice(filtered, page, PAGE_SIZE);
  const pageIds = slice.current.map((l) => l.id);

  const set = (patch: Partial<LessonFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const clear = () => { setFilters(EMPTY_LESSON_FILTERS); setPage(1); };
  const onSort = (k: LessonSortKey) => setSort((s) => nextSort(s, k));
  // Send the admin into the per-subject builder, pre-selected to this lesson's
  // parent subject; it manages files / reorder / edit metadata.
  const openBuilder = (l: LessonRow) => onNavigate(builderHref(l));


  const exportCsv = () => downloadCsv('lessons.csv', toCsv(lessonCsvRows(rowsToExport(filtered, selected))));

  if (loading) return <PageLoader label="Loading lessons..." />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <ListHeader
        title="Lessons"
        shown={filtered.length}
        total={rows.length}
        noun="lessons"
        exportLabel={exportLabel(selected.size)}
        onExport={exportCsv}
        newLabel="Add Lesson"
        onNew={() => onNavigate('/admin/course_new/builder')}
      />

      <Card className={FILTER_CARD}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search lessons" placeholder="Title, course, subject…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          {/* Changing the course clears the subject — keeps the picker honest. */}
          <select aria-label="Course" className={`${SELECT_CLASS} md:w-56`} value={filters.course} onChange={(e) => set({ course: e.target.value, subject: '' })}>
            <option value="">All Courses</option>
            {courseOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select aria-label="Subject" className={`${SELECT_CLASS} md:w-56`} value={filters.subject} onChange={(e) => set({ subject: e.target.value })}>
            <option value="">All Subjects</option>
            {subjectOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select aria-label="Access" className={`${SELECT_CLASS} md:w-32`} value={filters.access} onChange={(e) => set({ access: e.target.value as AccessFilter })}>
            <option value="">All Access</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
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
            title={rows.length === 0 ? 'No lessons yet.' : 'No lessons match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => onNavigate('/admin/course_new/builder')}>Add the first lesson</Button>
              : <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <SelectCell label="Select all lessons on this page" checked={allSelected(selected, pageIds)} onChange={() => setSelected((s) => togglePage(s, pageIds))} />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Lesson" k="title" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Summary" k="summary" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Subject" k="subject" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Files" k="files" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Access" k="access" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Order" k="order" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.current.map((l, i) => (
                <TableRow key={l.id} className="hover:bg-muted/30">
                  <TableCell>
                    <SelectCell label={`Select ${l.title}`} checked={selected.has(l.id)} onChange={(on) => setSelected((s) => toggleId(s, l.id, on))} />
                  </TableCell>
                  <TableCell className="text-xs font-medium text-primary">{(slice.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="max-w-[260px] text-sm">
                    <button type="button" onClick={() => setViewing(l)} className="text-left font-medium text-primary hover:underline">{l.title || '—'}</button>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={l.summary}>{l.summary || '—'}</TableCell>
                  <TableCell className="whitespace-normal"><Chips names={l.courses.map((c) => c.title)} max={2} /></TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm" title={l.subjectTitle}>{l.subjectTitle || '—'}</TableCell>
                  <TableCell className="text-sm tabular-nums">{l.files}</TableCell>
                  <TableCell><AccessPill free={l.free} /></TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">{l.order}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      name={l.title}
                      actions={[
                        { label: 'View', icon: Eye, onSelect: () => setViewing(l) },
                        { label: 'Open Builder', icon: Hammer, onSelect: () => openBuilder(l) },
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

      <LessonViewDialog lesson={viewing} onClose={() => setViewing(null)} onBuilder={(l) => { setViewing(null); openBuilder(l); }} />
    </div>
  );
}
