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

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const textareaClass = 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export default function UserFeedbacksPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadUserFeedbacks(session.token),
    [],
  );

  const allReviews = useMemo(() => toRecords(data), [data]);

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mCourseId, setMCourseId] = useState('');
  const [mUserId, setMUserId] = useState('');
  const [mRating, setMRating] = useState('');
  const [mReview, setMReview] = useState('');

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadStudents(session.token, {}),
    ])
      .then(([c, s]) => {
        setCourses(c);
        setStudents(s);
      })
      .catch(() => {});
  }, [api, session.token]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setMCourseId('');
    setMUserId('');
    setMRating('');
    setMReview('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id) || asString(row._id));
    setMCourseId(asString(row.course_id));
    setMUserId(asString(row.user_id));
    setMRating(asString(row.rating));
    setMReview(asString(row.review));
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!mCourseId || !mUserId) {
      toast.error('Course and Student are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        course_id: mCourseId,
        user_id: mUserId,
        rating: mRating,
        review: mReview,
      };
      if (editingId) {
        await api.editReview(session.token, editingId, payload);
      } else {
        await api.addReview(session.token, payload);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setSubmitting(false);
    }
  }, [mCourseId, mUserId, mRating, mReview, editingId, api, session.token, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row.id) || asString(row._id);
      if (!window.confirm('Delete this review?')) return;
      try {
        await api.deleteReview(session.token, id);
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete review');
      }
    },
    [api, session.token, reload],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'user_name', label: 'User Name', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'course_title', label: 'Course Name', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'rating', label: 'Rating', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'review',
        label: 'Review',
        render: (v) => {
          const text = asString(v);
          return text.length > 80 ? text.slice(0, 80) + '...' : text || '-';
        },
      },
    ],
    [],
  );

  if (loading) return <PageLoader label="Loading reviews..." />;

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Review" addLabel="+ Add Review" onAdd={openAdd} />

      <AdminDataTable
        columns={columns}
        rows={allReviews}
        actions={[
          { label: 'Edit', onClick: (row) => openEdit(row) },
          { label: 'Delete', variant: 'destructive', onClick: (row) => void handleDelete(row) },
        ]}
      />

      {/* Add/Edit Review Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Review' : 'Add Review'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Course *</Label>
              <select className={selectClass} value={mCourseId} onChange={(e) => setMCourseId(e.target.value)}>
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Student *</Label>
              <select className={selectClass} value={mUserId} onChange={(e) => setMUserId(e.target.value)}>
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={asString(s._id) || asString(s.id)} value={asString(s._id) || asString(s.id)}>
                    {asString(s.name) || asString(s.student_name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Rating</Label>
              <Input
                value={mRating}
                onChange={(e) => setMRating(e.target.value)}
                placeholder="e.g. 4 or 5"
              />
            </div>
            <div className="grid gap-2">
              <Label>Review</Label>
              <textarea
                className={textareaClass}
                value={mReview}
                onChange={(e) => setMReview(e.target.value)}
                placeholder="Enter review text"
              />
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
