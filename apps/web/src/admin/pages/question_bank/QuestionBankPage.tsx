import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDown, ArrowUp, ArrowUpDown, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Download, Eye,
  FileDown, FileText, Filter, Layers, ListChecks, Plus, Search, Sparkles, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, KpiTile, Pill } from '../../shared/components/ui-kit.js';
import { BulkUploadDialog } from './BulkUploadDialog.js';
import { SubjectPickerDialog } from './SubjectPickerDialog.js';
import {
  KIND_LABEL,
  questionsCsvRows,
  sortSubjects,
  statusLabel,
  statusTone,
  toOverview,
  toQuestionRows,
  type KindFilter,
  type SortDir,
  type SubjectSortKey,
} from './question-bank-model.js';
import { downloadQuestionTemplate } from './question-template.js';
import { useSubjectOptions } from './use-subject-options.js';

// Exam → Question Bank (TTII 2026-10-12), rebuilt after Naji's
// QuestionBankModule: header actions (Template / Export / Bulk Upload / Add
// Question), KPI tiles that filter, a filter card, and one row per subject —
// every live subject, including those with no questions yet (the old list
// grouped the questions, so an empty subject could not be opened at all).
// Search, type, author and "last 7 days" are applied on the server.
//
// The per-subject "Delete all questions" action of the old list is gone (not
// in his design): select the questions on the subject page and Delete; any in
// a published exam are kept and reported, as before.

const PAGE_SIZE = 10;

interface Filters { courseId: string; q: string; kind: KindFilter; createdBy: string; recent: boolean }
const EMPTY: Filters = { courseId: '', q: '', kind: '', createdBy: '', recent: false };
const SELECT = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

function SortHead({
  label, k, sortKey, dir, onSort, className,
}: { label: string; k: SubjectSortKey; sortKey: SubjectSortKey; dir: SortDir; onSort: (k: SubjectSortKey) => void; className?: string }) {
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

export default function QuestionBankPage({ api, session, onNavigate }: AdminPageProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SubjectSortKey>('lastUpdated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { subjects: allSubjects, reload: reloadSubjects } = useSubjectOptions(api, session.token, bulkOpen || addOpen);

  useEffect(() => {
    api.loadCourses(session.token)
      .then((list) => setCourses(list.map((c) => ({ id: asString(c.id), title: asString(c.title) })).filter((c) => c.id && c.title)))
      .catch(() => setCourses([]));
  }, [api, session.token]);

  // The search box is applied on the server — after a short pause in typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toOverview(await api.loadQuestionBankOverview(session.token, {
      courseId: filters.courseId,
      q: filters.q,
      qType: filters.kind,
      createdBy: filters.createdBy,
      recent: filters.recent,
    })),
    [filters.courseId, filters.q, filters.kind, filters.createdBy, filters.recent],
  );

  const sorted = useMemo(() => sortSubjects(data?.subjects ?? [], sortKey, sortDir), [data, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const questionFilterOn = filters.q !== '' || filters.kind !== '' || filters.createdBy !== '' || filters.recent;

  const set = (patch: Partial<Filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const clear = () => { setSearch(''); setFilters(EMPTY); setPage(1); };
  const onSort = (k: SubjectSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'title' ? 'asc' : 'desc'); }
  };

  const exportBank = async () => {
    setExporting(true);
    try {
      const rows = toQuestionRows(await api.loadQuestionBank(session.token, filters.courseId ? { courseId: filters.courseId } : {}));
      if (rows.length === 0) { toast.info('There are no questions to export.'); return; }
      downloadCsv('question-bank.csv', toCsv(questionsCsvRows(rows)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export the question bank.');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) return <PageLoader label="Loading question bank…" />;
  if (error && !data) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }
  const kpis = data?.kpis ?? { subjects: 0, questions: 0, mcq: 0, descriptive: 0, recent: 0 };
  const noTypeFilter = filters.kind === '' && !filters.recent;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles aria-hidden="true" className="size-3" /> Exam Management
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Question Bank</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Create, organise, and manage reusable questions for all subjects across the LMS.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadQuestionTemplate}><FileDown aria-hidden="true" className="size-4" /> Download Import Template</Button>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting} onClick={() => { void exportBank(); }}>
            <Download aria-hidden="true" className="size-4" /> {exporting ? 'Exporting…' : 'Export Question Bank'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkOpen(true)}><Upload aria-hidden="true" className="size-4" /> Bulk Upload Questions</Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}><Plus aria-hidden="true" className="size-4" /> Add Question</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile icon={BookOpen} label="Total Subjects" value={kpis.subjects} tone="primary" active={noTypeFilter} onClick={() => set({ kind: '', recent: false })} />
        <KpiTile icon={Layers} label="Total Questions" value={kpis.questions} tone="blue" active={noTypeFilter} onClick={() => set({ kind: '', recent: false })} />
        <KpiTile icon={ListChecks} label="MCQ Questions" value={kpis.mcq} tone="slate" active={filters.kind === 'mcq'} onClick={() => set({ kind: filters.kind === 'mcq' ? '' : 'mcq' })} />
        <KpiTile icon={FileText} label="Descriptive Questions" value={kpis.descriptive} tone="amber" active={filters.kind === 'descriptive'} onClick={() => set({ kind: filters.kind === 'descriptive' ? '' : 'descriptive' })} />
        <KpiTile icon={CheckCircle2} label="Recently Added (7 days)" value={kpis.recent} tone="emerald" active={filters.recent} onClick={() => set({ recent: !filters.recent })} />
      </div>

      <Card className="gap-0 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search" placeholder="Search subject name / code / question text / question ID" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter aria-hidden="true" className="size-4 text-muted-foreground" />
            <select aria-label="Course" className={cn(SELECT, 'w-[220px]')} value={filters.courseId} onChange={(e) => set({ courseId: e.target.value })}>
              <option value="">All courses</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select aria-label="Question type" className={cn(SELECT, 'w-[160px]')} value={filters.kind} onChange={(e) => set({ kind: e.target.value as KindFilter })}>
              <option value="">All types</option>
              {(Object.keys(KIND_LABEL) as Array<keyof typeof KIND_LABEL>).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <select aria-label="Created by" className={cn(SELECT, 'w-[170px]')} value={filters.createdBy} onChange={(e) => set({ createdBy: e.target.value })}>
              <option value="">All authors</option>
              {(data?.authors ?? []).map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
            </select>
            <select aria-label="Added" className={cn(SELECT, 'w-[150px]')} value={filters.recent ? '7d' : ''} onChange={(e) => set({ recent: e.target.value === '7d' })}>
              <option value="">All time</option>
              <option value="7d">Last 7 days</option>
            </select>
            <Button variant="outline" size="sm" className="h-9" onClick={clear}>Clear</Button>
          </div>
        </div>
      </Card>

      <Card className={cn('gap-0 overflow-hidden p-0 shadow-sm transition-opacity', loading ? 'opacity-70' : '')} aria-busy={loading}>
        {current.length === 0 && kpis.subjects === 0 ? (
          <EmptyState icon={BookOpen} title="No subjects yet." body="Subjects are created under Courses; their questions are managed here." />
        ) : current.length === 0 ? (
          <EmptyState icon={BookOpen} title="No subjects match your filters." action={<Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-14 text-xs">Sl No</TableHead>
                <SortHead label="Subject" k="title" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Course Mapping" k="courses" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Total Questions" k="total" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                <SortHead label="MCQs" k="mcq" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                <SortHead label="Descriptive" k="descriptive" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                <SortHead label="Last Updated" k="lastUpdated" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <button type="button" className="text-left font-medium text-foreground hover:text-primary hover:underline" onClick={() => onNavigate(`/admin/question_bank/view/${s.id}`)}>
                      {s.title}
                    </button>
                    <div className="text-xs text-muted-foreground">{s.code || 'No code'}</div>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    {s.courses.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Not linked</span>
                    ) : (
                      <div className="flex flex-wrap gap-1" title={s.courses.map((c) => c.title).join(', ')}>
                        {s.courses.slice(0, 2).map((c) => (
                          <span key={c.id} className="inline-flex max-w-[200px] items-center truncate rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs">{c.title}</span>
                        ))}
                        {s.courses.length > 2 ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">+{s.courses.length - 2}</span> : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="font-medium">{s.total}</span>
                    {questionFilterOn && s.matching !== null ? <div className="text-[11px] text-primary">{s.matching} match{s.matching === 1 ? '' : 'es'}</div> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.mcq}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.descriptive}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{s.lastUpdated ? formatDate(s.lastUpdated) : '—'}</TableCell>
                  <TableCell><Pill tone={statusTone(s.status)}>{statusLabel(s.status)}</Pill></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate(`/admin/question_bank/view/${s.id}`)}>
                      <Eye aria-hidden="true" className="size-3.5" /> View Questions
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)}</span> of <span className="font-medium text-foreground">{sorted.length}</span>
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

      <BulkUploadDialog
        open={bulkOpen}
        subjects={allSubjects}
        initialSubjectId={null}
        api={api}
        token={session.token}
        onClose={() => setBulkOpen(false)}
        onImported={() => { reload(); reloadSubjects(); }}
      />
      <SubjectPickerDialog
        open={addOpen}
        title="Add a question"
        description="Choose the subject the new question belongs to."
        confirmLabel="Continue"
        subjects={allSubjects}
        onClose={() => setAddOpen(false)}
        onPick={(id) => { setAddOpen(false); onNavigate(`/admin/question_bank/view/${id}?add=1`); }}
      />
    </div>
  );
}
