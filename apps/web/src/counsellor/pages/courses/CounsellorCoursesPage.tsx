import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Clock,
  GraduationCap,
  Laptop,
  Layers,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  asArray,
  asNumber,
  asString,
  toRecords,
} from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { asRecord } from '../../components/CounsellorWidgets.js';

interface CourseCard {
  id: number;
  title: string;
  code: string;
  level: string;
  tagline: string;
  duration: string;
  hours: number;
  subjects: number;
  priceMin: number;
  priceMax: number;
  applications: number;
  enrollments: number;
  conversionPct: number;
  // Course-card counts from loadCourses (computeCourseCounts). activeOfferings
  // = active, non-deleted offerings; combinations = active certificate
  // combinations; modes = distinct delivery modes across active offerings.
  activeOfferings: number;
  combinations: number;
  modes: string[];
}

const levelStyles = 'bg-primary-soft text-accent-foreground border-primary/30';

// learning_mode values are raw offering delivery_mode slugs (e.g. "cohort",
// "self_paced"). Humanise them for badge display without dropping unknowns.
function formatMode(mode: string): string {
  return mode
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatPrice(n: number): string {
  if (n <= 0) return 'Free';
  return `₹${n.toLocaleString('en-IN')}`;
}

// A course can carry a price RANGE across its offerings / certificate packages.
// Show a range when max > min, the single price when equal, and Free at 0.
function formatPriceRange(min: number, max: number): string {
  if (max > min && min > 0) return `${formatPrice(min)} - ${formatPrice(max)}`;
  return formatPrice(min > 0 ? min : max);
}

export default function CounsellorCoursesPage({ api, session, onNavigate }: CounsellorPageProps) {
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
    // Showcase only published courses — hide drafts (Naji 2026-06-30). Course
    // status vocabulary is 'draft' | 'active' | 'archived'; we exclude only
    // 'draft' (a denylist, not a published-only allowlist) so legacy courses
    // with a non-standard/empty status still appear. Scoped to this page — the
    // student catalogue and lead/application course pickers are untouched.
    const publishedCourses = toRecords(data?.courses).filter(
      (c) => asString(c.status).trim().toLowerCase() !== 'draft',
    );
    return publishedCourses.map((c) => {
      const id = asNumber(c.id);
      const sale = asNumber(c.offer_price) || asNumber(c.sale_price);
      const price = asNumber(c.price);
      // Effective single price: prefer a genuine sale over list price.
      const effectivePrice = sale > 0 && sale < price ? sale : price;
      // Price RANGE across the course's offerings / certificate packages.
      // The backend (computeCoursePriceRange) already falls back to the
      // course price, so price_min/price_max are populated. Fall back to the
      // single effective price for older payloads that omit the range fields.
      const rangeMin = asNumber(c.price_min);
      const rangeMax = asNumber(c.price_max);
      const priceMin = rangeMin > 0 ? rangeMin : effectivePrice;
      const priceMax = rangeMax > 0 ? rangeMax : effectivePrice;
      const perf = perfByCourse.get(id) ?? {
        applications: 0,
        enrollments: 0,
        conversionPct: 0,
      };
      // Distinct, de-duped, humanised delivery modes (drop blanks).
      const modes = [
        ...new Set(
          asArray(c.learning_mode)
            .map((m) => formatMode(asString(m)))
            .filter((m) => m.length > 0),
        ),
      ];
      return {
        id,
        title: asString(c.title) || asString(c.short_name) || 'Untitled course',
        code: asString(c.course_code) || asString(c.code),
        level: asString(c.level) || asString(c.label),
        tagline: asString(c.short_description) || asString(c.description),
        duration: asString(c.duration),
        hours: asNumber(c.total_learning_hours),
        subjects: asNumber(c.subject_count) || asNumber(c.subjects),
        priceMin: Math.min(priceMin, priceMax),
        priceMax: Math.max(priceMin, priceMax),
        applications: perf.applications,
        enrollments: perf.enrollments,
        conversionPct: perf.conversionPct,
        activeOfferings: asNumber(c.active_offering_count),
        combinations: asNumber(c.combination_count),
        modes,
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
    return <DashboardLoader label="courses" tone="theme" />;
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
            {courses.length} programs across UG, PG, and specialisations.
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
          <Select value={level} onValueChange={(v) => { if (v) setLevel(v); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent className="counsellor-theme">
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2">
                    {c.level ? (
                      <Badge className="bg-white/20 backdrop-blur text-white border-white/30 hover:bg-white/30">
                        {c.level}
                      </Badge>
                    ) : null}
                    {c.modes.map((m) => (
                      <Badge
                        key={m}
                        className="bg-white/20 backdrop-blur text-white border-white/30 hover:bg-white/30"
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {c.code || '—'}
                  </p>
                  <h3 className="mt-1 font-semibold text-base leading-tight">{c.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 min-h-[2rem]">
                    {c.tagline || 'No description available.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {c.duration || (c.hours > 0 ? `${c.hours}h learning` : '—')}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Laptop className="h-3.5 w-3.5 shrink-0" />
                      {c.activeOfferings} Active Offering{c.activeOfferings === 1 ? '' : 's'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      {c.subjects > 0
                        ? `${c.subjects} subject${c.subjects === 1 ? '' : 's'}`
                        : '—'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Award className="h-3.5 w-3.5 shrink-0" />
                      {c.combinations} Combination{c.combinations === 1 ? '' : 's'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {c.applications} application{c.applications === 1 ? '' : 's'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                      {c.enrollments} enrolled
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {c.conversionPct}% conversion
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Fee</p>
                      <p className="text-lg font-bold">{formatPriceRange(c.priceMin, c.priceMax)}</p>
                    </div>
                    <Button size="sm" onClick={() => onNavigate(`/counsellor/courses/view/${asString(c.id)}`)}>
                      View Details
                    </Button>
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
                    <TableHead>Duration</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Active Offering</TableHead>
                    <TableHead className="text-right">Combinations</TableHead>
                    <TableHead className="text-right">Subjects</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Enrolled</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {c.duration || '—'}
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
                      <TableCell>
                        {c.modes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.modes.map((m) => (
                              <Badge
                                key={m}
                                variant="outline"
                                className={cn('border', levelStyles)}
                              >
                                {m}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{c.activeOfferings}</TableCell>
                      <TableCell className="text-right text-sm">{c.combinations}</TableCell>
                      <TableCell className="text-right text-sm">
                        {c.subjects > 0 ? c.subjects : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">{c.applications}</TableCell>
                      <TableCell className="text-right text-sm">{c.enrollments}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.conversionPct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatPriceRange(c.priceMin, c.priceMax)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onNavigate(`/counsellor/courses/view/${asString(c.id)}`)}
                        >
                          View
                        </Button>
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
