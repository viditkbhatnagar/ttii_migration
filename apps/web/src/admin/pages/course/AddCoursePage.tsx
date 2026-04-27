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
import { FileUpload } from '../../shared/components/FileUpload.js';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const textareaClass = 'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface FormState {
  title: string;
  course_code: string;
  short_name: string;
  category_id: string;
  // Duration is split into count + unit on the form (e.g. "1" + "Year").
  // Stored as a single string "1 Year" on the backend.
  duration_count: string;
  duration_unit: string;
  total_learning_hours: string;
  level: string;
  version: string;
  language: string;
  description: string;
  outcomes: string;
  requirements: string;
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

const DURATION_UNITS = ['Year', 'Month', 'Week', 'Day'] as const;

function parseDurationString(raw: string): { count: string; unit: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { count: '', unit: 'Year' };
  // Accept "1 Year", "6 Months", "12 weeks", etc. Singular/plural agnostic.
  const match = /^(\d+)\s*([A-Za-z]+)/.exec(trimmed);
  if (!match) return { count: '', unit: 'Year' };
  const count = match[1] ?? '';
  const word = (match[2] ?? '').toLowerCase().replace(/s$/, '');
  const unit = DURATION_UNITS.find((u) => u.toLowerCase() === word) ?? 'Year';
  return { count, unit };
}

const emptyForm: FormState = {
  title: '',
  course_code: '',
  short_name: '',
  category_id: '',
  duration_count: '',
  duration_unit: 'Year',
  total_learning_hours: '',
  level: '',
  version: '',
  language: '',
  description: '',
  outcomes: '',
  requirements: '',
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
    const c = courseData;
    const isFree = c.is_free_course === true || c.is_free_course === 1 || asString(c.is_free_course) === '1';
    const isCohort = c.is_cohort_course === true || c.is_cohort_course === 1 || asString(c.is_cohort_course) === '1';
    const isPublic = c.is_public === true || c.is_public === 1 || asString(c.is_public) === '1' || asString(c.visibility) === 'public';
    const parsedDuration = parseDurationString(asString(c.duration));
    setForm({
      title: asString(c.title),
      course_code: asString(c.course_code),
      short_name: asString(c.short_name),
      category_id: asString(c.category_id),
      duration_count: parsedDuration.count,
      duration_unit: parsedDuration.unit,
      total_learning_hours: asString(c.total_learning_hours),
      level: asString(c.level),
      version: asString(c.version),
      language: asString(c.language),
      description: asString(c.description),
      outcomes: asString(c.outcomes),
      requirements: asString(c.requirements),
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
    // All fields are mandatory except Course Level.
    const required: { value: string; label: string }[] = [
      { value: form.course_code.trim(), label: 'Course Code' },
      { value: form.title.trim(), label: 'Course Title' },
      { value: form.short_name.trim(), label: 'Course Short Name' },
      { value: form.version.trim(), label: 'Course Version' },
      { value: form.category_id, label: 'Course Category' },
      { value: form.duration_count.trim(), label: 'Course Duration' },
      { value: form.total_learning_hours.trim(), label: 'Total Learning Hours' },
      { value: form.language, label: 'Language' },
      { value: form.description.trim(), label: 'Course Description' },
    ];
    const missing = required.find((r) => r.value === '');
    if (missing) {
      toast.error(`${missing.label} is required.`);
      return;
    }

    const durationCountNum = Number(form.duration_count);
    if (!Number.isFinite(durationCountNum) || durationCountNum <= 0) {
      toast.error('Course Duration must be a positive number.');
      return;
    }
    const durationStr = `${durationCountNum} ${form.duration_unit}${durationCountNum > 1 ? 's' : ''}`;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        course_code: form.course_code.trim(),
        short_name: form.short_name.trim(),
        category_id: form.category_id || null,
        duration: durationStr,
        total_learning_hours: form.total_learning_hours ? Number(form.total_learning_hours) : null,
        level: form.level.trim(),
        version: form.version.trim(),
        language: form.language.trim(),
        description: form.description.trim(),
        outcomes: form.outcomes.trim(),
        requirements: form.requirements.trim(),
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
          toast.error(asString(result.message) || 'Failed to update course');
        } else {
          onNavigate('/admin/course/index');
        }
      } else {
        const result = await api.createCourse(session.token, payload);
        if (asString(result.status) === '0' || result.status === 0) {
          toast.error(asString(result.message) || 'Failed to create course');
        } else {
          onNavigate('/admin/course/index');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, courseId, api, session.token, onNavigate]);

  if (loading) {
    return <PageLoader label="Loading add course..." />;
  }

  const categoryList = (categories ?? []);

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
              <Label>Course Code *</Label>
              <Input value={form.course_code} onChange={(e) => set('course_code', e.target.value)} placeholder="e.g. PGDTT-001" />
            </div>
            <div className="grid gap-2">
              <Label>Course Title *</Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Enter course title" />
            </div>
            <div className="grid gap-2">
              <Label>Course Short Name *</Label>
              <Input value={form.short_name} onChange={(e) => set('short_name', e.target.value)} placeholder="e.g. PGDM" />
            </div>
            <div className="grid gap-2">
              <Label>Course Level</Label>
              <select className={selectClass} value={form.level} onChange={(e) => set('level', e.target.value)}>
                <option value="">Select Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Course Version *</Label>
              <Input value={form.version} onChange={(e) => set('version', e.target.value)} placeholder="e.g. 1.0" />
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
              <Label>Course Duration *</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  type="number"
                  min="1"
                  value={form.duration_count}
                  onChange={(e) => set('duration_count', e.target.value)}
                  placeholder="e.g. 1"
                />
                <select
                  className={selectClass}
                  style={{ width: 'auto', paddingRight: '2rem' }}
                  value={form.duration_unit}
                  onChange={(e) => set('duration_unit', e.target.value)}
                >
                  {DURATION_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Total Learning Hours *</Label>
              <Input type="number" min="0" value={form.total_learning_hours} onChange={(e) => set('total_learning_hours', e.target.value)} placeholder="e.g. 120" />
            </div>
            <div className="grid gap-2">
              <Label>Language *</Label>
              <select className={selectClass} value={form.language} onChange={(e) => set('language', e.target.value)}>
                <option value="">Select Language</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Malayalam">Malayalam</option>
                <option value="Tamil">Tamil</option>
                <option value="Kannada">Kannada</option>
                <option value="Telugu">Telugu</option>
              </select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Course Description *</Label>
              <textarea
                className={textareaClass}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Enter course description"
              />
              <p className="text-xs text-gray-500">Rich text description (supports HTML)</p>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Learning Outcome</Label>
              <textarea
                className={textareaClass}
                value={form.outcomes}
                onChange={(e) => set('outcomes', e.target.value)}
                placeholder="What learners will be able to do after completing this course"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Who Should Enroll (points per line)</Label>
              <textarea
                className={textareaClass}
                value={form.features}
                onChange={(e) => set('features', e.target.value)}
                placeholder="Enter one bullet point per line"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Prerequisites</Label>
              <textarea
                className={textareaClass}
                value={form.requirements}
                onChange={(e) => set('requirements', e.target.value)}
                placeholder="Required prior qualifications or knowledge"
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
          onClick={() => { void handleSubmit(); }}
        >
          {saving ? 'Saving...' : 'Save Course'}
        </Button>
      </div>
    </div>
  );
}
