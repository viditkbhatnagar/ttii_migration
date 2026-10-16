import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Eye, FilePlus2, FileText, Pencil, Plus, Search, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import { CreateSupplementaryDialog } from '../exam_supplementary/CreateSupplementaryDialog.js';
import {
  EXAM_TYPE_LABEL,
  PHASE_LABEL,
  PHASE_TONE,
  canCreateSupplementary,
  examType,
  filterExams,
  phaseCounts,
  sortExams,
  toExamListRows,
  type ExamFilters,
  type ExamSortKey,
  type PhaseTab,
} from './exam-list-model.js';
import { ViewExamDialog } from './ViewExamDialog.js';

// Exam → Exams (TTII 2026-10-12), rebuilt after Naji's ExamsModule: filter
// card, phase tabs with counts, a sortable paged table, CSV export, and a real
// View Exam. It replaces a list whose Delete fired with no confirmation (and
// never showed the server's refusal or refreshed), whose "Questions" button led
// to a page that does not exist, and whose Subject / Batch filters did nothing.
// Phase comes from the server's IST sitting windows.

const PAGE_SIZE = 10;
const TABS: Array<{ id: PhaseTab; label: string }> = [
  { id: 'in_progress', label: 'In progress' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'draft', label: 'Draft' },
  { id: 'all', label: 'All' },
];
const EMPTY_FILTERS: ExamFilters = { tab: 'all', search: '', courseId: '', type: 'all', from: '', to: '' };

function PillTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{count}</span>
    </button>
  );
}

function SortHead({
  label, k, sortKey, dir, onSort, className,
}: { label: string; k: ExamSortKey; sortKey: ExamSortKey; dir: 'asc' | 'desc'; onSort: (k: ExamSortKey) => void; className?: string }) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1 text-xs font-medium hover:text-foreground', active ? 'text-foreground' : 'text-muted-foreground')}>
        {label} <Icon aria-hidden="true" className="size-3" />
      </button>
    </TableHead>
  );
}

export default function ExamsPage({ api, session, onNavigate }: AdminPageProps) {
  const [filters, setFilters] = useState<ExamFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<ExamSortKey>('fromDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
  // TTII 2026-10-16 — the exam a supplementary exam is being created from.
  const [supplementaryFrom, setSupplementaryFrom] = useState<number | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    api.loadCourses(session.token)
      .then((list) => setCourses(list.map((c) => ({ id: asString(c.id), title: asString(c.title) })).filter((c) => c.id && c.title)))
      .catch(() => setCourses([]));
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toExamListRows(await api.listExamsV2(session.token)),
    [],
    'admin:exams:list',
  );
  const rows = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => phaseCounts(filterExams(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(() => sortExams(filterExams(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // After a delete (or a reload) the list can shrink under the current page.
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (patch: Partial<ExamFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const onSort = (k: ExamSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const exportCsv = () => downloadCsv('exams.csv', toCsv([
    ['Exam ID', 'Exam name', 'Course', 'Type', 'From', 'To', 'Subjects', 'Students', 'Status'],
    ...filtered.map((r) => [r.examCode, r.title, r.courses.join('; '), EXAM_TYPE_LABEL[examType(r)], formatYmd(r.fromDate), formatYmd(r.toDate), r.subjects, r.allocated, PHASE_LABEL[r.phase]]),
  ]));

  if (loading) return <PageLoader label="Loading exams…" />;
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
      <PageTitle
        title="Exams"
        subtitle="Schedule, monitor and manage exams across all courses."
        actions={(
          <Button size="sm" className="gap-1.5" onClick={() => onNavigate('/admin/exam/add')}>
            <Plus aria-hidden="true" className="size-4" /> New Exam
          </Button>
        )}
      />

      <Card className="gap-0 p-4 shadow-sm">
        <div className={cn('grid gap-3 md:grid-cols-2', filters.tab === 'all' ? 'xl:grid-cols-[1fr_200px_150px_150px_150px_150px_auto]' : 'xl:grid-cols-[1fr_200px_150px_150px_150px_auto]')}>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search exams" placeholder="Search exam, code or course…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <select aria-label="Course" value={filters.courseId} onChange={(e) => set({ courseId: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {filters.tab === 'all' ? (
            <select
              aria-label="Status"
              value={filters.tab === 'all' ? '' : filters.tab}
              onChange={(e) => set({ tab: (e.target.value || 'all') as PhaseTab })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              {TABS.filter((t) => t.id !== 'all').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          ) : null}
          <select aria-label="Exam type" value={filters.type} onChange={(e) => set({ type: e.target.value as ExamFilters['type'] })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All exam types</option>
            <option value="regular">Regular</option>
            <option value="supplementary">Supplementary</option>
            <option value="practice">Practice</option>
          </select>
          <DmyDateInput value={filters.from} onChange={(v) => set({ from: v })} placeholder="From dd/mm/yyyy" minYear={thisYear - 3} maxYear={thisYear + 1} />
          <DmyDateInput value={filters.to} onChange={(v) => set({ to: v })} placeholder="To dd/mm/yyyy" minYear={thisYear - 3} maxYear={thisYear + 1} />
          <Button variant="outline" size="sm" className="h-9" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Clear</Button>
        </div>
      </Card>

      <div role="tablist" aria-label="Exam status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span> exam{filtered.length === 1 ? '' : 's'} found
          </p>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={filtered.length === 0} onClick={exportCsv}>
            <Download aria-hidden="true" className="size-3.5" /> Export CSV
          </Button>
        </div>

        {current.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={rows.length === 0 ? 'No exams yet.' : 'No exams match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => onNavigate('/admin/exam/add')}>Create the first exam</Button>
              : <Button variant="outline" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-xs">#</TableHead>
                <SortHead label="Exam ID" k="examCode" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Exam name" k="title" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Course" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Type" k="type" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="From" k="fromDate" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="To" k="toDate" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Subjects" k="subjects" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                <SortHead label="Status" k="phase" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((r, i) => (
                <TableRow key={r.examId}>
                  <TableCell className="text-xs text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{r.examCode || `ID ${r.examId}`}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <button type="button" title={r.title} className="truncate text-left text-sm font-medium text-primary hover:underline" onClick={() => setViewing(r.examId)}>
                      {r.title}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground" title={r.courses.join(', ')}>{r.courses.join(', ') || '—'}</TableCell>
                  <TableCell className={cn('text-sm', r.isSupplementary ? 'font-medium text-primary' : 'text-muted-foreground')}>{EXAM_TYPE_LABEL[examType(r)]}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(r.fromDate) || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(r.toDate) || '—'}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{r.subjects}</TableCell>
                  <TableCell><Pill tone={PHASE_TONE[r.phase]}>{PHASE_LABEL[r.phase]}</Pill></TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="size-8" title="View" aria-label={`View ${r.title}`} onClick={() => setViewing(r.examId)}>
                        <Eye aria-hidden="true" className="size-4" />
                      </Button>
                      {r.phase !== 'completed' ? (
                        <Button size="icon" variant="ghost" className="size-8" title="Edit" aria-label={`Edit ${r.title}`} onClick={() => onNavigate(`/admin/exam/edit/${r.examId}`)}>
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                      ) : null}
                      {r.phase !== 'draft' ? (
                        <Button size="icon" variant="ghost" className="size-8" title="Results" aria-label={`Results for ${r.title}`} onClick={() => onNavigate(`/admin/Exam_result/index?exam=${r.examId}`)}>
                          <Trophy aria-hidden="true" className="size-4" />
                        </Button>
                      ) : null}
                      {canCreateSupplementary(r) ? (
                        <Button size="icon" variant="ghost" className="size-8" title="Create Supplementary Exam" aria-label={`Create a supplementary exam from ${r.title}`} onClick={() => setSupplementaryFrom(r.examId)}>
                          <FilePlus2 aria-hidden="true" className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center justify-between border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{current.length}</span> of <span className="font-medium text-foreground">{filtered.length}</span>
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

      <CreateSupplementaryDialog
        sourceExamId={supplementaryFrom}
        onClose={() => setSupplementaryFrom(null)}
        onCreated={(examId) => { setSupplementaryFrom(null); onNavigate(`/admin/exam/edit/${examId}?step=4`); }}
        api={api}
        token={session.token}
      />

      <ViewExamDialog
        examId={viewing}
        api={api}
        token={session.token}
        onClose={() => setViewing(null)}
        onNavigate={onNavigate}
        onDeleted={reload}
      />
    </div>
  );
}
