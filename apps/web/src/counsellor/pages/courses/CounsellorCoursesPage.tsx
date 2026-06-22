import { useMemo, useState } from 'react';
import { BookOpen, Clock, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { asRecord } from '../../components/CounsellorWidgets.js';

interface CourseCard {
  id: number;
  title: string;
  code: string;
  level: string;
  hours: number;
  price: number;
  applications: number;
  enrollments: number;
}

function formatPrice(n: number): string {
  if (n <= 0) return 'Free';
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function CounsellorCoursesPage({ api, session }: CounsellorPageProps) {
  const [search, setSearch] = useState('');
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([api.loadCourses(session.token), api.loadCounsellorDashboard(session.token)]).then(
        ([courses, dashboard]) => ({ courses, dashboard }),
      ),
    [api, session.token],
  );

  const courses = useMemo<CourseCard[]>(() => {
    const perfByCourse = new Map<number, { applications: number; enrollments: number }>();
    for (const p of toRecords(asRecord(data?.dashboard).coursePerformance)) {
      perfByCourse.set(asNumber(p.courseId), {
        applications: asNumber(p.applications),
        enrollments: asNumber(p.enrollments),
      });
    }
    return toRecords(data?.courses).map((c) => {
      const id = asNumber(c.id);
      const sale = asNumber(c.sale_price);
      const price = asNumber(c.price);
      const perf = perfByCourse.get(id) ?? { applications: 0, enrollments: 0 };
      return {
        id,
        title: asString(c.title) || asString(c.short_name) || 'Untitled course',
        code: asString(c.course_code),
        level: asString(c.level),
        hours: asNumber(c.total_learning_hours),
        price: sale > 0 && sale < price ? sale : price,
        applications: perf.applications,
        enrollments: perf.enrollments,
      };
    });
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [courses, search]);

  if (loading) {
    return <DashboardLoader label="courses" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Courses" />
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Courses" />
      <p className="-mt-4 text-sm text-gray-500">Programmes you can counsel and enrol students into</p>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses by name or code…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-400">No courses match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
              <div className="flex h-20 items-end justify-between bg-gradient-to-br from-cn-navy to-cn-navy-2 p-4">
                <span className="font-mono text-xs font-medium text-white/90">{c.code || '—'}</span>
                <BookOpen aria-hidden="true" className="size-5 text-white/80" />
              </div>
              <div className="space-y-3 p-4">
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800" title={c.title}>
                  {c.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {c.level ? <span className="rounded-full bg-slate-100 px-2 py-0.5">{c.level}</span> : null}
                  {c.hours > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock aria-hidden="true" className="size-3.5" /> {c.hours}h
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-cn-orange">{formatPrice(c.price)}</span>
                  <span className="text-[11px] text-slate-400">
                    {c.applications} app{c.applications === 1 ? '' : 's'} · {c.enrollments} enrolled
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
