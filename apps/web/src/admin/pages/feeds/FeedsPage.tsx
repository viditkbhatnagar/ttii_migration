import { useMemo, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { useConfirm } from '@/components/confirm-dialog';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseOnBlur } from '@/lib/text-format';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const textareaClass = 'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function FeedsPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadFeeds(session.token),
    [],
  );

  const allFeeds = useMemo(() => toRecords(data), [data]);

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [instructors, setInstructors] = useState<Record<string, unknown>[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mImage, setMImage] = useState('');
  const [mCourseId, setMCourseId] = useState('');
  const [mInstructorId, setMInstructorId] = useState('');
  const [mDescription, setMDescription] = useState('');

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadInstructors(session.token),
    ])
      .then(([c, i]) => {
        setCourses(c);
        setInstructors(i);
      })
      .catch(() => {});
  }, [api, session.token]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setMTitle('');
    setMImage('');
    setMCourseId('');
    setMInstructorId('');
    setMDescription('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id) || asString(row._id));
    setMTitle(asString(row.title));
    setMImage(asString(row.image));
    setMCourseId(asString(row.course_id));
    setMInstructorId(asString(row.instructor_id));
    setMDescription(asString(row.description));
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!mTitle.trim() || !mCourseId || !mDescription.trim()) {
      toast.error('Title, Course, and Description are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: mTitle.trim(),
        course_id: mCourseId,
        description: mDescription.trim(),
        ...(mImage.trim() ? { image: mImage.trim() } : {}),
        ...(mInstructorId ? { instructor_id: mInstructorId } : {}),
      };
      if (editingId) {
        await api.editFeed(session.token, editingId, payload);
      } else {
        await api.addFeed(session.token, payload);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save feed');
    } finally {
      setSubmitting(false);
    }
  }, [mTitle, mImage, mCourseId, mInstructorId, mDescription, editingId, api, session.token, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row.id) || asString(row._id);
      if (!(await confirm({
        title: 'Delete this feed?',
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteFeed(session.token, id);
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete feed');
      }
    },
    [api, session.token, reload, confirm],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true, render: (v) => asString(v) || '-' },
    ],
    [],
  );

  if (loading) return <PageLoader label="Loading feeds..." />;

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Feeds" addLabel="+ Add Feed" onAdd={openAdd} />

      <AdminDataTable
        columns={columns}
        rows={allFeeds}
        actions={[
          { label: 'Edit', onClick: (row) => openEdit(row) },
          { label: 'Delete', variant: 'destructive', onClick: (row) => void handleDelete(row) },
        ]}
      />

      {/* Add/Edit Feed Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editingId ? 'Update Feed' : 'Add Feed'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} onBlur={titleCaseOnBlur(setMTitle)} placeholder="Feed title" />
              </div>
              <div className="grid gap-2">
                <Label>Image</Label>
                <Input value={mImage} onChange={(e) => setMImage(e.target.value)} placeholder="Image URL" />
              </div>
              <div className="grid gap-2">
                <Label>Course *</Label>
                <select className={selectClass} value={mCourseId} onChange={(e) => setMCourseId(e.target.value)}>
                  <option value="">Choose Course</option>
                  {courses.map((c) => (
                    <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Instructor</Label>
                <select className={selectClass} value={mInstructorId} onChange={(e) => setMInstructorId(e.target.value)}>
                  <option value="">Choose Instructor</option>
                  {instructors.map((i) => (
                    <option key={asString(i.id) || asString(i._id)} value={asString(i.id) || asString(i._id)}>
                      {asString(i.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Description *</Label>
                <textarea
                  className={textareaClass}
                  value={mDescription}
                  onChange={(e) => setMDescription(e.target.value)}
                  placeholder="Feed description (supports HTML)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                className="bg-ttii-primary hover:bg-ttii-primary/90"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
