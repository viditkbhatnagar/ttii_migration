// Full course-detail page (Naji 2026-06-09) — replaces the old "More Info"
// modal with a real page that mirrors the EduPulse course-detail reference
// (ttii.lovable.app/course/...). Per the agreed scope it shows ONLY data the
// backend actually has: gradient hero (title + price), a Duration/Subjects/
// Lessons stat bar, About, Highlights (tags), a real Curriculum accordion
// (modules -> lessons, lessons fetched lazily per subject), and a sticky
// Programme-fee / Enrol sidebar. Sections with no backing data on the reference
// (rating, enrolled, mode, brochure, learning outcomes, who-should-enrol,
// certification) are deliberately omitted rather than faked.

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Clock,
  BookOpen,
  FileText,
  Check,
  UserPlus,
  ChevronDown,
  PlayCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentLoader } from '@/student/components/StudentLoader';
import { EnrollPathModal, type EnrollCourse } from '../../components/EnrollPathModal.js';
import type { StudentPageProps } from '../../routing/student-routes.js';
import { asString, asNumber, formatCurrency } from '../../../admin/shared/utils/admin-data-utils.js';

interface CourseMeta {
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
  // 1 = Subject-wise (modules → lessons accordion); 2 = Lesson-wise
  // (flat lesson list, no subjects). See course.structure_type.
  structureType: number;
}

interface ModuleRow {
  id: string;
  title: string;
  lessonCount: number;
}

interface LessonState {
  loading: boolean;
  loaded: boolean;
  lessons: Array<{ id: string; title: string }>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toMeta(raw: Record<string, unknown>): CourseMeta {
  const tagsRaw = raw.tags;
  return {
    id: asString(raw.id),
    title: asString(raw.title) || 'Course',
    code: asString(raw.code) || asString(raw.course_code),
    duration: asString(raw.duration),
    subjectCount: asNumber(raw.subject_count) || asNumber(raw.subjects),
    lessonCount: asNumber(raw.lessons_count) || asNumber(raw.lessons),
    price: asNumber(raw.price),
    offerPrice: asNumber(raw.offer_price),
    description: asString(raw.description),
    tags: Array.isArray(tagsRaw) ? tagsRaw.map((t) => asString(t)).filter((t) => t !== '') : [],
    structureType: asNumber(raw.structure_type) === 2 ? 2 : 1,
  };
}

export default function StudentCourseDetailPage({ api, session, onNavigate }: StudentPageProps) {
  const courseId = useMemo(() => new URLSearchParams(window.location.search).get('courseId') ?? '', []);
  const [meta, setMeta] = useState<CourseMeta | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  // Lesson-wise (structure_type=2) courses: a flat lesson list, no subjects.
  const [directLessons, setDirectLessons] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lessonsBySubject, setLessonsBySubject] = useState<Map<string, LessonState>>(new Map());
  const [enrollCourse, setEnrollCourse] = useState<EnrollCourse | null>(null);

  useEffect(() => {
    if (!courseId) { setNotFound(true); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // Fetch the course first so structure_type decides how to load the
        // curriculum: subjects→lessons accordion (type 1) vs a flat lesson
        // list straight off the course (type 2).
        const detail = await api.getCourseDetail(session.token, courseId);
        if (cancelled) return;
        const courseRaw = detail ? asRecord(detail.course) : null;
        if (!courseRaw || Object.keys(courseRaw).length === 0) {
          setNotFound(true);
          return;
        }
        const nextMeta = toMeta({ ...courseRaw, id: asString(courseRaw.id) || courseId });
        setMeta(nextMeta);

        if (nextMeta.structureType === 2) {
          const lessons = await api.getCourseLessonsDirect(session.token, courseId);
          if (cancelled) return;
          setDirectLessons(
            lessons.map((l) => ({ id: asString(l.id), title: asString(l.title) || 'Lesson' })),
          );
        } else {
          const subjects = await api.getCourseSubjects(session.token, courseId);
          if (cancelled) return;
          setModules(
            subjects.map((s) => ({
              id: asString(s.id),
              title: asString(s.title) || 'Module',
              lessonCount: asNumber(s.total_lessons),
            })),
          );
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, session.token, courseId]);

  const toggleModule = (subjectId: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
    // Lazy-load lessons the first time a module is opened.
    setLessonsBySubject((cur) => {
      if (cur.has(subjectId)) return cur;
      const next = new Map(cur);
      next.set(subjectId, { loading: true, loaded: false, lessons: [] });
      void api
        .getCourseLessons(session.token, subjectId)
        .then((rows) => {
          setLessonsBySubject((m) => {
            const n = new Map(m);
            n.set(subjectId, {
              loading: false,
              loaded: true,
              lessons: rows.map((r) => ({ id: asString(r.id), title: asString(r.title) || 'Lesson' })),
            });
            return n;
          });
        })
        .catch(() => {
          setLessonsBySubject((m) => {
            const n = new Map(m);
            n.set(subjectId, { loading: false, loaded: true, lessons: [] });
            return n;
          });
        });
      return next;
    });
  };

  if (loading) return <StudentLoader label="Loading course…" />;

  if (notFound || !meta) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm text-student-muted">We couldn’t load this course.</p>
        <Button variant="outline" className="mt-4" onClick={() => onNavigate('/student/courses')}>
          <ArrowLeft aria-hidden="true" className="mr-1.5 size-4" /> Back to courses
        </Button>
      </div>
    );
  }

  const hasOffer = meta.offerPrice > 0 && meta.offerPrice < meta.price;
  const displayPrice = hasOffer ? meta.offerPrice : meta.price;
  const isFree = meta.price <= 0;
  const priceLabel = isFree ? 'Free' : displayPrice > 0 ? formatCurrency(displayPrice) : '—';

  const isLessonWise = meta.structureType === 2;
  // For lesson-wise courses there are no subjects; fall back to the loaded
  // flat-lesson count when the payload doesn't carry a lessons total.
  const lessonStatCount = meta.lessonCount > 0 ? meta.lessonCount : isLessonWise ? directLessons.length : 0;

  const stats: Array<{ icon: LucideIcon; label: string; value: string }> = [];
  const features: string[] = [];
  if (meta.duration) { stats.push({ icon: Clock, label: 'Duration', value: meta.duration }); features.push(meta.duration); }
  if (!isLessonWise && meta.subjectCount > 0) {
    stats.push({ icon: BookOpen, label: 'Subjects', value: String(meta.subjectCount) });
    features.push(`${meta.subjectCount} subject${meta.subjectCount === 1 ? '' : 's'}`);
  }
  if (lessonStatCount > 0) {
    stats.push({ icon: FileText, label: 'Lessons', value: String(lessonStatCount) });
    features.push(`${lessonStatCount} lesson${lessonStatCount === 1 ? '' : 's'}`);
  }

  const openEnrol = () =>
    setEnrollCourse({ id: meta.id, title: meta.title, subjectCount: meta.subjectCount, price: meta.price, offerPrice: meta.offerPrice });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <button
        type="button"
        onClick={() => onNavigate('/student/courses')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-student-muted transition-colors hover:text-student-text"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to courses
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-student-primary to-student-accent px-6 py-10 text-white shadow-sm sm:px-10 sm:py-14">
        {priceLabel !== '—' ? (
          <span className="absolute right-5 top-5 rounded-full bg-white/20 px-3 py-1 text-sm font-bold backdrop-blur">{priceLabel}</span>
        ) : null}
        {meta.tags.length > 0 ? (
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            {meta.tags[0]}
          </span>
        ) : meta.code ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            <GraduationCap aria-hidden="true" className="size-4" /> {meta.code}
          </span>
        ) : null}
        <h1 className="mt-3 max-w-[80%] text-3xl font-bold leading-tight sm:text-4xl">{meta.title}</h1>
      </div>

      {/* Stat bar */}
      {stats.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-student-primary-light text-student-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-student-muted">{s.label}</p>
                  <p className="truncate text-sm font-bold text-student-text">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Body: left content + sticky sidebar */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* About */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-student-text">About this course</h2>
            {meta.description ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{meta.description}</p>
            ) : (
              <p className="mt-2 text-sm text-student-muted">
                Full details for this programme will be shared by our admissions team when you request to enrol.
              </p>
            )}
          </section>

          {/* Highlights (tags) */}
          {meta.tags.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-student-text">Highlights</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-student-primary-light px-3 py-1 text-xs font-semibold text-student-primary">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* Curriculum — lesson-wise (structure_type=2): flat lesson list */}
          {isLessonWise && directLessons.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-student-text">Lessons</h2>
              <p className="mt-0.5 text-sm text-student-muted">
                {directLessons.length} lesson{directLessons.length === 1 ? '' : 's'}
              </p>
              <ol className="mt-4 divide-y divide-slate-100">
                {directLessons.map((lesson, idx) => (
                  <li key={lesson.id} className="flex items-center gap-3 py-3.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-student-primary-light text-xs font-bold text-student-primary">
                      {idx + 1}
                    </span>
                    <PlayCircle aria-hidden="true" className="size-4 shrink-0 text-student-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-student-text">{lesson.title}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Curriculum — subject-wise (structure_type=1): modules → lessons */}
          {!isLessonWise && modules.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-student-text">Curriculum</h2>
              <p className="mt-0.5 text-sm text-student-muted">
                {modules.length} module{modules.length === 1 ? '' : 's'}
                {meta.lessonCount > 0 ? ` · ${meta.lessonCount} lesson${meta.lessonCount === 1 ? '' : 's'}` : ''}
              </p>
              <div className="mt-4 divide-y divide-slate-100">
                {modules.map((mod, idx) => {
                  const isOpen = expanded.has(mod.id);
                  const ls = lessonsBySubject.get(mod.id);
                  return (
                    <div key={mod.id}>
                      <button
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        className="flex w-full items-center gap-3 py-3.5 text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-student-primary-light text-xs font-bold text-student-primary">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-student-text">{mod.title}</span>
                          {mod.lessonCount > 0 ? (
                            <span className="block text-xs text-student-muted">{mod.lessonCount} lesson{mod.lessonCount === 1 ? '' : 's'}</span>
                          ) : null}
                        </span>
                        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen ? (
                        <div className="pb-3 pl-10">
                          {ls?.loading ? (
                            <p className="flex items-center gap-2 py-1 text-xs text-student-muted">
                              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> Loading lessons…
                            </p>
                          ) : ls && ls.lessons.length > 0 ? (
                            <ul className="space-y-1.5">
                              {ls.lessons.map((lesson) => (
                                <li key={lesson.id} className="flex items-center gap-2 text-sm text-slate-600">
                                  <PlayCircle aria-hidden="true" className="size-3.5 shrink-0 text-student-primary" />
                                  <span className="min-w-0 truncate">{lesson.title}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="py-1 text-xs text-student-muted">No lessons listed yet.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        {/* Sticky fee / enrol sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-student-muted">Programme fee</p>
            <p className="mt-1 text-3xl font-bold text-student-text">{priceLabel}</p>
            {hasOffer ? (
              <p className="text-sm text-slate-400 line-through">{formatCurrency(meta.price)}</p>
            ) : !isFree && displayPrice > 0 ? (
              <p className="text-xs text-student-muted">incl. all taxes</p>
            ) : null}

            <Button
              onClick={openEnrol}
              className="mt-4 w-full rounded-xl bg-gradient-to-br from-student-primary to-student-accent text-white shadow-sm hover:opacity-95"
            >
              <UserPlus aria-hidden="true" className="mr-2 size-4" /> Enrol Now
            </Button>

            {features.length > 0 ? (
              <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-sm text-slate-600">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check aria-hidden="true" className="size-4 shrink-0 text-student-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>
      </div>

      <EnrollPathModal
        course={enrollCourse}
        onClose={() => setEnrollCourse(null)}
        onRequestEnrol={async (cid) => {
          const res = await api.requestEnrolment(session.token, cid);
          if (res.status !== 1) throw new Error(res.message || 'Could not send your request.');
        }}
      />
    </div>
  );
}
