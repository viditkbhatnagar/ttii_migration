import { useMemo, useState } from 'react';
import { BookOpen, CalendarCheck, Eye, IndianRupee, Layers, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { CARD, DotBadge, EmptyState, ErrorState, PageHeader, PaginationBar, SortHead, StatCard, Tag } from '../list-kit/ListKit.js';
import { fmtYmd, inr, pageSlice, type SortDir } from '../list-kit/list-kit-model.js';
import {
  PLAN_STATUS, categoryOptions, filterCourses, parseCourseBoard, sortCourses, type CourseSortKey, type PlanStatus,
} from './centre-courses-model.js';

// Centre portal → Courses & Fees in Naji's design (courses.index.tsx) on real
// data. Fee payable to TTII / GST / Total per combination are a pending
// product decision, so the table shows the one fee TTII actually sets for the
// centre (centre_course_plans.assigned_amount) once per course.

const PAGE_SIZE = 8;

export default function CentreCoursesPage({ api, session, onNavigate }: CentrePageProps) {
  const portalTheme = usePortalThemeClass();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadCourseBoard(session.token),
    [session.token],
    'centre-portal-courses',
  );
  const rows = useMemo(() => parseCourseBoard(data ?? {}), [data]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | PlanStatus>('all');
  const [sortKey, setSortKey] = useState<CourseSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterCourses(rows, query, category, status), [rows, query, category, status]);
  const sorted = useMemo(() => sortCourses(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);
  const current = pageSlice(sorted, page, PAGE_SIZE);
  const categories = useMemo(() => categoryOptions(rows), [rows]);
  const activeCount = rows.filter((r) => r.status === 'active').length;
  const combinationCount = rows.reduce((sum, r) => sum + r.combinations.length, 0);
  const fees = rows.map((r) => r.centreFee).filter((f): f is number => f !== null && f > 0);

  const onSort = (k: CourseSortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
    setPage(1);
  };
  const view = (courseId: string) => onNavigate(`/centre/courses/view/${courseId}`);

  if (loading && !data) return <PageLoader label="Loading courses..." />;

  return (
    <div className="space-y-6 py-2">
      <PageHeader title="Courses & Fees" subtitle="Courses TTII has assigned to your centre, and the fee set for each" />

      {error && !data ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Assigned Courses" value={rows.length} icon={BookOpen} />
            <StatCard label="Active Now" value={activeCount} icon={CalendarCheck} tone="bg-success-soft text-success" sub="Within validity dates" />
            <StatCard label="Combinations" value={combinationCount} icon={Layers} tone="bg-info-soft text-info" sub="Certificate combinations" />
            <StatCard
              label="Centre Fee Range"
              value={fees.length === 0 ? '—' : fees.length === 1 || Math.min(...fees) === Math.max(...fees) ? inr(fees[0]) : `${inr(Math.min(...fees))}–${inr(Math.max(...fees))}`}
              icon={IndianRupee}
              tone="bg-warning-soft text-warning-foreground"
              sub="Set by TTII"
            />
          </div>

          <Card className={cn(CARD, 'gap-0 p-4')}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search courses" placeholder="Search course or code" className="pl-9" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
              </div>
              <Select value={category} onValueChange={(v) => { if (v) { setCategory(v); setPage(1); } }}>
                <SelectTrigger className="w-full md:w-48" aria-label="Category"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => { if (v) { setStatus(v as 'all' | PlanStatus); setPage(1); } }}>
                <SelectTrigger className="w-full md:w-40" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(Object.keys(PLAN_STATUS) as PlanStatus[]).map((s) => <SelectItem key={s} value={s}>{PLAN_STATUS[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className={cn(CARD, 'gap-0 overflow-hidden py-0')}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10 text-muted-foreground">#</TableHead>
                    <SortHead label="Course Category" k="category" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Course" k="course" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Duration" k="duration" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Certificate Combinations" k="combinations" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Centre fee (set by TTII)" k="centreFee" align="right" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Applicable From" k="startDate" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Applicable To" k="endDate" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <TableHead className="text-right text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.rows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={10}>
                        {rows.length === 0
                          ? <EmptyState icon={BookOpen} title="No courses assigned yet" body="TTII assigns courses and fees to your centre. They will appear here." />
                          : <EmptyState icon={Search} title="No courses match your filters." />}
                      </TableCell>
                    </TableRow>
                  ) : current.rows.map((r, idx) => (
                    <TableRow key={r.planId || r.courseId} className="cursor-pointer hover:bg-muted/30" onClick={() => view(r.courseId)}>
                      <TableCell className="text-xs text-muted-foreground">{String((current.page - 1) * PAGE_SIZE + idx + 1).padStart(2, '0')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.category || '—'}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{r.course}</p>
                        {r.code ? <p className="font-mono text-[11px] text-muted-foreground">{r.code}</p> : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.duration || '—'}</TableCell>
                      <TableCell>
                        {r.combinations.length === 0 ? <span className="text-sm text-muted-foreground">—</span> : (
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {r.combinations.slice(0, 3).map((c) => (
                              <Tag key={c.id} className="bg-primary-soft text-accent-foreground" >{c.code}</Tag>
                            ))}
                            {r.combinations.length > 3 ? <Tag className="bg-muted text-muted-foreground">+{r.combinations.length - 3}</Tag> : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{inr(r.centreFee)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtYmd(r.startDate)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtYmd(r.endDate)}</TableCell>
                      <TableCell><DotBadge tone={PLAN_STATUS[r.status].tone} label={PLAN_STATUS[r.status].label} /></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => view(r.courseId)} aria-label={`View ${r.course}`}>
                          <Eye className="h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar page={current.page} totalPages={current.totalPages} showing={current.rows.length} total={sorted.length} unit="courses" onPage={setPage} />
          </Card>
        </>
      )}
    </div>
  );
}

