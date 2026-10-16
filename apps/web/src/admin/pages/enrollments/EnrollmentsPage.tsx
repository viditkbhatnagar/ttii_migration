import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, Eye, MoreHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import { InfoRow } from '../students/student-view/student-view-ui.js';
import {
  EMPTY_ENROLMENT_FILTERS, ENROLMENT_STATUSES, STATUS_TONE, enrolmentCsvRows, filterEnrolments, scopedOptions,
  sortEnrolments, statusCounts, toEnrolmentRows,
  type EnrolmentFilters, type EnrolmentRow, type EnrolmentSortKey, type EnrolmentTab,
} from './enrollments-list-model.js';

// Admin → Enrollments, rebuilt after Naji's EnrollmentsModule (TTII 2026-10-12):
// status pills with counts (they replace the old six summary cards — same
// numbers), a filter card, a sortable, selectable, paged table, CSV export,
// View (student profile) and View Enrollment. Read-only, like the old page.
// Kept from the old page: course → offering → combination cascade, the From /
// To date filter (now dd/mm/yyyy fields, compared as calendar dates — the old
// `new Date('YYYY-MM-DD')` read UTC midnight), the legacy-status mapping.
//
// Not built from Naji's design (awaiting product sign-off): Change status and
// Add Enrollment on this list. "Update Progress" is left out: progress is
// computed from lesson completion, not stored. Status and new enrolments are
// still managed on the Student View (Edit / Add Enrolment).

const PAGE_SIZE = 10;

export default function EnrollmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const [filters, setFilters] = useState<EnrolmentFilters>(EMPTY_ENROLMENT_FILTERS);
  const [sortKey, setSortKey] = useState<EnrolmentSortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<EnrolmentRow | null>(null);

  const { data, loading, error, reload } = useAdminPageData(() => api.loadEnrollments(session.token), []);
  const rows = useMemo(() => toEnrolmentRows(data ?? []), [data]);
  const opts = useMemo(() => scopedOptions(rows, filters), [rows, filters]);
  // Counts run before the status filter so every pill reflects the other filters.
  const counts = useMemo(() => statusCounts(filterEnrolments(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(() => sortEnrolments(filterEnrolments(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (patch: Partial<EnrolmentFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_ENROLMENT_FILTERS); setPage(1); };
  const onSort = (k: EnrolmentSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const asOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));
  const viewStudent = (r: EnrolmentRow) => { if (r.studentId) onNavigate(`/admin/students/view/${r.studentId}`); };

  const allOnPage = current.length > 0 && current.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) current.forEach((r) => next.delete(r.id)); else current.forEach((r) => next.add(r.id));
    return next;
  });
  const toggleOne = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });

  const exportCsv = () => {
    const picked = selected.size > 0 ? filtered.filter((r) => selected.has(r.id)) : filtered;
    downloadCsv('enrollments.csv', toCsv(enrolmentCsvRows(picked, formatYmd)));
  };

  if (loading) return <PageLoader label="Loading enrollments..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const thisYear = new Date().getFullYear();
  const tabs: Array<{ id: EnrolmentTab; label: string }> = [{ id: 'all', label: 'All' }, ...ENROLMENT_STATUSES.map((s) => ({ id: s, label: s }))];
  const viewWidth = 'min(480px, calc(100vw - 2rem))';

  return (
    <div className="space-y-6">
      <PageTitle
        title="Enrollments"
        subtitle={`${filtered.length} of ${rows.length} enrollments`}
        actions={(
          <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={exportCsv}>
            <Download aria-hidden="true" className="size-4" /> Export{selected.size ? ` (${selected.size})` : ''}
          </Button>
        )}
      />

      <div role="group" aria-label="Enrolment status" className="flex flex-wrap gap-2">
        {tabs.map((t) => <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />)}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_200px_200px_160px]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search enrollments" placeholder="Search by student, ID, course or offering…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Course" value={filters.course} onChange={(v) => set({ course: v, offering: '', combination: '' })} allLabel="All Courses" options={asOptions(opts.courses)} />
          <FilterSelect label="Offering" value={filters.offering} onChange={(v) => set({ offering: v, combination: '' })} allLabel="All Offerings" options={asOptions(opts.offerings)} />
          <FilterSelect label="Status" value={filters.tab === 'all' ? '' : filters.tab} onChange={(v) => set({ tab: (v || 'all') as EnrolmentTab })} allLabel="All Status" options={asOptions([...ENROLMENT_STATUSES])} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[200px_200px_200px_1fr]">
          <FilterSelect label="Combination" value={filters.combination} onChange={(v) => set({ combination: v })} allLabel="All Combinations" options={asOptions(opts.combinations)} />
          <DmyDateInput value={filters.from} onChange={(v) => set({ from: v })} placeholder="From dd/mm/yyyy" minYear={thisYear - 6} maxYear={thisYear + 1} />
          <DmyDateInput value={filters.to} onChange={(v) => set({ to: v })} placeholder="To dd/mm/yyyy" minYear={thisYear - 6} maxYear={thisYear + 1} />
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={rows.length === 0 ? 'No enrollments yet.' : 'No enrollments match your filters.'}
            {...(rows.length === 0 ? {} : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10"><Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Enrollment ID" k="enrollmentId" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Date" k="date" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Student" k="student" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course Name" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course Offering" k="offering" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Combination" k="combination" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course Fee" k="fee" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Progress" k="progress" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id || i} className="hover:bg-muted/30">
                    <TableCell><Checkbox aria-label={`Select ${r.enrollmentId || r.student}`} checked={selected.has(r.id)} onCheckedChange={(v) => toggleOne(r.id, v === true)} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-primary">{r.enrollmentId || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(r.date) || '—'}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {r.studentId ? <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => viewStudent(r)}>{r.student || '—'}</button> : (r.student || '—')}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm"><span className="line-clamp-2" title={r.course || undefined}>{r.course || '—'}</span></TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={r.offering}>{r.offering || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.combination || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{r.fee !== null ? `₹${r.fee.toLocaleString('en-IN')}` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex min-w-[120px] items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${r.progress}%` }} />
                        </div>
                        <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{r.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell><Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-8" title="View student" aria-label={`View ${r.student}`} disabled={!r.studentId} onClick={() => viewStudent(r)}>
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8" title="More" aria-label={`More actions for ${r.enrollmentId || r.student}`}>
                              <MoreHorizontal aria-hidden="true" className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setViewing(r)}>View Enrollment</DropdownMenuItem>
                            <DropdownMenuItem disabled={!r.studentId} onClick={() => viewStudent(r)}>Open student profile</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="enrollments" onPage={setPage} />
      </Card>

      <Dialog open={viewing !== null} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent style={{ width: viewWidth, maxWidth: viewWidth }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>{viewing?.student || 'Enrollment'}</DialogTitle>
            <DialogDescription>{viewing?.enrollmentId || '—'}</DialogDescription>
          </DialogHeader>
          {viewing ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <InfoRow label="Enrollment Date" value={formatYmd(viewing.date)} />
              <InfoRow label="Student Email" value={viewing.email} />
              <InfoRow label="Course" value={viewing.course} />
              <InfoRow label="Offering" value={viewing.offering} />
              <InfoRow label="Combination" value={viewing.combination} />
              <InfoRow label="Batch" value={viewing.batch} />
              <InfoRow label="Course Fee" value={viewing.fee !== null ? `₹${viewing.fee.toLocaleString('en-IN')}` : ''} />
              <InfoRow label="Progress" value={`${viewing.progress}%`} />
              <InfoRow label="Status" value={<Pill tone={STATUS_TONE[viewing.status]}>{viewing.status}</Pill>} />
            </div>
          ) : null}
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            {viewing?.studentId ? <Button onClick={() => { const v = viewing; setViewing(null); viewStudent(v); }}>Open student profile</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
