import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface OfferingForm {
  course_id: string;
  title: string;
  offering_code: string;
  delivery_mode: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  enrollment_start: string;
  enrollment_end: string;
  max_enrollment: string;
  pricing_amount: string;
  status: string;
}

const emptyForm: OfferingForm = {
  course_id: '', title: '', offering_code: '',
  delivery_mode: 'cohort', academic_year: '', start_date: '', end_date: '',
  enrollment_start: '', enrollment_end: '', max_enrollment: '', pricing_amount: '', status: 'draft',
};

function toDateInput(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0] ?? '';
}

export default function AddOfferingPage({ api, session, onNavigate }: AdminPageProps) {
  const [form, setForm] = useState<OfferingForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const editId = useMemo(() => {
    const match = window.location.pathname.match(/\/admin\/offerings\/edit\/(.+)/);
    return match?.[1] ?? '';
  }, []);

  const { data: coursesData, loading: coursesLoading } = useAdminPageData(() => api.loadCourses(session.token), []);
  const courses = useMemo(() => toRecords(coursesData), [coursesData]);

  useEffect(() => {
    if (!editId) return;
    api.getOffering(session.token, editId).then((offering) => {
      if (!offering) return;
      setForm({
        course_id: asString(offering.course_id),
        title: asString(offering.title),
        offering_code: asString(offering.offering_code),
        delivery_mode: asString(offering.delivery_mode) || 'cohort',
        academic_year: asString(offering.academic_year),
        start_date: toDateInput(asString(offering.start_date)),
        end_date: toDateInput(asString(offering.end_date)),
        enrollment_start: toDateInput(asString(offering.enrollment_start)),
        enrollment_end: toDateInput(asString(offering.enrollment_end)),
        max_enrollment: offering.max_enrollment ? String(asNumber(offering.max_enrollment)) : '',
        pricing_amount: offering.pricing_amount ? String(asNumber(offering.pricing_amount)) : '',
        status: asString(offering.status) || 'draft',
      });
    }).catch(() => {/* ignore */});
  }, [editId, api, session.token]);

  const handleSave = useCallback(async () => {
    if (!form.course_id) return;
    setSaving(true);
    try {
      const payload = {
        course_id: form.course_id,
        title: form.title.trim() || undefined,
        offering_code: form.offering_code.trim() || undefined,
        delivery_mode: form.delivery_mode,
        academic_year: form.delivery_mode === 'cohort' ? (form.academic_year.trim() || undefined) : undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        enrollment_start: form.enrollment_start || undefined,
        enrollment_end: form.enrollment_end || undefined,
        max_enrollment: form.max_enrollment ? Number(form.max_enrollment) : undefined,
        pricing_amount: form.pricing_amount ? Number(form.pricing_amount) : undefined,
        status: form.status,
      };
      if (editId) {
        await api.updateOffering(session.token, editId, payload);
      } else {
        await api.createOffering(session.token, payload);
      }
      onNavigate('/admin/offerings/index');
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, editId, form, onNavigate]);

  const updateField = useCallback((field: keyof OfferingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (coursesLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{editId ? 'Edit Offering' : 'New Course Offering'}</h2>
        <Button variant="outline" onClick={() => onNavigate('/admin/offerings/index')}>Back</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Course Selection</CardTitle></CardHeader>
        <CardContent>
          <div className="max-w-md space-y-1">
            <Label>Course *</Label>
            <select className={selectClass} value={form.course_id} onChange={(e) => updateField('course_id', e.target.value)}>
              <option value="">-- Select Course --</option>
              {courses.map((c) => <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Offering Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Montessori Foundations — Jan 2026 Batch" />
            </div>
            <div className="space-y-1">
              <Label>Offering Code</Label>
              <Input value={form.offering_code} onChange={(e) => updateField('offering_code', e.target.value)} placeholder="e.g. MF-JAN26" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Delivery Mode</Label>
              <select className={selectClass} value={form.delivery_mode} onChange={(e) => updateField('delivery_mode', e.target.value)}>
                <option value="self_paced">Self-Paced</option>
                <option value="cohort">Cohort</option>
              </select>
            </div>
            {form.delivery_mode === 'cohort' && (
              <div className="space-y-1">
                <Label>Academic Year</Label>
                <Input value={form.academic_year} onChange={(e) => updateField('academic_year', e.target.value)} placeholder="e.g. 2025-26" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {form.delivery_mode === 'cohort' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Schedule & Capacity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => updateField('start_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => updateField('end_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Enrollment Opens</Label>
                <Input type="date" value={form.enrollment_start} onChange={(e) => updateField('enrollment_start', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Enrollment Closes</Label>
                <Input type="date" value={form.enrollment_end} onChange={(e) => updateField('enrollment_end', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Max Enrollment</Label>
                <Input type="number" value={form.max_enrollment} onChange={(e) => updateField('max_enrollment', e.target.value)} placeholder="0 = unlimited" />
              </div>
              <div className="space-y-1">
                <Label>Pricing (INR)</Label>
                <Input type="number" value={form.pricing_amount} onChange={(e) => updateField('pricing_amount', e.target.value)} placeholder="0" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="max-w-xs space-y-1">
            <Label>Status</Label>
            <select className={selectClass} value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => onNavigate('/admin/offerings/index')}>Cancel</Button>
        <Button onClick={() => { void handleSave(); }} disabled={saving || !form.course_id}>
          {saving ? 'Saving...' : editId ? 'Update Offering' : 'Create Offering'}
        </Button>
      </div>
    </div>
  );
}
