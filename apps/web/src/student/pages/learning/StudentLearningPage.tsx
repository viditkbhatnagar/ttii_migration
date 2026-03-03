import { useMemo } from 'react';
import { BookOpen, Flame, Lock, FileText, Video, FileQuestion } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

function getFileTypeIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower === 'video' || lower === 'url') return Video;
  if (lower === 'quiz') return FileQuestion;
  return FileText;
}

function getFileTypeBadge(type: string): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  const lower = type.toLowerCase();
  if (lower === 'video' || lower === 'url') return { label: 'Video', variant: 'default' };
  if (lower === 'quiz') return { label: 'Quiz', variant: 'secondary' };
  if (lower === 'pdf') return { label: 'PDF', variant: 'outline' };
  if (lower === 'practice') return { label: 'Practice', variant: 'secondary' };
  return { label: type || 'File', variant: 'outline' };
}

export default function StudentLearningPage({ api, session }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadLearning(session.token),
    [api, session.token],
  );

  const courses = useMemo(() => data?.courses ?? [], [data]);
  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const lessons = useMemo(() => data?.lessons ?? [], [data]);
  const lessonFiles = useMemo(() => data?.lessonFiles ?? [], [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">My Learning</h1>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">My Learning</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5">
            <Flame className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{data?.streakCurrent ?? 0} day streak</span>
          </div>
          <Button variant="outline" size="sm" onClick={reload}>Refresh</Button>
        </div>
      </div>

      {/* Course overview cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-white">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <BookOpen className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
              <p className="text-sm text-gray-500">Courses</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
              <FileText className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
              <p className="text-sm text-gray-500">Subjects</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <BookOpen className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{lessons.length}</p>
              <p className="text-sm text-gray-500">Lessons</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled courses */}
      {courses.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Enrolled Courses</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {courses.map((course) => {
              const id = asString(course.id);
              const title = asString(course.title) || `Course ${id}`;
              const description = asString(course.description);
              return (
                <Card key={id} className="bg-white">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    {description ? <p className="mt-1 text-sm text-gray-500 line-clamp-2">{description}</p> : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Lessons list */}
      {lessons.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Lessons</h2>
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const id = asString(lesson.id);
              const title = asString(lesson.title) || `Lesson ${id}`;
              const completion = asNumber(lesson.completed_percentage);
              const isLocked = lesson.lock === true || lesson.lock === 1 || lesson.lock === '1';

              return (
                <Card key={id} className={`bg-white ${isLocked ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isLocked ? (
                          <Lock className="size-4 text-gray-400" />
                        ) : (
                          <BookOpen className="size-4 text-ttii-primary" />
                        )}
                        <h3 className="font-medium text-gray-900">{title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <Badge variant="outline" className="text-xs">Locked</Badge>
                        ) : (
                          <Badge variant={completion === 100 ? 'default' : 'secondary'} className="text-xs">
                            {completion}% complete
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!isLocked && completion > 0 ? (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-ttii-primary transition-all"
                          style={{ width: `${Math.min(completion, 100)}%` }}
                        />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Lesson Files */}
      {lessonFiles.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Lesson Materials</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {lessonFiles.map((file) => {
              const id = asString(file.id);
              const title = asString(file.title) || `File ${id}`;
              const attachmentType = asString(file.attachment_type) || asString(file.lesson_type);
              const badge = getFileTypeBadge(attachmentType);
              const FileIcon = getFileTypeIcon(attachmentType);

              return (
                <Card key={id} className="bg-white">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <FileIcon className="size-4 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{title}</p>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {courses.length === 0 && lessons.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-10 text-gray-300" />
            <p className="text-sm text-gray-500">No courses enrolled yet.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
