import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';

export default function ViewProgramPage({ api, session, onNavigate }: AdminPageProps) {
  const programId = useMemo(() => {
    const match = window.location.pathname.match(/\/admin\/programs\/view\/(.+)/);
    return match?.[1] ?? '';
  }, []);

  const { data: programData, loading: programLoading, error: programError } = useAdminPageData(
    () => api.getProgram(session.token, programId),
    [programId],
  );

  const { data: coursesData, loading: coursesLoading } = useAdminPageData(
    () => api.listProgramCourses(session.token, programId),
    [programId],
  );

  const program = useMemo(() => {
    if (!programData || Array.isArray(programData)) return null;
    return programData;
  }, [programData]);

  const courses = useMemo(() => toRecords(coursesData), [coursesData]);

  if (programLoading) return <PageLoader label="Loading program..." />;
  if (programError) {
    return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{programError}</CardContent></Card>;
  }
  if (!program) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Program not found.</CardContent></Card>;
  }

  const title = asString(program.title);
  const code = asString(program.code);
  const description = asString(program.description);
  const thumbnail = asString(program.thumbnail);
  const courseCount = Number(program.course_count ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" size="sm" onClick={() => onNavigate('/admin/programs/index')}>
            ← Back to Programs
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate(`/admin/programs/courses/${programId}`)}>
            Manage Courses
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            {thumbnail ? (
              <img src={thumbnail} alt={title} className="h-24 w-32 rounded object-cover" />
            ) : (
              <div className="flex h-24 w-32 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                No image
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{title}</CardTitle>
                {code ? <Badge variant="secondary">{code}</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {description || 'No description provided.'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {courseCount} course{courseCount === 1 ? '' : 's'} linked
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Courses in this Program</h2>
        {coursesLoading ? (
          <PageLoader label="Loading courses..." />
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No courses linked to this program yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const cid = asString(c.id);
              const ctitle = asString(c.title);
              const clevel = asString(c.level);
              const cthumb = asString(c.thumbnail);
              const cshort = asString(c.short_description);
              const cstatus = asString(c.status) || 'active';
              const cduration = asString(c.duration);
              return (
                <Card key={cid} className="overflow-hidden">
                  {cthumb ? (
                    <img src={cthumb} alt={ctitle} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-semibold">{ctitle}</h3>
                      <Badge variant={cstatus === 'active' ? 'default' : 'secondary'}>{cstatus}</Badge>
                    </div>
                    {clevel ? <p className="text-xs text-muted-foreground">Level: {clevel}</p> : null}
                    {cduration ? <p className="text-xs text-muted-foreground">Duration: {cduration}</p> : null}
                    {cshort ? (
                      <p className="line-clamp-3 text-xs text-muted-foreground">
                        {cshort.length > 120 ? `${cshort.slice(0, 120)}…` : cshort}
                      </p>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onNavigate(`/admin/course/view/${cid}`)}
                    >
                      View Course
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
