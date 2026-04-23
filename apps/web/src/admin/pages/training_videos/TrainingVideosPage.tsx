import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import { Play, Pencil, Trash2, Video } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

const CATEGORIES = ['Live', 'Lectures', 'Tutorials'];
const VIDEO_TYPES = ['YouTube', 'Vimeo'];

interface VideoFormState {
  title: string;
  category: string;
  videoType: string;
  videoUrl: string;
  thumbnail: string;
  description: string;
}

const emptyForm: VideoFormState = { title: '', category: '', videoType: '', videoUrl: '', thumbnail: '', description: '' };

export default function TrainingVideosPage({ api, session }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<VideoFormState>(emptyForm);
  const [deleteId, setDeleteId] = useState('');
  const [deleteTitle, setDeleteTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadTrainingVideos(session.token),
    [],
  );

  const allVideos = useMemo(() => toRecords(data), [data]);

  const filteredVideos = useMemo(() => {
    if (activeTab === 'All') return allVideos;
    return allVideos.filter((v) => asString(v.category).toLowerCase() === activeTab.toLowerCase());
  }, [allVideos, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allVideos.length };
    for (const cat of CATEGORIES) {
      counts[cat] = allVideos.filter((v) => asString(v.category).toLowerCase() === cat.toLowerCase()).length;
    }
    return counts;
  }, [allVideos]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((row: Record<string, unknown>) => {
    setEditId(asString(row.id));
    setForm({
      title: asString(row.title),
      category: asString(row.category),
      videoType: asString(row.video_type),
      videoUrl: asString(row.video_url),
      thumbnail: asString(row.thumbnail),
      description: asString(row.description),
    });
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const input = {
        title: form.title.trim(),
        category: form.category,
        video_type: form.videoType,
        video_url: form.videoUrl,
        thumbnail: form.thumbnail,
        description: form.description,
      };
      if (editId) {
        await api.editTrainingVideo(session.token, editId, input);
      } else {
        await api.addTrainingVideo(session.token, input);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId('');
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, editId, form, reload]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.deleteTrainingVideo(session.token, deleteId);
      setDeleteId('');
      setDeleteTitle('');
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, deleteId, reload]);

  const updateField = useCallback((field: keyof VideoFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (loading) {
    return <PageLoader label="Loading training videos..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Training Videos" addLabel="+ Add Video" onAdd={handleOpenAdd} />

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {['All', ...CATEGORIES].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab
                ? 'bg-white border border-b-white border-gray-200 text-ttii-primary -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} ({tabCounts[tab] ?? 0})
          </button>
        ))}
      </div>

      {/* Video Cards Grid */}
      {filteredVideos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-400">
            No videos found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVideos.map((video) => (
            <Card key={asString(video.id)} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
                {asString(video.thumbnail) ? (
                  <img
                    src={asString(video.thumbnail)}
                    alt={asString(video.title)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Video className="h-12 w-12 text-gray-300" />
                )}
                {asString(video.video_url) && (
                  <a
                    href={asString(video.video_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <Play className="h-10 w-10 text-white" />
                  </a>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                  {asString(video.title) || 'Untitled'}
                </h3>
                <div className="flex items-center gap-2">
                  {asString(video.category) && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {asString(video.category)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(video.created_at)}</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  {asString(video.video_url) && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Play video" asChild>
                      <a href={asString(video.video_url)} target="_blank" rel="noopener noreferrer">
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Edit video" onClick={() => handleOpenEdit(video)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" aria-label="Delete video" onClick={() => { setDeleteId(asString(video.id)); setDeleteTitle(asString(video.title)); }}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Video Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(''); setForm(emptyForm); } }}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Video' : 'Add Video'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Video title" />
              </div>
              <div>
                <Label>Category *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                >
                  <option value="">Choose Category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Video Type *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.videoType}
                  onChange={(e) => updateField('videoType', e.target.value)}
                >
                  <option value="">Choose Type</option>
                  {VIDEO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Video URL (YouTube/Vimeo link)</Label>
                <Input value={form.videoUrl} onChange={(e) => updateField('videoUrl', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Thumbnail (optional — upload to override auto-fetch)</Label>
                <Input value={form.thumbnail} onChange={(e) => updateField('thumbnail', e.target.value)} placeholder="https://..." />
                <p className="mt-1 text-xs text-gray-500">Auto-fetch thumbnail preview from YouTube/Vimeo URL</p>
                {form.thumbnail ? (
                  <img src={form.thumbnail} alt="Thumbnail preview" className="mt-2 h-24 w-auto rounded border object-contain" />
                ) : null}
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Video description (supports HTML)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(''); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim()}>
                {saving ? 'Saving...' : editId ? 'Update Video' : 'Add Video'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(''); setDeleteTitle(''); } }}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            <DialogHeader>
              <DialogTitle>Delete Video</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteTitle}</strong>? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDeleteId(''); setDeleteTitle(''); }} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
