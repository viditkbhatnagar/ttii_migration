import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Clock,
  GraduationCap,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { cn } from '@/lib/utils';
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
  conversionPct: number;
}

const levelStyles = 'bg-primary-soft text-accent-foreground border-primary/30';

function formatPrice(n: number): string {
  if (n <= 0) return 'Free';
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function CounsellorCoursesPage({ api, session }: CounsellorPageProps) {
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');

  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([
        api.loadCourses(session.token),
        api.loadCounsellorDashboard(session.token),
      ]).then(([courses, dashboard]) => ({ courses, dashboard })),
    [api, session.token],
  );

  const courses = useMemo<CourseCard[]>(() => {
    const perfByCourse = new Map<
      number,
      { applications: number; enrollments: number; conversionPct: number }
    >();
    for (const p of toRecords(asRecord(data?.dashboard).coursePerformance)) {
      perfByCourse.set(asNumber(p.courseId), {
        applications: asNumber(p.applications),
        enrollments: asNumber(p.enrollments),
        conversionPct: asNumber(p.conversionPct),
      });
    }
    return toRecords(data?.courses).map((c) => {
      const id = asNumber(c.id);
      const sale = asNumber(c.sale_price);
      const price = asNumber(c.price);
      const perf = perfByCourse.get(id) ?? {
        applications: 0,
        enrollments: 0,
        conversionPct: 0,
      };
      return {
        id,
        title: asString(c.title) || asString(c.short_name) || 'Untitled course',
        code: asString(c.course_code),
        level: asString(c.level),
        hours: asNumber(c.total_learning_hours),
        price: sale > 0 && sale < price ? sale : price,
        applications: perf.applications,
        enrollments: perf.enrollments,
        conversionPct: perf.conversionPct,
      };
    });
  }, [data]);

  const levels = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      if (c.level) set.add(c.level);
    }
    return [...set].sort();
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter(
      (c) =>
        (level === 'all' || c.level === level) &&
        (c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)),
    );
  }, [courses, search, level]);

  if (loading) {
    return <DashboardLoader label="courses" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Courses & Offerings" />
        <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses &amp; Offerings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {courses.length} programme{courses.length === 1 ? '' : 's'} you can counsel and enrol
            students into.
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <Card className="p-4 shadow-[var(--shadow-soft)] border-border/70">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {levels.length > 0 ? (
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-[180px] rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="all">All Levels</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </Card>

      {/* Grid */}
      {view === 'grid' &&
        (filtered.length === 0 ? (
          <Card className="p-12 text-center shadow-[var(--shadow-soft)] border-border/70">
            <p className="text-sm text-muted-foreground">No courses match your search.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((c) => (
              <Card
                key={c.id}
                className="overflow-hidden shadow-[var(--shadow-soft)] border-border/70 hover:shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5"
              >
                <div className="h-24 bg-[image:var(--gradient-primary)] relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {c.level ? (
                      <Badge className={cn('border', levelStyles)}>{c.level}</Badge>
                    ) : null}
                  </div>
                  <BookOpen className="absolute top-3 right-3 h-5 w-5 text-white/80" />
                </div>
                <div className="p-5">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {c.code || '—'}
                  </p>
                  <h3 className="mt-1 font-semibold text-base leading-tight line-clamp-2">
                    {c.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    {c.hours > 0 ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {c.hours}h learning
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {c.applications} application
                      {c.applications === 1 ? '' : 's'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" /> {c.enrollments} enrolled
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" /> {c.conversionPct}% conversion
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Fee</p>
                      <p className="text-lg font-bold">{formatPrice(c.price)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {/* Table */}
      {view === 'table' &&
        (filtered.length === 0 ? (
          <Card className="p-12 text-center shadow-[var(--shadow-soft)] border-border/70">
            <p className="text-sm text-muted-foreground">No courses match your search.</p>
          </Card>
        ) : (
          <Card className="shadow-[var(--shadow-soft)] border-border/70 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Course</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Learning Hours</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Enrolled</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary-soft text-accent-foreground flex items-center justify-center">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{c.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {c.code || '—'}
                              {c.level ? ` · ${c.level}` : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.level ? (
                          <Badge variant="outline" className={cn('border', levelStyles)}>
                            {c.level}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {c.hours > 0 ? `${c.hours}h` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">{c.applications}</TableCell>
                      <TableCell className="text-right text-sm">{c.enrollments}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.conversionPct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(c.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ))}
    </main>
  );
}
