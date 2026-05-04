import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Flame,
  Lock,
  FileText,
  File,
  Video,
  Headphones,
  FileQuestion,
  Globe,
  BarChart3,
  CheckCircle,
  ArrowLeft,
  X,
  ExternalLink,
  PlayCircle,
  Radio,
  Calendar,
  Clock,
  Circle,
  CircleDot,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

// Map file type → icon. Naji 2026-05-04: every content type should look
// distinct in the timeline (video / audio / pdf / quiz / url / file).
function getFileTypeIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower === 'video' || lower === 'youtube_video' || lower === 'vimeo_video') return Video;
  if (lower === 'audio') return Headphones;
  if (lower === 'pdf') return FileText;
  if (lower === 'quiz') return FileQuestion;
  if (lower === 'article') return FileText;
  if (lower === 'url') return Globe;
  if (lower === 'practice') return BookOpen;
  return File;
}

// Pick the most specific type signal from a lesson file row. lesson_type
// is the semantic content kind (video / audio / article / quiz / pdf);
// attachment_type describes the wire format (often "url" for vimeo /
// youtube). Naji 2026-05-04: Vimeo URLs were showing as "Link" because
// attachment_type was winning — flipped the precedence so semantic
// types are picked first and "url" only used as a last resort.
function pickFileType(file: Record<string, unknown>): string {
  const lessonType = asString(file.lesson_type).toLowerCase();
  const attachmentType = asString(file.attachment_type).toLowerCase();
  const semantic = new Set(['video', 'audio', 'pdf', 'quiz', 'article', 'practice']);
  if (semantic.has(lessonType)) return lessonType;
  if (semantic.has(attachmentType)) return attachmentType;
  return attachmentType || lessonType;
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
  description: string;
}

function resolveSelectedContent(file: Record<string, unknown>): SelectedContent | null {
  const id = asString(file.id);
  const title = asString(file.title) || `File ${id}`;
  const description = asString(file.description) || asString(file.summary) || asString(file.note) || '';
  const lower = pickFileType(file);

  if (lower === 'video' || lower === 'url' || lower === 'youtube_video' || lower === 'vimeo_video') {
    const url = asString(file.video_url);
    if (!url) return null;
    return { id, title, type: 'video', url: toEmbeddableVideoUrl(url), description };
  }
  if (lower === 'audio') {
    const url = asString(file.audio_url);
    if (!url) return null;
    return { id, title, type: 'audio', url, description };
  }
  const url = asString(file.attachment_url) || asString(file.video_url) || asString(file.audio_url);
  if (!url) return null;
  if (lower === 'pdf' || /\.pdf($|\?)/i.test(url)) {
    return { id, title, type: 'pdf', url, description };
  }
  return { id, title, type: 'other', url, description };
}

function isLocked(record: Record<string, unknown>): boolean {
  const v = record.lock;
  return v === true || v === 1 || v === '1';
}

export default function StudentLearningPage({ api, session, onNavigate: _onNavigate }: StudentPageProps) {
  void _onNavigate;
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadLearning(session.token),
    [api, session.token],
  );

  // View state — list of courses vs detail view of a single course.
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);
  // Naji 2026-05-04: only one subject can be expanded at a time. Tracks
  // the open subject id; null means everything collapsed.
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  // LEFT-pane tab in detail view: timeline tree vs live classes list.
  const [leftTab, setLeftTab] = useState<'timeline' | 'live'>('timeline');
  const [liveClasses, setLiveClasses] = useState<Record<string, unknown>[]>([]);
  const [liveClassesLoading, setLiveClassesLoading] = useState(false);

  useEffect(() => {
    if (activeCourseId === null || leftTab !== 'live') return;
    let cancelled = false;
    setLiveClassesLoading(true);
    api
      .loadStudentLiveClasses(session.token, activeCourseId)
      .then((rows) => {
        if (!cancelled) setLiveClasses(rows);
      })
      .catch(() => {
        if (!cancelled) setLiveClasses([]);
      })
      .finally(() => {
        if (!cancelled) setLiveClassesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, session.token, activeCourseId, leftTab]);

  const enrolledCourses = useMemo(() => data?.courses ?? [], [data]);
  const catalogCourses = useMemo(() => data?.catalogCourses ?? [], [data]);
  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const lessons = useMemo(() => data?.lessons ?? [], [data]);
  const lessonFiles = useMemo(() => data?.lessonFiles ?? [], [data]);

  const enrolledIdSet = useMemo(
    () => new Set(enrolledCourses.map((c) => asString(c.id))),
    [enrolledCourses],
  );
  const otherCourses = useMemo(
    () => catalogCourses.filter((c) => !enrolledIdSet.has(asString(c.id))),
    [catalogCourses, enrolledIdSet],
  );

  const overallCompletion = useMemo(() => {
    if (lessons.length === 0) return 0;
    const total = lessons.reduce((sum, l) => sum + asNumber(l.completed_percentage), 0);
    return Math.round(total / lessons.length);
  }, [lessons]);

  const handleSelectFile = (file: Record<string, unknown>) => {
    const resolved = resolveSelectedContent(file);
    if (resolved) setSelectedContent(resolved);
  };

  const handleOpenCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    setSelectedContent(null);
    setLeftTab('timeline');
    window.scrollTo({ top: 0 });
  };

  const handleBackToList = () => {
    setActiveCourseId(null);
    setSelectedContent(null);
    setLeftTab('timeline');
  };

  if (loading) return <PageLoader label="Loading courses..." />;

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

  // ── Detail view ────────────────────────────────────────────────
  if (activeCourseId !== null) {
    const course = enrolledCourses.find((c) => asString(c.id) === activeCourseId);
    if (!course) {
      // If the active course is no longer in the list (e.g. unenrolled), fall back.
      return (
        <div className="space-y-6">
          <Button variant="outline" size="sm" onClick={handleBackToList}>
            <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
            Back to courses
          </Button>
          <p className="text-sm text-student-muted">Course no longer available.</p>
        </div>
      );
    }
    const courseSubjects = subjects.filter((s) => asString(s.course_id) === activeCourseId);
    const courseLessons = lessons.filter((l) => {
      const subjectId = asString(l.subject_id);
      return courseSubjects.some((s) => asString(s.id) === subjectId);
    });
    const courseCompletion = courseLessons.length === 0
      ? 0
      : Math.round(
          courseLessons.reduce((sum, l) => sum + asNumber(l.completed_percentage), 0) /
            courseLessons.length,
        );

    return (
      <div className="space-y-4">
        {/* Course summary strip */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <Button variant="outline" size="sm" onClick={handleBackToList} className="rounded-lg">
            <ArrowLeft aria-hidden="true" className="mr-1 size-4" />
            Back
          </Button>
          {course.thumbnail ? (
            <img
              src={asString(course.thumbnail)}
              alt=""
              className="size-14 shrink-0 rounded-lg object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-student-text">
              {asString(course.title) || 'Course'}
            </h1>
            <p className="text-xs text-student-muted">
              {courseSubjects.length} subject{courseSubjects.length === 1 ? '' : 's'} &middot;{' '}
              {courseLessons.length} lesson{courseLessons.length === 1 ? '' : 's'} &middot;{' '}
              {courseCompletion}% complete
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-student-primary transition-all duration-500"
                style={{ width: `${Math.min(courseCompletion, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Two-column layout: timeline left, content view right */}
        <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
          {/* LEFT — Course Timeline + Live Classes tabs */}
          <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setLeftTab('timeline')}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors ${
                  leftTab === 'timeline'
                    ? 'border-b-2 border-student-primary bg-student-primary/5 text-student-primary'
                    : 'text-student-muted hover:text-student-text'
                }`}
              >
                <BookOpen className="size-3.5" aria-hidden="true" />
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('live')}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors ${
                  leftTab === 'live'
                    ? 'border-b-2 border-student-primary bg-student-primary/5 text-student-primary'
                    : 'text-student-muted hover:text-student-text'
                }`}
              >
                <Radio className="size-3.5" aria-hidden="true" />
                Live Classes
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-2">
              {leftTab === 'timeline' ? (
                courseSubjects.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-student-muted">
                    No subjects in this course yet.
                  </p>
                ) : (
                  courseSubjects.map((subject) => {
                    const subjectId = asString(subject.id);
                    const subjectLessons = lessons.filter((l) => asString(l.subject_id) === subjectId);
                    return (
                      <SubjectNode
                        key={subjectId}
                        subject={subject}
                        lessons={subjectLessons}
                        lessonFiles={lessonFiles}
                        activeFileId={selectedContent?.id ?? null}
                        onSelectFile={handleSelectFile}
                        expanded={expandedSubjectId === subjectId}
                        onToggle={() =>
                          setExpandedSubjectId((cur) => (cur === subjectId ? null : subjectId))
                        }
                      />
                    );
                  })
                )
              ) : (
                <LiveClassesPanel rows={liveClasses} loading={liveClassesLoading} />
              )}
            </div>
          </aside>

          {/* RIGHT — Content View. Naji 2026-05-04: player sits at the
              top with no banner strip above it; the title and description
              live BELOW the player. */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {selectedContent ? (
              <ContentPlayer content={selectedContent} onClose={() => setSelectedContent(null)} />
            ) : (
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="rounded-full bg-slate-100 p-4">
                  <PlayCircle aria-hidden="true" className="size-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-student-text">Nothing playing yet</p>
                <p className="max-w-xs text-xs text-student-muted">
                  Pick any lesson, video, audio or PDF from the timeline on the left to start.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text">My Courses</h1>
          <p className="mt-1 text-sm text-student-muted">
            {enrolledCourses.length} enrolled &middot; {otherCourses.length} more available
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
            <Flame className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">
              {data?.streakCurrent ?? 0} day streak
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">Refresh</Button>
        </div>
      </div>

      {/* Course Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-student-text">Course Summary</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Courses', value: enrolledCourses.length, icon: BookOpen, tint: 'bg-blue-50 text-blue-600' },
            { label: 'Subjects', value: subjects.length, icon: FileText, tint: 'bg-violet-50 text-violet-600' },
            { label: 'Lessons', value: lessons.length, icon: BookOpen, tint: 'bg-emerald-50 text-emerald-600' },
            { label: 'Overall', value: `${overallCompletion}%`, icon: BarChart3, tint: 'bg-student-primary/10 text-student-primary' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="text-2xl font-semibold text-student-text">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-student-muted">{stat.label}</p>
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.tint}`}>
                  <Icon aria-hidden="true" className="size-5" />
                </div>
              </div>
            );
          })}
        </div>
        {enrolledCourses.length > 0 ? (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-student-primary transition-all duration-500"
              style={{ width: `${Math.min(overallCompletion, 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      {/* Enrolled */}
      {enrolledCourses.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Enrolled Courses</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {enrolledCourses.map((course) => {
              const id = asString(course.id);
              const courseSubjects = subjects.filter((s) => asString(s.course_id) === id);
              const courseLessons = lessons.filter((l) => {
                const sId = asString(l.subject_id);
                return courseSubjects.some((s) => asString(s.id) === sId);
              });
              const completion = courseLessons.length === 0
                ? 0
                : Math.round(
                    courseLessons.reduce((sum, l) => sum + asNumber(l.completed_percentage), 0) /
                      courseLessons.length,
                  );
              return (
                <CourseCard
                  key={id}
                  course={course}
                  subjectCount={courseSubjects.length}
                  lessonCount={courseLessons.length}
                  completion={completion}
                  enrolled
                  onClick={() => handleOpenCourse(id)}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {/* All other courses */}
      {otherCourses.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">All Other Courses</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {otherCourses.map((course) => {
              const id = asString(course.id);
              return (
                <CourseCard
                  key={id}
                  course={course}
                  subjectCount={asNumber(course.subject_count)}
                  lessonCount={asNumber(course.lessons_count)}
                  completion={0}
                  enrolled={false}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Empty state */}
      {enrolledCourses.length === 0 && otherCourses.length === 0 ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <BookOpen aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
          <h3 className="text-base font-semibold text-student-text">No courses found</h3>
          <p className="mt-1 text-sm text-student-muted">
            You haven't been enrolled in any courses yet.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────── */

function CourseCard({
  course,
  subjectCount,
  lessonCount,
  completion,
  enrolled,
  onClick,
}: {
  course: Record<string, unknown>;
  subjectCount: number;
  lessonCount: number;
  completion: number;
  enrolled: boolean;
  onClick?: () => void;
}) {
  const title = asString(course.title) || 'Untitled Course';
  const thumbnail = asString(course.thumbnail);
  const description = asString(course.short_description) || asString(course.description);

  const inner = (
    <>
      <div className="aspect-video w-full overflow-hidden bg-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen aria-hidden="true" className="size-10 text-slate-300" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-student-text">{title}</h3>
          {enrolled ? (
            <Badge className="shrink-0 rounded-full bg-emerald-100 text-emerald-700 border-emerald-200">
              Enrolled
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 rounded-full">Available</Badge>
          )}
        </div>
        {description ? (
          <p className="line-clamp-2 text-xs text-student-muted">{description}</p>
        ) : null}
        <p className="text-xs text-student-muted">
          {subjectCount} subject{subjectCount === 1 ? '' : 's'} &middot;{' '}
          {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
        </p>
        {enrolled ? (
          <>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-student-primary transition-all duration-500"
                style={{ width: `${Math.min(completion, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-student-primary">{completion}% complete</span>
              <span className="inline-flex items-center text-student-primary">
                Continue <ChevronRight aria-hidden="true" className="ml-0.5 size-3.5" />
              </span>
            </div>
          </>
        ) : null}
      </div>
    </>
  );

  const baseClass = 'group block overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-shadow';

  if (enrolled && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} hover:border-student-primary hover:shadow-md`}
      >
        {inner}
      </button>
    );
  }

  return <div className={`${baseClass} opacity-90`}>{inner}</div>;
}

function SubjectNode({
  subject,
  lessons,
  lessonFiles,
  activeFileId,
  onSelectFile,
  expanded,
  onToggle,
}: {
  subject: Record<string, unknown>;
  lessons: Record<string, unknown>[];
  lessonFiles: Record<string, unknown>[];
  activeFileId: string | null;
  onSelectFile: (file: Record<string, unknown>) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const id = asString(subject.id);
  const title = asString(subject.title) || `Subject ${id}`;
  const completion = lessons.length === 0
    ? 0
    : Math.round(
        lessons.reduce((sum, l) => sum + asNumber(l.completed_percentage), 0) / lessons.length,
      );
  // Naji 2026-05-04: lessons too should expand one at a time within
  // a subject (mirroring the subject single-open rule).
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  return (
    <div className="mb-1 rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
      >
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-slate-400 transition-transform ${expanded ? '' : '-rotate-90'}`}
        />
        <span className="flex-1 truncate text-sm font-semibold text-student-text">{title}</span>
        <span className="text-[10px] font-medium text-student-muted">
          {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
        </span>
        <Badge
          className={`text-[10px] rounded-full ${
            completion === 100
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : 'bg-blue-100 text-blue-700 border-blue-200'
          }`}
        >
          {completion}%
        </Badge>
      </button>
      {expanded ? (
        <div className="ml-3 space-y-0.5 border-l border-slate-100 pl-3">
          {lessons.length === 0 ? (
            <p className="py-2 text-xs text-student-muted">No lessons yet.</p>
          ) : (
            lessons.map((lesson) => {
              const lessonId = asString(lesson.id);
              const filesForLesson = lessonFiles.filter(
                (f) => asString(f.lesson_id) === lessonId,
              );
              return (
                <LessonNode
                  key={lessonId}
                  lesson={lesson}
                  files={filesForLesson}
                  activeFileId={activeFileId}
                  onSelectFile={onSelectFile}
                  expanded={expandedLessonId === lessonId}
                  onToggle={() =>
                    setExpandedLessonId((cur) => (cur === lessonId ? null : lessonId))
                  }
                />
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function LessonNode({
  lesson,
  files,
  activeFileId,
  onSelectFile,
  expanded,
  onToggle,
}: {
  lesson: Record<string, unknown>;
  files: Record<string, unknown>[];
  activeFileId: string | null;
  onSelectFile: (file: Record<string, unknown>) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const id = asString(lesson.id);
  const title = asString(lesson.title) || `Lesson ${id}`;
  const completion = asNumber(lesson.completed_percentage);
  const locked = isLocked(lesson);
  const hasFiles = files.length > 0;

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => { if (hasFiles && !locked) onToggle(); }}
        disabled={locked || !hasFiles}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${
          locked
            ? 'cursor-not-allowed opacity-60'
            : hasFiles
              ? 'hover:bg-slate-50'
              : 'cursor-default'
        }`}
        title={locked ? 'Locked — complete the previous lesson first' : ''}
      >
        {locked ? (
          <Lock aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
        ) : completion === 100 ? (
          <CheckCircle aria-hidden="true" className="size-3.5 shrink-0 text-emerald-500" />
        ) : (
          <BookOpen aria-hidden="true" className="size-3.5 shrink-0 text-student-primary" />
        )}
        <span className="flex-1 truncate text-xs font-medium text-student-text">{title}</span>
        {hasFiles ? (
          <span className="text-[10px] text-student-muted">{files.length}</span>
        ) : null}
        {hasFiles && !locked ? (
          <ChevronDown
            aria-hidden="true"
            className={`size-3.5 shrink-0 text-slate-400 transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        ) : null}
      </button>
      {expanded && !locked ? (
        <div className="ml-4 space-y-0.5 border-l border-slate-100 pl-2 py-1">
          {files.map((file) => (
            <FileNode
              key={asString(file.id)}
              file={file}
              isActive={activeFileId === asString(file.id)}
              onSelect={onSelectFile}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FileNode({
  file,
  isActive,
  onSelect,
}: {
  file: Record<string, unknown>;
  isActive: boolean;
  onSelect: (file: Record<string, unknown>) => void;
}) {
  const id = asString(file.id);
  const title = asString(file.title) || `File ${id}`;
  const fileType = pickFileType(file);
  const Icon = getFileTypeIcon(fileType);
  const locked = isLocked(file);
  const playable = !locked && resolveSelectedContent(file) !== null;
  // Naji 2026-05-04: replace the right-side type badge with a
  // completion status indicator (tick when done, dot when in progress,
  // empty circle when not started).
  const progress = asNumber(file.progress);
  const completed = progress >= 100;
  const inProgress = progress > 0 && progress < 100;
  const StatusIcon = locked
    ? Lock
    : completed
      ? CheckCircle
      : inProgress
        ? CircleDot
        : Circle;
  const statusTint = locked
    ? 'text-slate-400'
    : completed
      ? 'text-emerald-500'
      : inProgress
        ? 'text-blue-500'
        : 'text-slate-300';

  if (!playable) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
          locked ? 'opacity-60' : 'opacity-90'
        }`}
        title={locked ? 'Locked — complete the previous lesson first' : 'Content link not available'}
      >
        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-student-muted">{title}</span>
        <StatusIcon aria-hidden="true" className={`size-3.5 shrink-0 ${statusTint}`} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(file)}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        isActive
          ? 'bg-student-primary/10 text-student-primary'
          : 'hover:bg-slate-50'
      }`}
    >
      <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${isActive ? 'text-student-primary' : 'text-slate-500'}`} />
      <span className="flex-1 truncate font-medium text-student-text">{title}</span>
      <StatusIcon aria-hidden="true" className={`size-3.5 shrink-0 ${statusTint}`} />
    </button>
  );
}

function LiveClassesPanel({
  rows,
  loading,
}: {
  rows: Record<string, unknown>[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="px-2 py-6 text-center text-sm text-student-muted">Loading live classes...</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-student-muted">
        No live classes scheduled for your cohorts in this course yet.
      </p>
    );
  }
  // Group by status — upcoming/today first, past at the bottom.
  const upcoming = rows.filter((r) => asString(r.status) === 'upcoming');
  const today = rows.filter((r) => asString(r.status) === 'today');
  const past = rows.filter((r) => asString(r.status) === 'past');
  const groups: Array<{ label: string; items: Record<string, unknown>[] }> = [
    ...(today.length > 0 ? [{ label: 'Today', items: today }] : []),
    ...(upcoming.length > 0 ? [{ label: 'Upcoming', items: upcoming }] : []),
    ...(past.length > 0 ? [{ label: 'Past', items: past }] : []),
  ];
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.label} className="space-y-1.5">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-student-muted">
            {g.label}
          </p>
          {g.items.map((row) => (
            <LiveClassRow key={asString(row.id)} row={row} />
          ))}
        </div>
      ))}
    </div>
  );
}

function LiveClassRow({ row }: { row: Record<string, unknown> }) {
  const title = asString(row.title) || 'Live Class';
  const date = asString(row.date);
  const fromTime = asString(row.from_time);
  const toTime = asString(row.to_time);
  const subject = asString(row.subject_title);
  const cohortCode = asString(row.cohort_code);
  const instructor = asString(row.instructor_name);
  const joinUrl = asString(row.join_url);
  const recordingUrl = asString(row.recording_url);
  const status = asString(row.status);
  const hasRecording = row.has_recording === true;
  const isPast = status === 'past';
  const isToday = status === 'today';

  return (
    <div className="rounded-lg border border-slate-100 p-3 hover:border-student-primary/40 hover:bg-student-primary/5">
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold text-student-text">{title}</p>
        {isToday ? (
          <Badge className="shrink-0 rounded-full bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
            Today
          </Badge>
        ) : null}
      </div>
      {subject ? (
        <p className="mt-0.5 text-xs text-student-muted">
          {subject}
          {cohortCode ? <span className="ml-1 opacity-60">({cohortCode})</span> : null}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-student-muted">
        {date ? (
          <span className="inline-flex items-center gap-1">
            <Calendar aria-hidden="true" className="size-3" />
            {date}
          </span>
        ) : null}
        {fromTime || toTime ? (
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden="true" className="size-3" />
            {fromTime}{toTime ? ` – ${toTime}` : ''}
          </span>
        ) : null}
        {instructor ? <span className="opacity-80">{instructor}</span> : null}
      </div>
      {(joinUrl && !isPast) || (hasRecording && recordingUrl) ? (
        <div className="mt-2 flex items-center gap-2">
          {joinUrl && !isPast ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-student-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-student-primary/90"
            >
              <Radio aria-hidden="true" className="size-3" />
              Join
            </a>
          ) : null}
          {hasRecording && recordingUrl ? (
            <a
              href={recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-student-text hover:bg-slate-50"
            >
              <PlayCircle aria-hidden="true" className="size-3" />
              Recording
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ContentPlayer({ content, onClose }: { content: SelectedContent; onClose: () => void }) {
  // Naji 2026-05-04: player goes flush at the top (no banner strip above
  // it) and the title + description sit BELOW so the bottom space is
  // useful instead of empty. Open-in-new-tab and Close move into the
  // info row to keep the chrome out of the way.
  return (
    <div>
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
        ) : (
          <iframe
            key={content.id}
            src={content.url}
            title={content.title}
            className="h-[70vh] w-full bg-white"
          />
        )}
      </div>
      <div className="space-y-2 border-t border-slate-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-student-muted">{content.type}</p>
            <h3 className="mt-0.5 truncate text-sm font-semibold text-student-text">{content.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <ExternalLink className="size-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        {content.description ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-student-muted">
            {content.description}
          </p>
        ) : (
          <p className="text-xs italic text-slate-400">No description provided for this content.</p>
        )}
      </div>
    </div>
  );
}
