import { useState, useMemo, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { FileUpload } from '../../shared/components/FileUpload.js';
import { RichTextEditor } from '../../shared/components/RichTextEditor.js';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const typeColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  video: 'default', audio: 'secondary', article: 'outline', document: 'outline', quiz: 'destructive',
};

interface AssetForm {
  title: string;
  summary: string;
  asset_type: string;
  duration: string;
  video_url: string;
  attachment: string;
  audio_file: string;
  tags: string;
}

const emptyForm: AssetForm = {
  title: '', summary: '', asset_type: 'video', duration: '', video_url: '', attachment: '', audio_file: '', tags: '',
};

export default function ContentLibraryPage({ api, session }: AdminPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [previewAsset, setPreviewAsset] = useState<Record<string, unknown> | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (filterType) f.asset_type = filterType;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [filterType]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listContentAssets(session.token, filters),
    [filterType],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id);
    const asset = await api.getContentAsset(session.token, id);
    if (asset) {
      setEditId(id);
      setForm({
        title: asString(asset.title),
        summary: asString(asset.summary),
        asset_type: asString(asset.asset_type) || 'video',
        duration: asString(asset.duration),
        video_url: asString(asset.video_url),
        attachment: asString(asset.attachment),
        audio_file: asString(asset.audio_file),
        tags: asString(asset.tags),
      });
      setShowForm(true);
    }
  }, [api, session.token]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        asset_type: form.asset_type,
        duration: form.duration.trim() || undefined,
        video_url: form.video_url.trim() || undefined,
        attachment: form.attachment.trim() || undefined,
        audio_file: form.audio_file.trim() || undefined,
        tags: form.tags.trim() || undefined,
      };
      if (editId) {
        await api.updateContentAsset(session.token, editId, payload);
      } else {
        await api.createContentAsset(session.token, payload);
      }
      setShowForm(false);
      setEditId('');
      setForm(emptyForm);
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, editId, form, reload]);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    const count = Number(row.lesson_count ?? 0);
    const msg = count > 0
      ? `This asset is used in ${count} lesson(s). Deleting it will remove it from all lessons. Continue?`
      : `Delete asset "${asString(row.title)}"?`;
    if (!window.confirm(msg)) return;
    try {
      await api.deleteContentAsset(session.token, asString(row.id));
      reload();
    } catch { /* ignore */ }
  }, [api, session.token, reload]);

  const handlePreview = useCallback((row: Record<string, unknown>) => {
    const type = asString(row.asset_type);
    if (type === 'article') {
      setPreviewAsset(row);
    } else {
      const url = type === 'video' ? asString(row.video_url)
        : type === 'audio' ? asString(row.audio_file)
        : asString(row.attachment);
      if (url) window.open(url, '_blank');
    }
  }, []);

  const columns: DataTableColumn[] = [
    { key: 'id', label: '', render: (_v, row) => (
      <button type="button" className="text-gray-400 hover:text-blue-600" title="Preview" onClick={() => handlePreview(row)}>
        <Eye className="h-4 w-4" />
      </button>
    )},
    { key: 'title', label: 'Title', sortable: true },
    { key: 'asset_type', label: 'Type', render: (v) => (
      <Badge variant={typeColors[String(v)] ?? 'secondary'}>{String(v)}</Badge>
    )},
    { key: 'duration', label: 'Duration', render: (v) => String(v || '-') },
    { key: 'lesson_count', label: 'Used In', render: (v) => {
      const n = Number(v ?? 0);
      return n > 0 ? `${n} lesson${n > 1 ? 's' : ''}` : 'Unused';
    }},
    { key: 'created_at', label: 'Created', render: (v) => {
      if (!v) return '-';
      const d = new Date(String(v));
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
    }},
  ];

  const actions: DataTableAction[] = [
    { label: 'Preview', onClick: (row) => handlePreview(row) },
    { label: 'Edit', onClick: (row) => void handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (error) {
    return <Card><CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Content Library" addLabel="+ New Asset" onAdd={handleOpenAdd} />

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="max-w-xs space-y-1">
            <Label className="text-xs">Asset Type</Label>
            <select className={selectClass} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="article">Article</option>
              <option value="document">Document</option>
              <option value="quiz">Quiz</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      {/* Add/Edit Asset Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(''); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Asset' : 'New Content Asset'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Asset title" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <select className={selectClass} value={form.asset_type} onChange={(e) => setForm((f) => ({ ...f, asset_type: e.target.value }))}>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="article">Article</option>
                  <option value="document">Document</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>
              <div>
                <Label>Duration</Label>
                <Input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="e.g. 10:30" />
              </div>
            </div>
            {(form.asset_type === 'video') && (
              <div>
                <Label>Video URL</Label>
                <Input value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="https://..." />
              </div>
            )}
            {(form.asset_type === 'audio') && (
              <div>
                <Label>Audio File</Label>
                <FileUpload
                  value={form.audio_file}
                  onChange={(url) => setForm((f) => ({ ...f, audio_file: url }))}
                  onUpload={async (file) => { const r = await api.uploadFile(session.token, file); return r.url; }}
                  accept="audio/*"
                  placeholder="Upload audio or enter URL"
                />
              </div>
            )}
            {(form.asset_type === 'document') && (
              <div>
                <Label>File</Label>
                <FileUpload
                  value={form.attachment}
                  onChange={(url) => setForm((f) => ({ ...f, attachment: url }))}
                  onUpload={async (file) => { const r = await api.uploadFile(session.token, file); return r.url; }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                  placeholder="Upload file or enter URL"
                />
              </div>
            )}
            {form.asset_type === 'article' ? (
              <div>
                <Label>Article Content</Label>
                <RichTextEditor
                  value={form.summary}
                  onChange={(html) => setForm((f) => ({ ...f, summary: html }))}
                />
              </div>
            ) : (
              <div>
                <Label>Summary</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                />
              </div>
            )}
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="e.g. montessori, child-development" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(''); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Preview Dialog */}
      <Dialog open={!!previewAsset} onOpenChange={(open) => { if (!open) setPreviewAsset(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{asString(previewAsset?.title)}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: asString(previewAsset?.summary) }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
