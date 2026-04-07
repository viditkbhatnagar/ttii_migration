import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { FileUpload } from '../../shared/components/FileUpload.js';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const textareaClass = 'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface FormState {
  title: string;
  short_name: string;
  category_id: string;
  duration: string;
  description: string;
  thumbnail: string;
  is_free_course: string;
  is_cohort_course: string;
  is_public: string;
  point: string;
  price: string;
  sale_price: string;
  features: string;
  label: string;
  status: string;
}

const emptyForm: FormState = {
  title: '',
  short_name: '',
  category_id: '',
  duration: '',
  description: '',
  thumbnail: '',
  is_free_course: 'free',
  is_cohort_course: 'cohort',
  is_public: 'public',
  point: '',
  price: '',
  sale_price: '',
  features: '',
  label: '',
  status: 'draft',
};

export default function AddCoursePage({ api, session, onNavigate }: AdminPageProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Determine mode from URL
  const { isEdit, courseId } = useMemo(() => {
    const path = window.location.pathname;
    const editMatch = path.match(/\/admin\/course\/edit\/(.+)/);
    if (editMatch) {
      return { isEdit: true, courseId: editMatch[1] ?? '' };
    }
    return { isEdit: false, courseId: '' };
  }, []);

  // Load categories for dropdown
  const { data: categories } = useAdminPageData(
    () => api.loadCategories(session.token),
    [],
  );

  // Load course data for edit mode
  const { data: courseData, loading } = useAdminPageData(
    () => (isEdit && courseId ? api.getCourse(session.token, courseId) : Promise.resolve(null)),
    [isEdit, courseId],
  );

  // Pre-fill form in edit mode
  useEffect(() => {
    if (!isEdit || !courseData) return;
    const c = courseData as Record<string, unknown>;
    const isFree = c.is_free_course === true || c.is_free_course === 1 || asString(c.is_free_course) === '1';
    const isCohort = c.is_cohort_course === true || c.is_cohort_course === 1 || asString(c.is_cohort_course) === '1';
    const isPublic = c.is_public === true || c.is_public === 1 || asString(c.is_public) === '1' || asString(c.visibility) === 'public';
    setForm({
      title: asString(c.title),
      short_name: asString(c.short_name),
      category_id: asString(c.category_id),
      duration: asString(c.duration),
      description: asString(c.description),
      thumbnail: asString(c.thumbnail),
      is_free_course: isFree ? 'free' : 'paid',
      is_cohort_course: isCohort ? 'cohort' : 'non_cohort',
      is_public: isPublic ? 'public' : 'private',
      point: asString(c.point),
      price: asString(c.price),
      sale_price: asString(c.sale_price),
      features: asString(c.features),
      label: asString(c.label),
      status: asString(c.status) || 'draft',
    });
  }, [isEdit, courseData]);

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      alert('Course title is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        short_name: form.short_name.trim(),
        category_id: form.category_id || null,
        duration: form.duration.trim(),
        description: form.description.trim(),
        thumbnail: form.thumbnail.trim(),
        is_free_course: form.is_free_course === 'free',
        is_cohort_course: form.is_cohort_course === 'cohort',
        is_public: form.is_public === 'public',
        point: form.point ? Number(form.point) : 0,
        price: form.is_free_course === 'paid' && form.price ? Number(form.price) : null,
        sale_price: form.is_free_course === 'paid' && form.sale_price ? Number(form.sale_price) : null,
        features: form.features.trim(),
        label: form.label.trim(),
        status: form.status,
        visibility: form.is_public,
      };

      if (isEdit) {
        const result = await api.updateCourse(session.token, courseId, payload);
        if (asString(result.status) === '0' || result.status === 0) {
          alert(asString(result.message) || 'Failed to update course');
        } else {
          onNavigate('/admin/course/index');
        }
      } else {
        const result = await api.createCourse(session.token, payload);
        if (asString(result.status) === '0' || result.status === 0) {
          alert(asString(result.message) || 'Failed to create course');
        } else {
          onNavigate('/admin/course/index');
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, courseId, api, session.token, onNavigate]);

  if (loading) {
    return <PageLoader label="Loading add course..." />;
  }

  const categoryList = (categories ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-4">
      <AdminPageHeader title={isEdit ? 'Edit Course' : 'Add Course'}>
        <Button variant="outline" onClick={() => onNavigate('/admin/course/index')}>
          Cancel
        </Button>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Course Title *</Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Enter course title" />
            </div>
            <div className="grid gap-2">
              <Label>Course Short Name *</Label>
              <Input value={form.short_name} onChange={(e) => set('short_name', e.target.value)} placeholder="e.g. PGDM" />
            </div>
            <div className="grid gap-2">
              <Label>Course Category *</Label>
              <select className={selectClass} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">Choose Category</option>
                {categoryList.map((cat) => (
                  <option key={asString(cat.id)} value={asString(cat.id)}>{asString(cat.name)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Course duration *</Label>
              <Input value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 1 Year" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Course Description</Label>
              <textarea
                className={textareaClass}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Enter course description"
              />
              <p className="text-xs text-gray-500">Rich text description (supports HTML)</p>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Who should enrol (points per line)</Label>
              <textarea
                className={textareaClass}
                value={form.features}
                onChange={(e) => set('features', e.target.value)}
                placeholder="Enter one bullet point per line"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Course Thumbnail</Label>
              <FileUpload
                value={form.thumbnail}
                onChange={(url) => set('thumbnail', url)}
                onUpload={async (file) => { const r = await api.uploadFile(session.token, file); return r.url; }}
                accept="image/*"
                placeholder="Upload thumbnail image"
              />
              <p className="text-xs text-gray-500">Image Aspect ratio should be 1200x628 – Max File size 100KB</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Pricing *</Label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_free_course"
                  value="free"
                  checked={form.is_free_course === 'free'}
                  onChange={() => set('is_free_course', 'free')}
                />
                Free Course
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_free_course"
                  value="paid"
                  checked={form.is_free_course === 'paid'}
                  onChange={() => set('is_free_course', 'paid')}
                />
                Paid Course
              </label>
            </div>
            {form.is_free_course === 'paid' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Price</Label>
                  <Input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="Enter price" />
                </div>
                <div className="grid gap-2">
                  <Label>Sale Price</Label>
                  <Input type="number" min="0" value={form.sale_price} onChange={(e) => set('sale_price', e.target.value)} placeholder="Enter sale price" />
                </div>
              </div>
            )}
          </div>

          {/* Course Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Course Type *</Label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_cohort_course"
                  value="cohort"
                  checked={form.is_cohort_course === 'cohort'}
                  onChange={() => set('is_cohort_course', 'cohort')}
                />
                Cohort Course
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_cohort_course"
                  value="non_cohort"
                  checked={form.is_cohort_course === 'non_cohort'}
                  onChange={() => set('is_cohort_course', 'non_cohort')}
                />
                Non Cohort Course
              </label>
            </div>
          </div>

          {/* Publish Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Publish Type *</Label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_public"
                  value="public"
                  checked={form.is_public === 'public'}
                  onChange={() => set('is_public', 'public')}
                />
                Public
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_public"
                  value="private"
                  checked={form.is_public === 'private'}
                  onChange={() => set('is_public', 'private')}
                />
                Private
              </label>
            </div>
          </div>

          {/* Referral Point + Status */}
          <div className="grid gap-4 md:grid-cols-2 md:max-w-lg">
            <div className="grid gap-2">
              <Label>Referral Point *</Label>
              <Input
                type="number"
                min="0"
                value={form.point}
                onChange={(e) => set('point', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <select className={selectClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => onNavigate('/admin/course/index')}>
          Cancel
        </Button>
        <Button
          className="bg-ttii-primary hover:bg-ttii-primary/90"
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving ? 'Saving...' : 'Save Course'}
        </Button>
      </div>
    </div>
  );
}
