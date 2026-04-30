import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Video, Music, FileQuestion, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Small icon for a lesson file row, derived from lesson_files.lesson_type. */
function LessonFileIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === 'video') return <Video aria-hidden="true" className="size-3.5 text-blue-600" />;
  if (t === 'audio') return <Music aria-hidden="true" className="size-3.5 text-purple-600" />;
  if (t === 'quiz') return <FileQuestion aria-hidden="true" className="size-3.5 text-orange-600" />;
  return <FileText aria-hidden="true" className="size-3.5 text-slate-500" />;
}

/** Lazy-loaded files-under-a-lesson row. Only fetches when the parent
 * lesson is first expanded (Naji 2026-04-30 — wants a drill-down preview
 * inside the View Course screen). */
function LessonFilesNode({
  api,
  token,
  lessonId,
}: {
  api: AdminPageProps['api'];
  token: string;
  lessonId: string;
}) {
  const { data, loading } = useAdminPageData(
    () => api.listLessonFiles(token, lessonId),
    [lessonId],
  );
  const files = useMemo(() => toRecords(data), [data]);

  if (loading) {
    return (
      <div className="ml-12 space-y-1">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-3/4" />)}
      </div>
    );
  }
  if (files.length === 0) {
    return <p className="ml-12 text-xs text-slate-400">No content yet.</p>;
  }
  return (
    <ul className="ml-12 space-y-1">
      {files.map((f) => (
        <li key={asString(f.id)} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-50">
          <LessonFileIcon type={asString(f.lesson_type)} />
          <span className="flex-1 text-sm text-slate-700">{asString(f.title) || '(untitled)'}</span>
          <span className="text-[11px] uppercase tracking-wide text-slate-400">{asString(f.lesson_type) || 'file'}</span>
        </li>
      ))}
    </ul>
  );
}

function LessonNode({
  api,
  token,
  lesson,
}: {
  api: AdminPageProps['api'];
  token: string;
  lesson: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const lessonId = asString(lesson.id);
  const fileCount = asNumber(lesson.files_count);
  return (
    <li className="rounded-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50"
      >
        {open ? (
          <ChevronDown aria-hidden="true" className="size-3.5 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight aria-hidden="true" className="size-3.5 text-slate-500 shrink-0" />
        )}
        <BookOpen aria-hidden="true" className="size-3.5 text-emerald-600 shrink-0" />
        <span className="flex-1 text-sm text-slate-800">{asString(lesson.title) || '(untitled lesson)'}</span>
        <span className="text-[11px] text-slate-400">{fileCount > 0 ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : 'empty'}</span>
      </button>
      {open && <LessonFilesNode api={api} token={token} lessonId={lessonId} />}
    </li>
  );
}

function SubjectNode({
  api,
  token,
  subject,
}: {
  api: AdminPageProps['api'];
  token: string;
  subject: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const subjectId = asString(subject.id);
  const lessonCount = asNumber(subject.total_lessons || subject.lesson_count);

  // Lessons load lazily when the subject is first expanded.
  const { data: lessonsData, loading: lessonsLoading } = useAdminPageData(
    () => (open ? api.listLessonsAdmin(token, subjectId) : Promise.resolve([])),
    [subjectId, open],
  );
  const lessons = useMemo(() => toRecords(lessonsData), [lessonsData]);

  return (
    <li className="rounded-md border border-slate-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50"
      >
        {open ? (
          <ChevronDown aria-hidden="true" className="size-3.5 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight aria-hidden="true" className="size-3.5 text-slate-500 shrink-0" />
        )}
        <span className="flex-1 text-sm font-medium text-slate-900">{asString(subject.title) || '(untitled subject)'}</span>
        <span className="text-[11px] text-slate-500">
          {lessonCount > 0 ? `${lessonCount} lesson${lessonCount === 1 ? '' : 's'}` : 'no lessons'}
        </span>
      </button>
      {open && (
        <div className="px-2 pb-2 ml-4 border-l border-slate-200">
          {lessonsLoading ? (
            <div className="ml-4 space-y-1 mt-1">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-6 w-2/3" />)}
            </div>
          ) : lessons.length === 0 ? (
            <p className="ml-6 mt-1 text-xs text-slate-400">No lessons yet.</p>
          ) : (
            <ul className="space-y-0.5 mt-1">
              {lessons.map((l) => (
                <LessonNode key={asString(l.id)} api={api} token={token} lesson={l} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function CurriculumTree({
  api,
  token,
  courseId,
}: {
  api: AdminPageProps['api'];
  token: string;
  courseId: string;
}) {
  const { data, loading, error } = useAdminPageData(
    () => api.listCourseSubjects(token, courseId),
    [courseId],
  );
  const subjects = useMemo(() => toRecords(data), [data]);

  if (loading) {
    return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (subjects.length === 0) {
    return <p className="text-sm text-slate-400">No subjects yet. Use Manage Subjects to add one.</p>;
  }
  return (
    <ul className="space-y-2">
      {subjects.map((s) => (
        <SubjectNode key={asString(s.id)} api={api} token={token} subject={s} />
      ))}
    </ul>
  );
}

export default function ViewCoursePage({ api, session, onNavigate }: AdminPageProps) {
  const courseId = useMemo(() => {
    const match = window.location.pathname.match(/\/admin\/course\/view\/(.+)/);
    return match?.[1] ?? '';
  }, []);

  const { data, loading, error } = useAdminPageData(
    () => (courseId ? api.getCourse(session.token, courseId) : Promise.resolve(null)),
    [courseId],
  );

  if (loading) return <PageLoader label="Loading course..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-600">Course not found.</CardContent>
      </Card>
    );
  }

  const c = data;
  const totalHours = asNumber(c.total_learning_hours);
  const price = asNumber(c.price);
  const salePrice = asNumber(c.sale_price);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="View Course">
        <Button variant="outline" onClick={() => onNavigate('/admin/course/index')}>
          Back to list
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate(`/admin/course/subjects/${courseId}`)}
        >
          Manage Subjects
        </Button>
        <Button
          className="bg-ttii-primary hover:bg-ttii-primary/90"
          onClick={() => onNavigate(`/admin/course/edit/${courseId}`)}
        >
          Edit Course
        </Button>
      </AdminPageHeader>

      <Section title={asString(c.title) || 'Course'}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Course Code" value={asString(c.course_code)} />
          <Field label="Short Name" value={asString(c.short_name)} />
          <div className="grid gap-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
            <div>
              <AdminStatusBadge status={asString(c.status) || 'draft'} />
            </div>
          </div>
          <Field label="Course Level" value={asString(c.level)} />
          <Field label="Course Version" value={asString(c.version)} />
          <Field label="Course Duration" value={asString(c.duration)} />
          <Field label="Total Learning Hours" value={totalHours ? String(totalHours) : ''} />
          <Field label="Language" value={asString(c.language)} />
          <Field label="Pricing" value={asString(c.is_free_course) === '1' || c.is_free_course === true ? 'Free' : `Paid — ₹${price}${salePrice ? ` (sale ₹${salePrice})` : ''}`} />
        </div>
      </Section>

      <Section title="Curriculum">
        <p className="mb-3 text-xs text-slate-500">
          Subjects → Lessons → Content. Click a subject or lesson to drill down.
        </p>
        <CurriculumTree api={api} token={session.token} courseId={courseId} />
      </Section>

      <Section title="Description">
        <div className="prose max-w-none text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: asString(c.description) || '<em>No description</em>' }} />
      </Section>

      {asString(c.outcomes).trim() && (
        <Section title="Learning Outcome">
          <p className="whitespace-pre-line text-sm text-gray-800">{asString(c.outcomes)}</p>
        </Section>
      )}

      {asString(c.features).trim() && (
        <Section title="Who Should Enroll">
          <p className="whitespace-pre-line text-sm text-gray-800">{asString(c.features)}</p>
        </Section>
      )}

      {asString(c.requirements).trim() && (
        <Section title="Prerequisites">
          <p className="whitespace-pre-line text-sm text-gray-800">{asString(c.requirements)}</p>
        </Section>
      )}

      {asString(c.thumbnail) && (
        <Section title="Thumbnail">
          <img loading="lazy" decoding="async" src={asString(c.thumbnail)} alt="Course thumbnail" className="max-h-60 rounded-md border border-gray-200" />
        </Section>
      )}
    </div>
  );
}
