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
  FileType2,
  GraduationCap,
  Layers,
  ListChecks,
  MessageCircle,
  Search,
  User,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { StudentLoader as PageLoader } from '@/student/components/StudentLoader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EChart } from '@/components/EChart';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, asBoolean, asRecord } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';
import type { StudentPortalApi } from '../../student-portal-api.js';
import { ExamPlayer } from '../../components/ExamPlayer.js';
import { toEmbeddableVideoUrl } from '../../lib/video-embed.js';
import { RecommendedCourseCard } from '../../components/RecommendedCourseCard.js';
import { EnrollPathModal } from '../../components/EnrollPathModal.js';

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

// EduPulse list-view course status. Drives the filter pills + card badge.
type CourseStatus = 'in-progress' | 'completed' | 'not-started';

interface EnrolledCourseMeta {
  id: string;
  course: Record<string, unknown>;
  completion: number;
  modulesDone: number;
  modulesTotal: number;
  lessonsDone: number;
  lessonsTotal: number;
  status: CourseStatus;
}

// EduPulse uses diagonal-gradient banners on its course / subject cards in
// three rotating hues. On TTII tokens these anchor to the brand magenta
// (#8047e1) + accent pink (#ce74e3) family so the gradients stay on-palette
// instead of hardcoding new colours. Cycled by card index for visual rhythm.
const CARD_GRADIENTS = [
  'from-student-primary to-student-accent',
  'from-student-accent to-fuchsia-500',
  'from-violet-600 to-student-primary',
  'from-fuchsia-600 to-student-accent',
] as const;

function gradientFor(index: number): string {
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length] ?? CARD_GRADIENTS[0];
}

// Map a derived course/subject status to its EduPulse-style soft pill. The
// "almost done" / "just started" wording mirrors the reference badges.
function statusBadgeFor(
  status: CourseStatus,
  completion: number,
): { label: string; className: string } {
  if (status === 'completed') {
    return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700' };
  }
  if (status === 'not-started') {
    return { label: 'Not started', className: 'bg-slate-100 text-slate-500' };
  }
  if (completion >= 80) {
    return { label: 'Almost done', className: 'bg-amber-50 text-amber-700' };
  }
  if (completion <= 15) {
    return { label: 'Just started', className: 'bg-sky-50 text-sky-700' };
  }
  return { label: 'In progress', className: 'bg-student-primary/10 text-student-primary' };
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

// Lesson-wise courses (structure_type===2) have no subjects — their lessons
// hang directly off the course (Naji 2026-06-23). A missing/other value is
// treated as the existing subject-wise behaviour (type 1). loadLearning tags
// such courses' lessons with a single synthetic "__direct__<courseId>" subject
// so the snapshot shape stays valid; the UI branches on this flag to render
// lessons directly with no subject accordion.
function isLessonWiseCourse(course: Record<string, unknown> | null | undefined): boolean {
  return asNumber(course?.structure_type) === 2;
}

/**
 * Normalized non-enrolled course used by the "Recommended" card + its modals.
 * Superset of RecommendedCourse (card), CourseInfo (More Info modal) and
 * EnrollCourse (Enrol modal), so one object feeds all three.
 */
interface CatalogCourse {
  id: string;
  title: string;
  code: string;
  duration: string;
  subjectCount: number;
  lessonCount: number;
  price: number;
  offerPrice: number;
  description: string;
  tags: string[];
}

function toCatalogCourse(course: Record<string, unknown>): CatalogCourse {
  return {
    id: asString(course.id),
    title: asString(course.title) || 'Untitled Course',
    code: asString(course.code) || asString(course.course_code),
    duration: asString(course.duration),
    subjectCount: asNumber(course.subject_count),
    lessonCount: asNumber(course.lessons_count),
    price: asNumber(course.price),
    offerPrice: asNumber(course.offer_price),
    description: asString(course.description),
    tags: Array.isArray(course.tags) ? (course.tags as unknown[]).map((t) => asString(t)).filter((t) => t !== '') : [],
  };
}

export default function StudentLearningPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadLearning(session.token),
    [api, session.token],
    `student:learning:${session.userId}`,
  );

  // View state. Three surfaces, mirroring EduPulse's separate routes:
  //   activeCourseId === null            → My Courses list (§2)
  //   activeCourseId set, !playerOpen    → My Course detail / subjects grid (§3)
  //   activeCourseId set, playerOpen     → Lesson player, 3-column (§4)
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);
  // Naji 2026-05-04: only one subject can be expanded at a time. Tracks
  // the open subject id; null means everything collapsed.
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  // LEFT-pane tab in detail view: timeline tree vs live classes list.
  const [leftTab, setLeftTab] = useState<'timeline' | 'live'>('timeline');
  const [liveClasses, setLiveClasses] = useState<Record<string, unknown>[]>([]);
  const [liveClassesLoading, setLiveClassesLoading] = useState(false);
  // List view: EduPulse-style status filter for the enrolled-course grid.
  const [courseFilter, setCourseFilter] = useState<'all' | 'in-progress' | 'completed' | 'not-started'>('all');
  // List view: free-text search across enrolled course titles (EduPulse §2).
  const [courseSearch, setCourseSearch] = useState('');
  // Recommended-card modals for non-enrolled ("All Other") courses.
  const [enrollCourse, setEnrollCourse] = useState<CatalogCourse | null>(null);

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

  // Per-course metadata for the list-view enrolled grid (EduPulse Courses
  // layout). Same completion math the enrolled card map already uses:
  // average the lessons' completed_percentage across the course's subjects.
  const enrolledCoursesMeta = useMemo<EnrolledCourseMeta[]>(() => {
    return enrolledCourses.map((course) => {
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
      const modulesDone = courseSubjects.filter((s) => {
        const sid = asString(s.id);
        const sl = courseLessons.filter((l) => asString(l.subject_id) === sid);
        if (sl.length === 0) return false;
        return sl.every((l) => asNumber(l.completed_percentage) >= 100);
      }).length;
      const lessonsDone = courseLessons.filter(
        (l) => asNumber(l.completed_percentage) >= 100,
      ).length;
      const status: CourseStatus =
        completion >= 100 ? 'completed' : completion <= 0 ? 'not-started' : 'in-progress';
      return {
        id,
        course,
        completion,
        modulesDone,
        modulesTotal: courseSubjects.length,
        lessonsDone,
        lessonsTotal: courseLessons.length,
        status,
      };
    });
  }, [enrolledCourses, subjects, lessons]);

  const statusCounts = useMemo(() => {
    return enrolledCoursesMeta.reduce(
      (acc, meta) => {
        acc[meta.status] += 1;
        return acc;
      },
      { 'in-progress': 0, completed: 0, 'not-started': 0 } as Record<CourseStatus, number>,
    );
  }, [enrolledCoursesMeta]);

  const filteredEnrolledMeta = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    return enrolledCoursesMeta.filter((meta) => {
      if (courseFilter !== 'all' && meta.status !== courseFilter) return false;
      if (query && !asString(meta.course.title).toLowerCase().includes(query)) return false;
      return true;
    });
  }, [enrolledCoursesMeta, courseFilter, courseSearch]);

  const handleSelectFile = (file: Record<string, unknown>) => {
    const resolved = resolveSelectedContent(file);
    if (resolved) setSelectedContent(resolved);
  };

  // Resume Learning deep-link (Naji 2026-06-05): the dashboard stashes a resume
  // target in sessionStorage then routes here; once data is loaded we open that
  // course and jump straight into the requested lesson file — or the course's
  // next not-completed lesson when only a course is given. Consumed once.
  useEffect(() => {
    if (!data) return;
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem('ttii.student.resume');
      if (raw) window.sessionStorage.removeItem('ttii.student.resume');
    } catch {
      raw = null;
    }
    if (!raw) return;
    let parsed: { courseId?: string; lessonFileId?: string };
    try {
      parsed = JSON.parse(raw) as { courseId?: string; lessonFileId?: string };
    } catch {
      return;
    }
    const courseId = asString(parsed.courseId);
    if (!courseId) return;

    let file: Record<string, unknown> | null = null;
    const wantFileId = asString(parsed.lessonFileId);
    if (wantFileId) {
      file = lessonFiles.find((f) => asString(f.id) === wantFileId) ?? null;
    }
    if (!file) {
      const courseSubjects = subjects.filter((s) => asString(s.course_id) === courseId);
      const courseLessons = lessons.filter((l) =>
        courseSubjects.some((s) => asString(s.id) === asString(l.subject_id)),
      );
      const upNext = courseLessons.find(
        (l) => asNumber(l.completed_percentage) < 100 && !isLocked(l),
      );
      if (upNext) {
        file = lessonFiles.find((f) => asString(f.lesson_id) === asString(upNext.id)) ?? null;
      }
    }

    setActiveCourseId(courseId);
    if (file) {
      const lesson = lessons.find((l) => asString(l.id) === asString(file?.lesson_id));
      const resolved = resolveSelectedContent(file);
      if (resolved) {
        setPlayerOpen(true);
        setExpandedSubjectId(lesson ? asString(lesson.subject_id) : null);
        setSelectedContent(resolved);
      }
    }
    document.getElementById('main-content')?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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
    setPlayerOpen(false);
    setSelectedContent(null);
    setExpandedSubjectId(null);
    setLeftTab('timeline');
    document.getElementById('main-content')?.scrollTo({ top: 0 });
  };

  const handleBackToList = () => {
    setActiveCourseId(null);
    setPlayerOpen(false);
    setSelectedContent(null);
    setLeftTab('timeline');
  };

  // From the subjects grid (§3) into the lesson player (§4). Expands the
  // chosen subject in the tree and, if it has a playable first file, opens
  // it immediately so the player isn't blank.
  const handleOpenSubject = (subjectId: string) => {
    setPlayerOpen(true);
    setLeftTab('timeline');
    setExpandedSubjectId(subjectId);
    const firstPlayable = lessons
      .filter((l) => asString(l.subject_id) === subjectId)
      .flatMap((l) => lessonFiles.filter((f) => asString(f.lesson_id) === asString(l.id)))
      .find((f) => !isLocked(f) && resolveSelectedContent(f) !== null);
    if (firstPlayable) {
      const resolved = resolveSelectedContent(firstPlayable);
      if (resolved) setSelectedContent(resolved);
    } else {
      setSelectedContent(null);
    }
    document.getElementById('main-content')?.scrollTo({ top: 0 });
  };

  // Back from the lesson player to the subjects grid (§3).
  const handleBackToSubjects = () => {
    setPlayerOpen(false);
    setSelectedContent(null);
    document.getElementById('main-content')?.scrollTo({ top: 0 });
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
    // Lesson-wise (structure_type===2): lessons render directly under the
    // course with no subject layer. courseSubjects then holds only the single
    // synthetic grouping (id "__direct__<id>"), which we never surface as a
    // subject card/node — we render its lessons straight away.
    const lessonWise = isLessonWiseCourse(course);
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
    // A "module" is a subject. Complete = every lesson done.
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

    // "View live classes" shortcut from the subjects grid header: open the
    // lesson player and flip its left rail to the Live Classes tab.
    const handleOpenSubjectLive = () => {
      const firstSubjectId = asString(courseSubjects[0]?.id);
      setPlayerOpen(true);
      setSelectedContent(null);
      setExpandedSubjectId(firstSubjectId || null);
      setLeftTab('live');
      document.getElementById('main-content')?.scrollTo({ top: 0 });
    };

    // Lesson-wise (§3): clicking a lesson card opens the player straight into
    // that lesson's first playable file. No subject layer to expand, so the
    // tree is driven purely by lessons (expandedSubjectId stays null).
    const handleOpenLesson = (lessonId: string) => {
      setPlayerOpen(true);
      setLeftTab('timeline');
      setExpandedSubjectId(null);
      const firstPlayable = lessonFiles
        .filter((f) => asString(f.lesson_id) === lessonId)
        .find((f) => !isLocked(f) && resolveSelectedContent(f) !== null);
      if (firstPlayable) {
        const resolved = resolveSelectedContent(firstPlayable);
        setSelectedContent(resolved ?? null);
      } else {
        setSelectedContent(null);
      }
      document.getElementById('main-content')?.scrollTo({ top: 0 });
    };

    const courseDuration = asString(course.duration);
    const liveClassCount = liveClasses.length;
    // Total quizzes across the course (distinct quiz lesson_files).
    const totalQuizzes = lessonFiles.filter((f) => {
      const lessonId = asString(f.lesson_id);
      const lesson = courseLessons.find((l) => asString(l.id) === lessonId);
      return Boolean(lesson) && pickFileType(f) === 'quiz';
    }).length;
    const courseStatus: CourseStatus =
      courseCompletion >= 100 ? 'completed' : courseCompletion <= 0 ? 'not-started' : 'in-progress';
    const courseStatusBadge = statusBadgeFor(courseStatus, courseCompletion);

    // ── Lesson player (§4) — 3-column. Rendered when a subject has been
    //    opened from the subjects grid. Kept in a sibling render below so
    //    the data prep above is shared.
    if (playerOpen) {
      return (
        <LessonPlayerView
          course={course}
          lessonWise={lessonWise}
          courseSubjects={courseSubjects}
          courseLessons={courseLessons}
          allLessons={lessons}
          lessonFiles={lessonFiles}
          courseCompletion={courseCompletion}
          completedLessons={completedLessons}
          totalLessons={courseLessons.length}
          streakCurrent={data?.streakCurrent ?? 0}
          liveClasses={liveClasses}
          liveClassesLoading={liveClassesLoading}
          leftTab={leftTab}
          onLeftTab={setLeftTab}
          liveClassCount={liveClassCount}
          selectedContent={selectedContent}
          expandedSubjectId={expandedSubjectId}
          onToggleSubject={(subjectId) =>
            setExpandedSubjectId((cur) => (cur === subjectId ? null : subjectId))
          }
          activeFileId={selectedContent?.id ?? null}
          onSelectFile={handleSelectFile}
          onClearContent={() => setSelectedContent(null)}
          onPlayRecording={handlePlayRecording}
          upNextLesson={upNextLesson}
          onStartUpNext={handleStartUpNext}
          onBack={handleBackToSubjects}
          api={api}
          authToken={session.token}
        />
      );
    }

    // ── My Course detail / subjects grid (§3) ──────────────────────
    return (
      <div className="space-y-4">
        {/* Hero banner (§3) — brand-gradient with course title, a quick
            subjects · lessons · status line, and a circular progress ring. */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-student-primary via-student-primary to-student-accent p-6 text-white shadow-lg">
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
              <p className="mt-2 text-sm text-white/80">
                {lessonWise ? null : (
                  <>
                    {courseSubjects.length} subject{courseSubjects.length === 1 ? '' : 's'} &middot;{' '}
                  </>
                )}
                {courseLessons.length} lesson{courseLessons.length === 1 ? '' : 's'} &middot; Status:{' '}
                {courseStatusBadge.label}
              </p>
            </div>
            <CourseProgressRing percentage={courseCompletion} />
          </div>
        </div>

        {/* Stats strip (§3) — Subjects / Lessons / Quizzes / Live / Status,
            each iconed, followed by an Overall Course Progress bar. We omit
            an "Assignments" stat here because loadLearning doesn't fetch
            assignment data — the dedicated Assignments page owns that. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <DetailStat
              icon={Layers}
              tint="bg-student-primary/10 text-student-primary"
              label={lessonWise ? 'Lessons' : 'Subjects'}
              value={
                lessonWise
                  ? String(courseLessons.length)
                  : `${completedSubjects}/${courseSubjects.length}`
              }
            />
            <DetailStat
              icon={BookOpen}
              tint="bg-sky-50 text-sky-600"
              label={lessonWise ? 'Completed' : 'Lessons'}
              value={`${completedLessons}/${courseLessons.length}`}
            />
            <DetailStat
              icon={FileQuestion}
              tint="bg-fuchsia-50 text-fuchsia-600"
              label="Quizzes"
              value={String(totalQuizzes)}
            />
            <DetailStat
              icon={Radio}
              tint="bg-amber-50 text-amber-600"
              label="Live Classes"
              value={String(liveClassCount)}
            />
            <DetailStat
              icon={BarChart3}
              tint={
                courseStatus === 'completed'
                  ? 'bg-emerald-50 text-emerald-600'
                  : courseStatus === 'not-started'
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-student-primary/10 text-student-primary'
              }
              label="Status"
              value={courseStatusBadge.label}
            />
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-student-text">Overall Course Progress</span>
              <span className="text-base font-bold text-student-primary">{courseCompletion}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-all duration-500"
                style={{ width: `${Math.min(courseCompletion, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Final Examination banner — only shown if a final quiz exists. */}
        {finalExamFile ? (
          <div className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/25">
                <FileQuestion aria-hidden="true" className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-snug">Final Examination</p>
                <p className="mt-0.5 text-xs text-white/85">Test everything you've learned in this course.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartFinalExam}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-white"
            >
              Take Final Exam
            </button>
          </div>
        ) : null}

        {/* Subjects / Lessons grid (§3) — gradient-banner cards. Lesson-wise
            courses (structure_type===2) have no subject layer, so we render
            their lessons directly here instead of subject cards. */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-student-text">{lessonWise ? 'Lessons' : 'Subjects'}</h2>
            {liveClassCount > 0 ? (
              <button
                type="button"
                onClick={() => handleOpenSubjectLive()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-student-primary transition-colors hover:text-student-primary/80"
              >
                <Radio aria-hidden="true" className="size-4" />
                View live classes
              </button>
            ) : null}
          </div>

          {lessonWise ? (
            courseLessons.length === 0 ? (
              <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <BookOpen aria-hidden="true" className="mx-auto mb-3 size-10 text-slate-300" />
                <p className="text-sm text-student-muted">No lessons in this course yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {courseLessons.map((lesson, idx) => {
                  const lessonId = asString(lesson.id);
                  const lessonQuizzes = lessonFiles.filter((f) => {
                    return asString(f.lesson_id) === lessonId && pickFileType(f) === 'quiz';
                  }).length;
                  return (
                    <LessonCard
                      key={lessonId}
                      index={idx}
                      lesson={lesson}
                      quizCount={lessonQuizzes}
                      onContinue={() => handleOpenLesson(lessonId)}
                    />
                  );
                })}
              </div>
            )
          ) : courseSubjects.length === 0 ? (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <Layers aria-hidden="true" className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm text-student-muted">No subjects in this course yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {courseSubjects.map((subject, idx) => {
                const subjectId = asString(subject.id);
                const subjectLessons = courseLessons.filter(
                  (l) => asString(l.subject_id) === subjectId,
                );
                const subjectQuizzes = lessonFiles.filter((f) => {
                  const lessonId = asString(f.lesson_id);
                  return (
                    subjectLessons.some((l) => asString(l.id) === lessonId) &&
                    pickFileType(f) === 'quiz'
                  );
                }).length;
                return (
                  <SubjectCard
                    key={subjectId}
                    index={idx}
                    subject={subject}
                    lessons={subjectLessons}
                    quizCount={subjectQuizzes}
                    onContinue={() => handleOpenSubject(subjectId)}
                  />
                );
              })}
            </div>
          )}
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
            {enrolledCourses.length} enrolled &middot; {statusCounts['in-progress']} in progress &middot;{' '}
            {statusCounts.completed} completed
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

      {/* Enrolled — EduPulse "Courses" layout (§2): a search bar + status
          filter pills above a responsive grid of gradient-banner course
          cards. Same per-course math as before, lifted into
          enrolledCoursesMeta. */}
      {enrolledCourses.length > 0 ? (
        <div className="space-y-4">
          {/* Search + status filter pills */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search your courses…"
                aria-label="Search your courses"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-student-text placeholder:text-slate-400 focus:border-student-primary focus:outline-none focus:ring-2 focus:ring-student-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'All', count: enrolledCoursesMeta.length },
                { key: 'in-progress', label: 'In progress', count: statusCounts['in-progress'] },
                { key: 'completed', label: 'Completed', count: statusCounts.completed },
                { key: 'not-started', label: 'Not started', count: statusCounts['not-started'] },
              ] as const).map((pill) => {
                const active = courseFilter === pill.key;
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setCourseFilter(pill.key)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-student-primary text-white'
                        : 'border border-slate-200 bg-white text-student-muted hover:bg-slate-50'
                    }`}
                  >
                    {pill.label}
                    <span
                      className={`rounded-full px-1.5 text-[11px] font-semibold ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Course grid — gradient-banner cards (EduPulse §2). */}
          {filteredEnrolledMeta.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredEnrolledMeta.map((meta, idx) => (
                <EnrolledCourseCard
                  key={meta.id}
                  index={idx}
                  course={meta.course}
                  lessonsDone={meta.lessonsDone}
                  lessonsTotal={meta.lessonsTotal}
                  completion={meta.completion}
                  status={meta.status}
                  onContinue={() => handleOpenCourse(meta.id)}
                />
              ))}
            </div>
          ) : (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-student-muted">
                {courseSearch.trim()
                  ? `No courses match “${courseSearch.trim()}”.`
                  : 'No courses in this filter.'}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Recommended / available courses — EduPulse recommended-card design
          (gradient header, price, tags, More Info + Enrol), matching the
          dashboard. More Info opens the course detail modal; Enrol opens the
          learning-path request modal. */}
      {otherCourses.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Recommended Courses</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {otherCourses.map((course) => {
              const cat = toCatalogCourse(course);
              return (
                <RecommendedCourseCard
                  key={cat.id}
                  course={cat}
                  onMore={() => onNavigate(`/student/course-detail?courseId=${cat.id}`)}
                  onEnroll={() => setEnrollCourse(cat)}
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

      {/* Enrol → "Choose your learning path" request modal (no self-enrol). */}
      <EnrollPathModal
        course={enrollCourse}
        onClose={() => setEnrollCourse(null)}
        onRequestEnrol={async (courseId) => {
          const res = await api.requestEnrolment(session.token, courseId);
          if (res.status !== 1) throw new Error(res.message || 'Could not send your request.');
        }}
      />

    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────── */

// EduPulse §2 course card — gradient banner with a status badge + book
// icon, then title, course label, x/y lessons + duration, a progress bar,
// and a Continue + message-icon footer. No instructor name exists on the
// course row, so we surface the course `label` (e.g. "B.Ed") when present
// and omit it otherwise — no fabricated trainer.
function EnrolledCourseCard({
  index,
  course,
  lessonsDone,
  lessonsTotal,
  completion,
  status,
  onContinue,
}: {
  index: number;
  course: Record<string, unknown>;
  lessonsDone: number;
  lessonsTotal: number;
  completion: number;
  status: CourseStatus;
  onContinue: () => void;
}) {
  const title = asString(course.title) || 'Untitled Course';
  const label = asString(course.label);
  const durationStr = asString(course.duration);
  const badge = statusBadgeFor(status, completion);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Gradient banner */}
      <div className={`relative flex h-28 items-end bg-gradient-to-br ${gradientFor(index)} p-4`}>
        <span className={`absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}>
          {badge.label}
        </span>
        <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
          <BookOpen aria-hidden="true" className="size-6" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-student-text">{title}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-student-muted">
          <GraduationCap aria-hidden="true" className="size-3.5 shrink-0" />
          {label || 'TTII Certified'}
        </p>

        {/* Lessons + duration meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-student-muted">
          <span className="inline-flex items-center gap-1">
            <ListChecks aria-hidden="true" className="size-3.5" />
            {lessonsDone}/{lessonsTotal} lessons
          </span>
          {durationStr ? (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3.5" />
              {durationStr}
            </span>
          ) : null}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-student-muted">Progress</span>
            <span className="font-bold text-student-primary">{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-all duration-500"
              style={{ width: `${Math.min(completion, 100)}%` }}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-student-primary text-sm font-semibold text-white transition-colors hover:bg-student-primary/90"
          >
            <PlayCircle aria-hidden="true" className="size-4" />
            {status === 'completed' ? 'Review' : status === 'not-started' ? 'Start' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={onContinue}
            aria-label="Open course discussion"
            title="Open course"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-student-muted transition-colors hover:bg-slate-50 hover:text-student-primary"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

// Circular progress indicator shown in the course detail hero banner.
// Naji 2026-05-07 — visual reskin of the course summary strip.
// 2026-05-27 — rebuilt on Apache ECharts (gauge series). The hero sits on TTII
// purple so the ring is white-on-translucent; the percentage label is layered
// on top of the gauge via an absolutely-positioned overlay (ECharts'
// `detail.color: 'white'` works, but the smaller "Complete" caption is HTML).
function CourseProgressRing({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const option = useMemo<EChartsOption>(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '90%',
        min: 0,
        max: 100,
        progress: {
          show: true,
          width: 5,
          roundCap: true,
          itemStyle: { color: '#ffffff' },
        },
        axisLine: { lineStyle: { width: 5, color: [[1, 'rgba(255,255,255,0.18)']] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        detail: { show: false },
        data: [{ value: clamped }],
      },
    ],
    animationDuration: 600,
  }), [clamped]);

  return (
    <div className="relative flex size-20 shrink-0 items-center justify-center sm:size-24">
      <EChart option={option} className="size-full" ariaLabel={`Course complete: ${clamped}%`} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white sm:text-xl">{clamped}%</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-white/75">Complete</span>
      </div>
    </div>
  );
}

// Single iconed metric in the course-detail stats strip (§3). Icon chip on
// top, big value, small label — the EduPulse stat tile.
function DetailStat({
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
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`flex size-10 items-center justify-center rounded-xl ${tint}`}>
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div>
        <p className="text-base font-bold leading-tight text-student-text">{value}</p>
        <p className="text-[11px] font-medium text-student-muted">{label}</p>
      </div>
    </div>
  );
}

// EduPulse §3 subject card — gradient banner + status badge + layers icon,
// then subject title, a Lessons / Quizzes / Progress metric row, and a
// Continue Learning CTA into the lesson player. Subject rows carry no
// instructor / code / assignment count, so those are intentionally omitted
// rather than faked.
function SubjectCard({
  index,
  subject,
  lessons,
  quizCount,
  onContinue,
}: {
  index: number;
  subject: Record<string, unknown>;
  lessons: Record<string, unknown>[];
  quizCount: number;
  onContinue: () => void;
}) {
  const title = asString(subject.title) || `Subject ${index + 1}`;
  const lessonsDone = lessons.filter((l) => asNumber(l.completed_percentage) >= 100).length;
  const lessonsTotal = lessons.length;
  // Prefer the backend-computed progress; fall back to averaging the
  // course-lesson completion when the subject row lacks it.
  const progress = (() => {
    const fromSubject = asNumber(subject.progress);
    if (fromSubject > 0) return Math.min(100, Math.round(fromSubject));
    if (lessonsTotal === 0) return 0;
    return Math.round(
      lessons.reduce((sum, l) => sum + asNumber(l.completed_percentage), 0) / lessonsTotal,
    );
  })();
  const locked = isLocked(subject) || asBoolean(subject.is_locked);
  const status: CourseStatus =
    progress >= 100 ? 'completed' : progress <= 0 ? 'not-started' : 'in-progress';
  const badge = statusBadgeFor(status, progress);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`relative flex h-24 items-end bg-gradient-to-br ${gradientFor(index)} p-4`}>
        <span className={`absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}>
          {badge.label}
        </span>
        <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
          <Layers aria-hidden="true" className="size-5" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-student-text">{title}</h3>

        {/* Metric row */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-sm font-bold text-student-text">{lessonsDone}/{lessonsTotal}</p>
            <p className="text-[10px] font-medium text-student-muted">Lessons</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-sm font-bold text-student-text">{quizCount}</p>
            <p className="text-[10px] font-medium text-student-muted">Quizzes</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-sm font-bold text-student-primary">{progress}%</p>
            <p className="text-[10px] font-medium text-student-muted">Progress</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={locked}
          className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-student-primary text-sm font-semibold text-white transition-colors hover:bg-student-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          title={locked ? 'Locked — not yet available' : ''}
        >
          {locked ? (
            <>
              <Lock aria-hidden="true" className="size-4" />
              Locked
            </>
          ) : (
            <>
              <PlayCircle aria-hidden="true" className="size-4" />
              Continue Learning
            </>
          )}
        </button>
      </div>
    </article>
  );
}

// Lesson-wise (§3) card — the lesson equivalent of SubjectCard. Lesson-wise
// courses have no subject layer, so the §3 grid lists lessons directly. Uses
// the lesson's own completed_percentage for progress and a Quizzes / Progress
// metric row. Mirrors SubjectCard's visual language for consistency.
function LessonCard({
  index,
  lesson,
  quizCount,
  onContinue,
}: {
  index: number;
  lesson: Record<string, unknown>;
  quizCount: number;
  onContinue: () => void;
}) {
  const title = asString(lesson.title) || `Lesson ${index + 1}`;
  const progress = Math.min(100, Math.round(asNumber(lesson.completed_percentage)));
  const locked = isLocked(lesson) || asBoolean(lesson.is_locked);
  const status: CourseStatus =
    progress >= 100 ? 'completed' : progress <= 0 ? 'not-started' : 'in-progress';
  const badge = statusBadgeFor(status, progress);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`relative flex h-24 items-end bg-gradient-to-br ${gradientFor(index)} p-4`}>
        <span className={`absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}>
          {badge.label}
        </span>
        <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
          <BookOpen aria-hidden="true" className="size-5" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-student-text">{title}</h3>

        {/* Metric row */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-sm font-bold text-student-text">{quizCount}</p>
            <p className="text-[10px] font-medium text-student-muted">Quizzes</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-sm font-bold text-student-primary">{progress}%</p>
            <p className="text-[10px] font-medium text-student-muted">Progress</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={locked}
          className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-student-primary text-sm font-semibold text-white transition-colors hover:bg-student-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          title={locked ? 'Locked — complete the previous lesson first' : ''}
        >
          {locked ? (
            <>
              <Lock aria-hidden="true" className="size-4" />
              Locked
            </>
          ) : (
            <>
              <PlayCircle aria-hidden="true" className="size-4" />
              Continue Learning
            </>
          )}
        </button>
      </div>
    </article>
  );
}

// EduPulse §4 — the 3-column Lesson Player. Left = collapsible module/lesson
// tree (the existing SubjectNode, untouched) + Live Classes tab; center =
// the existing ContentPlayer (video / mp4 / audio / pdf / article / native
// quiz — all handlers preserved) plus an honest tab strip; right = a
// course-progress ring, an Upcoming live list, and an instructor card.
// CRITICAL: this only restructures layout — playback, quiz, and progress
// handlers come straight through from the page via props.
interface LessonPlayerViewProps {
  course: Record<string, unknown>;
  lessonWise: boolean;
  courseSubjects: Record<string, unknown>[];
  courseLessons: Record<string, unknown>[];
  allLessons: Record<string, unknown>[];
  lessonFiles: Record<string, unknown>[];
  courseCompletion: number;
  completedLessons: number;
  totalLessons: number;
  streakCurrent: number;
  liveClasses: Record<string, unknown>[];
  liveClassesLoading: boolean;
  liveClassCount: number;
  leftTab: 'timeline' | 'live';
  onLeftTab: (tab: 'timeline' | 'live') => void;
  selectedContent: SelectedContent | null;
  expandedSubjectId: string | null;
  onToggleSubject: (subjectId: string) => void;
  activeFileId: string | null;
  onSelectFile: (file: Record<string, unknown>) => void;
  onClearContent: () => void;
  onPlayRecording: (row: Record<string, unknown>) => void;
  upNextLesson: Record<string, unknown> | null;
  onStartUpNext: () => void;
  onBack: () => void;
  api: StudentPortalApi;
  authToken: string;
}

function LessonPlayerView({
  course,
  lessonWise,
  courseSubjects,
  courseLessons,
  allLessons,
  lessonFiles,
  courseCompletion,
  completedLessons,
  totalLessons,
  streakCurrent,
  liveClasses,
  liveClassesLoading,
  liveClassCount,
  leftTab,
  onLeftTab,
  selectedContent,
  expandedSubjectId,
  onToggleSubject,
  activeFileId,
  onSelectFile,
  onClearContent,
  onPlayRecording,
  upNextLesson,
  onStartUpNext,
  onBack,
  api,
  authToken,
}: LessonPlayerViewProps) {
  const [treeFilter, setTreeFilter] = useState('');
  // Lesson-wise courses render LessonNodes directly in the tree (no subject
  // accordion), so the single-open lesson behaviour is tracked here instead of
  // inside SubjectNode. null means everything collapsed.
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  // Honest tab strip below the player. Overview is real (the content
  // description, rendered by ContentPlayer). Transcript and Q&A have no
  // backing data yet (see edupulse-design-reference §7) — they render an
  // explicit "not available" state instead of fabricated content.
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'qa'>('overview');

  const courseTitle = asString(course.title) || 'Course';
  const upNextTitle = upNextLesson ? asString(upNextLesson.title) : '';

  const query = treeFilter.trim().toLowerCase();
  const upcomingLive = liveClasses.filter(
    (r) => asString(r.status) === 'upcoming' || asString(r.status) === 'today',
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-medium text-student-primary transition-colors hover:text-student-primary/80"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {lessonWise ? 'Lessons' : 'Subjects'}
          </button>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-300" />
          <span className="truncate font-semibold text-student-text">{courseTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          {upNextTitle ? (
            <span className="hidden max-w-[16rem] items-center gap-1.5 truncate rounded-full bg-student-primary/10 px-3 py-1 text-xs font-medium text-student-primary sm:inline-flex">
              <PlayCircle aria-hidden="true" className="size-3.5 shrink-0" />
              Continue: {upNextTitle}
            </span>
          ) : null}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent"
                style={{ width: `${Math.min(courseCompletion, 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-student-primary">{courseCompletion}%</span>
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(240px,300px)]">
        {/* LEFT — module/lesson tree + Live Classes */}
        <aside className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => onLeftTab('timeline')}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  leftTab === 'timeline'
                    ? 'border-b-2 border-student-primary bg-student-primary/5 text-student-primary'
                    : 'text-student-muted hover:text-student-text'
                }`}
              >
                <BookOpen className="size-3.5" aria-hidden="true" />
                Content
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {completedLessons}/{totalLessons}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onLeftTab('live')}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  leftTab === 'live'
                    ? 'border-b-2 border-student-primary bg-student-primary/5 text-student-primary'
                    : 'text-student-muted hover:text-student-text'
                }`}
              >
                <Radio className="size-3.5" aria-hidden="true" />
                Live
                {liveClassCount > 0 ? (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {liveClassCount}
                  </span>
                ) : null}
              </button>
            </div>

            {leftTab === 'timeline' ? (
              <>
                {/* Overall progress + filter */}
                <div className="space-y-2 border-b border-slate-100 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-student-muted">
                      {courseCompletion}% complete
                    </span>
                    <span className="text-student-muted">
                      {totalLessons - completedLessons} left
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent"
                      style={{ width: `${Math.min(courseCompletion, 100)}%` }}
                    />
                  </div>
                  <div className="relative">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={treeFilter}
                      onChange={(e) => setTreeFilter(e.target.value)}
                      placeholder="Filter lessons…"
                      aria-label="Filter lessons"
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-student-text placeholder:text-slate-400 focus:border-student-primary focus:outline-none focus:ring-2 focus:ring-student-primary/20"
                    />
                  </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-2">
                  {lessonWise ? (
                    // Lesson-wise: lessons render directly under the course, no
                    // subject accordion. expandedSubjectId is bypassed entirely.
                    courseLessons.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-student-muted">
                        No lessons in this course yet.
                      </p>
                    ) : (
                      courseLessons.map((lesson) => {
                        const lessonId = asString(lesson.id);
                        if (query && !asString(lesson.title).toLowerCase().includes(query)) {
                          return null;
                        }
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
                            expanded={expandedLessonId === lessonId || query !== ''}
                            onToggle={() =>
                              setExpandedLessonId((cur) => (cur === lessonId ? null : lessonId))
                            }
                          />
                        );
                      })
                    )
                  ) : courseSubjects.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-student-muted">
                      No modules in this course yet.
                    </p>
                  ) : (
                    courseSubjects.map((subject) => {
                      const subjectId = asString(subject.id);
                      const subjectLessons = allLessons.filter(
                        (l) => asString(l.subject_id) === subjectId,
                      );
                      // Honour the filter: keep a subject if its title or any
                      // of its lesson titles match the query.
                      if (query) {
                        const subjectMatch = asString(subject.title)
                          .toLowerCase()
                          .includes(query);
                        const lessonMatch = subjectLessons.some((l) =>
                          asString(l.title).toLowerCase().includes(query),
                        );
                        if (!subjectMatch && !lessonMatch) return null;
                      }
                      return (
                        <SubjectNode
                          key={subjectId}
                          subject={subject}
                          lessons={subjectLessons}
                          lessonFiles={lessonFiles}
                          activeFileId={activeFileId}
                          onSelectFile={onSelectFile}
                          expanded={expandedSubjectId === subjectId || query !== ''}
                          onToggle={() => onToggleSubject(subjectId)}
                        />
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto p-2">
                <LiveClassesPanel
                  rows={liveClasses}
                  loading={liveClassesLoading}
                  onPlayRecording={onPlayRecording}
                />
              </div>
            )}
          </div>
        </aside>

        {/* CENTER — player + tabbed area */}
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {selectedContent ? (
              <ContentPlayer
                content={selectedContent}
                onClose={onClearContent}
                api={api}
                authToken={authToken}
              />
            ) : (
              <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-student-primary/10">
                  <PlayCircle aria-hidden="true" className="size-9 text-student-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-student-text">Ready to Learn?</p>
                  <p className="mt-1 max-w-xs text-sm text-student-muted">
                    Pick a lesson from the left to start watching videos, reading materials, or taking quizzes.
                  </p>
                </div>
                {upNextLesson ? (
                  <button
                    type="button"
                    onClick={onStartUpNext}
                    className="inline-flex items-center gap-2 rounded-xl bg-student-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-student-primary/90"
                  >
                    <PlayCircle aria-hidden="true" className="size-4" />
                    Continue Learning
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Honest tab strip. Only Overview carries real data; Transcript
              and Q&A have no backing endpoint yet so they say so plainly. */}
          {selectedContent ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex gap-1 border-b border-slate-100 px-2">
                {([
                  { key: 'overview', label: 'Overview' },
                  { key: 'transcript', label: 'Transcript' },
                  { key: 'qa', label: 'Q&A' },
                ] as const).map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      aria-pressed={active}
                      className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'border-student-primary text-student-primary'
                          : 'border-transparent text-student-muted hover:text-student-text'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="p-4">
                {activeTab === 'overview' ? (
                  selectedContent.description ? (
                    selectedContent.type === 'article' ? (
                      <article
                        className="prose prose-sm max-w-none text-sm leading-relaxed text-student-text"
                        dangerouslySetInnerHTML={{ __html: selectedContent.description }}
                      />
                    ) : (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-student-muted">
                        {stripHtml(selectedContent.description)}
                      </p>
                    )
                  ) : (
                    <p className="text-sm italic text-slate-400">
                      No overview provided for this lesson.
                    </p>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <FileText aria-hidden="true" className="size-8 text-slate-300" />
                    <p className="text-sm font-medium text-student-text">
                      {activeTab === 'transcript' ? 'Transcript' : 'Q&A'} not available yet
                    </p>
                    <p className="max-w-xs text-xs text-student-muted">
                      {activeTab === 'transcript'
                        ? 'This lesson does not have a transcript. We will surface one here when it is published.'
                        : 'Discussion and Q&A for this lesson are not enabled yet.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* RIGHT — progress ring + upcoming + instructor */}
        <aside className="space-y-4">
          {/* Course progress */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-student-muted">
              Course Progress
            </p>
            <ProgressRingLight percentage={courseCompletion} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 px-2 py-2">
                <p className="text-sm font-bold text-student-text">
                  {completedLessons}/{totalLessons}
                </p>
                <p className="text-[10px] font-medium text-student-muted">Lessons</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-2">
                <p className="inline-flex items-center justify-center gap-1 text-sm font-bold text-amber-600">
                  <Flame aria-hidden="true" className="size-3.5" />
                  {streakCurrent}
                </p>
                <p className="text-[10px] font-medium text-student-muted">Day streak</p>
              </div>
            </div>
          </div>

          {/* Upcoming live */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-student-muted">
              Upcoming
            </p>
            {upcomingLive.length === 0 ? (
              <p className="text-xs text-student-muted">No upcoming live classes.</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingLive.slice(0, 3).map((row) => (
                  <LiveClassRow
                    key={asString(row.id)}
                    row={row}
                    onPlayRecording={onPlayRecording}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Instructor card — only when the course payload carries one. */}
          <InstructorCard course={course} />
        </aside>
      </div>
    </div>
  );
}

// Light-theme variant of the course progress ring for the white right-rail
// card (the hero ring is white-on-translucent and not reusable here).
function ProgressRingLight({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const option = useMemo<EChartsOption>(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '92%',
        min: 0,
        max: 100,
        progress: { show: true, width: 8, roundCap: true, itemStyle: { color: '#8047e1' } },
        axisLine: { lineStyle: { width: 8, color: [[1, '#ece9fb']] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        detail: { show: false },
        data: [{ value: clamped }],
      },
    ],
    animationDuration: 600,
  }), [clamped]);

  return (
    <div className="relative mx-auto flex size-28 items-center justify-center">
      <EChart option={option} className="size-full" ariaLabel={`Course complete: ${clamped}%`} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-student-text">{clamped}%</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-student-muted">
          Complete
        </span>
      </div>
    </div>
  );
}

// Instructor card for the lesson-player right rail. The legacy course
// payload does not carry an instructor on the list shape, so this renders
// only when an `instructor` object with a name is actually present —
// otherwise it shows an honest "course support" fallback (no fake person).
function InstructorCard({ course }: { course: Record<string, unknown> }) {
  const instructor = asRecord(course.instructor);
  const name = asString(instructor?.name);
  const image = asString(instructor?.image);

  if (!name) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-student-muted">
          Instructor
        </p>
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-student-primary/10 text-student-primary">
            <GraduationCap aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-student-text">TTII Faculty</p>
            <p className="text-xs text-student-muted">Course support</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-student-muted">
        Instructor
      </p>
      <div className="flex items-center gap-3">
        {image ? (
          <img
            src={image}
            alt=""
            className="size-11 shrink-0 rounded-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-student-primary/10 text-student-primary">
            <User aria-hidden="true" className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-student-text">{name}</p>
          <p className="text-xs text-student-muted">TTII Certified</p>
        </div>
      </div>
    </div>
  );
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
            {/* PDFs are view-only (no download) — only articles get the
                open-in-new-tab shortcut. */}
            {content.url && content.type !== 'pdf' ? (
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
            // PDFs are view-only: #toolbar=0&navpanes=0 hides the built-in PDF
            // viewer's download/print toolbar so students can read but not
            // download. (Other embeds pass through unchanged.)
            <iframe
              key={content.id}
              src={
                content.type === 'pdf' && !content.url.includes('#')
                  ? `${content.url}#toolbar=0&navpanes=0&scrollbar=0`
                  : content.url
              }
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

