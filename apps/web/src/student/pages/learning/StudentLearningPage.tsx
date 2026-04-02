import { useMemo } from 'react';
import { BookOpen, Flame, Lock, FileText, Video, FileQuestion, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  title: string;
  totalLessons: number;
  completedLessons: number;
  averageCompletion: number;
}

function computeSubjectProgress(
  subjects: Record<string, unknown>[],
  lessons: Record<string, unknown>[],
): SubjectProgress[] {
  const subjectMap = new Map<string, { title: string; completions: number[]; total: number; completed: number }>();

  for (const subject of subjects) {
    const id = asString(subject.id);
    subjectMap.set(id, {
      title: asString(subject.title) || `Subject ${id}`,
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">My Courses</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Courses', value: courses.length, icon: BookOpen, gradient: 'from-blue-500 to-blue-600', iconColor: 'text-blue-100' },
          { label: 'Subjects', value: subjects.length, icon: FileText, gradient: 'from-purple-500 to-purple-600', iconColor: 'text-purple-100' },
          { label: 'Lessons', value: lessons.length, icon: BookOpen, gradient: 'from-emerald-500 to-emerald-600', iconColor: 'text-emerald-100' },
          { label: 'Overall Progress', value: `${overallCompletion}%`, icon: BarChart3, gradient: 'from-student-primary to-blue-700', iconColor: 'text-blue-100' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-md`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium text-white/80">{stat.label}</p>
                </div>
                <div className="rounded-xl bg-white/20 p-3">
                  <Icon className={`size-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Course Progress Bar */}
      {courses.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-blue-50 via-blue-50/80 to-indigo-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">
                {asString(courses[0]?.title) || 'Course Progress'}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">{overallCompletion}% complete</p>
            </div>
            <span className="text-3xl font-bold text-student-primary">{overallCompletion}%</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(overallCompletion, 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Subject Progress — Accordion */}
      {subjectProgress.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Subjects</h2>
          <Accordion type="multiple" className="space-y-3">
            {subjectProgress.map((sp, index) => {
              const subjectLessons = lessons.filter((l) => asString(l.subject_id) === sp.id);
              const subjectFiles = lessonFiles.filter((f) => {
                const lessonId = asString(f.lesson_id);
                return subjectLessons.some((l) => asString(l.id) === lessonId);
              });

              return (
                <AccordionItem
                  key={sp.id}
                  value={sp.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden data-[state=open]:border-2 data-[state=open]:border-blue-200 data-[state=open]:bg-blue-50/30"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        sp.averageCompletion === 100
                          ? 'bg-green-100 text-green-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {sp.averageCompletion === 100 ? (
                          <CheckCircle className="size-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-800">{sp.title}</p>
                        <p className="text-xs text-slate-500">
                          {sp.completedLessons}/{sp.totalLessons} lessons &middot; {sp.averageCompletion}% complete
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                          style={{ width: `${Math.min(sp.averageCompletion, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="rounded-xl bg-white border border-slate-100 p-3 text-center">
                        <p className="text-lg font-bold text-slate-800">{sp.totalLessons}</p>
                        <p className="text-xs text-slate-500">Total</p>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-100 p-3 text-center">
                        <p className="text-lg font-bold text-green-600">{sp.completedLessons}</p>
                        <p className="text-xs text-slate-500">Done</p>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-100 p-3 text-center">
                        <p className="text-lg font-bold text-blue-600">{sp.totalLessons - sp.completedLessons}</p>
                        <p className="text-xs text-slate-500">Remaining</p>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-100 p-3 text-center">
                        <p className="text-lg font-bold text-student-primary">{sp.averageCompletion}%</p>
                        <p className="text-xs text-slate-500">Progress</p>
                      </div>
                    </div>

                    {/* Lessons List */}
                    <div className="space-y-2">
                      {subjectLessons.map((lesson) => {
                        const id = asString(lesson.id);
                        const title = asString(lesson.title) || `Lesson ${id}`;
                        const completion = asNumber(lesson.completed_percentage);
                        const isLocked = lesson.lock === true || lesson.lock === 1 || lesson.lock === '1';

                        return (
                          <div
                            key={id}
                            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                              isLocked
                                ? 'border-slate-100 bg-slate-50 opacity-60'
                                : completion === 100
                                  ? 'border-green-100 bg-green-50/50'
                                  : 'border-slate-100 bg-white'
                            }`}
                          >
                            {isLocked ? (
                              <Lock className="size-4 text-slate-400 shrink-0" />
                            ) : completion === 100 ? (
                              <CheckCircle className="size-4 text-green-500 shrink-0" />
                            ) : (
                              <BookOpen className="size-4 text-student-primary shrink-0" />
                            )}
                            <span className="text-sm font-medium text-slate-700 flex-1 truncate">{title}</span>
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
                          </div>
                        );
                      })}
                    </div>

                    {/* Lesson Files for this subject */}
                    {subjectFiles.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {subjectFiles.map((file) => {
                            const fId = asString(file.id);
                            const fTitle = asString(file.title) || `File ${fId}`;
                            const attachmentType = asString(file.attachment_type) || asString(file.lesson_type);
                            const badge = getFileTypeBadgeStyle(attachmentType);
                            const FileIcon = getFileTypeIcon(attachmentType);

                            return (
                              <div key={fId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                  <FileIcon className="size-4 text-slate-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-700 truncate flex-1">{fTitle}</p>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                                  {badge.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* CTA */}
                    {sp.averageCompletion < 100 ? (
                      <Button
                        className="mt-4 rounded-xl bg-student-primary hover:bg-student-primary/90"
                        size="sm"
                        onClick={() => onNavigate('/student/courses')}
                      >
                        Continue Learning
                        <ArrowRight className="ml-1 size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="mt-4 rounded-xl"
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
      ) : null}

      {/* Enrolled Courses (if multiple) */}
      {courses.length > 1 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Enrolled Courses</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {courses.map((course) => {
              const id = asString(course.id);
              const title = asString(course.title) || `Course ${id}`;
              const description = asString(course.description);
              return (
                <div key={id} className="rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md">
                  <h3 className="font-semibold text-slate-800">{title}</h3>
                  {description ? <p className="mt-1 text-sm text-slate-500 line-clamp-2">{description}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Empty State */}
      {courses.length === 0 && lessons.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto size-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No courses found</h3>
          <p className="text-slate-500 mt-1">You haven't been enrolled in any courses yet.</p>
        </div>
      ) : null}
    </div>
  );
}
