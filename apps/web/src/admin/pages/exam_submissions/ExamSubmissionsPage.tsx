import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Columns3, Download, Eye, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import {
  EMPTY_FILTERS,
  EVAL_LABEL,
  RESULT_LABEL,
  STATUS_LABEL,
  TABS,
  csvRows,
  daysBefore,
  filterOptions,
  filterRows,
  formatIst,
  formatMinutes,
  formatSeconds,
  inTab,
  scheduleLabel,
  sortRows,
  statusDetail,
  tabCounts,
  toSubmissionRows,
  type EvaluationState,
  type ResultState,
  type SortKey,
  type SubmissionFilters,
  type SubmissionRow,
  type SubmissionStatus,
  type SubmissionTab,
} from './exam-submissions-model.js';
import { EvalBadge, PillTab, ResultBadge, SortHead, StatusBadge, TypeBadge } from './submission-ui.js';
import { SubmissionProfile } from './SubmissionProfile.js';

// Exam → Exam Submissions (TTII 2026-10-12, Naji's ExamSubmissionsModule):
// every allocated student on every sitting, and every re-exam, with where they
// stand — scheduled, in progress (live from the autosave heartbeat),
// submitted, auto submitted (inferred), missed. Loads the last 30 days and
// everything upcoming by default; the date range goes to the server, every
// other filter works on the loaded rows.

const PAGE_SIZE = 10;
const LOOKBACK_DAYS = 30;
const COLUMNS = [
  { key: 'student', label: 'Student' },
  { key: 'examSubject', label: 'Exam & Subject' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'attempt', label: 'Attempt' },
  { key: 'submission', label: 'Submission Status' },
  { key: 'details', label: 'Submission Details' },
  { key: 'evalResult', label: 'Evaluation / Result' },
] as const;
type ColKey = (typeof COLUMNS)[number]['key'];
const ALL_VISIBLE = Object.fromEntries(COLUMNS.map((c) => [c.key, true])) as Record<ColKey, boolean>;
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

function SelectFilter({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function DetailsCell({ row, nowMs }: { row: SubmissionRow; nowMs: number }) {
  if (row.submittedAt) {
    return (
      <>
        <div className="text-foreground">{formatIst(row.submittedAt)}</div>
        <div className="text-[11px] text-muted-foreground">
          Time taken: {formatSeconds(row.timeTakenSeconds) || '—'}
          {row.answered !== null && row.questionCount ? ` · ${row.answered}/${row.questionCount} answered` : ''}
        </div>
      </>
    );
  }
  if (row.status === 'in_progress') {
    return (
      <>
        <div className="text-foreground">Started {formatIst(row.startedAt)}</div>
        <div className="text-[11px] text-muted-foreground">
          {row.answered ?? 0}/{row.questionCount ?? 0} answered · {statusDetail(row, nowMs)}
        </div>
      </>
    );
  }
  return <span className="text-xs text-muted-foreground">{statusDetail(row, nowMs) || '—'}</span>;
}

export default function ExamSubmissionsPage({ api, session }: AdminPageProps) {
  const [from, setFrom] = useState(() => daysBefore(new Date(), LOOKBACK_DAYS));
  const [to, setTo] = useState('');
  const [filters, setFilters] = useState<SubmissionFilters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<SubmissionTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('schedule');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [cols, setCols] = useState<Record<ColKey, boolean>>(ALL_VISIBLE);
  const [selected, setSelected] = useState<SubmissionRow | null>(null);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toSubmissionRows(await api.listExamSubmissions(session.token, from, to)),
    [from, to],
  );
  const rows = useMemo(() => data ?? [], [data]);
  const nowMs = Date.now();
  const options = useMemo(() => filterOptions(rows), [rows]);
  const narrowed = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const counts = useMemo(() => tabCounts(narrowed), [narrowed]);
  const filtered = useMemo(
    () => sortRows(narrowed.filter((r) => inTab(r, tab)), sortKey, sortDir),
    [narrowed, tab, sortKey, sortDir],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (patch: Partial<SubmissionFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setFrom(daysBefore(new Date(), LOOKBACK_DAYS));
    setTo('');
    setTab('all');
    setPage(1);
  };
  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const exportCsv = () => downloadCsv('exam-submissions.csv', toCsv(csvRows(filtered, Date.now())));

  if (selected) {
    return <SubmissionProfile api={api} token={session.token} row={selected} onBack={() => { setSelected(null); reload(); }} />;
  }
  if (loading && !data) return <PageLoader label="Loading submissions…" />;
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
  return (
    <div className="space-y-6">
      <PageTitle title="Exam Submissions" subtitle="Monitor scheduled examinations and every student's submission, live." />

      <Card className="gap-3 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Filter aria-hidden="true" className="size-3.5" /> Filters
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search submissions" placeholder="Search student name, student ID, exam or subject…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <SelectFilter label="All courses" value={filters.courseId} onChange={(v) => set({ courseId: v })} options={options.courses} />
          <SelectFilter label="All exams" value={filters.examId} onChange={(v) => set({ examId: v })} options={options.exams} />
          <SelectFilter label="All subjects" value={filters.subject} onChange={(v) => set({ subject: v })} options={options.subjects} />
          <SelectFilter
            label="All exam types"
            value={filters.type === 'all' ? '' : filters.type}
            onChange={(v) => set({ type: (v || 'all') as SubmissionFilters['type'] })}
            options={[{ value: 'regular', label: 'Regular' }, { value: 'reexam', label: 'Re-exam' }]}
          />
          <SelectFilter
            label="Submission status"
            value={filters.status === 'all' ? '' : filters.status}
            onChange={(v) => set({ status: (v || 'all') as 'all' | SubmissionStatus })}
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <SelectFilter
            label="Evaluation status"
            value={filters.evaluation === 'all' ? '' : filters.evaluation}
            onChange={(v) => set({ evaluation: (v || 'all') as 'all' | EvaluationState })}
            options={(['pending', 'evaluated', 'auto'] as EvaluationState[]).map((value) => ({ value, label: EVAL_LABEL[value] }))}
          />
          <SelectFilter
            label="Result status"
            value={filters.result === 'all' ? '' : filters.result}
            onChange={(v) => set({ result: (v || 'all') as 'all' | ResultState })}
            options={Object.entries(RESULT_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <div className="flex items-center gap-2 lg:col-span-2">
            <DmyDateInput value={from} onChange={(v) => { setFrom(v); setPage(1); }} placeholder="From dd/mm/yyyy" minYear={thisYear - 3} maxYear={thisYear + 1} />
            <span className="text-xs text-muted-foreground">to</span>
            <DmyDateInput value={to} onChange={(v) => { setTo(v); setPage(1); }} placeholder="Upcoming (no end)" minYear={thisYear - 3} maxYear={thisYear + 1} />
          </div>
          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" className="h-9" onClick={reset}>Clear Filters</Button>
          </div>
        </div>
      </Card>

      <div role="tablist" aria-label="Submission status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <PillTab key={t.id} active={tab === t.id} label={t.label} count={counts[t.id]} onClick={() => { setTab(t.id); setPage(1); }} />
        ))}
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-sm" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span> submission{filtered.length === 1 ? '' : 's'} found
            {' · '}times in IST
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Columns3 aria-hidden="true" className="size-3.5" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {COLUMNS.map((c) => (
                  <DropdownMenuCheckboxItem key={c.key} checked={cols[c.key]} onCheckedChange={(v) => setCols((prev) => ({ ...prev, [c.key]: v === true }))}>
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={filtered.length === 0} onClick={exportCsv}>
              <Download aria-hidden="true" className="size-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {current.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={rows.length === 0 ? 'No exam sittings in this date range.' : 'No submissions match your filters'}
            body={rows.length === 0 ? 'Widen the dates to see older sittings.' : 'Adjust the filters to see more results.'}
            action={<Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <div className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-14 text-xs">Sl No</TableHead>
                  {cols.student ? <SortHead label="Student" k="student" sortKey={sortKey} dir={sortDir} onSort={onSort} /> : null}
                  {cols.examSubject ? <SortHead label="Exam & Subject" k="exam" sortKey={sortKey} dir={sortDir} onSort={onSort} /> : null}
                  {cols.schedule ? <SortHead label="Schedule" k="schedule" sortKey={sortKey} dir={sortDir} onSort={onSort} /> : null}
                  {cols.attempt ? <SortHead label="Attempt" k="attempt" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-center" /> : null}
                  {cols.submission ? <SortHead label="Submission Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} /> : null}
                  {cols.details ? <TableHead className="text-xs">Submission Details</TableHead> : null}
                  {cols.evalResult ? <SortHead label="Evaluation / Result" k="evaluation" sortKey={sortKey} dir={sortDir} onSort={onSort} /> : null}
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, idx) => (
                  <TableRow key={r.key} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                    {cols.student ? (
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{r.studentName || `User ${r.userId}`}</div>
                        <div className="text-[11px] text-muted-foreground">{r.studentCode || '—'}</div>
                      </TableCell>
                    ) : null}
                    {cols.examSubject ? (
                      <TableCell className="max-w-[280px]">
                        <div className="truncate text-sm text-foreground" title={r.examTitle}>{r.examTitle}</div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <TypeBadge type={r.type} />
                          <span className="truncate text-[11px] text-muted-foreground" title={r.subject}>{r.subject}</span>
                        </div>
                      </TableCell>
                    ) : null}
                    {cols.schedule ? (
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {scheduleLabel(r)}
                        <div className="text-[11px] text-muted-foreground/70">Duration: {formatMinutes(r.durationMinutes)}</div>
                      </TableCell>
                    ) : null}
                    {cols.attempt ? (
                      <TableCell className="text-center">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold text-foreground">#{r.attemptNo}</span>
                      </TableCell>
                    ) : null}
                    {cols.submission ? <TableCell><StatusBadge row={r} /></TableCell> : null}
                    {cols.details ? <TableCell className="text-sm"><DetailsCell row={r} nowMs={nowMs} /></TableCell> : null}
                    {cols.evalResult ? (
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <EvalBadge row={r} />
                          <ResultBadge row={r} />
                        </div>
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setSelected(r)}>
                        <Eye aria-hidden="true" className="size-3.5" /> View Submission
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{current.length}</span> of <span className="font-medium text-foreground">{filtered.length}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft aria-hidden="true" className="size-4" /> Prev
            </Button>
            <span className="px-2 text-xs text-muted-foreground">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" className="gap-1" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
              Next <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
