import { canSeeMoney } from '../shared-money-access.js';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange, CheckCircle2, ClipboardCheck, Eye, FileText, GraduationCap, MoreHorizontal, Plus, Search, UserCheck, XCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { CARD, DotBadge, EmptyState, ErrorState, PageHeader, PaginationBar, PillButton, SortHead, StatCard } from '../list-kit/ListKit.js';
import {
  RANGE_LABELS, fmtYmd, inr, initialsOf, istTodayYmd, pageSlice, type RangeKey, type SortDir,
} from '../list-kit/list-kit-model.js';
import { AddApplicationDialog } from './AddApplicationDialog.js';
import { ConvertDialog, RejectDialog, type ActionTarget } from './ApplicationActionDialogs.js';
import {
  APP_STATES, DEFAULT_FILTERS, STATE_LABEL, STATE_TONE, courseFilterOptions, filterApplications, offeringFilterOptions,
  parseApplicationBoard, sortApplications, stateCounts, wantsNewApplication,
  type ApplicationFilters, type ApplicationRow, type ApplicationSortKey, type StageTab,
} from './centre-applications-model.js';

// Centre portal → Applications in Naji's design (src/routes/applications.index.tsx),
// on the real flow: Pending / Enrolled / Rejected. Convert enrols the student
// at once (existing endpoint); the prototype's pay-TTII stages are on hold.

const PAGE_SIZE = 8;

/** Opens Add Application when the URL carries ?new=1 (topbar button, dashboard quick action), then drops the flag. */
function useNewApplicationFlag(open: () => void) {
  useEffect(() => {
    const check = () => {
      if (!wantsNewApplication(window.location.search)) return;
      open();
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    };
    check();
    window.addEventListener('popstate', check);
    return () => window.removeEventListener('popstate', check);
  }, [open]);
}

export default function CentreApplicationsPage({ api, session, onNavigate }: CentrePageProps) {
  const portalTheme = usePortalThemeClass();
  const showMoney = canSeeMoney(session.roleId);
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadApplicationBoard(session.token),
    [session.token],
    'centre-portal-applications',
  );
  const rows = useMemo(() => parseApplicationBoard(data ?? {}), [data]);
  const today = istTodayYmd();

  const [filters, setFilters] = useState<ApplicationFilters>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<ApplicationSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [converting, setConverting] = useState<ActionTarget | null>(null);
  const [rejecting, setRejecting] = useState<ActionTarget | null>(null);

  const openAdd = useMemo(() => () => setAddOpen(true), []);
  useNewApplicationFlag(openAdd);

  const counts = useMemo(() => stateCounts(rows), [rows]);
  const filtered = useMemo(() => filterApplications(rows, filters, today), [rows, filters, today]);
  const sorted = useMemo(() => sortApplications(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);
  const current = pageSlice(sorted, page, PAGE_SIZE);
  const courseOptions = useMemo(() => courseFilterOptions(rows), [rows]);
  const offeringOptions = useMemo(() => offeringFilterOptions(rows, filters.course), [rows, filters.course]);

  const setFilter = (patch: Partial<ApplicationFilters>) => {
    setFilters((f) => ({ ...f, ...patch, ...(patch.course !== undefined && patch.course !== f.course ? { offering: 'all' } : {}) }));
    setPage(1);
  };
  const onSort = (k: ApplicationSortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
    setPage(1);
  };
  const view = (r: ApplicationRow) => onNavigate(`/centre/applications/view/${r.id}`);
  const target = (r: ApplicationRow): ActionTarget => ({ id: r.id, name: r.name, course: r.course, email: r.email });

  if (loading && !data) return <PageLoader label="Loading applications..." />;

  return (
    <div className="space-y-6 py-2">
      <PageHeader
        title="Applications"
        subtitle={`${filtered.length} application${filtered.length === 1 ? '' : 's'} · Pending, Enrolled and Rejected`}
        actions={<Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" /> Add Application</Button>}
      />

      {error && !data ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Applications" value={counts.all} icon={ClipboardCheck} />
            <StatCard label="Pending" value={counts.pending} icon={FileText} tone="bg-warning-soft text-warning-foreground" sub="Not converted yet" />
            <StatCard label="Enrolled" value={counts.enrolled} icon={CheckCircle2} tone="bg-success-soft text-success" sub="Converted to students" />
            <StatCard label="Rejected" value={counts.rejected} icon={XCircle} tone="bg-destructive/10 text-destructive" />
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by stage">
            {APP_STATES.map((s) => (
              <PillButton key={s} active={filters.stage === s} onClick={() => setFilter({ stage: s })} label={STATE_LABEL[s]} count={counts[s]} />
            ))}
            <PillButton active={filters.stage === 'all'} onClick={() => setFilter({ stage: 'all' })} label="All" count={counts.all} />
          </div>

          <Card className={cn(CARD, 'gap-0 p-4')}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search applications"
                  placeholder="Search by name, ID, email or phone…"
                  className="pl-9"
                  value={filters.query}
                  onChange={(e) => setFilter({ query: e.target.value })}
                />
              </div>
              <Select value={filters.course} onValueChange={(v) => { if (v) setFilter({ course: v }); }}>
                <SelectTrigger className="w-full md:w-44" aria-label="Course"><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courseOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.offering} onValueChange={(v) => { if (v) setFilter({ offering: v }); }}>
                <SelectTrigger className="w-full md:w-44" aria-label="Offering"><SelectValue placeholder="Offering" /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  <SelectItem value="all">All Offerings</SelectItem>
                  {offeringOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.stage} onValueChange={(v) => { if (v) setFilter({ stage: v as StageTab }); }}>
                <SelectTrigger className="w-full md:w-40" aria-label="Stage"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  <SelectItem value="all">All Stages</SelectItem>
                  {APP_STATES.map((s) => <SelectItem key={s} value={s}>{STATE_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.range} onValueChange={(v) => { if (v) setFilter({ range: v as RangeKey }); }}>
                <SelectTrigger className="w-full md:w-40" aria-label="Date range">
                  <CalendarRange className="mr-1.5 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={portalTheme}>
                  {(['7', '30', '90', 'all'] as RangeKey[]).map((r) => <SelectItem key={r} value={r}>{RANGE_LABELS[r]}</SelectItem>)}
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
                    <SortHead label="Application ID" k="applicationId" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Student" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Course & Offering" k="course" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <SortHead label="Certificate Combination" k="combination" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    {showMoney ? <SortHead label="Fee" k="fee" align="right" sortKey={sortKey} sortDir={sortDir} onSort={onSort} /> : null}
                    <SortHead label="Stage" k="state" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    <TableHead className="text-right text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.rows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={showMoney ? 9 : 8}>
                        {rows.length === 0
                          ? <EmptyState icon={ClipboardCheck} title="No applications yet" body="Add an application for a student, then convert it to enrol them." />
                          : <EmptyState icon={Search} title="No applications match your filters." />}
                      </TableCell>
                    </TableRow>
                  ) : current.rows.map((r, idx) => (
                    <TableRow key={r.id} className="group cursor-pointer hover:bg-muted/30" onClick={() => view(r)}>
                      <TableCell className="text-xs text-muted-foreground">{String((current.page - 1) * PAGE_SIZE + idx + 1).padStart(2, '0')}</TableCell>
                      <TableCell>
                        <button type="button" onClick={(e) => { e.stopPropagation(); view(r); }} className="font-mono text-xs font-medium text-primary hover:underline">
                          {r.applicationId}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtYmd(r.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-accent-foreground">{initialsOf(r.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight text-foreground">{r.name || '—'}</p>
                            <p className="text-[11px] text-muted-foreground">{r.phone || r.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{r.course || '—'}</p>
                        <p className="text-[11px] text-muted-foreground">{r.offering || 'No offering'}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.combination || '—'}</TableCell>
                      {showMoney ? (
                        <TableCell className="text-right text-sm tabular-nums" title={r.fee === null ? 'No payment plan yet' : undefined}>
                          {r.fee === null ? <span className="text-muted-foreground">—</span> : (
                            <>
                              <p className="font-medium text-foreground">{inr(r.fee)}</p>
                              <p className="text-[11px] text-muted-foreground">{inr(r.paid)} paid</p>
                            </>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell><DotBadge tone={STATE_TONE[r.state]} label={STATE_LABEL[r.state]} /></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Actions for ${r.name || r.applicationId}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={cn('w-48', portalTheme)}>
                            <DropdownMenuItem onSelect={() => view(r)}><Eye className="h-4 w-4" /> View</DropdownMenuItem>
                            {r.state === 'pending' ? (
                              <>
                                <DropdownMenuItem onSelect={() => setConverting(target(r))}><UserCheck className="h-4 w-4" /> Convert to student</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setRejecting(target(r))}><XCircle className="h-4 w-4" /> Reject</DropdownMenuItem>
                              </>
                            ) : null}
                            {r.state === 'enrolled' && r.studentUserId ? (
                              <DropdownMenuItem onSelect={() => onNavigate(`/centre/students/view/${r.studentUserId}`)}>
                                <GraduationCap className="h-4 w-4" /> View student
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar page={current.page} totalPages={current.totalPages} showing={current.rows.length} total={sorted.length} unit="applications" onPage={setPage} />
          </Card>
        </>
      )}

      <AddApplicationDialog api={api} token={session.token} open={addOpen} onOpenChange={setAddOpen} onCreated={() => reload()} />
      <ConvertDialog api={api} token={session.token} target={converting} onClose={() => setConverting(null)} onDone={() => { setConverting(null); reload(); }} />
      <RejectDialog api={api} token={session.token} target={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); reload(); }} />
    </div>
  );
}
