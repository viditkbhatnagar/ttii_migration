import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, asNumber } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

export default function AddEntranceExamPage({ api, session, onNavigate }: AdminPageProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [duration, setDuration] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [status, setStatus] = useState('draft');
  const [submitting, setSubmitting] = useState(false);

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await api.addEntranceExam(session.token, {
        title,
        description,
        courseId: Number(courseId) || 0,
        examDate,
        fromTime,
        toTime,
        duration,
        totalMarks: Number(totalMarks) || 0,
        status,
      });
      onNavigate('/admin/entrance_exam/index');
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Add Entrance Exam" />

      <Card className="mx-auto max-w-2xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exam title" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <select
                id="course"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={asNumber(c.id)} value={String(asNumber(c.id))}>{asString(c.title)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="examDate">Exam Date</Label>
              <Input id="examDate" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromTime">From Time</Label>
              <Input id="fromTime" type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toTime">To Time</Label>
              <Input id="toTime" type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2 hours" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalMarks">Total Marks</Label>
              <Input id="totalMarks" type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onNavigate('/admin/entrance_exam/index')}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {submitting ? 'Creating...' : 'Create Entrance Exam'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
