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
  features: string;
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
  features: '',
  status: 'draft',
};

export default function AddCoursePage({ api, session, onNavigate }: AdminPageProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [requiredDocIds, setRequiredDocIds] = useState<Set<string>>(new Set());

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

  // Document type master list (for the Required Documents multi-select)
  const { data: documentTypes } = useAdminPageData(
    () => api.listDocumentTypes(session.token),
    [],
  );

  // In edit mode, prefill the chosen required docs.
  useEffect(() => {
    if (!isEdit || !courseId) return;
    api.listCourseRequiredDocuments(session.token, courseId)
      .then((rows) => {
        const ids = new Set<string>();
        for (const r of rows) {
          const id = asString(r.document_type_id);
          if (id) ids.add(id);
        }
        setRequiredDocIds(ids);
      })
      .catch(() => {});
  }, [isEdit, courseId, api, session.token]);

  const toggleDocType = useCallback((id: string) => {
    setRequiredDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (!isEdit || !courseData) return;
    const c = courseData;
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
      features: asString(c.features),
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
      // Pricing, Course Type, Publish Type and Referral Point removed from
      // the course form (Naji 2026-04-27): pricing + delivery mode now live
      // on Course Offerings, so they don't belong here. Sending sane
      // defaults for the legacy DB columns so existing rows / consumers
      // don't break.
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
        is_free_course: true,
        is_cohort_course: true,
        is_public: true,
        point: 0,
        price: null,
        sale_price: null,
        features: form.features.trim(),
        label: '',
        status: form.status,
        visibility: 'public',
      };

      const saveRequiredDocs = async (cid: string) => {
        if (!cid) return;
        try {
          await api.setCourseRequiredDocuments(session.token, cid, Array.from(requiredDocIds));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Course saved, but failed to save required documents.');
        }
      };

      if (isEdit) {
        const result = await api.updateCourse(session.token, courseId, payload);
        if (asString(result.status) === '0' || result.status === 0) {
          toast.error(asString(result.message) || 'Failed to update course');
        } else {
          await saveRequiredDocs(courseId);
          onNavigate('/admin/course/index');
        }
      } else {
        const result = await api.createCourse(session.token, payload);
        if (asString(result.status) === '0' || result.status === 0) {
          toast.error(asString(result.message) || 'Failed to create course');
        } else {
          const newId = asString(result.id) || asString((result as Record<string, unknown>).course_id);
          await saveRequiredDocs(newId);
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
                placeholder="Write the course overview as a paragraph"
              />
              <p className="text-xs text-gray-500">Paragraph format. Shown to students on the course page.</p>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Learning Outcome (one point per line)</Label>
              <textarea
                className={textareaClass}
                value={form.outcomes}
                onChange={(e) => set('outcomes', e.target.value)}
                placeholder={'• Develop classroom management skills\n• Design age-appropriate lesson plans\n• Assess student progress effectively'}
              />
              <p className="text-xs text-gray-500">Each line becomes a bullet point shown to students.</p>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Who Should Enroll (one point per line)</Label>
              <textarea
                className={textareaClass}
                value={form.features}
                onChange={(e) => set('features', e.target.value)}
                placeholder={'• Aspiring teachers preparing for classroom roles\n• Working professionals upgrading qualifications\n• Parents looking to teach foundational skills'}
              />
              <p className="text-xs text-gray-500">Each line becomes a bullet point shown to students.</p>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Prerequisites (one point per line)</Label>
              <textarea
                className={textareaClass}
                value={form.requirements}
                onChange={(e) => set('requirements', e.target.value)}
                placeholder={'• Bachelor\'s degree in any discipline\n• Basic English communication\n• Access to a computer with internet'}
              />
              <p className="text-xs text-gray-500">Each line becomes a bullet point shown to students.</p>
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
              <p className="text-xs text-gray-500">
                Recommended 1200×628 (≈1.91:1). The image will be center-cropped to fit course cards on both web and mobile. Max file size 200KB.
              </p>
            </div>
            <div className="grid gap-2 md:col-span-2 md:max-w-xs">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600">
            Pick which documents an applicant must upload when applying for this
            course. Manage the master list under <span className="font-medium">Settings → Document Types</span>.
          </p>
          {(documentTypes ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-sm text-gray-500">
              No document types defined yet. Add them under Settings → Document Types first.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {(documentTypes ?? []).map((d) => {
                const id = asString(d.id);
                const label = asString(d.label);
                const checked = requiredDocIds.has(id);
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      checked ? 'border-ttii-primary bg-ttii-primary/5' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDocType(id)}
                      className="size-4"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          )}
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
