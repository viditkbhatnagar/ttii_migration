import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, GraduationCap, IndianRupee, MoreHorizontal, Plus, Search, UserCheck, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { CARD, DotBadge, EmptyState, ErrorState, PageHeader, PaginationBar, PillButton, SortHead, StatCard, Tag } from '../list-kit/ListKit.js';
import { RANGE_LABELS, fmtYmd, inr, initialsOf, istTodayYmd, pageSlice, type RangeKey, type SortDir } from '../list-kit/list-kit-model.js';
import { AddApplicationDialog } from '../applications/AddApplicationDialog.js';
import {
  DEFAULT_STUDENT_FILTERS, FEE_STATE, STATUS_TABS, STATUS_TONE, courseOptions, filterStudents, offeringOptions, parseStudentBoard,
  sortStudents, statusCounts, studentKpis, studentsCsv, type StatusTab, type StudentFilters, type StudentRow, type StudentSortKey,
} from './centre-students-model.js';

// Centre portal → Students in Naji's design (students.index.tsx) on real data.
// Students come only from converted applications, so "Add Student" opens the
// Add Application dialog. Not built (no real source): the Progress column's
// attendance, KPI deltas.

const PAGE_SIZE = 8;

function downloadCsv(rows: readonly StudentRow[]): void {
  const blob = new Blob([studentsCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function CentreStudentsPage({ api, session, onNavigate }: CentrePageProps) {
  const portalTheme = usePortalThemeClass();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadStudentBoard(session.token),
    [session.token],
    'centre-portal-students',
  );
  const rows = useMemo(() => parseStudentBoard(data ?? {}), [data]);
  const today = istTodayYmd();
  const [filters, setFilters] = useState<StudentFilters>(DEFAULT_STUDENT_FILTERS);
  const [sortKey, setSortKey] = useState<StudentSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const counts = useMemo(() => statusCounts(rows), [rows]);
  const kpis = useMemo(() => studentKpis(rows), [rows]);
  const filtered = useMemo(() => filterStudents(rows, filters, today), [rows, filters, today]);
  const sorted = useMemo(() => sortStudents(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);
  const current = pageSlice(sorted, page, PAGE_SIZE);
  const courses = useMemo(() => courseOptions(rows), [rows]);
  const offerings = useMemo(() => offeringOptions(rows, filters.course), [rows, filters.course]);

  const setFilter = (patch: Partial<StudentFilters>) => {
    setFilters((f) => ({ ...f, ...patch, ...(patch.course !== undefined && patch.course !== f.course ? { offering: 'all' } : {}) }));
    setPage(1);
  };
  const onSort = (k: StudentSortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
    setPage(1);
  };
  const view = (r: StudentRow) => onNavigate(`/centre/students/view/${r.id}`);

  if (loading && !data) return <PageLoader label="Loading students..." />;

  return (
    <div className="space-y-6 py-2">
      <PageHeader
        title="My Students"
        subtitle={`${filtered.length} student${filtered.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={sorted.length === 0} onClick={() => downloadCsv(sorted)}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Student</Button>
          </>
        }
      />

      {error && !data ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Students" value={kpis.total} icon={Users} sub="Converted applications" />
            <StatCard label="Active Students" value={kpis.active} icon={UserCheck} tone="bg-info-soft text-info" />
            <StatCard label="Completed Students" value={kpis.completed} icon={CheckCircle2} tone="bg-success-soft text-success" sub="Completed or graduated" />
            <StatCard label="Fees Collected" value={inr(kpis.paid)} icon={IndianRupee} sub="Paid instalments" />
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            <PillButton active={filters.tab === 'all'} onClick={() => setFilter({ tab: 'all' })} label="All" count={counts.all} />
            {STATUS_TABS.map((s) => (
              <PillButton key={s} active={filters.tab === s} onClick={() => setFilter({ tab: s as StatusTab })} label={s} count={counts[s]} />
            ))}
          </div>

          <Card className={cn(CARD, 'gap-0 p-4')}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search students" placeholder="Search by name, ID or email…" className="pl-9" value={filters.query} onChange={(e) => setFilter({ query: e.target.value })} />
              </div>
              <Select value={filters.course} onValueChange={(v) => { if (v) setFilter({ course: v }); }}>
                <SelectTrigger className="w-full md:w-44" aria-label="Course"><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.offering} onValueChange={(v) => { if (v) setFilter({ offering: v }); }}>
                <SelectTrigger className="w-full md:w-44" aria-label="Offering"><SelectValue placeholder="Offering" /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  <SelectItem value="all">All Offerings</SelectItem>
                  {offerings.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.range} onValueChange={(v) => { if (v) setFilter({ range: v as RangeKey }); }}>
                <SelectTrigger className="w-full md:w-40" aria-label="Enrolled"><SelectValue /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  {(['30', '90', '180', 'all'] as RangeKey[]).map((r) => <SelectItem key={r} value={r}>{RANGE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className={cn(CARD, 'gap-0 overflow-hidden py-0')}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <SortHead label="Student ID" k="studentCode" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Student" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Course" k="course" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Offering" k="offering" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Enrolled" k="enrolledOn" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Fee" k="fee" align="right" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Paid" k="paid" align="right" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <TableHead className="text-right text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.rows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={9}>
                        {rows.length === 0
                          ? <EmptyState icon={GraduationCap} title="No students yet" body="Students appear here once an application is converted." />
                          : <EmptyState icon={Search} title="No students match your filters." />}
                      </TableCell>
                    </TableRow>
                  ) : current.rows.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => view(r)}>
                      <TableCell className="font-mono text-xs font-medium text-primary">{r.studentCode || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            {r.photo ? <AvatarImage src={r.photo} alt="" /> : null}
                            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-accent-foreground">{initialsOf(r.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight text-foreground">{r.name || '—'}</p>
                            <p className="text-[11px] text-muted-foreground">{r.email || r.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{r.course || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.offering || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtYmd(r.enrolledOn)}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{r.feeState === 'no_plan' ? <span className="text-muted-foreground">—</span> : inr(r.fee)}</TableCell>
                      <TableCell className="text-right">
                        {r.feeState === 'no_plan' ? <span className="text-muted-foreground">—</span> : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm tabular-nums text-foreground">{inr(r.paid)}</span>
                            <Tag className={FEE_STATE[r.feeState].tone}>{FEE_STATE[r.feeState].label}</Tag>
                          </div>
                        )}
                      </TableCell>
                      <TableCell><DotBadge tone={STATUS_TONE[r.status]} label={r.status} /></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Actions for ${r.name || r.studentCode}`}><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={cn('w-44', portalTheme)}>
                            <DropdownMenuItem onSelect={() => view(r)}><Eye className="h-4 w-4" /> View profile</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar page={current.page} totalPages={current.totalPages} showing={current.rows.length} total={sorted.length} unit="students" onPage={setPage} />
          </Card>
        </>
      )}

      <AddApplicationDialog
        api={api}
        token={session.token}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => onNavigate('/centre/applications')}
      />
    </div>
  );
}
