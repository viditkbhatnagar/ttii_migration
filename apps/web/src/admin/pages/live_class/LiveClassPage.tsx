import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, History, Search, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, KpiTile, PageTitle } from '../../shared/components/ui-kit.js';
import { dmy, nextSort, pageSlice, to12h, type SortDir } from '../cohorts/list-model.js';
import { ExportButtons, Pager, PillTab, SortHead } from '../cohorts/list-ui.js';
import {
  EMPTY_LIVE_FILTERS,
  filterLive,
  filterLiveIgnoringTab,
  joinHref,
  liveCsvRows,
  liveTabCounts,
  sortLive,
  toLiveRows,
  type LiveFilters,
  type LiveSortKey,
  type LiveTab,
} from './live-session-list-model.js';

// Live Sessions (TTII 2026-10-12), rebuilt after Naji's LiveSessionsModule:
// totals, All / Upcoming / Past pills, filters, a sortable paged table and
// export. Read-only by decision (Risha 2026-06-23): sessions are scheduled
// inside each cohort, where recordings and attendance also live.

const PAGE_SIZE = 10;
const SELECT_CLASS = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const TABS: Array<{ id: LiveTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
];

export default function LiveClassPage({ api, session, onNavigate }: AdminPageProps) {
  const [filters, setFilters] = useState<LiveFilters>(EMPTY_LIVE_FILTERS);
  const [sort, setSort] = useState<{ key: LiveSortKey; dir: SortDir }>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toLiveRows(await api.loadLiveClasses(session.token)),
    [],
  );
  const rows = useMemo(() => data ?? [], [data]);
  const totals = useMemo(() => liveTabCounts(rows), [rows]);
  const counts = useMemo(() => liveTabCounts(filterLiveIgnoringTab(rows, filters)), [rows, filters]);
  const filtered = useMemo(() => sortLive(filterLive(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const cohorts = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => { if (r.cohortId && r.cohort && !m.has(r.cohortId)) m.set(r.cohortId, r.cohort); });
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);
  const courses = useMemo(() => [...new Set(rows.map((r) => r.course).filter(Boolean))].sort(), [rows]);
  const platforms = useMemo(() => [...new Set(rows.map((r) => r.platform).filter((p) => p && p !== '-'))].sort(), [rows]);

  const set = (patch: Partial<LiveFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const onSort = (k: LiveSortKey) => setSort((s) => nextSort(s, k));

  if (loading) return <PageLoader label="Loading live sessions…" />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const thisYear = new Date().getFullYear();
  return (
    <div className="space-y-6">
      <PageTitle title="Live Sessions" subtitle="Track upcoming and past live classes across cohorts." />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile label="Total Sessions" value={totals.all} icon={Video} tone="primary" active={filters.tab === 'all'} onClick={() => set({ tab: 'all' })} />
        <KpiTile label="Upcoming" value={totals.upcoming} icon={CalendarClock} tone="blue" active={filters.tab === 'upcoming'} onClick={() => set({ tab: filters.tab === 'upcoming' ? 'all' : 'upcoming' })} />
        <KpiTile label="Past" value={totals.past} icon={History} tone="slate" active={filters.tab === 'past'} onClick={() => set({ tab: filters.tab === 'past' ? 'all' : 'past' })} />
      </div>

      <div role="tablist" aria-label="Session status" className="flex flex-wrap gap-2">
        {TABS.map((t) => <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />)}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)] print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ExportButtons disabled={filtered.length === 0} onCsv={() => downloadCsv('live-sessions.csv', toCsv(liveCsvRows(filtered)))} />
          <div className="relative w-full sm:w-64">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search sessions" placeholder="Search…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <select aria-label="Cohort" className={SELECT_CLASS} value={filters.cohortId} onChange={(e) => set({ cohortId: e.target.value })}>
            <option value="">All Cohorts</option>
            {cohorts.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
          <select aria-label="Course" className={SELECT_CLASS} value={filters.course} onChange={(e) => set({ course: e.target.value })}>
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Platform" className={SELECT_CLASS} value={filters.platform} onChange={(e) => set({ platform: e.target.value })}>
            <option value="">All Platforms</option>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <DmyDateInput value={filters.date} onChange={(v) => set({ date: v })} placeholder="Date dd/mm/yyyy" minYear={thisYear - 3} maxYear={thisYear + 1} />
          <Button variant="outline" size="sm" className="h-9" onClick={() => { setFilters(EMPTY_LIVE_FILTERS); setPage(1); }}>Clear</Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState icon={Video} title={rows.length === 0 ? 'No live sessions yet.' : 'No sessions match your filters.'} {...(rows.length === 0 ? { body: 'Live sessions are scheduled inside each cohort.' } : {})} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="ID" k="sessionId" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Title" k="title" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Cohort" k="cohort" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Date" k="date" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="From" k="from" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="To" k="to" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Platform" k="platform" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs">Meeting</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((s, i) => {
                const href = joinHref(s);
                return (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell className="font-mono text-xs font-medium text-primary">{s.sessionId || '—'}</TableCell>
                    <TableCell className="max-w-[260px] text-sm font-medium">{s.title}</TableCell>
                    <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                      {s.cohortId ? (
                        <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => onNavigate(`/admin/cohorts/view/${s.cohortId}`)}>
                          {s.cohort || `Cohort ${s.cohortId}`}
                        </button>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm text-muted-foreground">{s.course || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{dmy(s.ymd) || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{s.from ? to12h(s.from) : '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{s.to ? to12h(s.to) : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.platform}</TableCell>
                    <TableCell className="text-right">
                      {s.upcoming && href ? (
                        <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-primary">
                          <a href={href} target="_blank" rel="noopener noreferrer"><Video aria-hidden="true" className="size-3.5" /> Join</a>
                        </Button>
                      ) : s.upcoming && s.zoomId ? (
                        <span className="text-xs text-muted-foreground">Zoom ID {s.zoomId}</span>
                      ) : !s.upcoming && s.cohortId ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-muted-foreground"
                          title="Ended — recordings and attendance are in the cohort's Live Sessions tab"
                          onClick={() => onNavigate(`/admin/cohorts/view/${s.cohortId}`)}
                        >
                          <Video aria-hidden="true" className="size-3.5" /> Ended
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{s.upcoming ? '—' : 'Ended'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <Pager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>
    </div>
  );
}
