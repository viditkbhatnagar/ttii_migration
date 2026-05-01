import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowUpDown } from 'lucide-react';
import { SortableList } from '../../shared/components/SortableList.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { FileUpload } from '../../shared/components/FileUpload.js';
import { RichTextEditor } from '../../shared/components/RichTextEditor.js';
import { useConfirm } from '@/components/confirm-dialog';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const textareaClass =
  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

type FileType = 'video' | 'audio' | 'article' | 'document' | 'quiz';

interface LessonForm {
  title: string;
  summary: string;
  free: boolean;
}

interface FileForm {
  title: string;
  summary: string;
  duration: string;
  video_url: string;
  audio_file: string;
  attachment: string;
  thumbnail: string;
  language: string;
  free: boolean;
}

const emptyLessonForm: LessonForm = { title: '', summary: '', free: false };
const emptyFileForm: FileForm = { title: '', summary: '', duration: '', video_url: '', audio_file: '', attachment: '', thumbnail: '', language: '', free: false };

export default function AddLessonPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  // Step 1: Course & Subject selection
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Step 3: File management view
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedLessonTitle, setSelectedLessonTitle] = useState('');

  // Dialog states
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState('');
  const [lessonForm, setLessonForm] = useState<LessonForm>(emptyLessonForm);

  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileDialogType, setFileDialogType] = useState<FileType>('video');
  const [editingFileId, setEditingFileId] = useState('');
  const [fileForm, setFileForm] = useState<FileForm>(emptyFileForm);

  const [saving, setSaving] = useState(false);

  // Reorder dialogs (Naji 2026-04-30 — drag-to-reorder for lessons within
  // a subject and content within a lesson). Save-on-drop UX.
  const [showLessonReorder, setShowLessonReorder] = useState(false);
  const [showFileReorder, setShowFileReorder] = useState(false);

  // Load courses
  const { data: coursesData, loading: coursesLoading } = useAdminPageData(
    () => api.loadCourses(session.token),
    [],
  );
  const courses = useMemo(() => toRecords(coursesData), [coursesData]);

  // Load subjects when course selected
  const { data: subjectsData, loading: subjectsLoading } = useAdminPageData(
    () => (selectedCourseId ? api.loadSubjects(session.token, selectedCourseId) : Promise.resolve(null)),
    [selectedCourseId],
  );
  const subjects = useMemo(() => toRecords(subjectsData), [subjectsData]);

  // Load lessons when subject selected
  const { data: lessonsData, loading: lessonsLoading, reload: reloadLessons } = useAdminPageData(
    () => (selectedSubjectId ? api.listLessonsAdmin(session.token, selectedSubjectId) : Promise.resolve(null)),
    [selectedSubjectId],
  );
  const lessons = useMemo(() => toRecords(lessonsData), [lessonsData]);

  // Load files when lesson selected
  const { data: filesData, loading: filesLoading, reload: reloadFiles } = useAdminPageData(
    () => (selectedLessonId ? api.listLessonFiles(session.token, selectedLessonId) : Promise.resolve(null)),
    [selectedLessonId],
  );
  const files = useMemo(() => toRecords(filesData), [filesData]);

  // --- Lesson handlers ---

  const openAddLesson = useCallback(() => {
    setEditingLessonId('');
    setLessonForm(emptyLessonForm);
    setLessonDialogOpen(true);
  }, []);

  const openEditLesson = useCallback((row: Record<string, unknown>) => {
    setEditingLessonId(asString(row.id));
    setLessonForm({
      title: asString(row.title),
      summary: asString(row.summary),
      free: row.free === true || row.free === 1 || row.free === '1',
    });
    setLessonDialogOpen(true);
  }, []);

  const handleSaveLesson = useCallback(async () => {
    if (!lessonForm.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        subject_id: selectedSubjectId,
        title: lessonForm.title.trim(),
        summary: lessonForm.summary.trim(),
        free: lessonForm.free,
      };
      if (editingLessonId) {
        await api.editLesson(session.token, editingLessonId, payload);
      } else {
        await api.addLesson(session.token, payload);
      }
      setLessonDialogOpen(false);
      reloadLessons();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [api, session.token, selectedCourseId, selectedSubjectId, editingLessonId, lessonForm, reloadLessons]);

  const handleDeleteLesson = useCallback(
    async (row: Record<string, unknown>) => {
      if (!(await confirm({
        title: `Delete lesson "${asString(row.title)}"?`,
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteLesson(session.token, asString(row.id));
        reloadLessons();
      } catch {
        /* ignore */
      }
    },
    [api, session.token, reloadLessons, confirm],
  );

  const handleManageFiles = useCallback((row: Record<string, unknown>) => {
    setSelectedLessonId(asString(row.id));
    setSelectedLessonTitle(asString(row.title));
  }, []);

  // --- File handlers ---

  const openAddFile = useCallback((type: FileType) => {
    setEditingFileId('');
    setFileDialogType(type);
    setFileForm(emptyFileForm);
    setFileDialogOpen(true);
  }, []);

  const openEditFile = useCallback((row: Record<string, unknown>) => {
    const type = (asString(row.lesson_type) || 'video') as FileType;
    setEditingFileId(asString(row.id));
    setFileDialogType(type);
    setFileForm({
      title: asString(row.title),
      summary: asString(row.summary),
      duration: asString(row.duration),
      video_url: asString(row.video_url),
      audio_file: asString(row.audio_file),
      attachment: asString(row.attachment),
      thumbnail: asString(row.thumbnail),
      language: asString(row.languages) || asString(row.language),
      free: row.free === true || row.free === 1 || row.free === '1' || row.free === 'on',
    });
    setFileDialogOpen(true);
  }, []);

  const handleSaveFile = useCallback(async () => {
    if (!fileForm.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        lesson_id: selectedLessonId,
        title: fileForm.title.trim(),
        summary: fileForm.summary.trim(),
        duration: fileForm.duration.trim(),
        lesson_type: fileDialogType,
        video_url: fileForm.video_url.trim(),
        attachment: fileForm.attachment.trim(),
        audio_file: fileForm.audio_file.trim(),
        thumbnail: fileForm.thumbnail.trim(),
        language: fileForm.language.trim(),
        free: fileForm.free,
      };
      if (editingFileId) {
        await api.editLessonFile(session.token, editingFileId, payload);
      } else {
        await api.addLessonFile(session.token, payload);
      }
      setFileDialogOpen(false);
      reloadFiles();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [api, session.token, selectedLessonId, editingFileId, fileDialogType, fileForm, reloadFiles]);

  const handleDeleteFile = useCallback(
    async (row: Record<string, unknown>) => {
      if (!(await confirm({
        title: `Delete file "${asString(row.title)}"?`,
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteLessonFile(session.token, asString(row.id));
        reloadFiles();
      } catch {
        /* ignore */
      }
    },
    [api, session.token, reloadFiles, confirm],
  );

  // --- Table columns ---

  const lessonColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title' },
      {
        key: 'summary',
        label: 'Summary',
        render: (v) => {
          const s = typeof v === 'string' ? v : '';
          return s.length > 60 ? `${s.slice(0, 60)}...` : s || '-';
        },
      },
      {
        key: 'free',
        label: 'Free Preview',
        render: (v) =>
          v === true || v === 1 || v === '1' ? (
            <Badge variant="default">Free</Badge>
          ) : (
            <Badge variant="secondary">Paid</Badge>
          ),
      },
      { key: 'files_count', label: 'Files' },
      { key: 'order', label: 'Order' },
    ],
    [],
  );

  const lessonActions: DataTableAction[] = useMemo(
    () => [
      { label: 'Edit', onClick: (row) => openEditLesson(row) },
      { label: 'Delete', onClick: (row) => void handleDeleteLesson(row), variant: 'destructive' },
      { label: 'Manage Files', onClick: (row) => handleManageFiles(row) },
    ],
    [openEditLesson, handleDeleteLesson, handleManageFiles],
  );

  const fileColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title' },
      {
        key: 'lesson_type',
        label: 'Type',
        render: (v) => {
          const t = typeof v === 'string' ? v : 'unknown';
          const colors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
            video: 'default',
            audio: 'secondary',
            article: 'outline',
            document: 'outline',
            quiz: 'destructive',
          };
          return <Badge variant={colors[t] ?? 'secondary'}>{t}</Badge>;
        },
      },
      { key: 'duration', label: 'Duration', render: (v) => (typeof v === 'string' && v ? v : '-') },
      {
        key: 'free',
        label: 'Free',
        render: (v) =>
          v === true || v === 1 || v === '1' ? (
            <Badge variant="default">Free</Badge>
          ) : (
            <Badge variant="secondary">Paid</Badge>
          ),
      },
    ],
    [],
  );

  const fileActions: DataTableAction[] = useMemo(
    () => [
      { label: 'Edit', onClick: (row) => openEditFile(row) },
      { label: 'Delete', onClick: (row) => void handleDeleteFile(row), variant: 'destructive' },
    ],
    [openEditFile, handleDeleteFile],
  );

  // --- File dialog field label ---

  const fileTypeLabel: Record<FileType, string> = {
    video: 'Video',
    audio: 'Audio',
    article: 'Article',
    document: 'Document',
    quiz: 'Quiz',
  };

  // --- Render ---

  if (coursesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Lesson Builder" />

      {/* Step 1: Course & Subject Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Course & Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Course</Label>
              <select
                className={selectClass}
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedSubjectId('');
                  setSelectedLessonId('');
                  setSelectedLessonTitle('');
                }}
              >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={asString(c.id)} value={asString(c.id)}>
                    {asString(c.title)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <select
                className={selectClass}
                value={selectedSubjectId}
                disabled={!selectedCourseId || subjectsLoading}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedLessonId('');
                  setSelectedLessonTitle('');
                }}
              >
                <option value="">
                  {subjectsLoading ? 'Loading subjects...' : '-- Select Subject --'}
                </option>
                {subjects.map((s) => (
                  <option key={asString(s.id)} value={asString(s.id)}>
                    {asString(s.title)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Lesson List */}
      {selectedCourseId && selectedSubjectId && !selectedLessonId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Lessons</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowLessonReorder(true)} disabled={lessons.length < 2}>
                <ArrowUpDown className="size-4" />
                Reorder
              </Button>
              <Button size="sm" onClick={openAddLesson}>
                + Add Lesson
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {lessonsLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : lessons.length > 0 ? (
              <AdminDataTable
                columns={lessonColumns}
                rows={lessons}
                actions={lessonActions}
                searchable={false}
                exportable={false}
              />
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">
                No lessons found for this subject. Click &quot;+ Add Lesson&quot; to create one.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Lesson Files Management */}
      {selectedLessonId && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Files for: <span className="text-ttii-primary">{selectedLessonTitle}</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedLessonId('');
                  setSelectedLessonTitle('');
                }}
              >
                Back to Lessons
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openAddFile('video')}>
                + Video
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openAddFile('audio')}>
                + Audio
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openAddFile('article')}>
                + Article
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openAddFile('document')}>
                + Document
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openAddFile('quiz')}>
                + Quiz
              </Button>
              <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={() => setShowFileReorder(true)} disabled={files.length < 2}>
                <ArrowUpDown className="size-4" />
                Reorder
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filesLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : files.length > 0 ? (
              <AdminDataTable
                columns={fileColumns}
                rows={files}
                actions={fileActions}
                searchable={false}
                exportable={false}
              />
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">
                No files in this lesson yet. Add content using the buttons above.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveLesson();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editingLessonId ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Lesson title"
                />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <textarea
                  className={textareaClass}
                  value={lessonForm.summary}
                  onChange={(e) => setLessonForm((f) => ({ ...f, summary: e.target.value }))}
                  placeholder="Brief description of the lesson"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lesson-free"
                  checked={lessonForm.free}
                  onChange={(e) => setLessonForm((f) => ({ ...f, free: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="lesson-free">Free Preview</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !lessonForm.title.trim()}>
                {saving ? 'Saving...' : editingLessonId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit File Dialog */}
      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveFile();
            }}
          >
          <DialogHeader>
            <DialogTitle>
              {editingFileId ? 'Edit' : 'Add'} {fileTypeLabel[fileDialogType]}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={fileForm.title}
                onChange={(e) => setFileForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={`${fileTypeLabel[fileDialogType]} title`}
              />
            </div>

            {/* Video URL — shown for video type */}
            {fileDialogType === 'video' && (
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  value={fileForm.video_url}
                  onChange={(e) => setFileForm((f) => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://vimeo.com/… or https://youtu.be/…"
                />
                <p className="text-[11px] text-slate-500">Vimeo / YouTube share URLs auto-embed in the player.</p>
              </div>
            )}

            {/* Audio file upload — shown for audio type */}
            {fileDialogType === 'audio' && (
              <div className="space-y-2">
                <Label>Audio File</Label>
                <FileUpload
                  value={fileForm.audio_file}
                  onChange={(url) => setFileForm((f) => ({ ...f, audio_file: url }))}
                  onUpload={async (file) => { const r = await api.uploadFile(session.token, file); return r.url; }}
                  accept="audio/*"
                  placeholder="Upload audio or paste a URL"
                />
              </div>
            )}

            {/* Document upload — shown for document type */}
            {fileDialogType === 'document' && (
              <div className="space-y-2">
                <Label>Document File</Label>
                <FileUpload
                  value={fileForm.attachment}
                  onChange={(url) => setFileForm((f) => ({ ...f, attachment: url }))}
                  onUpload={async (file) => { const r = await api.uploadFile(session.token, file); return r.url; }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                  placeholder="Upload file or paste a URL"
                />
              </div>
            )}

            {/* Thumbnail — useful for every type */}
            <div className="space-y-2">
              <Label>Thumbnail / Banner Image (optional)</Label>
              <FileUpload
                value={fileForm.thumbnail}
                onChange={(url) => setFileForm((f) => ({ ...f, thumbnail: url }))}
                onUpload={async (file) => { const r = await api.uploadFile(session.token, file); return r.url; }}
                accept="image/*"
                placeholder="Upload image or paste a URL"
              />
            </div>

            {/* Content / Summary — Rich text editor for articles, plain textarea otherwise */}
            {fileDialogType === 'article' ? (
              <div className="space-y-2">
                <Label>Article Content</Label>
                <RichTextEditor
                  value={fileForm.summary}
                  onChange={(html) => setFileForm((f) => ({ ...f, summary: html }))}
                />
              </div>
            ) : fileDialogType !== 'quiz' ? (
              <div className="space-y-2">
                <Label>Summary</Label>
                <textarea
                  className={textareaClass}
                  value={fileForm.summary}
                  onChange={(e) => setFileForm((f) => ({ ...f, summary: e.target.value }))}
                  placeholder="Brief summary"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Quiz Description (optional)</Label>
                <textarea
                  className={textareaClass}
                  value={fileForm.summary}
                  onChange={(e) => setFileForm((f) => ({ ...f, summary: e.target.value }))}
                  placeholder="Short description shown above the questions"
                />
                <p className="text-xs text-amber-700">
                  Question editor + bulk CSV upload for quiz files is shipping next — for now Save the metadata and use the existing Question Bank flow.
                </p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {/* Duration — shown for video, audio */}
              {(fileDialogType === 'video' || fileDialogType === 'audio') && (
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={fileForm.duration}
                    onChange={(e) => setFileForm((f) => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 10:30"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Language</Label>
                <Input
                  value={fileForm.language}
                  onChange={(e) => setFileForm((f) => ({ ...f, language: e.target.value }))}
                  placeholder="e.g. English"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="file-free"
                checked={fileForm.free}
                onChange={(e) => setFileForm((f) => ({ ...f, free: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="file-free">Free Preview</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFileDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !fileForm.title.trim()}>
              {saving ? 'Saving...' : editingFileId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reorder Lessons dialog */}
      <Dialog open={showLessonReorder} onOpenChange={(open) => { if (!open) setShowLessonReorder(false); }}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Reorder Lessons</DialogTitle>
          </DialogHeader>
          <p className="mb-2 text-xs text-slate-500">Drag a lesson to a new position. Order saves automatically.</p>
          <SortableList
            ids={lessons.map((l) => asString(l.id))}
            onReorder={(nextIds) => {
              void (async () => {
                try {
                  await api.reorderLessons(session.token, nextIds);
                  toast.success('Order saved');
                  reloadLessons();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to save order');
                }
              })();
            }}
            className="space-y-1"
          >
            {(id, handle) => {
              const lesson = lessons.find((l) => asString(l.id) === id);
              if (!lesson) return null;
              return (
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2">
                  {handle}
                  <span className="flex-1 text-sm text-slate-800">{asString(lesson.title) || '(untitled)'}</span>
                </div>
              );
            }}
          </SortableList>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowLessonReorder(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder Lesson Files dialog */}
      <Dialog open={showFileReorder} onOpenChange={(open) => { if (!open) setShowFileReorder(false); }}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Reorder Content</DialogTitle>
          </DialogHeader>
          <p className="mb-2 text-xs text-slate-500">Drag a content item to a new position. Order saves automatically.</p>
          <SortableList
            ids={files.map((f) => asString(f.id))}
            onReorder={(nextIds) => {
              void (async () => {
                try {
                  await api.reorderLessonFiles(session.token, selectedLessonId, nextIds);
                  toast.success('Order saved');
                  reloadFiles();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to save order');
                }
              })();
            }}
            className="space-y-1"
          >
            {(id, handle) => {
              const file = files.find((f) => asString(f.id) === id);
              if (!file) return null;
              return (
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2">
                  {handle}
                  <span className="flex-1 text-sm text-slate-800">{asString(file.title) || '(untitled)'}</span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">{asString(file.lesson_type) || 'file'}</span>
                </div>
              );
            }}
          </SortableList>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowFileReorder(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
