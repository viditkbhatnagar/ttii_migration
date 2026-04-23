import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const textareaClass = 'flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface FormState {
  title: string;
  mark: string;
  course_id: string;
  batch_id: string;
  from_date: string;
  to_date: string;
  from_time: string;
  to_time: string;
  duration: string;
  description: string;
  free: boolean;
}

const emptyForm: FormState = {
  title: '',
  mark: '',
  course_id: '',
  batch_id: '',
  from_date: '',
  to_date: '',
  from_time: '',
  to_time: '',
  duration: '',
  description: '',
  free: false,
};

export default function AddExamPage({ api, session, onNavigate }: AdminPageProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [batches, setBatches] = useState<Record<string, unknown>[]>([]);

  // Determine mode from URL
  const { isEdit, examId } = useMemo(() => {
    const path = window.location.pathname;
    const editMatch = path.match(/\/admin\/exam\/edit\/(.+)/);
    if (editMatch) return { isEdit: true, examId: editMatch[1] ?? '' };
    return { isEdit: false, examId: '' };
  }, []);

  // Load courses + batches
  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadBatches(session.token),
    ])
      .then(([c, b]) => {
        setCourses(c);
        setBatches(b);
      })
      .catch(() => {});
  }, [api, session.token]);

  // Load exam data for edit mode
  const { data: examData, loading } = useAdminPageData(
    () => (isEdit && examId ? api.loadAdminExams(session.token, {}).then((r) => {
      const found = (r.exams || []).find((e: Record<string, unknown>) => asString(e.id) === examId || asString(e._id) === examId);
      return found || null;
    }) : Promise.resolve(null)),
    [isEdit, examId],
  );

  // Pre-fill in edit mode
  useEffect(() => {
    if (!isEdit || !examData) return;
    const e = examData;
    setForm({
      title: asString(e.title),
      mark: asString(e.mark),
      course_id: asString(e.course_id),
      batch_id: asString(e.batch_id),
      from_date: asString(e.from_date).slice(0, 10),
      to_date: asString(e.to_date).slice(0, 10),
      from_time: asString(e.from_time),
      to_time: asString(e.to_time),
      duration: asString(e.duration),
      description: asString(e.description),
      free: e.free === '1' || e.free === 1 || e.free === true,
    });
  }, [isEdit, examData]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    if (!form.mark.trim()) { toast.error('Mark is required.'); return; }
    if (!form.course_id) { toast.error('Course is required.'); return; }
    if (!form.batch_id) { toast.error('Batch is required.'); return; }
    if (!form.from_date) { toast.error('Start date is required.'); return; }
    if (!form.to_date) { toast.error('End date is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        mark: Number(form.mark.trim()) || 0,
        courseId: form.course_id,
        batchId: form.batch_id,
        fromDate: form.from_date,
        toDate: form.to_date,
        fromTime: form.from_time,
        toTime: form.to_time,
        duration: form.duration.trim(),
        description: form.description.trim(),
        free: form.free ? '1' : '0',
      };

      const result = isEdit
        ? await api.editExam(session.token, examId, payload)
        : await api.addExam(session.token, payload);

      if (asString(result.status) === '0' || result.status === 0) {
        toast.error(asString(result.message) || `Failed to ${isEdit ? 'update' : 'add'} exam`);
      } else {
        onNavigate('/admin/exam/index');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, examId, api, session.token, onNavigate]);

  if (loading) return <PageLoader label="Loading exam..." />;

  return (
    <div className="space-y-4">
      <AdminPageHeader title={isEdit ? 'Edit Exam' : 'Add Exam'}>
        <Button variant="outline" onClick={() => onNavigate('/admin/exam/index')}>
          Cancel
        </Button>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exam Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Enter exam title" />
            </div>
            <div className="grid gap-2">
              <Label>Mark *</Label>
              <Input value={form.mark} onChange={(e) => set('mark', e.target.value)} placeholder="Total marks" />
            </div>
            <div className="grid gap-2">
              <Label>Course *</Label>
              <select className={selectClass} value={form.course_id} onChange={(e) => set('course_id', e.target.value)}>
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Batch *</Label>
              <select className={selectClass} value={form.batch_id} onChange={(e) => set('batch_id', e.target.value)}>
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={asString(b.id)} value={asString(b.id)}>
                    {asString(b.title) || asString(b.batch_name) || asString(b.name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Start Date *</Label>
              <Input type="date" value={form.from_date} onChange={(e) => set('from_date', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>End Date *</Label>
              <Input type="date" value={form.to_date} onChange={(e) => set('to_date', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Start Time *</Label>
              <Input type="time" value={form.from_time} onChange={(e) => set('from_time', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>End Time *</Label>
              <Input type="time" value={form.to_time} onChange={(e) => set('to_time', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Duration *</Label>
              <Input value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 1 hour 30 minutes" />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm mt-7">
                <input
                  type="checkbox"
                  checked={form.free}
                  onChange={(e) => set('free', e.target.checked)}
                  className="size-4"
                />
                <span>Is Free?</span>
              </label>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Instructions</Label>
              <textarea
                className={textareaClass}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Enter exam instructions"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => onNavigate('/admin/exam/index')}>
          Cancel
        </Button>
        <Button
          className="bg-ttii-primary hover:bg-ttii-primary/90"
          disabled={saving}
          onClick={() => { void handleSubmit(); }}
        >
          {saving ? 'Saving...' : isEdit ? 'Update Exam' : 'Add Exam'}
        </Button>
      </div>
    </div>
  );
}
