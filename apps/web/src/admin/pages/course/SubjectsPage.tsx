import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FolderOpen, Library, Pencil, Search, Trash2, X } from 'lucide-react';
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
  allSelected, distinctOptions, envelopeMessage, errorMessage, exportLabel, nextSort, pageSlice, rowsToExport, statusLabel, statusPills, statusTone, toggleId, togglePage, type SortDir,
} from './catalog-list-model.js';
import { Chips, FILTER_CARD, ListHeader, LoadError, PAGE_CARD, Pager, RowActions, SELECT_CLASS, SelectCell, SortHead, StatusPills } from './catalog-ui.js';
import {
  EMPTY_SUBJECT_FILTERS, SUBJECT_STATUS_ORDER, filterSubjects, sortSubjects, subjectCsvRows, subjectTypeOptions, toSubjectRows,
  type SubjectFilters, type SubjectRow, type SubjectSortKey,
} from './subject-list-model.js';
import { SubjectFormDialog } from './SubjectFormDialog.js';

// Courses → Subjects (TTII 2026-10-12), rebuilt after Naji's SubjectsModule.
// Subjects are shared across courses (course_subject), so the Courses column
// and filter use the full linked list. Title / Manage Content open the
// subject's content page; Edit and Delete keep their endpoints and rules.

const PAGE_SIZE = 10;

export default function SubjectsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<SubjectFilters>(EMPTY_SUBJECT_FILTERS);
  const [sort, setSort] = useState<{ key: SubjectSortKey; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);

  const { data, loading, error, reload } = useAdminPageData(() => api.listAllSubjects(session.token), []);

  const rawRows = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => toSubjectRows(rawRows), [rawRows]);
  const pills = useMemo(() => statusPills(rows.map((s) => s.status), SUBJECT_STATUS_ORDER), [rows]);
  const courseOptions = useMemo(() => distinctOptions(rows.flatMap((s) => s.courses)), [rows]);
  const typeOptions = useMemo(() => subjectTypeOptions(rows), [rows]);
  const filtered = useMemo(() => sortSubjects(filterSubjects(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const slice = pageSlice(filtered, page, PAGE_SIZE);
  const pageIds = slice.current.map((s) => s.id);

  const set = (patch: Partial<SubjectFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const clear = () => { setFilters(EMPTY_SUBJECT_FILTERS); setPage(1); };
  const onSort = (k: SubjectSortKey) => setSort((s) => nextSort(s, k));
  const openContent = (s: SubjectRow) => onNavigate(`/admin/subjects/view/${s.id}`);
  const openAdd = () => { setEditRow(null); setFormOpen(true); };
  const closeForm = useCallback(() => { setFormOpen(false); setEditRow(null); }, []);

  const remove = useCallback(async (s: SubjectRow) => {
    if (!(await confirm({
      title: `Delete subject "${s.title}"?`,
      description: 'This will detach the subject from any course it is linked to. This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.deleteSubject(session.token, s.id);
      toast.success(envelopeMessage(res, 'Subject deleted.'));
      setSelected((sel) => toggleId(sel, s.id, false));
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete subject'));
    }
  }, [api, session.token, reload, confirm]);

  const exportCsv = () => downloadCsv('subjects.csv', toCsv(subjectCsvRows(rowsToExport(filtered, selected))));

  if (loading) return <PageLoader label="Loading subjects..." />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <ListHeader
        title="Subjects"
        shown={filtered.length}
        total={rows.length}
        noun="subjects"
        exportLabel={exportLabel(selected.size)}
        onExport={exportCsv}
        newLabel="Add Subject"
        onNew={openAdd}
      />

      <StatusPills label="Subject status" pills={pills} total={rows.length} active={filters.status} onChange={(status) => set({ status })} />

      <Card className={FILTER_CARD}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search subjects" placeholder="Title, code, course…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <select aria-label="Course" className={`${SELECT_CLASS} md:w-56`} value={filters.course} onChange={(e) => set({ course: e.target.value })}>
            <option value="">All Courses</option>
            {courseOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select aria-label="Type" className={`${SELECT_CLASS} md:w-36`} value={filters.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="">All Types</option>
            {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Status" className={`${SELECT_CLASS} md:w-36`} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All Status</option>
            {pills.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clear}>
            <X aria-hidden="true" className="size-4" /> Clear
          </Button>
        </div>
      </Card>

      <Card className={PAGE_CARD}>
        {slice.current.length === 0 ? (
          <EmptyState
            icon={Library}
            title={rows.length === 0 ? 'No subjects yet.' : 'No subjects match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={openAdd}>Add the first subject</Button>
              : <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <SelectCell label="Select all subjects on this page" checked={allSelected(selected, pageIds)} onChange={() => setSelected((s) => togglePage(s, pageIds))} />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Subject Title" k="title" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Courses" k="courses" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Type" k="type" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Hours" k="hours" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Version" k="version" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.current.map((s, i) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell>
                    <SelectCell label={`Select ${s.title}`} checked={selected.has(s.id)} onChange={(on) => setSelected((sel) => toggleId(sel, s.id, on))} />
                  </TableCell>
                  <TableCell className="text-xs font-medium text-primary">{(slice.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">{s.code || '—'}</TableCell>
                  <TableCell className="max-w-[280px] text-sm">
                    {/* Click the title to open the subject's content (lessons + items). */}
                    <button type="button" onClick={() => openContent(s)} className="text-left font-medium text-primary hover:underline">{s.title || '—'}</button>
                  </TableCell>
                  <TableCell className="whitespace-normal"><Chips names={s.courses.map((c) => c.title)} max={2} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.type || '—'}</TableCell>
                  <TableCell className="text-sm tabular-nums">{s.hours === null ? '—' : s.hours}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.version || '—'}</TableCell>
                  <TableCell><Pill tone={statusTone(s.status)}>{statusLabel(s.status)}</Pill></TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      name={s.title}
                      actions={[
                        // Risha 2026-05-30 — open a subject to see/manage all its lessons + content.
                        { label: 'Manage Content', icon: FolderOpen, onSelect: () => openContent(s) },
                        { label: 'Edit', icon: Pencil, onSelect: () => { setEditRow(s.raw); setFormOpen(true); } },
                        { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => void remove(s) },
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

      <SubjectFormDialog
        open={formOpen}
        editRow={editRow}
        allSubjects={rawRows}
        api={api}
        token={session.token}
        onClose={closeForm}
        onSaved={reload}
      />
    </div>
  );
}
