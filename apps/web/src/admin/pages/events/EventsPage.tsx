import { useMemo, useState, useCallback, useEffect } from 'react';
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

export default function EventsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadEvents(session.token),
    [],
  );

  const allEvents = useMemo(() => toRecords(data), [data]);

  const [instructors, setInstructors] = useState<Record<string, unknown>[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mImage, setMImage] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mInstructorId, setMInstructorId] = useState('');
  const [mEventDate, setMEventDate] = useState('');
  const [mFromTime, setMFromTime] = useState('');
  const [mToTime, setMToTime] = useState('');
  const [mDuration, setMDuration] = useState('');
  const [mIsRecording, setMIsRecording] = useState(false);
  const [mNumObjectives, setMNumObjectives] = useState('');

  useEffect(() => {
    api.loadInstructors(session.token).then(setInstructors).catch(() => {});
  }, [api, session.token]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setMTitle(''); setMImage(''); setMDescription(''); setMInstructorId('');
    setMEventDate(''); setMFromTime(''); setMToTime(''); setMDuration('');
    setMIsRecording(false); setMNumObjectives('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id) || asString(row._id));
    setMTitle(asString(row.title));
    setMImage(asString(row.image));
    setMDescription(asString(row.description));
    setMInstructorId(asString(row.instructor_id));
    setMEventDate(asString(row.event_date).slice(0, 10));
    setMFromTime(asString(row.from_time));
    setMToTime(asString(row.to_time));
    setMDuration(asString(row.duration));
    setMIsRecording(row.is_recording_available === 1 || row.is_recording_available === '1');
    setMNumObjectives(asString(row.num_objectives));
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!mTitle.trim() || !mImage.trim() || !mInstructorId || !mEventDate || !mFromTime || !mToTime || !mDuration.trim()) {
      alert('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: mTitle.trim(),
        image: mImage.trim(),
        description: mDescription.trim(),
        instructor_id: mInstructorId,
        event_date: mEventDate,
        from_time: mFromTime,
        to_time: mToTime,
        duration: mDuration.trim(),
        is_recording_available: mIsRecording ? 1 : 0,
        num_objectives: mNumObjectives ? Number(mNumObjectives) : 0,
      };
      if (editingId) {
        await api.editEvent(session.token, editingId, payload);
      } else {
        await api.addEvent(session.token, payload);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  }, [mTitle, mImage, mDescription, mInstructorId, mEventDate, mFromTime, mToTime, mDuration, mIsRecording, mNumObjectives, editingId, api, session.token, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row.id) || asString(row._id);
      if (!window.confirm('Delete this event?')) return;
      try {
        await api.deleteEvent(session.token, id);
        reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete event');
      }
    },
    [api, session.token, reload],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'image',
        label: 'Image',
        render: (v) => {
          const src = asString(v);
          return src ? <img src={src} alt="" className="h-10 w-auto rounded object-contain" /> : '-';
        },
      },
      { key: 'title', label: 'Title', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'description',
        label: 'Description',
        render: (v) => {
          const text = asString(v);
          return text.length > 60 ? text.slice(0, 60) + '...' : text || '-';
        },
      },
      {
        key: 'objectives',
        label: 'Objectives',
        render: (v) => {
          const text = asString(v);
          return text.length > 50 ? text.slice(0, 50) + '...' : text || '-';
        },
      },
      {
        key: 'event_date',
        label: 'Time',
        render: (_v, row) => {
          const d = asString(row?.event_date);
          const f = asString(row?.from_time);
          const t = asString(row?.to_time);
          return (
            <div className="text-xs">
              {d ? <div>Date: {d}</div> : null}
              {f ? <div>From: {f}</div> : null}
              {t ? <div>To: {t}</div> : null}
            </div>
          );
        },
      },
    ],
    [],
  );

  if (loading) return <PageLoader label="Loading events..." />;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Events" addLabel="+ Add Events" onAdd={openAdd} />

      <AdminDataTable
        columns={columns}
        rows={allEvents}
        actions={[
          { label: 'Edit', onClick: (row) => openEdit(row) },
          { label: 'Delete', variant: 'destructive', onClick: (row) => void handleDelete(row) },
          { label: 'Records', onClick: (row) => onNavigate('/admin/events/records/' + asString(row.id || row._id)) },
        ]}
      />

      {/* Add/Edit Event Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label>Title *</Label>
              <Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Event title" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Image *</Label>
              <Input value={mImage} onChange={(e) => setMImage(e.target.value)} placeholder="Image URL" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Description</Label>
              <textarea
                className={textareaClass}
                value={mDescription}
                onChange={(e) => setMDescription(e.target.value)}
                placeholder="Event description"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Instructors *</Label>
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
              <Label>Event Date *</Label>
              <Input type="date" value={mEventDate} onChange={(e) => setMEventDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Duration *</Label>
              <Input value={mDuration} onChange={(e) => setMDuration(e.target.value)} placeholder="e.g. 1 hour" />
            </div>
            <div className="grid gap-2">
              <Label>From Time *</Label>
              <Input type="time" value={mFromTime} onChange={(e) => setMFromTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>To Time *</Label>
              <Input type="time" value={mToTime} onChange={(e) => setMToTime(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={mIsRecording}
                onChange={(e) => setMIsRecording(e.target.checked)}
                className="size-4"
              />
              Is Recording Available?
            </label>
            <div className="grid gap-2 md:col-span-2">
              <Label>Number of Objectives</Label>
              <Input
                type="number"
                min="0"
                value={mNumObjectives}
                onChange={(e) => setMNumObjectives(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">Sets how many objective text fields will be generated.</p>
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
