import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Clock, Eye, GraduationCap, LayoutGrid, Plus, Search, Table2, UserRound, Users, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { FilterSelect } from '../kit/FilterSelect.js';
import { fmtDay, fmtMonth } from '../kit/format.js';
import { CentrePageHeader, NoticeCard, PaginationBar, PillTabs, StatCard } from '../kit/page-kit.js';
import { usePagination } from '../kit/use-pagination.js';
import { AddCohortDialog } from './AddCohortDialog.js';
import {
  COHORT_STATUS_LABEL, COHORT_STATUS_STYLE, EMPTY_COHORT_FILTERS, cohortStats, distinct, filterCohorts, sortCohorts, tabCounts, toCohortOptions, toCohortRows,
  type CohortFilters, type CohortRow, type CohortSortKey, type CohortTab,
} from './cohort-model.js';

type ViewMode = 'cards' | 'table';

const TAB_LABEL: Record<CohortTab, string> = { upcoming: 'Upcoming', running: 'Running', completed: 'Completed', all: 'All' };
const TAB_ORDER: CohortTab[] = ['upcoming', 'running', 'completed', 'all'];

interface SortHeadProps { label: string; k: CohortSortKey; sortKey: CohortSortKey; dir: 'asc' | 'desc'; onSort: (k: CohortSortKey) => void }
function SortHead({ label, k, sortKey, dir, onSort }: SortHeadProps) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1 text-xs font-medium hover:text-foreground', active ? 'text-foreground' : 'text-muted-foreground')}>
        {label}<Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

export default function CentreCohortsPage({ api, session, onNavigate }: CentrePageProps) {
  const options = useAdminPageData(async () => toCohortOptions(await api.loadCohortOptions(session.token)), [session.token]);
  const cohorts = useAdminPageData(() => api.loadCohorts(session.token), [session.token]);
  const [filters, setFilters] = useState<CohortFilters>(EMPTY_COHORT_FILTERS);
  const [mode, setMode] = useState<ViewMode>('table');
  const [sort, setSort] = useState<{ key: CohortSortKey; dir: 'asc' | 'desc' }>({ key: 'cid', dir: 'desc' });
  const [adding, setAdding] = useState(false);

  const all = useMemo(() => toCohortRows(cohorts.data ?? [], options.data?.languages ?? []), [cohorts.data, options.data]);
  const filtered = useMemo(() => sortCohorts(filterCohorts(all, filters), sort.key, sort.dir), [all, filters, sort]);
  const pg = usePagination(filtered, 10, JSON.stringify(filters));
  const stats = cohortStats(all);
  const counts = tabCounts(all);
  const set = (patch: Partial<CohortFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const toggleSort = (key: CohortSortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const open = (c: CohortRow) => onNavigate(`/centre/cohorts/view/${c.id}`);

  const header = (
    <CentrePageHeader title="Cohorts" subtitle="Manage cohorts at your centre"
      actions={<Button className="gap-1.5" onClick={() => setAdding(true)} disabled={!options.data}><Plus className="h-4 w-4" />Add Cohort</Button>} />
  );

  if (cohorts.loading || options.loading) return <PageLoader label="Loading cohorts..." />;
  if (cohorts.error || options.error || !options.data) {
    return <div className="space-y-5">{header}<NoticeCard tone="error">{cohorts.error || options.error || 'Could not load cohorts.'}</NoticeCard></div>;
  }

  const sortProps = { sortKey: sort.key, dir: sort.dir, onSort: toggleSort };
  const tabOptions = TAB_ORDER.map((t) => ({ value: t, label: TAB_LABEL[t], count: counts[t] }));

  return (
    <div className="space-y-5">
      {header}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Cohorts" value={stats.total} icon={Users} />
        <StatCard label="Running" value={stats.running} icon={Clock} tone="bg-info-soft text-info" />
        <StatCard label="Upcoming" value={stats.upcoming} icon={CalendarDays} tone="bg-warning-soft text-warning-foreground" />
        <StatCard label="Students in Cohorts" value={stats.students} icon={GraduationCap} tone="bg-success-soft text-success" />
      </div>

      <section aria-label="Cohort filters" className="rounded-xl border border-border/70 bg-card p-4">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FilterSelect label="Course" allLabel="All Courses" value={filters.course} options={distinct(all, (r) => r.course).map((v) => ({ value: v, label: v }))} onChange={(v) => set({ course: v })} />
          <FilterSelect label="Subject" allLabel="All Subjects" value={filters.subject} options={distinct(all, (r) => r.subject).map((v) => ({ value: v, label: v }))} onChange={(v) => set({ subject: v })} />
          <FilterSelect label="Language" allLabel="All Languages" value={filters.language} options={distinct(all, (r) => r.language).map((v) => ({ value: v, label: v }))} onChange={(v) => set({ language: v })} />
          <FilterSelect label="Instructor" allLabel="All Instructors" value={filters.instructor} options={distinct(all, (r) => r.instructor).map((v) => ({ value: v, label: v }))} onChange={(v) => set({ instructor: v })} />
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setFilters(EMPTY_COHORT_FILTERS)}>Clear</Button>
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <PillTabs label="Cohort status" value={filters.tab} onChange={(tab) => set({ tab })} options={tabOptions} />
        <div className="flex items-center gap-3 md:ml-auto">
          <div className="flex rounded-full border border-border bg-muted p-0.5" role="group" aria-label="Change view">
            {([['table', 'Table', Table2], ['cards', 'Cards', LayoutGrid]] as const).map(([m, label, Icon]) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors', mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <label htmlFor="cohort-search" className="sr-only">Search cohorts</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="cohort-search" value={filters.search} onChange={(e) => set({ search: e.target.value })} placeholder="Search cohort or instructor" className="w-full pl-9 md:w-72" />
          </div>
        </div>
      </div>

      {mode === 'cards' ? (
        <Card className="gap-0 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {pg.current.map((c) => (
              <Card key={c.id} role="button" tabIndex={0} onClick={() => open(c)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c); } }}
                className="cursor-pointer space-y-4 p-5 transition-shadow hover:shadow-[var(--shadow-elegant)] focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{c.code} · {c.course || '—'}</p>
                    <p className="mt-0.5 font-semibold">{c.title}</p>
                  </div>
                  <Badge variant="outline" className={cn('rounded-full', COHORT_STATUS_STYLE[c.status])}>{COHORT_STATUS_LABEL[c.status]}</Badge>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><UserRound className="h-4 w-4" />{c.instructor || 'No instructor yet'}</p>
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{fmtDay(c.startYmd)} – {fmtDay(c.endYmd)}</p>
                  <p className="flex items-center gap-2"><Video className="h-4 w-4" />{c.liveClasses} live class{c.liveClasses === 1 ? '' : 'es'}</p>
                </div>
                <p className="text-xs"><span className="font-medium">{c.students}</span> <span className="text-muted-foreground">student{c.students === 1 ? '' : 's'}</span></p>
              </Card>
            ))}
            {filtered.length === 0 && <p className="py-10 text-center text-muted-foreground md:col-span-2 xl:col-span-3">{all.length === 0 ? 'No cohorts yet — use Add Cohort to create one.' : 'No cohorts found'}</p>}
          </div>
          <PaginationBar page={pg.page} totalPages={pg.totalPages} showing={pg.current.length} total={pg.total} onPage={pg.setPage} unit="cohorts" />
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">#</TableHead>
                <SortHead label="Status" k="status" {...sortProps} />
                <SortHead label="Cohort ID" k="cid" {...sortProps} />
                <SortHead label="Cohort Code" k="code" {...sortProps} />
                <SortHead label="Cohort Date" k="startYmd" {...sortProps} />
                <SortHead label="Course" k="course" {...sortProps} />
                <SortHead label="Subject" k="subject" {...sortProps} />
                <SortHead label="Language" k="language" {...sortProps} />
                <SortHead label="Instructor" k="instructor" {...sortProps} />
                <SortHead label="No. of Students" k="students" {...sortProps} />
                <SortHead label="No. of Live Classes" k="liveClasses" {...sortProps} />
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.current.map((c, i) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground">{pg.offset + i + 1}</TableCell>
                  <TableCell><Badge variant="outline" className={cn('rounded-full', COHORT_STATUS_STYLE[c.status])}>{COHORT_STATUS_LABEL[c.status]}</Badge></TableCell>
                  <TableCell><button type="button" className="font-mono text-xs font-medium text-primary hover:underline" onClick={() => open(c)}>{c.cid}</button></TableCell>
                  <TableCell className="text-sm">{c.code || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtMonth(c.startYmd)}</TableCell>
                  <TableCell className="text-sm">{c.course || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.subject || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.language || '—'}</TableCell>
                  <TableCell className="text-sm">{c.instructor || '—'}</TableCell>
                  <TableCell><span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-accent-foreground">{c.students}</span></TableCell>
                  <TableCell><span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-accent-foreground">{c.liveClasses}</span></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`View ${c.title}`} onClick={() => open(c)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={12} className="py-10 text-center text-muted-foreground">{all.length === 0 ? 'No cohorts yet — use Add Cohort to create one.' : 'No cohorts found'}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationBar page={pg.page} totalPages={pg.totalPages} showing={pg.current.length} total={pg.total} onPage={pg.setPage} unit="cohorts" />
        </Card>
      )}

      <AddCohortDialog open={adding} onOpenChange={setAdding} api={api} token={session.token} options={options.data} onCreated={cohorts.reload} />
    </div>
  );
}
