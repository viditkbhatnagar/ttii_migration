// Counsellor Course detail page (Naji 2026-06-27) — matches the Lovable
// reference (courses.$id.tsx): a gradient hero + stat pills and a 4-tab layout
// (Overview / Offering / Certifications / Course Content). REAL DATA ONLY — the
// Lovable mock's Mode, Eligibility, Prerequisites, Download Brochure and the
// per-combination Course-Fee columns have no backing data, so they are omitted
// rather than faked. Data shapes/extraction mirror StudentCourseDetailPage
// (course meta under `.course`; structure_type 1 = subjects→lessons accordion,
// 2 = flat lesson list) and the page shell mirrors CounsellorViewApplicationPage
// (the counsellor layout already provides the sidebar/topbar).

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  PlayCircle,
  Share2,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { asNumber, asString, formatDate, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

/* ─── Real-data view models (mirrors StudentCourseDetailPage.toMeta) ─── */

interface CourseMeta {
  id: string;
  title: string;
  code: string;
  shortName: string;
  label: string;
  duration: string;
  subjectCount: number;
  lessonCount: number;
  price: number;
  offerPrice: number;
  description: string;
  shortDescription: string;
  tags: string[];
  features: string[];
  whoShouldEnrol: string[];
  // 1 = Subject-wise (modules → lessons accordion); 2 = Lesson-wise (flat list).
  structureType: number;
}

interface ModuleRow {
  id: string;
  title: string;
  lessonCount: number;
}

interface LessonRow {
  id: string;
  title: string;
}

interface LessonState {
  loading: boolean;
  loaded: boolean;
  lessons: LessonRow[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

// `features` from buildCourseData is Array<{ id, title }>; tolerate plain
// strings too. Returns a flat, non-empty string list for the checklist UI.
function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      const rec = asRecord(entry);
      return asString(rec.title) || asString(rec.label) || asString(rec.name);
    })
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function toMeta(raw: Record<string, unknown>, fallbackId: string): CourseMeta {
  const tagsRaw = raw.tags;
  return {
    id: asString(raw.id) || fallbackId,
    title: asString(raw.title) || 'Course',
    code: asString(raw.code) || asString(raw.course_code),
    shortName: asString(raw.short_name),
    label: asString(raw.label),
    duration: asString(raw.duration),
    subjectCount: asNumber(raw.subject_count) || asNumber(raw.subjects),
    lessonCount: asNumber(raw.lessons_count) || asNumber(raw.lessons),
    price: asNumber(raw.price),
    offerPrice: asNumber(raw.offer_price) || asNumber(raw.sale_price),
    description: asString(raw.description),
    shortDescription: asString(raw.short_description),
    tags: Array.isArray(tagsRaw) ? tagsRaw.map((t) => asString(t)).filter((t) => t !== '') : [],
    features: toStringList(raw.features),
    whoShouldEnrol: toStringList(raw.who_should_enrol),
    structureType: asNumber(raw.structure_type) === 2 ? 2 : 1,
  };
}

const fmtInr = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

/* ─── Small presentational helpers ─── */

function StatPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-[var(--shadow-soft)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ChecklistCard({
  icon: Icon,
  title,
  items,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
}) {
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item, idx) => (
            <li key={`${idx}-${item}`} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No data available.</p>
      )}
    </Card>
  );
}

/* ─── Page ─── */

export default function CounsellorCourseDetailPage({ api, session, onNavigate }: CounsellorPageProps) {
  const admin = api.admin;

  // Same id derivation as CounsellorViewApplicationPage — last path segment.
  const courseId = useMemo(() => window.location.pathname.split('/').filter(Boolean).pop() ?? '', []);

  const [meta, setMeta] = useState<CourseMeta | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [directLessons, setDirectLessons] = useState<LessonRow[]>([]);
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);
  const [combinations, setCombinations] = useState<Record<string, unknown>[]>([]);
  const [partners, setPartners] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Curriculum accordion state (subject-wise courses) — same shape as Student.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lessonsBySubject, setLessonsBySubject] = useState<Map<string, LessonState>>(new Map());

  useEffect(() => {
    if (!courseId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // Course detail first so structure_type decides the curriculum loader;
        // the other three lists are independent so fetch them in parallel.
        const [detail, offeringRows, combinationRows, partnerRows] = await Promise.all([
          api.getCourseDetail(session.token, courseId),
          admin.listOfferings(session.token, { course_id: courseId }),
          admin.listCertificateCombinations(session.token, { course_id: courseId, status: 'active' }),
          admin.listCertificationPartners(session.token),
        ]);
        if (cancelled) return;

        const courseRaw = detail ? asRecord(detail.course) : null;
        if (!courseRaw || Object.keys(courseRaw).length === 0) {
          setNotFound(true);
          return;
        }
        const nextMeta = toMeta(courseRaw, courseId);
        setMeta(nextMeta);
        setOfferings(toRecords(offeringRows));
        setCombinations(toRecords(combinationRows));
        setPartners(toRecords(partnerRows));

        if (nextMeta.structureType === 2) {
          const lessons = await api.getCourseLessonsDirect(session.token, courseId);
          if (cancelled) return;
          setDirectLessons(lessons.map((l) => ({ id: asString(l.id), title: asString(l.title) || 'Lesson' })));
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
    return () => {
      cancelled = true;
    };
  }, [api, admin, session.token, courseId]);

  // Lazy-load lessons the first time a module is opened (same as Student page).
  const toggleModule = (subjectId: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
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

  const handleShare = () => {
    const url = window.location.href;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success('Course link copied to clipboard.'))
      .catch(() => toast.error('Could not copy the link.'));
  };

  if (loading) {
    return <DashboardLoader label="course" />;
  }

  if (notFound || !meta) {
    return (
      <Card className="p-10 text-center shadow-[var(--shadow-soft)] border-border/70">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Button variant="outline" className="mt-4 gap-1.5" onClick={() => onNavigate('/counsellor/courses')}>
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </Button>
      </Card>
    );
  }

  const hasOffer = meta.offerPrice > 0 && meta.offerPrice < meta.price;
  const displayPrice = hasOffer ? meta.offerPrice : meta.price;
  const isFree = meta.price <= 0;
  const feeLabel = isFree ? 'Free' : displayPrice > 0 ? fmtInr(displayPrice) : '—';

  const isLessonWise = meta.structureType === 2;
  const lessonStatCount = meta.lessonCount > 0 ? meta.lessonCount : isLessonWise ? directLessons.length : 0;
  const tagline = meta.shortDescription || meta.description;

  // Stat pills — REAL DATA ONLY (Mode + Eligibility omitted: no backing data).
  const stats: Array<{ icon: LucideIcon; label: string; value: string }> = [];
  if (meta.duration) stats.push({ icon: Clock, label: 'Duration', value: meta.duration });
  if (lessonStatCount > 0) stats.push({ icon: FileText, label: 'Lessons', value: String(lessonStatCount) });
  if (!isLessonWise && meta.subjectCount > 0)
    stats.push({ icon: BookOpen, label: 'Subjects', value: String(meta.subjectCount) });
  stats.push({ icon: Calendar, label: 'Active Offerings', value: String(offerings.length) });
  stats.push({ icon: Award, label: 'Combinations', value: String(combinations.length) });
  if (feeLabel !== '—') stats.push({ icon: GraduationCap, label: 'Fee', value: feeLabel });

  return (
    <main className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => onNavigate('/counsellor/courses')}
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Courses
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-medium text-foreground">{meta.title}</span>
      </div>

      {/* Hero */}
      <Card className="overflow-hidden border-border/70 shadow-[var(--shadow-soft)]">
        <div className="relative px-6 py-8 text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/25" />
          <div className="absolute right-4 top-4 z-10">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleShare}
              className="gap-2 border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              {meta.label ? (
                <Badge className="border-white/30 bg-white/20 text-white backdrop-blur">{meta.label}</Badge>
              ) : null}
              {meta.code ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                  <GraduationCap className="h-3.5 w-3.5" /> {meta.code}
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight sm:text-3xl">{meta.title}</h1>
            {tagline ? <p className="mt-1.5 max-w-2xl text-sm text-white/85 line-clamp-2">{tagline}</p> : null}
          </div>
        </div>

        {/* Stat pills */}
        {stats.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 border-t border-border p-5 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <StatPill key={s.label} icon={s.icon} label={s.label} value={s.value} />
            ))}
          </div>
        ) : null}
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="offering">Offering</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="content">Course Content</TabsTrigger>
        </TabsList>

        {/* ── Overview ── (Prerequisites omitted: no backing data) */}
        <TabsContent value="overview" className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70 md:col-span-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <BookOpen className="h-4 w-4 text-primary" /> Course Overview
            </h2>
            {meta.description ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No description available.</p>
            )}
          </Card>

          <ChecklistCard icon={Target} title="Learning Outcome" items={meta.features} />
          <ChecklistCard icon={Users} title="Who Should Enroll" items={meta.whoShouldEnrol} />
        </TabsContent>

        {/* ── Offering ── */}
        <TabsContent value="offering" className="mt-4">
          <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Calendar className="h-4 w-4 text-primary" /> Available Offerings
              </h2>
              <Badge variant="outline">
                {offerings.length} Offering{offerings.length === 1 ? '' : 's'}
              </Badge>
            </div>
            {offerings.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Offering Name</TableHead>
                      <TableHead>Offering Code</TableHead>
                      <TableHead>Enrollment Start</TableHead>
                      <TableHead>Enrollment End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offerings.map((o, idx) => (
                      <TableRow key={asString(o.id) || idx} className="hover:bg-muted/30">
                        <TableCell className="text-sm font-medium">{asString(o.title) || '—'}</TableCell>
                        <TableCell className="text-sm">{asString(o.offering_code) || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(o.enrollment_start) || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(o.enrollment_end) || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No active offerings for this course yet.</p>
            )}
          </Card>
        </TabsContent>

        {/* ── Certifications ── */}
        <TabsContent value="certifications" className="mt-4 space-y-4">
          <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <Award className="h-4 w-4 text-warning" /> Certification Partners
            </h2>
            {partners.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {partners.map((p, idx) => {
                  const name = asString(p.name) || 'Partner';
                  const country = asString(p.country);
                  return (
                    <div
                      key={asString(p.id) || idx}
                      className="rounded-lg border border-border bg-gradient-to-br from-primary-soft/40 to-transparent p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-accent-foreground">
                          <Award className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight">{name}</p>
                          {country ? <p className="text-[11px] text-muted-foreground">{country}</p> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No certification partners listed.</p>
            )}
          </Card>

          <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <Award className="h-4 w-4 text-primary" /> Certificate Combinations
            </h2>
            {combinations.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Combination</TableHead>
                      <TableHead className="text-right">GST %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinations.map((cc, idx) => {
                      const gst = cc.gst_percent;
                      return (
                        <TableRow key={asString(cc.id) || idx}>
                          <TableCell className="font-medium">{asString(cc.combination_code) || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {gst === null || gst === undefined || gst === '' ? '—' : `${asNumber(gst)}%`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No certificate combinations for this course.</p>
            )}
          </Card>
        </TabsContent>

        {/* ── Course Content ── */}
        <TabsContent value="content" className="mt-4">
          <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              {isLessonWise ? <Layers className="h-4 w-4 text-primary" /> : <BookOpen className="h-4 w-4 text-primary" />}
              Course Content
            </h2>

            {/* Lesson-wise (structure_type=2): flat lesson list */}
            {isLessonWise ? (
              directLessons.length > 0 ? (
                <ol className="divide-y divide-border">
                  {directLessons.map((lesson, idx) => (
                    <li key={lesson.id} className="flex items-center gap-3 py-3.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-accent-foreground">
                        {idx + 1}
                      </span>
                      <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{lesson.title}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No lessons listed yet.</p>
              )
            ) : modules.length > 0 ? (
              /* Subject-wise (structure_type=1): subjects → lazy-loaded lessons */
              <div className="divide-y divide-border">
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
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-accent-foreground">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{mod.title}</span>
                          {mod.lessonCount > 0 ? (
                            <span className="block text-xs text-muted-foreground">
                              {mod.lessonCount} lesson{mod.lessonCount === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen ? (
                        <div className="pb-3 pl-10">
                          {ls?.loading ? (
                            <p className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading lessons…
                            </p>
                          ) : ls && ls.lessons.length > 0 ? (
                            <ul className="space-y-1.5">
                              {ls.lessons.map((lesson) => (
                                <li key={lesson.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <PlayCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                                  <span className="min-w-0 truncate">{lesson.title}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="py-1 text-xs text-muted-foreground">No lessons listed yet.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No course content listed yet.</p>
            )}

            {/* Curriculum summary footer (real counts) */}
            {(isLessonWise ? directLessons.length > 0 : modules.length > 0) ? (
              <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-success" />
                {isLessonWise
                  ? `${directLessons.length} lesson${directLessons.length === 1 ? '' : 's'}`
                  : `${modules.length} module${modules.length === 1 ? '' : 's'}${
                      lessonStatCount > 0 ? ` · ${lessonStatCount} lesson${lessonStatCount === 1 ? '' : 's'}` : ''
                    }`}
              </p>
            ) : null}
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
