import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, FolderOpen, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import {
  allSelected, dialogStyle, envelopeMessage, errorMessage, exportLabel, nextSort, pageSlice, rowsToExport, statusLabel, statusPills, statusTone, toggleId, togglePage, type SortDir,
} from '../course/catalog-list-model.js';
import { Chips, DIALOG_CLASS, FILTER_CARD, Field, ListHeader, LoadError, PAGE_CARD, Pager, RowActions, SELECT_CLASS, SelectCell, SortHead, StatusPills, TEXTAREA_CLASS } from '../course/catalog-ui.js';
import {
  EMPTY_PROGRAM_FILTERS, filterPrograms, programCsvRows, sortPrograms, toProgramRows,
  type ProgramFilters, type ProgramRow, type ProgramSortKey,
} from './program-list-model.js';

// Courses → Programs (TTII 2026-10-12), rebuilt after Naji's ProgramsModule:
// status pills, a filter card (search / course / status), a sortable paged
// table with row selection + CSV export, and the row "…" menu. Same endpoints
// and the same create / edit / delete rules as before; errors are now toasted
// instead of silently swallowed.

const PAGE_SIZE = 8;

interface ProgramForm {
  title: string;
  code: string;
  description: string;
}

const emptyForm: ProgramForm = { title: '', code: '', description: '' };

export default function ProgramDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<ProgramFilters>(EMPTY_PROGRAM_FILTERS);
  const [sort, setSort] = useState<{ key: ProgramSortKey; dir: SortDir }>({ key: 'title', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<ProgramForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(() => api.listPrograms(session.token), []);

  const rows = useMemo(() => toProgramRows(data ?? []), [data]);
  const courseNames = useMemo(() => [...new Set(rows.flatMap((p) => p.courses))].sort(), [rows]);
  const pills = useMemo(() => statusPills(rows.map((p) => p.status), ['active', 'inactive', 'draft']), [rows]);
  const filtered = useMemo(() => sortPrograms(filterPrograms(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const slice = pageSlice(filtered, page, PAGE_SIZE);
  const pageIds = slice.current.map((p) => p.id);

  const set = (patch: Partial<ProgramFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const closeForm = () => { setShowForm(false); setEditId(''); setForm(emptyForm); };

  const openAdd = useCallback(() => { setEditId(''); setForm(emptyForm); setShowForm(true); }, []);

  const openEdit = useCallback(async (p: ProgramRow) => {
    try {
      const program = await api.getProgram(session.token, p.id);
      if (!program) { toast.error('This program could not be found.'); return; }
      setEditId(p.id);
      setForm({ title: asString(program.title), code: asString(program.code), description: asString(program.description) });
      setShowForm(true);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load the program.'));
    }
  }, [api, session.token]);

  const save = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      const res = editId
        ? await api.updateProgram(session.token, editId, payload)
        : await api.createProgram(session.token, payload);
      toast.success(envelopeMessage(res, editId ? 'Program updated.' : 'Program created.'));
      closeForm();
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the program.'));
    } finally {
      setSaving(false);
    }
  }, [api, session.token, editId, form, reload]);

  const remove = useCallback(async (p: ProgramRow) => {
    if (!(await confirm({
      title: `Delete program "${p.title}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.deleteProgram(session.token, p.id);
      toast.success(envelopeMessage(res, 'Program deleted.'));
      setSelected((s) => toggleId(s, p.id, false));
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the program.'));
    }
  }, [api, session.token, reload, confirm]);

  const exportCsv = () => downloadCsv('programs.csv', toCsv(programCsvRows(rowsToExport(filtered, selected))));
  const view = (p: ProgramRow) => onNavigate(`/admin/programs/view/${p.id}`);

  if (loading) return <PageLoader label="Loading program directory..." />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <ListHeader
        title="Programs"
        shown={filtered.length}
        total={rows.length}
        noun="programs"
        exportLabel={exportLabel(selected.size)}
        onExport={exportCsv}
        newLabel="New Program"
        onNew={openAdd}
      />

      <StatusPills label="Program status" pills={pills} total={rows.length} active={filters.status} onChange={(status) => set({ status })} />

      <Card className={FILTER_CARD}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search programs" placeholder="Search by name, code or description…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <select aria-label="Course" className={`${SELECT_CLASS} md:w-56`} value={filters.course} onChange={(e) => set({ course: e.target.value })}>
            <option value="">All Courses</option>
            {courseNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Status" className={`${SELECT_CLASS} md:w-36`} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All Status</option>
            {pills.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setFilters(EMPTY_PROGRAM_FILTERS); setPage(1); }}>Reset filters</Button>
        </div>
      </Card>

      <Card className={PAGE_CARD}>
        {slice.current.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={rows.length === 0 ? 'No programs yet.' : 'No programs match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={openAdd}>Create the first program</Button>
              : <Button variant="outline" size="sm" onClick={() => { setFilters(EMPTY_PROGRAM_FILTERS); setPage(1); }}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <SelectCell label="Select all programs on this page" checked={allSelected(selected, pageIds)} onChange={() => setSelected((s) => togglePage(s, pageIds))} />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Program Name" k="title" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Description" k="description" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="No of Courses" k="courseCount" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} className="text-right" />
                <SortHead label="Courses" k="courses" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={(k) => setSort((s) => nextSort(s, k))} />
                <TableHead className="text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.current.map((p, i) => (
                <TableRow key={p.id} className="align-top hover:bg-muted/30">
                  <TableCell className="pt-4">
                    <SelectCell label={`Select ${p.title}`} checked={selected.has(p.id)} onChange={(on) => setSelected((s) => toggleId(s, p.id, on))} />
                  </TableCell>
                  <TableCell className="pt-4 text-xs font-medium text-primary">{(slice.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="pt-4 text-sm font-medium">{p.code || '—'}</TableCell>
                  <TableCell className="pt-4 text-sm font-medium">
                    <button type="button" onClick={() => view(p)} className="text-left hover:text-primary hover:underline">{p.title}</button>
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal pt-4 text-sm text-muted-foreground">
                    {p.description ? <p title={p.description} className="line-clamp-2 break-words">{p.description}</p> : '—'}
                  </TableCell>
                  <TableCell className="pt-4 text-right text-sm font-medium tabular-nums text-primary">{p.courseCount}</TableCell>
                  <TableCell className="whitespace-normal pt-4"><Chips names={p.courses} max={3} /></TableCell>
                  <TableCell className="pt-4"><Pill tone={statusTone(p.status)}>{statusLabel(p.status)}</Pill></TableCell>
                  <TableCell className="pt-4 text-right">
                    <RowActions
                      name={p.title}
                      actions={[
                        { label: 'View', icon: Eye, onSelect: () => view(p) },
                        { label: 'Edit', icon: Pencil, onSelect: () => void openEdit(p) },
                        { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => void remove(p) },
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

      <Dialog open={showForm} onOpenChange={(open) => { if (!open && !saving) closeForm(); }}>
        <DialogContent className={DIALOG_CLASS} style={dialogStyle(560)}>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
              <DialogTitle>{editId ? 'Edit Program' : 'New Program'}</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <Field label="Program Code" htmlFor="program-code">
                <Input id="program-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. DME-2025" />
              </Field>
              <Field label="Program Name" htmlFor="program-name" required>
                <Input
                  id="program-name"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setForm((f) => ({ ...f, title: next })); }}
                  placeholder="e.g. Diploma in Montessori Education"
                />
              </Field>
              <Field label="Program Description" htmlFor="program-description">
                <textarea
                  id="program-description"
                  rows={4}
                  className={TEXTAREA_CLASS}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of the program"
                />
              </Field>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 px-6 py-3">
              <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim()}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
