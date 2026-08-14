import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Library, Plus, Eye, Trash2, ExternalLink, Video, Music, FileQuestion, FileText, Check, Search, Link2, CopyPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { ContentPreviewDialog, type ContentPreviewRow } from '../../shared/components/content-preview-dialog.js';
import { LessonFileFormDialog, type LessonFileType } from './LessonFileFormDialog.js';

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const ADD_TYPES: LessonFileType[] = ['video', 'audio', 'article', 'document', 'quiz'];
const TYPE_LABEL: Record<string, string> = {
  video: 'Video', audio: 'Audio', article: 'Article', document: 'Document', quiz: 'Quiz',
};

/** Unified shape for a content row, whether it comes from lesson_files
 * ('lesson') or the Content Library / content_asset ('library'). The preview
 * fields live in ContentPreviewRow, shared with the Subject Detail page. */
interface ContentRow extends ContentPreviewRow {
  url: string;
}

function TypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === 'video') return <Video aria-hidden="true" className="size-4 text-blue-600" />;
  if (t === 'audio') return <Music aria-hidden="true" className="size-4 text-purple-600" />;
  if (t === 'quiz') return <FileQuestion aria-hidden="true" className="size-4 text-orange-600" />;
  return <FileText aria-hidden="true" className="size-4 text-slate-500" />;
}

/* ─── Content Library picker ──────────────────────────────────────────────── */

function LibraryPickerDialog({
  api, token, lessonId, open, onClose, onAttached,
}: {
  api: AdminPageProps['api'];
  token: string;
  lessonId: string;
  open: boolean;
  onClose: () => void;
  onAttached: () => void;
}) {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [attachingId, setAttachingId] = useState('');

  const { data, loading, reload } = useAdminPageData(
    () => (open ? api.listContentAssets(token) : Promise.resolve([])),
    [open],
  );
  const assets = useMemo(() => toRecords(data), [data]);

  // Issue 3 (Ishfaq 2026-06-24) — also browse EXISTING lesson files from other
  // lessons so content that lives only in lesson_files (e.g. another course's
  // documents) can be COPIED in, not just Content-Library items.
  const [mode, setMode] = useState<'library' | 'files'>('library');
  const [copyingId, setCopyingId] = useState('');
  const { data: filesData, loading: filesLoading, reload: reloadOtherFiles } = useAdminPageData(
    () => (open ? api.listAttachableFiles(token, lessonId) : Promise.resolve([])),
    [open, lessonId],
  );
  const otherFiles = useMemo(() => toRecords(filesData), [filesData]);

  useEffect(() => { if (!open) { setSearch(''); setTypeFilter(''); setMode('library'); } }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (typeFilter && asString(a.asset_type).toLowerCase() !== typeFilter) return false;
      if (q && !asString(a.title).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, search, typeFilter]);

  const attach = async (asset: Record<string, unknown>) => {
    const assetId = asString(asset.id);
    const currentLesson = asString(asset.lesson_id);
    if (currentLesson && currentLesson !== lessonId) {
      // content_asset.lesson_id is a single FK — attaching here detaches it
      // from wherever it currently lives. Make that explicit, not silent.
      const ok = await confirm({
        title: 'Move content to this lesson?',
        description: 'This item is currently attached to another lesson. Attaching it here will remove it from that lesson.',
        confirmText: 'Move here',
        variant: 'destructive',
      });
      if (!ok) return;
    }
    setAttachingId(assetId);
    try {
      await api.linkAssetToLesson(token, lessonId, assetId);
      toast.success('Content attached to lesson.');
      reload();
      onAttached();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not attach content.');
    } finally {
      setAttachingId('');
    }
  };

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return otherFiles.filter((f) => {
      if (typeFilter && asString(f.lesson_type).toLowerCase() !== typeFilter) return false;
      if (q) {
        const hay = `${asString(f.title)} ${asString(f.lesson_title)} ${asString(f.course_title)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [otherFiles, search, typeFilter]);

  const copyFile = async (file: Record<string, unknown>) => {
    const fileId = asString(file.id);
    setCopyingId(fileId);
    try {
      await api.copyLessonFileInto(token, fileId, lessonId);
      toast.success('Content copied into this lesson.');
      reloadOtherFiles();
      onAttached();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not copy content.');
    } finally {
      setCopyingId('');
    }
  };

  const toggleClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
      active ? 'border-ttii-primary bg-ttii-primary/5 text-ttii-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto"
        style={{ width: 'min(680px, calc(100vw - 2rem))', maxWidth: 'min(680px, calc(100vw - 2rem))' }}
      >
        <DialogHeader>
          <DialogTitle>Attach existing content</DialogTitle>
          <DialogDescription>
            Attach items from the Content Library, or copy a file that already exists on another lesson into this one.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setMode('library'); setTypeFilter(''); }} className={toggleClass(mode === 'library')}>
            Content Library
          </button>
          <button type="button" onClick={() => { setMode('files'); setTypeFilter(''); }} className={toggleClass(mode === 'files')}>
            From another lesson
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={mode === 'library' ? 'Search content by title…' : 'Search by file, lesson or course…'}
              className="pl-8"
            />
          </div>
          <select className={`${selectClass} sm:w-40`} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {ADD_TYPES.filter((t) => mode === 'library' || t !== 'quiz').map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </div>

        {mode === 'library' ? (
          <div className="mt-3 space-y-1.5">
            {loading ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : filtered.length === 0 ? (
              <p className="rounded-md border border-dashed py-8 text-center text-sm text-slate-500">
                {assets.length === 0 ? 'No content in the library yet. Add items in the Content Library first.' : 'No items match your filters.'}
              </p>
            ) : (
              filtered.map((a) => {
                const assetId = asString(a.id);
                const assetLesson = asString(a.lesson_id);
                const attachedHere = assetLesson === lessonId;
                const attachedElsewhere = assetLesson !== '' && !attachedHere;
                return (
                  <div key={assetId} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <TypeIcon type={asString(a.asset_type)} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{asString(a.title) || '(untitled)'}</span>
                    <Badge variant="secondary" className="shrink-0 capitalize">{asString(a.asset_type) || 'item'}</Badge>
                    {attachedElsewhere && (
                      <span className="shrink-0 text-[11px] text-amber-600">in another lesson</span>
                    )}
                    {attachedHere ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                        <Check aria-hidden="true" className="size-3.5" /> Attached
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5"
                        disabled={attachingId === assetId}
                        onClick={() => void attach(a)}
                      >
                        <Link2 aria-hidden="true" className="size-3.5" />
                        {attachingId === assetId ? 'Attaching…' : 'Attach'}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-1.5">
            {filesLoading ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : filteredFiles.length === 0 ? (
              <p className="rounded-md border border-dashed py-8 text-center text-sm text-slate-500">
                {otherFiles.length === 0 ? 'No files on other lessons to copy.' : 'No items match your filters.'}
              </p>
            ) : (
              filteredFiles.map((f) => {
                const fileId = asString(f.id);
                const ctx = asString(f.lesson_title)
                  ? `${asString(f.course_title)} · ${asString(f.lesson_title)}`
                  : asString(f.course_title);
                return (
                  <div key={fileId} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <TypeIcon type={asString(f.lesson_type)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800">{asString(f.title) || '(untitled)'}</p>
                      {ctx ? <p className="truncate text-[11px] text-slate-400">{ctx}</p> : null}
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize">{asString(f.lesson_type) || 'file'}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      disabled={copyingId === fileId}
                      onClick={() => void copyFile(f)}
                    >
                      <CopyPlus aria-hidden="true" className="size-3.5" />
                      {copyingId === fileId ? 'Copying…' : 'Copy'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main: per-lesson content manager ────────────────────────────────────── */

export interface LessonContentManagerDialogProps {
  api: AdminPageProps['api'];
  token: string;
  /** Lesson to manage; null = closed. */
  lessonId: string | null;
  lessonTitle: string;
  onClose: () => void;
  /** Called after any change so the parent can refresh lesson counts. */
  onChanged: () => void;
}

export function LessonContentManagerDialog({
  api, token, lessonId, lessonTitle, onClose, onChanged,
}: LessonContentManagerDialogProps) {
  const confirm = useConfirm();
  const open = lessonId !== null;
  const lid = lessonId ?? '';

  const { data: filesData, loading: filesLoading, reload: reloadFiles } = useAdminPageData(
    () => (lessonId ? api.listLessonFiles(token, lessonId) : Promise.resolve([])),
    [lessonId],
  );
  const { data: assetsData, loading: assetsLoading, reload: reloadAssets } = useAdminPageData(
    () => (lessonId ? api.listLessonAssets(token, lessonId) : Promise.resolve([])),
    [lessonId],
  );

  const reloadAll = () => { reloadFiles(); reloadAssets(); onChanged(); };

  // Sub-dialog state
  const [fileType, setFileType] = useState<LessonFileType>('video');
  const [editingFile, setEditingFile] = useState<Record<string, unknown> | null>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<ContentRow | null>(null);

  const rows = useMemo<ContentRow[]>(() => {
    const lessonRows: ContentRow[] = toRecords(filesData).map((f) => ({
      id: asString(f.id),
      title: asString(f.title),
      type: asString(f.lesson_type),
      source: 'lesson',
      url: asString(f.attachment_url) || asString(f.video_url) || asString(f.audio_url),
      summary: asString(f.summary),
    }));
    const libraryRows: ContentRow[] = toRecords(assetsData).map((a) => ({
      id: asString(a.id),
      title: asString(a.title),
      type: asString(a.asset_type),
      source: 'library',
      url: asString(a.attachment) || asString(a.video_url) || asString(a.audio_file),
      summary: asString(a.summary),
    }));
    return [...lessonRows, ...libraryRows];
  }, [filesData, assetsData]);

  const openAdd = (type: LessonFileType) => {
    setEditingFile(null);
    setFileType(type);
    setFileDialogOpen(true);
  };

  const openEdit = (row: ContentRow) => {
    // Library items are authored in the Content Library; edit them there.
    if (row.source === 'library') {
      toast('This item lives in the Content Library — edit it there.');
      return;
    }
    setEditingFile(toRecords(filesData).find((f) => asString(f.id) === row.id) ?? null);
    setFileType((row.type || 'video') as LessonFileType);
    setFileDialogOpen(true);
  };

  const view = (row: ContentRow) => {
    const t = row.type.toLowerCase();
    if (t === 'quiz' || t === 'article') { setPreviewItem(row); return; }
    if (row.url) { window.open(row.url, '_blank', 'noopener,noreferrer'); return; }
    toast.error('No file to open for this item.');
  };

  const remove = async (row: ContentRow) => {
    const ok = await confirm({
      title: row.source === 'library' ? `Remove "${row.title || 'item'}" from this lesson?` : `Delete "${row.title || 'file'}"?`,
      description: row.source === 'library'
        ? 'The item stays in the Content Library and can be re-attached later.'
        : 'This content file will be permanently deleted.',
      confirmText: row.source === 'library' ? 'Remove' : 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      if (row.source === 'library') {
        await api.unlinkAssetFromLesson(token, lid, row.id);
        toast.success('Removed from lesson.');
      } else {
        await api.deleteLessonFile(token, row.id);
        toast.success('Content deleted.');
      }
      reloadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove content.');
    }
  };

  const loading = filesLoading || assetsLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent
          className="max-h-[88vh] overflow-y-auto"
          style={{ width: 'min(720px, calc(100vw - 2rem))', maxWidth: 'min(720px, calc(100vw - 2rem))' }}
        >
          <DialogHeader>
            <DialogTitle>Manage Content — {lessonTitle || 'Lesson'}</DialogTitle>
            <DialogDescription>
              Attach existing items from the Content Library, or add new content directly to this lesson.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="default" className="gap-1.5" onClick={() => setPickerOpen(true)}>
              <Library aria-hidden="true" className="size-4" /> Attach from Library
            </Button>
            <span className="mx-1 hidden text-xs text-slate-400 sm:inline">or add new:</span>
            {ADD_TYPES.map((t) => (
              <Button key={t} type="button" size="sm" variant="outline" className="gap-1" onClick={() => openAdd(t)}>
                <Plus aria-hidden="true" className="size-3.5" /> {TYPE_LABEL[t]}
              </Button>
            ))}
          </div>

          <div className="mt-2 space-y-1.5">
            {loading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm text-slate-500">No content in this lesson yet.</p>
                <p className="mt-1 text-xs text-slate-400">Attach items from the Content Library or add a new file above.</p>
              </div>
            ) : (
              rows.map((row) => (
                <div key={`${row.source}-${row.id}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <TypeIcon type={row.type} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{row.title || '(untitled)'}</span>
                  <Badge variant="secondary" className="shrink-0 capitalize">{row.type || 'item'}</Badge>
                  {row.source === 'library' ? (
                    <Badge variant="outline" className="shrink-0">Library</Badge>
                  ) : (
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-slate-400">File</span>
                  )}
                  <Button type="button" size="sm" variant="ghost" className="shrink-0 gap-1 text-blue-600 hover:bg-blue-50" onClick={() => view(row)}>
                    {row.type.toLowerCase() === 'quiz' || row.type.toLowerCase() === 'article'
                      ? <><Eye aria-hidden="true" className="size-3.5" /> Preview</>
                      : <><ExternalLink aria-hidden="true" className="size-3.5" /> View</>}
                  </Button>
                  {row.source === 'lesson' && (
                    <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => void remove(row)}
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <LessonFileFormDialog
        api={api}
        token={token}
        lessonId={lid}
        open={fileDialogOpen}
        type={fileType}
        editingFile={editingFile}
        onClose={() => setFileDialogOpen(false)}
        onSaved={reloadAll}
      />

      <LibraryPickerDialog
        api={api}
        token={token}
        lessonId={lid}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAttached={reloadAll}
      />

      <ContentPreviewDialog api={api} token={token} item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}
