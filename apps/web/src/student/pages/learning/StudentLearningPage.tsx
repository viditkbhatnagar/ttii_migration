import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Flame, Lock, FileText, Video, FileQuestion, BarChart3, CheckCircle, ArrowRight, X, ExternalLink } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

function getFileTypeIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower === 'video' || lower === 'url') return Video;
  if (lower === 'quiz') return FileQuestion;
  return FileText;
}

// Vimeo: https://vimeo.com/{id}  →  https://player.vimeo.com/video/{id}
// YouTube: https://(www\.)?youtube\.com/watch\?v={id}  →  https://www.youtube.com/embed/{id}
// YouTube short: https://youtu.be/{id}  →  https://www.youtube.com/embed/{id}
// Anything already pointing at an embed path is left alone.
function toEmbeddableVideoUrl(url: string): string {
  if (!url) return '';
  if (url.includes('player.vimeo.com') || url.includes('youtube.com/embed') || url.includes('youtube-nocookie.com/embed')) {
    return url;
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const ytWatch = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
  const ytShort = url.match(/youtu\.be\/([\w-]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  return url;
}

interface SelectedContent {
  id: string;
  title: string;
  type: 'video' | 'audio' | 'pdf' | 'other';
  url: string;
}

function resolveSelectedContent(file: Record<string, unknown>): SelectedContent | null {
  const id = asString(file.id);
  const title = asString(file.title) || `File ${id}`;
  const lower = (asString(file.attachment_type) || asString(file.lesson_type)).toLowerCase();

  if (lower === 'video' || lower === 'url' || lower === 'youtube_video' || lower === 'vimeo_video') {
    const url = asString(file.video_url);
    if (!url) return null;
    return { id, title, type: 'video', url: toEmbeddableVideoUrl(url) };
  }
  if (lower === 'audio') {
    const url = asString(file.audio_url);
    if (!url) return null;
    return { id, title, type: 'audio', url };
  }
  const url = asString(file.attachment_url) || asString(file.video_url) || asString(file.audio_url);
  if (!url) return null;
  if (lower === 'pdf' || /\.pdf($|\?)/i.test(url)) {
    return { id, title, type: 'pdf', url };
  }
  return { id, title, type: 'other', url };
}

function getFileTypeBadgeStyle(type: string): { label: string; className: string } {
  const lower = type.toLowerCase();
  if (lower === 'video' || lower === 'url') return { label: 'Video', className: 'bg-blue-100 text-blue-700' };
  if (lower === 'quiz') return { label: 'Quiz', className: 'bg-purple-100 text-purple-700' };
  if (lower === 'pdf') return { label: 'PDF', className: 'bg-red-100 text-red-700' };
  if (lower === 'practice') return { label: 'Practice', className: 'bg-emerald-100 text-emerald-700' };
  return { label: type || 'File', className: 'bg-slate-100 text-slate-700' };
}

interface SubjectProgress {
  id: string;
  courseId: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
  averageCompletion: number;
}

function computeSubjectProgress(
  subjects: Record<string, unknown>[],
  lessons: Record<string, unknown>[],
): SubjectProgress[] {
  const subjectMap = new Map<string, { title: string; courseId: string; completions: number[]; total: number; completed: number }>();

  for (const subject of subjects) {
    const id = asString(subject.id);
    subjectMap.set(id, {
      title: asString(subject.title) || `Subject ${id}`,
      courseId: asString(subject.course_id),
      completions: [],
      total: 0,
      completed: 0,
    });
  }

  for (const lesson of lessons) {
    const subjectId = asString(lesson.subject_id);
    const completion = asNumber(lesson.completed_percentage);
    const entry = subjectMap.get(subjectId);
    if (entry) {
      entry.completions.push(completion);
      entry.total += 1;
      if (completion === 100) {
        entry.completed += 1;
      }
    }
  }

  return Array.from(subjectMap.entries()).map(([id, entry]) => ({
    id,
    courseId: entry.courseId,
    title: entry.title,
    totalLessons: entry.total,
    completedLessons: entry.completed,
    averageCompletion: entry.completions.length > 0
      ? Math.round(entry.completions.reduce((a, b) => a + b, 0) / entry.completions.length)
      : 0,
  }));
}


export default function StudentLearningPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadLearning(session.token),
    [api, session.token],
  );

  // Inline player state — set when a file is clicked, cleared by the
  // close button on the player banner.
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);
  const handleFileSelect = (file: Record<string, unknown>) => {
    const resolved = resolveSelectedContent(file);
    if (resolved) {
      setSelectedContent(resolved);
      // Scroll the player into view on small screens.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const courses = useMemo(() => data?.courses ?? [], [data]);
  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const lessons = useMemo(() => data?.lessons ?? [], [data]);
  const lessonFiles = useMemo(() => data?.lessonFiles ?? [], [data]);

  const subjectProgress = useMemo(() => computeSubjectProgress(subjects, lessons), [subjects, lessons]);

  const overallCompletion = useMemo(() => {
    if (lessons.length === 0) return 0;
    const totalCompletion = lessons.reduce((sum, lesson) => sum + asNumber(lesson.completed_percentage), 0);
    return Math.round(totalCompletion / lessons.length);
  }, [lessons]);

  // Lessons not assigned to any subject (orphans)
  const orphanLessons = useMemo(() => {
    const subjectIds = new Set(subjects.map((s) => asString(s.id)));
    return lessons.filter((l) => !subjectIds.has(asString(l.subject_id)));
  }, [subjects, lessons]);

  if (loading) {
    return <PageLoader label="Loading courses..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">My Courses</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inline player banner — shown above the lessons when a file is
          selected. Player type follows the file type. Close to return to
          the lesson list. */}
      {selectedContent ? (
        <ContentPlayer content={selectedContent} onClose={() => setSelectedContent(null)} />
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text">My Courses</h1>
          <p className="mt-1 text-sm text-student-muted">{courses.length} courses enrolled</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5">
            <Flame className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{data?.streakCurrent ?? 0} day streak</span>
          </div>
          <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">Refresh</Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Courses', value: courses.length, icon: BookOpen, iconTint: 'bg-blue-50 text-blue-600' },
          { label: 'Subjects', value: subjects.length, icon: FileText, iconTint: 'bg-violet-50 text-violet-600' },
          { label: 'Lessons', value: lessons.length, icon: BookOpen, iconTint: 'bg-emerald-50 text-emerald-600' },
          { label: 'Overall Progress', value: `${overallCompletion}%`, icon: BarChart3, iconTint: 'bg-student-primary/10 text-student-primary' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-student-text">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-student-muted">{stat.label}</p>
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.iconTint}`}>
                  <Icon aria-hidden="true" className="size-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Course Progress Bar */}
      {courses.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-student-text">
                {asString(courses[0]?.title) || 'Course Progress'}
              </h3>
              <p className="mt-0.5 text-xs text-student-muted">{overallCompletion}% complete</p>
            </div>
            <span className="text-2xl font-semibold text-student-primary">{overallCompletion}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-student-primary transition-all duration-500 ease-out"
              style={{ width: `${Math.min(overallCompletion, 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Subjects grouped per enrolled course. Earlier the page showed a
          single "Subjects" list across all courses, which got confusing
          when a student is enrolled in more than one. */}
      {courses.length > 0 && subjectProgress.length > 0 ? (
        <div className="space-y-6">
          {courses.map((course) => {
            const courseId = asString(course.id);
            const courseTitle = asString(course.title) || `Course ${courseId}`;
            const courseSubjects = subjectProgress.filter((sp) => sp.courseId === courseId);
            if (courseSubjects.length === 0) return null;
            return (
              <div key={courseId} className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-student-text">{courseTitle}</h2>
                  <span className="text-xs text-student-muted">{courseSubjects.length} subject{courseSubjects.length === 1 ? '' : 's'}</span>
                </div>
                <Accordion type="multiple" className="space-y-3">
                  {courseSubjects.map((sp, index) => {
              const subjectLessons = lessons.filter((l) => asString(l.subject_id) === sp.id);

              return (
                <AccordionItem
                  key={sp.id}
                  value={sp.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        aria-hidden="true"
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          sp.averageCompletion === 100
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sp.averageCompletion === 100 ? (
                          <CheckCircle className="size-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-student-text">{sp.title}</p>
                        <p className="text-xs text-student-muted">
                          {sp.completedLessons}/{sp.totalLessons} lessons &middot; {sp.averageCompletion}% complete
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-slate-100 bg-slate-50/50 px-5 pb-5 pt-4">
                    {/* Progress bar */}
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-student-primary transition-all duration-500"
                        style={{ width: `${Math.min(sp.averageCompletion, 100)}%` }}
                      />
                    </div>

                    {/* Stats Row — flat inline labels */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-student-muted">
                      <span><span className="font-semibold text-student-text">{sp.totalLessons}</span> total</span>
                      <span><span className="font-semibold text-emerald-600">{sp.completedLessons}</span> done</span>
                      <span><span className="font-semibold text-student-text">{sp.totalLessons - sp.completedLessons}</span> remaining</span>
                      <span className="ml-auto"><span className="font-semibold text-student-primary">{sp.averageCompletion}%</span> progress</span>
                    </div>

                    {/* Lessons List — each lesson nests its own files. */}
                    {subjectLessons.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {subjectLessons.map((lesson) => {
                          const lessonId = asString(lesson.id);
                          const filesForLesson = lessonFiles.filter((f) => asString(f.lesson_id) === lessonId);
                          return (
                            <LessonRow
                              key={lessonId}
                              lesson={lesson}
                              files={filesForLesson}
                              onSelectFile={handleFileSelect}
                              activeFileId={selectedContent?.id ?? null}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-student-muted text-center py-4">No lessons in this subject yet.</p>
                    )}

                    {/* CTA */}
                    {sp.averageCompletion < 100 ? (
                      <Button
                        className="mt-4 rounded-lg bg-student-primary hover:bg-student-primary/90"
                        size="sm"
                        onClick={() => onNavigate('/student/courses')}
                      >
                        Continue Learning
                        <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="mt-4 rounded-lg"
                        size="sm"
                        onClick={() => onNavigate('/student/courses')}
                      >
                        Review Course
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
                </Accordion>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Orphan Lessons (not assigned to any subject) — flat list with
          nested materials per lesson, mirroring the subject view. */}
      {orphanLessons.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Lessons</h2>
          <div className="space-y-2">
            {orphanLessons.map((lesson) => {
              const lessonId = asString(lesson.id);
              const filesForLesson = lessonFiles.filter((f) => asString(f.lesson_id) === lessonId);
              return (
                <LessonRow
                  key={lessonId}
                  lesson={lesson}
                  files={filesForLesson}
                  onSelectFile={handleFileSelect}
                  activeFileId={selectedContent?.id ?? null}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {/* No subjects at all → fall back to a flat lesson list. Materials
          stay nested under each lesson, not in a separate Materials block. */}
      {subjectProgress.length === 0 && lessons.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">All Lessons</h2>
          <div className="space-y-2">
            {lessons.map((lesson) => {
              const lessonId = asString(lesson.id);
              const filesForLesson = lessonFiles.filter((f) => asString(f.lesson_id) === lessonId);
              return (
                <LessonRow
                  key={lessonId}
                  lesson={lesson}
                  files={filesForLesson}
                  onSelectFile={handleFileSelect}
                  activeFileId={selectedContent?.id ?? null}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Enrolled Courses */}
      {courses.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Enrolled Courses</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {courses.map((course) => {
              const id = asString(course.id);
              const title = asString(course.title) || `Course ${id}`;
              const description = asString(course.description);
              return (
                <div key={id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-medium text-student-text">{title}</h3>
                  {description ? <p className="mt-1 text-sm text-student-muted line-clamp-2">{description}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Empty State */}
      {courses.length === 0 && lessons.length === 0 ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <BookOpen aria-hidden="true" className="mx-auto size-12 text-slate-300 mb-4" />
          <h3 className="text-base font-semibold text-student-text">No courses found</h3>
          <p className="text-sm text-student-muted mt-1">You haven't been enrolled in any courses yet.</p>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Shared sub-components ────────────────────────────────── */

function LessonRow({
  lesson,
  files = [],
  onSelectFile,
  activeFileId,
}: {
  lesson: Record<string, unknown>;
  files?: Record<string, unknown>[];
  onSelectFile?: (file: Record<string, unknown>) => void;
  activeFileId?: string | null;
}) {
  const id = asString(lesson.id);
  const title = asString(lesson.title) || `Lesson ${id}`;
  const completion = asNumber(lesson.completed_percentage);
  const isLocked = lesson.lock === true || lesson.lock === 1 || lesson.lock === '1';
  const [open, setOpen] = useState(false);
  const hasFiles = files.length > 0;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isLocked
          ? 'border-slate-100 bg-slate-50 opacity-60'
          : completion === 100
            ? 'border-green-100 bg-green-50/50'
            : 'border-slate-100 bg-white'
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 p-3 text-left"
        disabled={!hasFiles && !isLocked ? false : isLocked}
        onClick={() => hasFiles && setOpen((v) => !v)}
      >
        {isLocked ? (
          <Lock className="size-4 text-slate-400 shrink-0" />
        ) : completion === 100 ? (
          <CheckCircle className="size-4 text-green-500 shrink-0" />
        ) : (
          <BookOpen className="size-4 text-student-primary shrink-0" />
        )}
        <span className="text-sm font-medium text-slate-700 flex-1 truncate">{title}</span>
        {hasFiles ? (
          <span className="text-xs text-student-muted shrink-0">{files.length} item{files.length === 1 ? '' : 's'}</span>
        ) : null}
        {isLocked ? (
          <Badge variant="outline" className="text-xs rounded-full">Locked</Badge>
        ) : (
          <Badge className={`text-xs rounded-full ${
            completion === 100
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-blue-100 text-blue-700 border-blue-200'
          }`}>
            {completion}%
          </Badge>
        )}
        {hasFiles ? (
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        ) : null}
      </button>
      {hasFiles && open ? (
        <div className="border-t border-slate-100 bg-slate-50/40 px-3 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {files.map((file) => (
              <FileRow
                key={asString(file.id)}
                file={file}
                {...(onSelectFile ? { onSelect: onSelectFile } : {})}
                isActive={activeFileId !== null && activeFileId === asString(file.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FileRow({
  file,
  onSelect,
  isActive,
}: {
  file: Record<string, unknown>;
  onSelect?: (file: Record<string, unknown>) => void;
  isActive?: boolean;
}) {
  const fId = asString(file.id);
  const fTitle = asString(file.title) || `File ${fId}`;
  const attachmentType = asString(file.attachment_type) || asString(file.lesson_type);
  const badge = getFileTypeBadgeStyle(attachmentType);
  const FileIcon = getFileTypeIcon(attachmentType);
  const isLocked = file.lock === true || file.lock === 1 || file.lock === '1';
  const resolved = !isLocked ? resolveSelectedContent(file) : null;
  const isPlayable = resolved !== null;

  const inner = (
    <>
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
        isActive ? 'bg-student-primary/15 text-student-primary' : 'bg-slate-100 text-slate-600'
      }`}>
        <FileIcon className="size-4" />
      </div>
      <p className="text-sm font-medium text-slate-700 truncate flex-1 text-left">{fTitle}</p>
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
        {badge.label}
      </span>
    </>
  );

  if (isPlayable && onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(file)}
        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
          isActive
            ? 'border-student-primary bg-student-primary/5'
            : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50'
        }`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 ${
        isLocked ? 'opacity-60' : 'opacity-90'
      }`}
      title={isLocked ? 'Locked — complete the previous lesson first' : 'Content link not available yet'}
    >
      {inner}
    </div>
  );
}

function ContentPlayer({ content, onClose }: { content: SelectedContent; onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-student-text">{content.title}</p>
          <p className="text-[11px] uppercase tracking-wider text-student-muted">{content.type}</p>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
          >
            <ExternalLink className="size-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            title="Close player"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="bg-black">
        {content.type === 'video' ? (
          <div className="aspect-video w-full">
            <iframe
              key={content.id}
              src={content.url}
              title={content.title}
              className="size-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : content.type === 'audio' ? (
          <div className="bg-white p-4">
            <audio key={content.id} controls className="w-full">
              <source src={content.url} />
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : content.type === 'pdf' ? (
          <iframe
            key={content.id}
            src={content.url}
            title={content.title}
            className="h-[70vh] w-full bg-white"
          />
        ) : (
          <iframe
            key={content.id}
            src={content.url}
            title={content.title}
            className="h-[70vh] w-full bg-white"
          />
        )}
      </div>
    </div>
  );
}
