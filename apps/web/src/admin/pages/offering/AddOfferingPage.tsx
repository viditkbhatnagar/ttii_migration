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
  publish_type: string;
  course_expiry_days: string;
  content_release_strategy: string;
  fee_category: string;
  base_fee: string;
  discount: string;
  offered_fee: string;
  completion_policy_id: string;
  certificate_template_id: string;
  language_id: string;
  status: string;
}

const emptyForm: OfferingForm = {
  course_id: '',
  title: '',
  offering_code: '',
  delivery_mode: 'cohort',
  academic_year: '',
  start_date: '',
  end_date: '',
  enrollment_start: '',
  enrollment_end: '',
  max_enrollment: '',
  publish_type: 'public',
  course_expiry_days: '',
  content_release_strategy: 'full',
  fee_category: 'paid',
  base_fee: '',
  discount: '',
  offered_fee: '',
  completion_policy_id: '',
  certificate_template_id: '',
  language_id: '',
  status: 'draft',
};

function toDateInput(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0] ?? '';
}

function computeOfferedFee(base: string, discount: string): string {
  const b = Number(base) || 0;
  const d = Number(discount) || 0;
  if (!b) return '';
  const result = Math.max(0, b - d);
  return result ? String(result) : '';
}

export default function AddOfferingPage({ api, session, onNavigate }: AdminPageProps) {
  const [form, setForm] = useState<OfferingForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const editId = useMemo(() => {
    const match = window.location.pathname.match(/\/admin\/offerings\/edit\/(.+)/);
    return match?.[1] ?? '';
  }, []);

  const { data: coursesData, loading: coursesLoading } = useAdminPageData(
    () => api.loadCourses(session.token),
    [],
  );
  const { data: languagesData } = useAdminPageData(() => api.loadLanguages(session.token), []);
  const { data: policiesData } = useAdminPageData(() => api.listCompletionPolicies(session.token), []);
  const { data: templatesData } = useAdminPageData(() => api.listCertificateTemplates(session.token), []);

  const courses = useMemo(() => toRecords(coursesData), [coursesData]);
  const languages = useMemo(() => toRecords(languagesData), [languagesData]);
  const policies = useMemo(() => toRecords(policiesData), [policiesData]);
  const templates = useMemo(() => toRecords(templatesData), [templatesData]);

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
        publish_type: asString(offering.publish_type) || 'public',
        course_expiry_days: offering.course_expiry_days ? String(asNumber(offering.course_expiry_days)) : '',
        content_release_strategy: asString(offering.content_release_strategy) || 'full',
        fee_category: asString(offering.fee_category) || 'paid',
        base_fee: offering.base_fee ? String(asNumber(offering.base_fee)) : '',
        discount: offering.discount ? String(asNumber(offering.discount)) : '',
        offered_fee: offering.offered_fee ? String(asNumber(offering.offered_fee)) : '',
        completion_policy_id: asString(offering.completion_policy_id),
        certificate_template_id: asString(offering.certificate_template_id),
        language_id: asString(offering.language_id),
        status: asString(offering.status) || 'draft',
      });
    }).catch(() => {/* ignore */});
  }, [editId, api, session.token]);

  const updateField = useCallback((field: keyof OfferingForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'base_fee' || field === 'discount') {
        next.offered_fee = computeOfferedFee(
          field === 'base_fee' ? value : next.base_fee,
          field === 'discount' ? value : next.discount,
        );
      }
      if (field === 'fee_category' && value === 'free') {
        next.base_fee = '';
        next.discount = '';
        next.offered_fee = '';
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.course_id) return;
    setSaving(true);
    try {
      const isCohort = form.delivery_mode === 'cohort';
      const isSelfPaced = form.delivery_mode === 'self_paced';
      const payload = {
        course_id: form.course_id,
        title: form.title.trim() || undefined,
        offering_code: form.offering_code.trim() || undefined,
        delivery_mode: form.delivery_mode,
        academic_year: isCohort ? (form.academic_year.trim() || undefined) : undefined,
        start_date: isCohort ? (form.start_date || undefined) : undefined,
        end_date: isCohort ? (form.end_date || undefined) : undefined,
        enrollment_start: form.enrollment_start || undefined,
        enrollment_end: form.enrollment_end || undefined,
        max_enrollment: form.max_enrollment ? Number(form.max_enrollment) : undefined,
        publish_type: form.publish_type,
        course_expiry_days: isSelfPaced && form.course_expiry_days ? Number(form.course_expiry_days) : undefined,
        content_release_strategy: form.content_release_strategy,
        fee_category: form.fee_category,
        base_fee: form.fee_category === 'paid' && form.base_fee ? Number(form.base_fee) : undefined,
        discount: form.fee_category === 'paid' && form.discount ? Number(form.discount) : undefined,
        offered_fee: form.fee_category === 'paid' && form.offered_fee ? Number(form.offered_fee) : undefined,
        completion_policy_id: form.completion_policy_id || undefined,
        certificate_template_id: form.certificate_template_id || undefined,
        language_id: form.language_id || undefined,
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
        <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Course *</Label>
              <select className={selectClass} value={form.course_id} onChange={(e) => updateField('course_id', e.target.value)}>
                <option value="">-- Select Course --</option>
                {courses.map((c) => <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Delivery Mode</Label>
              <select className={selectClass} value={form.delivery_mode} onChange={(e) => updateField('delivery_mode', e.target.value)}>
                <option value="self_paced">Self-Paced</option>
                <option value="cohort">Cohort</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Offering Title</Label>
              <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Montessori Foundations — Jan 2026 Batch" />
            </div>
            <div className="space-y-1">
              <Label>Offering Code</Label>
              <Input value={form.offering_code} onChange={(e) => updateField('offering_code', e.target.value)} placeholder="e.g. MF-JAN26" />
            </div>
          </div>
          {form.delivery_mode === 'cohort' && (
            <div className="max-w-xs space-y-1">
              <Label>Academic Year</Label>
              <Input value={form.academic_year} onChange={(e) => updateField('academic_year', e.target.value)} placeholder="e.g. 2025-26" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Enrollment Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Enrollment Start Date</Label>
              <Input type="date" value={form.enrollment_start} onChange={(e) => updateField('enrollment_start', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Enrollment End Date</Label>
              <Input type="date" value={form.enrollment_end} onChange={(e) => updateField('enrollment_end', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Maximum Enrollment</Label>
              <Input type="number" value={form.max_enrollment} onChange={(e) => updateField('max_enrollment', e.target.value)} placeholder="0 = unlimited" />
            </div>
            <div className="space-y-1">
              <Label>Publish Type</Label>
              <select className={selectClass} value={form.publish_type} onChange={(e) => updateField('publish_type', e.target.value)}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {form.delivery_mode === 'cohort' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Course Scheduling</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Course Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => updateField('start_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Course End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => updateField('end_date', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Access Control</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {form.delivery_mode === 'self_paced' && (
              <div className="space-y-1">
                <Label>Course Expiry (Days)</Label>
                <Input
                  type="number"
                  value={form.course_expiry_days}
                  onChange={(e) => updateField('course_expiry_days', e.target.value)}
                  placeholder="e.g. 365"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Content Release Strategy</Label>
              <select
                className={selectClass}
                value={form.content_release_strategy}
                onChange={(e) => updateField('content_release_strategy', e.target.value)}
              >
                <option value="full">Full (all at once)</option>
                <option value="cohort">Cohort Based</option>
                <option value="subject">Subject Based</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1">
            <Label>Fee Category</Label>
            <select className={selectClass} value={form.fee_category} onChange={(e) => updateField('fee_category', e.target.value)}>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          {form.fee_category === 'paid' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Base Fee (INR)</Label>
                <Input type="number" value={form.base_fee} onChange={(e) => updateField('base_fee', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Discount (INR)</Label>
                <Input type="number" value={form.discount} onChange={(e) => updateField('discount', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Offered Fee (auto)</Label>
                <Input type="number" value={form.offered_fee} readOnly className="bg-muted" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Academic Rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Completion Policy</Label>
              <select
                className={selectClass}
                value={form.completion_policy_id}
                onChange={(e) => updateField('completion_policy_id', e.target.value)}
              >
                <option value="">-- None --</option>
                {policies.map((p) => <option key={asString(p.id)} value={asString(p.id)}>{asString(p.title)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Certificate Template</Label>
              <select
                className={selectClass}
                value={form.certificate_template_id}
                onChange={(e) => updateField('certificate_template_id', e.target.value)}
              >
                <option value="">-- None --</option>
                {templates.map((t) => <option key={asString(t.id)} value={asString(t.id)}>{asString(t.title)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Language</Label>
              <select
                className={selectClass}
                value={form.language_id}
                onChange={(e) => updateField('language_id', e.target.value)}
              >
                <option value="">-- Any --</option>
                {languages.map((l) => <option key={asString(l.id)} value={asString(l.id)}>{asString(l.title)}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="max-w-xs space-y-1">
            <Label>Status</Label>
            <select className={selectClass} value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
