import { useMemo, useState, useCallback, useEffect } from 'react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export default function BannersPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadBanners(session.token),
    [session.token],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mImage, setMImage] = useState('');
  const [mIsCourseBanner, setMIsCourseBanner] = useState(false);
  const [mCourseId, setMCourseId] = useState('');
  const [mUrl, setMUrl] = useState('');

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setMTitle('');
    setMImage('');
    setMIsCourseBanner(false);
    setMCourseId('');
    setMUrl('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id) || asString(row._id));
    setMTitle(asString(row.title));
    setMImage(asString(row.image));
    const isCourse = row.is_course_banner === 1 || row.is_course_banner === '1' || asString(row.course_id) !== '';
    setMIsCourseBanner(isCourse);
    setMCourseId(asString(row.course_id));
    setMUrl(asString(row.url));
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!mTitle.trim() || !mImage.trim()) {
      alert('Title and Image are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: mTitle.trim(),
        image: mImage.trim(),
        ...(mIsCourseBanner ? { courseId: mCourseId, isCourseBanner: true } : {}),
        ...(mUrl.trim() ? { url: mUrl.trim() } : {}),
      };
      if (editingId) {
        await api.editBanner(session.token, editingId, payload);
      } else {
        await api.addBanner(session.token, payload);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save banner');
    } finally {
      setSubmitting(false);
    }
  }, [mTitle, mImage, mIsCourseBanner, mCourseId, mUrl, editingId, api, session.token, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row.id) || asString(row._id);
      if (!window.confirm('Delete this banner?')) return;
      try {
        await api.deleteBanner(session.token, id);
        reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete banner');
      }
    },
    [api, session.token, reload],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'image',
        label: 'Image',
        render: (v) => {
          const src = asString(v);
          return src ? <img src={src} alt="" className="h-10 w-auto rounded object-contain" /> : '-';
        },
      },
      { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '-' },
    ],
    [],
  );

  if (loading) return <PageLoader label="Loading banners..." />;

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Banners" addLabel="+ Add Banners" onAdd={openAdd} />
      <AdminDataTable
        columns={columns}
        rows={rows}
        actions={[
          { label: 'Edit', onClick: (row) => openEdit(row) },
          { label: 'Delete', variant: 'destructive', onClick: (row) => void handleDelete(row) },
        ]}
      />

      {/* Add/Edit Banner Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Banner title" />
            </div>
            <div className="grid gap-2">
              <Label>Image *</Label>
              <Input value={mImage} onChange={(e) => setMImage(e.target.value)} placeholder="Image URL" />
              <p className="text-xs text-gray-500">Image Aspect ratio should be 1200x628 - Max File size 100KB</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mIsCourseBanner}
                onChange={(e) => setMIsCourseBanner(e.target.checked)}
                className="size-4"
              />
              Is Course related banner?
            </label>
            {mIsCourseBanner ? (
              <div className="grid gap-2">
                <Label>Select course</Label>
                <select className={selectClass} value={mCourseId} onChange={(e) => setMCourseId(e.target.value)}>
                  <option value="">None</option>
                  {courses.map((c) => (
                    <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label>Url</Label>
              <Input value={mUrl} onChange={(e) => setMUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={submitting}
              onClick={() => void handleSave()}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
