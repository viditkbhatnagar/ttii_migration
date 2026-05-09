import { useEffect, useMemo, useState, type MouseEvent } from 'react';
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
  FileType2,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';
import type { StudentPortalApi } from '../../student-portal-api.js';
import { ExamPlayer } from '../../components/ExamPlayer.js';

// Map file type → icon. Naji 2026-05-04 / 05-05: every content type
// should look distinct. PDF and article were sharing FileText so they
// were impossible to tell apart in the timeline — PDF now uses FileType2
// (the doc icon with a label corner).
function getFileTypeIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower === 'video' || lower === 'youtube_video' || lower === 'vimeo_video') return Video;
  if (lower === 'audio') return Headphones;
  if (lower === 'pdf') return FileType2;
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
  // 'doc' is the legacy PHP alias for an article (Word-like body text);
  // 'document' is ambiguous — admins use it for PDFs that they uploaded
  // as a generic file. Naji 2026-05-05: PDFs stored as 'document' were
  // being misrouted as articles (same icon + tried to render description
  // instead of the file). Decide by URL extension when type is generic.
  const attachmentUrl = asString(file.attachment_url) || asString(file.attachment);
  const looksLikePdf = /\.pdf($|\?)/i.test(attachmentUrl);
  const normalize = (t: string): string => {
    if (t === 'doc') return 'article';
    if (t === 'document') return looksLikePdf ? 'pdf' : 'article';
    return t;
  };
  const semantic = new Set(['video', 'audio', 'pdf', 'quiz', 'article', 'practice']);
  const ln = normalize(lessonType);
  const an = normalize(attachmentType);
  if (semantic.has(ln)) return ln;
  if (semantic.has(an)) return an;
  return an || ln;
}

// Strip HTML tags + decode common entities for inline preview text.
// The PHP LMS stored summaries with <p>...</p> wrapping; we surface the
// raw text on non-article rows so users don't see "<p>foo</p>" verbatim.
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
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
  type: 'video' | 'mp4' | 'audio' | 'pdf' | 'article' | 'quiz' | 'other';
  url: string;
  description: string;
  // Quiz needs the lesson_file id so the native QuizPlayer can fetch
  // questions, start an attempt, and submit answers.
  lessonFileId?: string;
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
  // Articles carry their content in the description / summary text —
  // no URL is involved. Naji 2026-05-04: doc + quiz were greyed out
  // because the previous resolver bailed when there was no URL.
  if (lower === 'article') {
    return { id, title, type: 'article', url: '', description };
  }
  // Quizzes are now rendered by the native React QuizPlayer (Naji
  // 2026-05-05) which fetches questions, manages an attempt, and
  // scores submissions. We carry the lesson_file id so the player can
  // call /student/quiz/* endpoints. URL stays empty — there's no
  // single resource to point at.
  if (lower === 'quiz') {
    return { id, title, type: 'quiz', url: '', description, lessonFileId: id };
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

  // Naji 2026-05-04 / 05-05: clicking "Recording" on a past live class
  // resolves a fresh signed URL (DO Spaces recordings rotate every hour)
  // and plays the MP4 inside the right-pane player. The earlier version
  // tried to play the stale `recording_url` from the list payload —
  // signed URL had usually expired by then so the <video> element drew
  // a black frame with no source.
  const handlePlayRecording = (row: Record<string, unknown>) => {
    const liveClassId = asString(row.id);
    if (!liveClassId) return;
    void (async () => {
      const url = await api.getLiveRecordingUrl(session.token, liveClassId).catch(() => '');
      if (!url) return;
      // Live recordings come back in two shapes:
      //   - Vimeo / YouTube URL (legacy: `video_url` field on live_class)
      //   - Direct MP4 (new: signed DO Spaces URL from recording_storage_key)
      // Vimeo/YouTube must use the iframe embed, not a <video> element.
      const isVimeoOrYouTube = /vimeo\.com|youtube\.com|youtu\.be/.test(url);
      const playable: SelectedContent = isVimeoOrYouTube
        ? {
            id: `live-${liveClassId}`,
            title: asString(row.title) || 'Recording',
            type: 'video',
            url: toEmbeddableVideoUrl(url),
            description: asString(row.subject_title) || '',
          }
        : {
            id: `live-${liveClassId}`,
            title: asString(row.title) || 'Recording',
            type: 'mp4',
            url,
            description: asString(row.subject_title) || '',
          };
      setSelectedContent(playable);
    })();
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
    const completedLessons = courseLessons.filter(
      (l) => asNumber(l.completed_percentage) >= 100,
    ).length;
    // A "module" is a subject. In progress = any lesson started; complete = all done.
    const subjectsInProgress = courseSubjects.filter((s) => {
      const sid = asString(s.id);
      const sl = courseLessons.filter((l) => asString(l.subject_id) === sid);
      if (sl.length === 0) return false;
      const total = sl.reduce((sum, l) => sum + asNumber(l.completed_percentage), 0);
      return total > 0 && total < sl.length * 100;
    }).length;
    const completedSubjects = courseSubjects.filter((s) => {
      const sid = asString(s.id);
      const sl = courseLessons.filter((l) => asString(l.subject_id) === sid);
      if (sl.length === 0) return false;
      return sl.every((l) => asNumber(l.completed_percentage) >= 100);
    }).length;

    // First non-completed lesson for the "UP NEXT" card. Falls through
    // to null (course finished) — the card hides itself in that case.
    const upNextLesson = courseLessons.find(
      (l) => asNumber(l.completed_percentage) < 100 && !isLocked(l),
    ) ?? null;
    const upNextSubject = upNextLesson
      ? courseSubjects.find((s) => asString(s.id) === asString(upNextLesson.subject_id)) ?? null
      : null;
    const upNextFile = upNextLesson
      ? lessonFiles.find((f) => asString(f.lesson_id) === asString(upNextLesson.id)) ?? null
      : null;

    // Final Exam = the last quiz file in the last subject (heuristic — most
    // courses surface a "final" quiz at the end). Skipped if no quizzes.
    const allQuizFiles = lessonFiles
      .filter((f) => {
        const lessonId = asString(f.lesson_id);
        const lesson = courseLessons.find((l) => asString(l.id) === lessonId);
        if (!lesson) return false;
        return pickFileType(f) === 'quiz';
      });
    const finalExamFile = allQuizFiles.length > 0 ? allQuizFiles[allQuizFiles.length - 1] : null;

    const handleStartUpNext = () => {
      if (!upNextLesson) return;
      // Expand subject + lesson, and if a playable file exists, open it.
      if (upNextSubject) {
        setExpandedSubjectId(asString(upNextSubject.id));
      }
      if (upNextFile) {
        handleSelectFile(upNextFile);
      }
    };

    const handleStartFinalExam = () => {
      if (!finalExamFile) return;
      const lessonId = asString(finalExamFile.lesson_id);
      const lesson = courseLessons.find((l) => asString(l.id) === lessonId);
      if (lesson) {
        setExpandedSubjectId(asString(lesson.subject_id));
      }
      handleSelectFile(finalExamFile);
    };

    const courseDuration = asString(course.duration);
    const liveClassCount = liveClasses.length;

    return (
      <div className="space-y-4">
        {/* Hero banner — gradient blue with course title, tags, and a
            circular progress indicator on the right. Naji 2026-05-07. */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#2347a8] to-[#3b5bdb] p-6 text-white shadow-lg">
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back to Courses
          </button>
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-medium text-white">
                  Enrolled
                </span>
                {finalExamFile ? (
                  <span className="inline-flex items-center rounded-full bg-amber-400/25 px-3 py-0.5 text-[11px] font-medium text-amber-100">
                    Final Exam Available
                  </span>
                ) : null}
                {courseDuration ? (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-medium text-white">
                    {courseDuration}
                  </span>
                ) : null}
              </div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                {asString(course.title) || 'Course'}
              </h1>
            </div>
            <CourseProgressRing percentage={courseCompletion} />
          </div>
        </div>

        {/* Stats row — 4 cards summarising the course at a glance. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={BookOpen}
            iconClass="bg-blue-50 text-blue-600"
            label="Modules"
            value={`${completedSubjects} / ${courseSubjects.length}`}
            sublabel={subjectsInProgress > 0 ? `${subjectsInProgress} in progress` : courseSubjects.length === 0 ? 'No modules yet' : 'Ready to start'}
          />
          <StatCard
            icon={BarChart3}
            iconClass="bg-emerald-50 text-emerald-600"
            label="Progress"
            value={`${courseCompletion}%`}
            sublabel="Content watched"
          />
          <StatCard
            icon={CheckCircle}
            iconClass="bg-purple-50 text-purple-600"
            label="Lessons"
            value={`${completedLessons} / ${courseLessons.length}`}
            sublabel={courseLessons.length > 0 ? `${courseLessons.length - completedLessons} remaining` : 'No lessons yet'}
          />
          <StatCard
            icon={Radio}
            iconClass="bg-amber-50 text-amber-600"
            label="Live Classes"
            value={String(liveClassCount)}
            sublabel={liveClassCount > 0 ? 'View schedule' : 'None scheduled'}
          />
        </div>

        {/* Two-column layout: stack of UP NEXT / Final Exam / Modules
            on the left, content player on the right. */}
        <div className="grid gap-4 lg:grid-cols-[minmax(300px,400px)_1fr]">
          {/* LEFT column */}
          <div className="space-y-3">
            {/* UP NEXT card — surfaces the next non-completed lesson. */}
            {upNextLesson ? (
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#3b5bdb] to-[#5a7be8] p-4 text-white shadow-md">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
                  <PlayCircle aria-hidden="true" className="size-3.5" />
                  Up Next
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-snug">
                  {asString(upNextLesson.title) || 'Continue learning'}
                </p>
                {upNextSubject ? (
                  <p className="mt-1 text-xs text-white/75">
                    {asString(upNextSubject.title)}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleStartUpNext}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-sm font-semibold text-[#3b5bdb] transition-colors hover:bg-white/95"
                >
                  <PlayCircle aria-hidden="true" className="size-4" />
                  Continue
                </button>
              </div>
            ) : null}

            {/* Final Examination card — only shown if a final quiz exists. */}
            {finalExamFile ? (
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-white shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/25">
                    <FileQuestion aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">Final Examination</p>
                    <p className="mt-0.5 text-xs text-white/85">Test your knowledge</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartFinalExam}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/95 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-white"
                >
                  Take Final Exam
                </button>
              </div>
            ) : null}

            {/* Course Modules + Live Classes — toggleable list */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setLeftTab('timeline')}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    leftTab === 'timeline'
                      ? 'border-b-2 border-student-primary bg-student-primary/5 text-student-primary'
                      : 'text-student-muted hover:text-student-text'
                  }`}
                >
                  <BookOpen className="size-3.5" aria-hidden="true" />
                  Course Modules
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {courseSubjects.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab('live')}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    leftTab === 'live'
                      ? 'border-b-2 border-student-primary bg-student-primary/5 text-student-primary'
                      : 'text-student-muted hover:text-student-text'
                  }`}
                >
                  <Radio className="size-3.5" aria-hidden="true" />
                  Live Classes
                  {liveClassCount > 0 ? (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {liveClassCount}
                    </span>
                  ) : null}
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {leftTab === 'timeline' ? (
                  courseSubjects.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-student-muted">
                      No modules in this course yet.
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
                  <LiveClassesPanel
                    rows={liveClasses}
                    loading={liveClassesLoading}
                    onPlayRecording={handlePlayRecording}
                  />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Content View. */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {selectedContent ? (
              <ContentPlayer
                content={selectedContent}
                onClose={() => setSelectedContent(null)}
                api={api}
                authToken={session.token}
              />
            ) : (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-student-primary/10">
                  <PlayCircle aria-hidden="true" className="size-9 text-student-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-student-text">Ready to Learn?</p>
                  <p className="mt-1 max-w-xs text-sm text-student-muted">
                    Select a module from the left to start watching videos, reading materials, or taking quizzes.
                  </p>
                </div>
                {upNextLesson ? (
                  <button
                    type="button"
                    onClick={handleStartUpNext}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <PlayCircle aria-hidden="true" className="size-4" />
                    Continue Learning
                  </button>
                ) : null}
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

      {/* Enrolled — Naji 2026-05-07 reskin: rich card per course matching
          the dashboard reference (numbered tile + 4 metric strips + bold
          progress bar + dark Continue Learning CTA). */}
      {enrolledCourses.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-student-text">My Courses</h2>
          <p className="-mt-2 text-sm text-student-muted">
            You are enrolled in <span className="font-semibold text-student-text">{enrolledCourses.length}</span>{' '}
            course{enrolledCourses.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-4">
            {enrolledCourses.map((course, idx) => {
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
              const completedSubjects = courseSubjects.filter((s) => {
                const sid = asString(s.id);
                const sl = courseLessons.filter((l) => asString(l.subject_id) === sid);
                if (sl.length === 0) return false;
                return sl.every((l) => asNumber(l.completed_percentage) >= 100);
              }).length;
              return (
                <EnrolledCourseRichCard
                  key={id}
                  index={idx + 1}
                  course={course}
                  modulesDone={completedSubjects}
                  modulesTotal={courseSubjects.length}
                  completion={completion}
                  onContinue={() => handleOpenCourse(id)}
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                  api={api}
                  authToken={session.token}
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

function formatInr(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

// Naji 2026-05-07 — rich enrolled-course card. Numbered tile on the left,
// course title + tag + module count strip, four metric tiles, bold
// progress bar, and a full-width dark "Continue Learning" CTA at bottom.
// Matches the dashboard reference design.
function EnrolledCourseRichCard({
  index,
  course,
  modulesDone,
  modulesTotal,
  completion,
  onContinue,
}: {
  index: number;
  course: Record<string, unknown>;
  modulesDone: number;
  modulesTotal: number;
  completion: number;
  onContinue: () => void;
}) {
  const title = asString(course.title) || 'Untitled Course';
  // Best-effort enrolment + validity dates. The legacy /course/all_course
  // payload sometimes carries enrollment_date / start_date / created_at;
  // we render whichever is present, otherwise fall through to a dash.
  const enrolledDateRaw =
    asString(course.enrollment_date) ||
    asString(course.start_date) ||
    asString(course.created_at);
  const enrolledDate = enrolledDateRaw ? formatNiceDate(enrolledDateRaw) : '—';
  const durationStr = asString(course.duration);
  const validityMonths = parseDurationMonths(durationStr);
  const enrolledDateObj = enrolledDateRaw ? new Date(enrolledDateRaw) : null;
  const validUntilObj = enrolledDateObj && validityMonths
    ? new Date(enrolledDateObj.getFullYear(), enrolledDateObj.getMonth() + validityMonths, enrolledDateObj.getDate())
    : null;
  const validUntilLabel = validUntilObj ? formatNiceDate(validUntilObj.toISOString()) : (durationStr || '—');
  const timeLeftLabel = validUntilObj ? formatTimeLeft(validUntilObj) : (durationStr || '—');

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-student-primary/15 bg-white shadow-sm">
      {/* Header strip */}
      <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500">
          {index}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-student-text">{title}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
              Standalone
            </span>
            <span className="text-student-muted">{modulesDone}/{modulesTotal} modules</span>
          </div>
        </div>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 -rotate-180 text-student-primary opacity-60" />
      </div>

      {/* 4 metric tiles */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4 lg:grid-cols-4">
        <CourseMetricTile
          icon={Calendar}
          tint="text-blue-600 bg-blue-50"
          label="Enrolled"
          value={enrolledDate}
        />
        <CourseMetricTile
          icon={Clock}
          tint="text-amber-600 bg-amber-50"
          label="Valid Until"
          value={validUntilLabel}
        />
        <CourseMetricTile
          icon={BookOpen}
          tint="text-emerald-600 bg-emerald-50"
          label="Modules"
          value={`${modulesDone} of ${modulesTotal} done`}
        />
        <CourseMetricTile
          icon={Clock}
          tint="text-purple-600 bg-purple-50"
          label="Time Left"
          value={timeLeftLabel}
        />
      </div>

      {/* Progress + CTA */}
      <div className="space-y-3 px-5 pb-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-student-muted">Course Progress</span>
          <span className="text-base font-bold text-student-primary">{completion}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-all duration-500"
            style={{ width: `${Math.min(completion, 100)}%` }}
          />
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <PlayCircle aria-hidden="true" className="size-4" />
          Continue Learning
        </button>
      </div>
    </div>
  );
}

function CourseMetricTile({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: typeof BookOpen;
  tint: string;
  label: string;
  value: string;
}) {
  // tint is a "text-xxx-Y00 bg-xxx-50" string — split for cleaner classNames.
  const [textCls, bgCls] = tint.split(' ');
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-slate-100 ${bgCls ?? ''} p-3`}>
      <Icon aria-hidden="true" className={`size-5 shrink-0 ${textCls ?? ''}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-student-muted">{label}</p>
        <p className="truncate text-sm font-semibold text-student-text">{value}</p>
      </div>
    </div>
  );
}

function formatNiceDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Parse legacy "12 months", "1 year", "6 months" duration strings to a
// month count. Returns null when the format isn't recognised.
function parseDurationMonths(value: string): number | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  const match = v.match(/(\d+)\s*(year|month|day)/);
  if (!match) return null;
  const n = parseInt(match[1] ?? '', 10);
  if (!Number.isFinite(n)) return null;
  const unit = match[2];
  if (unit === 'year') return n * 12;
  if (unit === 'month') return n;
  if (unit === 'day') return Math.max(1, Math.round(n / 30));
  return null;
}

function formatTimeLeft(target: Date): string {
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'}`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  return `${days} day${days === 1 ? '' : 's'}`;
}

// Circular progress indicator shown in the course detail hero banner.
// Naji 2026-05-07 — visual reskin of the course summary strip.
function CourseProgressRing({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative flex size-20 shrink-0 items-center justify-center sm:size-24">
      <svg className="size-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={5} />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white sm:text-xl">{clamped}%</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-white/75">Complete</span>
      </div>
    </div>
  );
}

// Single metric card for the stats row.
function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  sublabel,
}: {
  icon: typeof BookOpen;
  iconClass: string;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-student-muted">{label}</p>
        <p className="mt-1 truncate text-xl font-bold text-student-text">{value}</p>
        <p className="mt-0.5 truncate text-[11px] text-student-muted">{sublabel}</p>
      </div>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon aria-hidden="true" className="size-5" />
      </div>
    </div>
  );
}

function CourseCard({
  course,
  subjectCount,
  lessonCount,
  completion,
  enrolled,
  onClick,
  api,
  authToken,
}: {
  course: Record<string, unknown>;
  subjectCount: number;
  lessonCount: number;
  completion: number;
  enrolled: boolean;
  onClick?: () => void;
  api?: StudentPortalApi;
  authToken?: string;
}) {
  const id = asString(course.id);
  const title = asString(course.title) || 'Untitled Course';
  const thumbnail = asString(course.thumbnail);
  const price = asNumber(course.price);
  const offerPrice = asNumber(course.offer_price);
  const hasOffer = offerPrice > 0 && offerPrice < price;
  const displayPrice = hasOffer ? offerPrice : price;

  const [requesting, setRequesting] = useState(false);
  const [requestState, setRequestState] = useState<{ kind: 'idle' } | { kind: 'success'; message: string } | { kind: 'error'; message: string }>({ kind: 'idle' });

  const handleRequest = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!api || !authToken || !id || requesting) return;
    setRequesting(true);
    try {
      const result = await api.requestEnrolment(authToken, id);
      if (result.status === 1) {
        setRequestState({ kind: 'success', message: result.message || 'Request sent.' });
      } else {
        setRequestState({ kind: 'error', message: result.message || 'Request failed.' });
      }
    } catch (err) {
      setRequestState({ kind: 'error', message: err instanceof Error ? err.message : 'Request failed.' });
    } finally {
      setRequesting(false);
    }
  };

  const inner = (
    <>
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
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
            <BookOpen aria-hidden="true" className="size-8 text-slate-300" />
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-student-text">{title}</h3>
        <p className="text-[10px] text-student-muted">
          {subjectCount} sub &middot; {lessonCount} less
        </p>
        {enrolled ? (
          <>
            <div className="h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-student-primary transition-all duration-500"
                style={{ width: `${Math.min(completion, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium text-student-primary">{completion}% complete</span>
              <span className="inline-flex items-center text-student-primary">
                Continue <ChevronRight aria-hidden="true" className="ml-0.5 size-3" />
              </span>
            </div>
          </>
        ) : (
          <div className="space-y-1.5 pt-0.5">
            {displayPrice > 0 ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-student-text">{formatInr(displayPrice)}</span>
                {hasOffer ? (
                  <span className="text-[10px] text-student-muted line-through">{formatInr(price)}</span>
                ) : null}
              </div>
            ) : (
              <p className="text-[10px] text-student-muted">Contact for pricing</p>
            )}
            {requestState.kind === 'success' ? (
              <p role="status" className="text-[10px] text-emerald-600">{requestState.message}</p>
            ) : requestState.kind === 'error' ? (
              <p role="alert" className="text-[10px] text-red-600">{requestState.message}</p>
            ) : (
              <button
                type="button"
                onClick={(e) => { void handleRequest(e); }}
                disabled={requesting || !api}
                className="w-full rounded-md bg-student-primary px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-student-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requesting ? 'Sending…' : 'Request Enrolment'}
              </button>
            )}
          </div>
        )}
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

  return <div className={`${baseClass} hover:border-student-primary/40 hover:shadow-sm`}>{inner}</div>;
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
  // Naji 2026-05-05: PDF and article looked identical at small size
  // because both icons were neutral slate. Tint PDFs red (the
  // conventional PDF brand colour) so they read at a glance; quizzes
  // get a purple tint, audio amber, video blue. Articles stay slate.
  const iconTint = (() => {
    if (fileType === 'pdf') return 'text-red-500';
    if (fileType === 'quiz') return 'text-purple-500';
    if (fileType === 'audio') return 'text-amber-500';
    if (fileType === 'video') return 'text-blue-500';
    if (fileType === 'url') return 'text-cyan-500';
    return 'text-slate-500';
  })();
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
        <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${iconTint} opacity-60`} />
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
      <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${isActive ? 'text-student-primary' : iconTint}`} />
      <span className="flex-1 truncate font-medium text-student-text">{title}</span>
      <StatusIcon aria-hidden="true" className={`size-3.5 shrink-0 ${statusTint}`} />
    </button>
  );
}

// Trim "HH:MM:SS" → "HH:MM" so the row doesn't waste pixels on seconds.
function shortTime(value: string): string {
  if (!value) return '';
  const m = value.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : value;
}

function formatLiveClassDate(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Strip hyphen from legacy "C-1013" cohort codes (mirrors the helper
// used on the admin Cohorts page). New "MMJUL26" style codes pass
// through untouched.
function normalizeCohortCode(value: string): string {
  if (!value) return '';
  return value.replace(/^([A-Za-z]+)-(\d+)$/, '$1$2');
}

function LiveClassesPanel({
  rows,
  loading,
  onPlayRecording,
}: {
  rows: Record<string, unknown>[];
  loading: boolean;
  onPlayRecording: (row: Record<string, unknown>) => void;
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
  // Naji 2026-05-04: Upcoming + Today shown individually on top; Past
  // grouped under their subject so the Completed list stays compact
  // and scoped to the subject the recording belongs to.
  const upcomingRows = rows.filter((r) => asString(r.status) === 'upcoming');
  const todayRows = rows.filter((r) => asString(r.status) === 'today');
  const pastRows = rows.filter((r) => asString(r.status) === 'past');
  const upcomingTop = [...todayRows, ...upcomingRows];

  const pastBySubject = new Map<string, { title: string; items: Record<string, unknown>[] }>();
  for (const row of pastRows) {
    const key = asString(row.subject_id) || 'unknown';
    const title = asString(row.subject_title) || 'Other sessions';
    const entry = pastBySubject.get(key) ?? { title, items: [] };
    entry.items.push(row);
    pastBySubject.set(key, entry);
  }

  return (
    <div className="space-y-4">
      {upcomingTop.length > 0 ? (
        <div className="space-y-1.5">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-student-muted">
            Upcoming
          </p>
          {upcomingTop.map((row) => (
            <LiveClassRow key={asString(row.id)} row={row} onPlayRecording={onPlayRecording} />
          ))}
        </div>
      ) : null}

      {pastBySubject.size > 0 ? (
        <div className="space-y-2">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-student-muted">
            Past
          </p>
          {[...pastBySubject.values()].map((group) => (
            <PastSubjectGroup
              key={group.title}
              title={group.title}
              items={group.items}
              onPlayRecording={onPlayRecording}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PastSubjectGroup({
  title,
  items,
  onPlayRecording,
}: {
  title: string;
  items: Record<string, unknown>[];
  onPlayRecording: (row: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
      >
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        <span className="flex-1 truncate text-xs font-semibold text-student-text">{title}</span>
        <span className="text-[10px] font-medium text-student-muted">
          {items.length} session{items.length === 1 ? '' : 's'}
        </span>
      </button>
      {open ? (
        <div className="space-y-1.5 border-t border-slate-100 p-2">
          {items.map((row) => (
            <LiveClassRow key={asString(row.id)} row={row} onPlayRecording={onPlayRecording} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LiveClassRow({
  row,
  onPlayRecording,
}: {
  row: Record<string, unknown>;
  onPlayRecording: (row: Record<string, unknown>) => void;
}) {
  const title = asString(row.title) || 'Live Class';
  const date = formatLiveClassDate(asString(row.date));
  const fromTime = shortTime(asString(row.from_time));
  const toTime = shortTime(asString(row.to_time));
  const subject = asString(row.subject_title);
  const cohortCode = normalizeCohortCode(asString(row.cohort_code));
  const instructor = asString(row.instructor_name);
  const joinUrl = asString(row.join_url);
  const recordingUrl = asString(row.recording_url);
  const status = asString(row.status);
  const hasRecording = row.has_recording === true && Boolean(recordingUrl);
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
      {(joinUrl && !isPast) || hasRecording ? (
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
          {hasRecording ? (
            <button
              type="button"
              onClick={() => onPlayRecording(row)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-student-text hover:bg-slate-50"
            >
              <PlayCircle aria-hidden="true" className="size-3" />
              Recording
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ContentPlayer({
  content,
  onClose,
  api,
  authToken,
}: {
  content: SelectedContent;
  onClose: () => void;
  api: StudentPortalApi;
  authToken: string;
}) {
  // Naji 2026-05-04: player goes flush at the top (no banner strip above
  // it) and the title + description sit BELOW so the bottom space is
  // useful instead of empty. Open-in-new-tab and Close move into the
  // info row to keep the chrome out of the way.
  // Article doesn't use the dark video frame — it renders inline as
  // an HTML article body. Quiz uses the native QuizPlayer (Naji
  // 2026-05-05) — full-width React component that fills the right
  // pane properly, replacing the legacy mobile-only PHP iframe.
  if (content.type === 'quiz' && content.lessonFileId) {
    // Naji 2026-05-09 — new ExamPlayer with header card + question
    // navigator + flag + submit/result modals. Drop-in replacement for
    // QuizPlayer (same /student/quiz/* endpoints).
    return (
      <ExamPlayer
        api={api}
        authToken={authToken}
        lessonFileId={content.lessonFileId}
        title={content.title}
        onClose={onClose}
      />
    );
  }
  const showTopFrame = content.type !== 'article';
  // Naji 2026-05-07: green Reading Material header for article + PDF
  // content. The "Page 1" label is decorative — we don't track page
  // count for HTML articles, but it lines up with the visual style.
  const isReadingMaterial = content.type === 'article' || content.type === 'pdf';
  return (
    <div>
      {isReadingMaterial ? (
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <FileText aria-hidden="true" className="size-4" />
            <p className="text-sm font-semibold">Reading Material</p>
          </div>
          <div className="flex items-center gap-2">
            {content.url ? (
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-white/90 underline-offset-2 hover:text-white hover:underline"
              >
                Open in New Tab
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-white/85 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
      {showTopFrame ? (
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
          ) : content.type === 'mp4' ? (
            // Live-class recordings come back as signed MP4 URLs from
            // DO Spaces — iframe won't render those, so use the native
            // video element with controls.
            <div className="aspect-video w-full">
              <video key={content.id} controls className="size-full bg-black">
                <source src={content.url} type="video/mp4" />
                Your browser does not support video playback.
              </video>
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
      ) : null}
      <div className="space-y-2 border-t border-slate-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-student-muted">{content.type}</p>
            <h3 className="mt-0.5 truncate text-sm font-semibold text-student-text">{content.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {content.url ? (
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <ExternalLink className="size-4" />
              </a>
            ) : null}
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
        {content.type === 'article' ? (
          content.description ? (
            // Articles authored in the admin panel ship as HTML
            // (<p>, <strong>, <ul>...). Render with dangerouslySetInnerHTML
            // so paragraphs and emphasis show through instead of leaking
            // raw "<p>" tags into the page.
            <article
              className="prose prose-sm max-w-none text-sm leading-relaxed text-student-text"
              dangerouslySetInnerHTML={{ __html: content.description }}
            />
          ) : (
            <p className="text-xs italic text-slate-400">This article has no body yet.</p>
          )
        ) : content.description ? (
          // Strip HTML tags for non-article descriptions so the right pane
          // doesn't show "<p>...</p>" verbatim — Naji 2026-05-04.
          <p className="whitespace-pre-line text-sm leading-relaxed text-student-muted">
            {stripHtml(content.description)}
          </p>
        ) : (
          <p className="text-xs italic text-slate-400">No description provided for this content.</p>
        )}
      </div>
    </div>
  );
}

