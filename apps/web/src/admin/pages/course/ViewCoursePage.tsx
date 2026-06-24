import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, ChevronDown, FileText, Video, Music, FileQuestion, BookOpen, ExternalLink, Check, Eye, Plus, Pencil, Trash2, Library, CopyPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useConfirm } from '@/components/confirm-dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { SortableList } from '../../shared/components/SortableList.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { LessonContentManagerDialog } from './LessonContentManagerDialog.js';
import { LessonPickerDialog } from './LessonPickerDialog.js';

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
  // Content Library items (content_asset) linked to this lesson live in a
  // separate table, so surface them alongside lesson_files (Naji 2026-06-24 —
  // attached library content must be visible in the drill-down too).
  const { data: assetData, loading: assetLoading } = useAdminPageData(
    () => api.listLessonAssets(token, lessonId),
    [lessonId],
  );
  const files = useMemo<Record<string, unknown>[]>(() => {
    const lessonRows: Record<string, unknown>[] = toRecords(data).map((f) => ({ ...f, _source: 'lesson' }));
    const libraryRows: Record<string, unknown>[] = toRecords(assetData).map((a) => ({
      id: asString(a.id),
      title: asString(a.title),
      lesson_type: asString(a.asset_type),
      attachment_url: asString(a.attachment),
      video_url: asString(a.video_url),
      audio_url: asString(a.audio_file),
      _source: 'library',
    }));
    return [...lessonRows, ...libraryRows];
  }, [data, assetData]);
  // Quiz rows have no file URL (questions live in the quiz table), so they get a
  // "Preview" button that opens the questions dialog (Ishfaq 2026-06-09).
  const [quizFileId, setQuizFileId] = useState<string | null>(null);

  if (loading || assetLoading) {
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
    <>
      <ul className="ml-12 space-y-1">
        {files.map((f) => {
          const fileUrl = asString(f.attachment_url) || asString(f.video_url) || asString(f.audio_url);
          const isLibrary = asString(f._source) === 'library';
          // Quiz preview reads the lesson_files quiz table; library quizzes
          // store questions elsewhere, so only lesson-file quizzes get it here.
          const isLessonQuiz = asString(f.lesson_type).toLowerCase() === 'quiz' && !isLibrary;
          return (
            <li key={`${asString(f._source)}-${asString(f.id)}`} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-50">
              <LessonFileIcon type={asString(f.lesson_type)} />
              <span className="flex-1 truncate text-sm text-slate-700">{asString(f.title) || '(untitled)'}</span>
              {isLibrary && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Library</span>}
              <span className="text-[11px] uppercase tracking-wide text-slate-400">{asString(f.lesson_type) || 'file'}</span>
              {isLessonQuiz ? (
                <button
                  type="button"
                  onClick={() => setQuizFileId(asString(f.id))}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-orange-600 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <Eye aria-hidden="true" className="size-3" />
                  Preview
                </button>
              ) : fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <ExternalLink aria-hidden="true" className="size-3" />
                  View
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
      <QuizPreviewDialog api={api} token={token} fileId={quizFileId} onClose={() => setQuizFileId(null)} />
    </>
  );
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Read-only preview of a lesson quiz's questions + correct answers, fetched
 * from /admin/course/lesson_files/quiz_questions (Ishfaq 2026-06-09). */
function QuizPreviewDialog({
  api,
  token,
  fileId,
  onClose,
}: {
  api: AdminPageProps['api'];
  token: string;
  fileId: string | null;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    setLoading(true);
    setQuestions([]);
    void api
      .listLessonQuizQuestions(token, fileId)
      .then((rows) => { if (!cancelled) setQuestions(rows); })
      .catch(() => { if (!cancelled) setQuestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, token, fileId]);

  return (
    <Dialog open={fileId !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]"
        style={{ width: 'min(640px, calc(100vw - 2rem))', maxWidth: 'min(640px, calc(100vw - 2rem))' }}
      >
        <DialogHeader>
          <DialogTitle>Quiz preview</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading questions…</p>
        ) : questions.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-slate-500">No questions added to this quiz yet.</p>
        ) : (
          <ol className="space-y-3">
            {questions.map((q, idx) => {
              const correct = asString(q.correct_answer).toUpperCase();
              return (
                <li key={asString(q.id) || idx} className="rounded border p-3">
                  <div className="mb-2 text-sm font-semibold text-slate-900">Q{idx + 1}. {stripHtml(asString(q.question))}</div>
                  <ul className="space-y-1">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const text = stripHtml(asString(q[`option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d']));
                      if (!text) return null;
                      const isCorrect = letter === correct;
                      return (
                        <li key={letter} className={`flex items-start gap-2 text-sm ${isCorrect ? 'font-medium text-green-700' : 'text-slate-600'}`}>
                          {isCorrect ? <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <span className="w-4 shrink-0" />}
                          <span className="w-4 shrink-0 font-semibold">{letter}.</span>
                          <span className="min-w-0">{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
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

/** Small square icon button matching the SubjectDetailPage lesson-row actions. */
function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
        danger
          ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
    >
      {children}
    </button>
  );
}

/** One lesson row for a lesson-wise course: drag handle, expandable file
 * drill-down (reuses LessonFilesNode), plus edit/delete actions. */
function LessonWiseRow({
  api,
  token,
  lesson,
  dragHandle,
  onEdit,
  onDelete,
  onManageContent,
}: {
  api: AdminPageProps['api'];
  token: string;
  lesson: Record<string, unknown>;
  dragHandle: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onManageContent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const lessonId = asString(lesson.id);
  const fileCount = asNumber(lesson.files_count);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 p-3">
        {dragHandle}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-slate-50"
        >
          {open ? (
            <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
          )}
          <BookOpen aria-hidden="true" className="size-3.5 shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
            {asString(lesson.title) || '(untitled lesson)'}
          </span>
          <span className="text-[11px] text-slate-400">
            {fileCount > 0 ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : 'empty'}
          </span>
        </button>
        <IconButton label="Manage content" onClick={onManageContent}><Library className="size-4" /></IconButton>
        <IconButton label="Edit lesson" onClick={onEdit}><Pencil className="size-4" /></IconButton>
        <IconButton label="Delete lesson" onClick={onDelete} danger><Trash2 className="size-4" /></IconButton>
      </div>
      {open && (
        <div className="border-t border-slate-100 py-2">
          <LessonFilesNode api={api} token={token} lessonId={lessonId} />
        </div>
      )}
    </div>
  );
}

/** Lesson-wise curriculum: lessons attached directly to the course (no
 * subjects). Admin can add/edit/delete/reorder lessons here. Only used when
 * course.structure_type === 2 (Naji 2026-06-23). */
function LessonWiseCurriculum({
  api,
  token,
  courseId,
}: {
  api: AdminPageProps['api'];
  token: string;
  courseId: string;
}) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.listLessonsByCourse(token, courseId),
    [courseId],
  );
  const lessons = useMemo(() => toRecords(data), [data]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [free, setFree] = useState(false);
  const [saving, setSaving] = useState(false);
  // Lesson whose content is being managed (attach library items / add files).
  const [manageLesson, setManageLesson] = useState<{ id: string; title: string } | null>(null);
  // Attach-an-existing-lesson picker (clones a lesson into this course).
  const [attachOpen, setAttachOpen] = useState(false);

  const openAdd = () => {
    setEditId('');
    setTitle('');
    setSummary('');
    setFree(false);
    setDialogOpen(true);
  };
  const openEdit = (l: Record<string, unknown>) => {
    setEditId(asString(l.id));
    setTitle(asString(l.title));
    setSummary(asString(l.summary));
    setFree(asString(l.free) === 'on');
    setDialogOpen(true);
  };

  const save = async () => {
    if (!title.trim()) { toast.error('Please enter a lesson title.'); return; }
    setSaving(true);
    try {
      // Lesson-wise: no subject_id — attach the lesson directly to the course.
      const input = { course_id: courseId, title: title.trim(), summary: summary.trim(), free };
      if (editId) {
        await api.editLesson(token, editId, input);
        toast.success('Lesson updated');
      } else {
        await api.addLesson(token, input);
        toast.success('Lesson added');
      }
      setDialogOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save lesson.');
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (l: Record<string, unknown>) => {
    const n = asNumber(l.files_count);
    const ok = await confirm({
      title: `Delete lesson "${asString(l.title) || 'Untitled'}"?`,
      description: n > 0
        ? `This lesson has ${n} content file${n === 1 ? '' : 's'}. The lesson will be removed.`
        : 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await api.deleteLesson(token, asString(l.id));
      toast.success('Lesson deleted');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete lesson.');
    }
  };

  const reorder = useCallback((nextIds: string[]) => {
    void (async () => {
      try {
        await api.reorderLessons(token, nextIds);
        toast.success('Lessons reordered');
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save order.');
        reload();
      }
    })();
  }, [api, token, reload]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Lessons → Content. Lesson-wise course — lessons attach directly to the course (no subjects).
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAttachOpen(true)} variant="outline" size="sm" className="gap-1.5">
            <CopyPlus aria-hidden="true" className="size-4" /> Attach existing
          </Button>
          <Button onClick={openAdd} variant="outline" size="sm" className="gap-1.5">
            <Plus aria-hidden="true" className="size-4" /> Add Lesson
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
          <p className="text-sm text-slate-500">Lesson-wise course — add lessons directly (no subjects)</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button onClick={openAdd} variant="outline" className="gap-1.5">
              <Plus aria-hidden="true" className="size-4" /> Add the first lesson
            </Button>
            <Button onClick={() => setAttachOpen(true)} variant="outline" className="gap-1.5">
              <CopyPlus aria-hidden="true" className="size-4" /> Attach existing
            </Button>
          </div>
        </div>
      ) : (
        <SortableList ids={lessons.map((l) => asString(l.id))} onReorder={reorder} className="space-y-2">
          {(id, dragHandle) => {
            const lesson = lessons.find((l) => asString(l.id) === id);
            if (!lesson) return null;
            return (
              <LessonWiseRow
                api={api}
                token={token}
                lesson={lesson}
                dragHandle={dragHandle}
                onEdit={() => openEdit(lesson)}
                onDelete={() => void removeLesson(lesson)}
                onManageContent={() => setManageLesson({ id: asString(lesson.id), title: asString(lesson.title) })}
              />
            );
          }}
        </SortableList>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Lesson Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction" />
            </div>
            <div className="space-y-1.5">
              <Label>Summary</Label>
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Optional short summary" />
            </div>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <input type="checkbox" className="size-4 rounded border-slate-300" checked={free} onChange={(e) => setFree(e.target.checked)} />
              Free preview lesson (accessible without enrolment)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LessonContentManagerDialog
        api={api}
        token={token}
        lessonId={manageLesson?.id ?? null}
        lessonTitle={manageLesson?.title ?? ''}
        onClose={() => setManageLesson(null)}
        onChanged={reload}
      />

      <LessonPickerDialog
        api={api}
        token={token}
        courseId={courseId}
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onAttached={reload}
      />
    </>
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
  // structure_type 2 = Lesson-wise (no subjects); 1/missing = Subject-wise
  // (existing behavior, must not change). Only branch when === 2.
  const isLessonWise = asNumber(c.structure_type) === 2;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="View Course">
        <Button variant="outline" onClick={() => onNavigate('/admin/course/index')}>
          Back to list
        </Button>
        {!isLessonWise && (
          <Button
            variant="outline"
            onClick={() => onNavigate(`/admin/course/subjects/${courseId}`)}
          >
            Manage Subjects
          </Button>
        )}
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
        </div>
      </Section>

      <Section title="Curriculum">
        {isLessonWise ? (
          <LessonWiseCurriculum api={api} token={session.token} courseId={courseId} />
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">
              Subjects → Lessons → Content. Click a subject or lesson to drill down.
            </p>
            <CurriculumTree api={api} token={session.token} courseId={courseId} />
          </>
        )}
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
