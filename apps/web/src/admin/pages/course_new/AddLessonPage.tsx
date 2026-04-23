import { useState, useMemo, useCallback } from 'react';
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
  free: boolean;
}

const emptyLessonForm: LessonForm = { title: '', summary: '', free: false };
const emptyFileForm: FileForm = { title: '', summary: '', duration: '', video_url: '', audio_file: '', attachment: '', free: false };

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
      free: row.free === true || row.free === 1 || row.free === '1',
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
            <Button size="sm" onClick={openAddLesson}>
              + Add Lesson
            </Button>
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
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { void handleSaveLesson(); }} disabled={saving || !lessonForm.title.trim()}>
              {saving ? 'Saving...' : editingLessonId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit File Dialog */}
      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFileId ? 'Edit' : 'Add'} {fileTypeLabel[fileDialogType]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Audio File URL — shown for audio type */}
            {fileDialogType === 'audio' && (
              <div className="space-y-2">
                <Label>Audio File URL</Label>
                <Input
                  value={fileForm.audio_file}
                  onChange={(e) => setFileForm((f) => ({ ...f, audio_file: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            )}

            {/* File URL — shown for document type */}
            {fileDialogType === 'document' && (
              <div className="space-y-2">
                <Label>File URL</Label>
                <Input
                  value={fileForm.attachment}
                  onChange={(e) => setFileForm((f) => ({ ...f, attachment: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Summary / Content */}
            <div className="space-y-2">
              <Label>{fileDialogType === 'article' ? 'Content' : 'Summary'}</Label>
              <textarea
                className={textareaClass}
                value={fileForm.summary}
                onChange={(e) => setFileForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder={
                  fileDialogType === 'article'
                    ? 'Article content'
                    : fileDialogType === 'quiz'
                      ? 'Quiz description (questions managed in Question Bank)'
                      : 'Brief summary'
                }
              />
              {fileDialogType === 'quiz' && (
                <p className="text-xs text-gray-500">Quiz questions are managed in the Question Bank section.</p>
              )}
            </div>

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
            <Button variant="outline" onClick={() => setFileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { void handleSaveFile(); }} disabled={saving || !fileForm.title.trim()}>
              {saving ? 'Saving...' : editingFileId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
