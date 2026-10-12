import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, FileStack, Pencil, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, Pill, type Tone } from '../../shared/components/ui-kit.js';
import { toRecords } from '../../shared/utils/admin-data-utils.js';
import {
  allSelected, distinctValues, envelopeMessage, errorMessage, exportLabel, formatDmy, nextSort, pageSlice, rowsToExport, toggleId, togglePage, type SortDir,
} from '../course/catalog-list-model.js';
import { FILTER_CARD, ListHeader, LoadError, PAGE_CARD, Pager, RowActions, SELECT_CLASS, SelectCell, SortHead } from '../course/catalog-ui.js';
import { AssetFormDialog } from './AssetFormDialog.js';
import { AssetPreviewDialog } from './AssetPreviewDialog.js';
import {
  EMPTY_ASSET_FILTERS, EMPTY_ASSET_FORM, assetCsvRows, assetTypeOptions, buildLessonPicker, filterAssets, formFromAsset, sortAssets,
  subjectTagChoices, toAssetRows, type AssetFilters, type AssetForm, type AssetRow, type AssetSortKey,
} from './content-library-model.js';

// Courses → Content Library (TTII 2026-10-12), rebuilt after Naji's
// ContentLibraryModule. This is the content_asset store only (the Lesson
// Builder's lesson_files are managed in the builder). Assets carry no publish
// status, so the prototype's status pills and Status column are left out; the
// Duration and Created On columns stay. Type now filters in the browser over
// the same list instead of re-fetching per type.

const PAGE_SIZE = 10;

const TYPE_TONE: Record<string, Tone> = { video: 'primary', audio: 'blue', article: 'slate', document: 'slate', quiz: 'amber' };

export default function ContentLibraryPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<AssetFilters>(EMPTY_ASSET_FILTERS);
  const [sort, setSort] = useState<{ key: AssetSortKey; dir: SortDir }>({ key: 'contentId', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; editId: string; initial: AssetForm }>({ open: false, editId: '', initial: EMPTY_ASSET_FORM });
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);

  const { data, loading, error, reload } = useAdminPageData(() => api.listContentAssets(session.token), []);
  const { data: languagesData } = useAdminPageData(() => api.loadLanguages(session.token), []);
  // Subjects + lessons (across all courses) power the Subject Tag / Lesson Tag
  // pickers — Risha 2026-05-30 wanted both pick-from-list.
  const { data: subjectsData } = useAdminPageData(() => api.listAllSubjects(session.token), []);
  const { data: lessonsData } = useAdminPageData(() => api.listAllLessonsAdmin(session.token), []);

  const rows = useMemo(() => toAssetRows(data ?? []), [data]);
  const languages = useMemo(() => toRecords(languagesData), [languagesData]);
  const subjectChoices = useMemo(() => subjectTagChoices(toRecords(subjectsData)), [subjectsData]);
  const picker = useMemo(() => buildLessonPicker(toRecords(lessonsData)), [lessonsData]);

  const typeOptions = useMemo(() => assetTypeOptions(rows), [rows]);
  const subjectTags = useMemo(() => distinctValues(rows.map((r) => r.subjectTag)), [rows]);
  const lessonTags = useMemo(() => distinctValues(rows.map((r) => r.lessonTag)), [rows]);
  const creators = useMemo(() => distinctValues(rows.map((r) => r.createdBy)), [rows]);
  const filtered = useMemo(() => sortAssets(filterAssets(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const slice = pageSlice(filtered, page, PAGE_SIZE);
  const pageIds = slice.current.map((a) => a.id);

  const set = (patch: Partial<AssetFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const clear = () => { setFilters(EMPTY_ASSET_FILTERS); setPage(1); };
  const onSort = (k: AssetSortKey) => setSort((s) => nextSort(s, k));
  const closeForm = useCallback(() => setForm((f) => ({ ...f, open: false })), []);
  const openAdd = () => setForm({ open: true, editId: '', initial: EMPTY_ASSET_FORM });

  const openEdit = useCallback(async (a: AssetRow) => {
    try {
      const asset = await api.getContentAsset(session.token, a.id);
      if (!asset) { toast.error('This asset could not be found.'); return; }
      setForm({ open: true, editId: a.id, initial: formFromAsset(asset) });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load the asset.'));
    }
  }, [api, session.token]);

  const openPreview = useCallback(async (a: AssetRow) => {
    // Show the list row at once, then fetch the full asset so a quiz preview
    // has its `questions` (the list only carries question_count).
    setPreview(a.raw);
    if (a.type !== 'quiz') return;
    try {
      const full = await api.getContentAsset(session.token, a.id);
      if (full) setPreview(full);
    } catch { /* keep the row-level preview */ }
  }, [api, session.token]);

  const remove = useCallback(async (a: AssetRow) => {
    if (!(await confirm({
      title: `Delete asset "${a.title}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.deleteContentAsset(session.token, a.id);
      toast.success(envelopeMessage(res, 'Asset deleted.'));
      setSelected((s) => toggleId(s, a.id, false));
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the asset.'));
    }
  }, [api, session.token, reload, confirm]);

  const exportCsv = () => downloadCsv('content-library.csv', toCsv(assetCsvRows(rowsToExport(filtered, selected))));

  if (loading) return <PageLoader label="Loading content library..." />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <ListHeader
        title="Content Library"
        shown={filtered.length}
        total={rows.length}
        noun="assets"
        exportLabel={exportLabel(selected.size)}
        onExport={exportCsv}
        newLabel="New Asset"
        onNew={openAdd}
      />

      <Card className={FILTER_CARD}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search assets" placeholder="Title, ID, tags…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <select aria-label="Type" className={`${SELECT_CLASS} capitalize xl:w-36`} value={filters.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="">All Types</option>
            {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Subject Tag" className={`${SELECT_CLASS} xl:w-48`} value={filters.subjectTag} onChange={(e) => set({ subjectTag: e.target.value })}>
            <option value="">All Subjects</option>
            {subjectTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Lesson Tag" className={`${SELECT_CLASS} xl:w-48`} value={filters.lessonTag} onChange={(e) => set({ lessonTag: e.target.value })}>
            <option value="">All Lessons</option>
            {lessonTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Created By" className={`${SELECT_CLASS} xl:w-36`} value={filters.createdBy} onChange={(e) => set({ createdBy: e.target.value })}>
            <option value="">Anyone</option>
            {creators.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clear}>
            <X aria-hidden="true" className="size-4" /> Clear
          </Button>
        </div>
      </Card>

      <Card className={PAGE_CARD}>
        {rows.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title="No content assets yet."
            body="Click New Asset to add the first one. Legacy lesson content from the old LMS lives under each course's Lessons section, not here — the Content Library is a standalone repository for reusable assets."
            action={<Button size="sm" onClick={openAdd}>New Asset</Button>}
          />
        ) : slice.current.length === 0 ? (
          <EmptyState icon={FileStack} title="No assets match your filters." action={<Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <SelectCell label="Select all assets on this page" checked={allSelected(selected, pageIds)} onChange={() => setSelected((s) => togglePage(s, pageIds))} />
                </TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Content ID" k="contentId" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-xs">Preview</TableHead>
                <SortHead label="Title" k="title" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Type" k="type" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Subject Tag" k="subjectTag" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Lesson Tag" k="lessonTag" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Duration" k="duration" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Created By" k="createdBy" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Created On" k="createdAt" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.current.map((a, i) => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell>
                    <SelectCell label={`Select ${a.title}`} checked={selected.has(a.id)} onChange={(on) => setSelected((s) => toggleId(s, a.id, on))} />
                  </TableCell>
                  <TableCell className="text-xs font-medium text-primary">{(slice.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{a.contentId}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="size-8" aria-label={`Preview ${a.title}`} onClick={() => void openPreview(a)}>
                      <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                  <TableCell className="max-w-[280px] text-sm">
                    <button type="button" onClick={() => void openPreview(a)} className="text-left font-medium text-primary hover:underline">{a.title}</button>
                  </TableCell>
                  <TableCell><Pill tone={TYPE_TONE[a.type] ?? 'slate'} className="capitalize">{a.type || '—'}</Pill></TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm" title={a.subjectTag}>{a.subjectTag || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm" title={a.lessonTag}>{a.lessonTag || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.duration || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.createdBy || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDmy(a.createdAt) || '—'}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      name={a.title}
                      actions={[
                        { label: 'Preview', icon: Eye, onSelect: () => void openPreview(a) },
                        { label: 'Edit', icon: Pencil, onSelect: () => void openEdit(a) },
                        { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => void remove(a) },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows.length > 0 ? <Pager shown={slice.current.length} total={filtered.length} page={slice.page} pages={slice.pages} onPage={setPage} /> : null}
      </Card>

      <AssetFormDialog
        open={form.open}
        editId={form.editId}
        initial={form.initial}
        languages={languages}
        subjectChoices={subjectChoices}
        picker={picker}
        api={api}
        token={session.token}
        onClose={closeForm}
        onSaved={reload}
      />
      <AssetPreviewDialog asset={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
