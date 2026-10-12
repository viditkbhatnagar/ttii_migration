import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ClipboardCheck, Download, ExternalLink, Eye, FileText, MoreHorizontal, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { ExportButtons, Pager, PillTab, SortHead } from '../cohorts/list-ui.js';
import { DialogShell } from '../cohorts/view/DialogShell.js';
import {
  EVAL_TABS,
  evalCounts,
  evalCsvRows,
  filterEval,
  showsMarks,
  sortEval,
  toEvalRows,
  type EvalRow,
  type EvalSortKey,
  type EvalStatus,
} from './assignment-model.js';

// Assignment Evaluation (TTII 2026-10-12), rebuilt after Naji's
// AssignmentEvaluationModule. The three-state flow is unchanged (Naji UAT
// 2026-05-22): Pending Evaluation → Evaluate (marks are entered on the
// submission page) → Pending Verification → Review → Verify & Publish → Result
// Published (Re-Evaluate re-opens it). "Returned" has no data until return
// columns exist on assignment_submissions.

const PAGE_SIZE = 10;

export default function AssignmentEvaluationPage({ api, session, onNavigate }: AdminPageProps) {
  const [tab, setTab] = useState<EvalStatus>('pending_evaluation');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: EvalSortKey; dir: SortDir }>({ key: 'submitted', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<EvalRow | null>(null);
  const [verifyRow, setVerifyRow] = useState<EvalRow | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(async () => toEvalRows(await api.loadAssignmentEvaluations(session.token)), []);
  const rows = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => evalCounts(rows), [rows]);
  const filtered = useMemo(() => sortEval(filterEval(rows, tab, search), sort.key, sort.dir), [rows, tab, search, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);
  const onSort = (k: EvalSortKey) => setSort((s) => nextSort(s, k));
  const marksCols = showsMarks(tab);

  // Evaluate / Re-Evaluate open the existing submission editor focused on one student.
  const openEditor = (r: EvalRow) => {
    if (!r.assignmentId) return;
    onNavigate(`/admin/assignment/submissions/${r.assignmentId}${r.id ? `?submission_id=${encodeURIComponent(r.id)}` : ''}`);
  };
  const download = (r: EvalRow) => {
    if (r.submissionFile) window.open(r.submissionFile, '_blank', 'noopener,noreferrer');
    else toast.error('No submitted file for this submission.');
  };

  const verify = async () => {
    if (!verifyRow?.id) return;
    setVerifying(true);
    try {
      const res = await api.verifySubmission(session.token, verifyRow.id);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message);
      if (status === 1) {
        toast.success(message || 'Submission verified.');
        setVerifyRow(null);
        reload();
      } else {
        toast.error(message || 'Failed to verify submission.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify submission.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <PageLoader label="Loading assignment evaluations…" />;
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

  return (
    <div className="space-y-6">
      <PageTitle title="Assignment Evaluation" subtitle="Review student submissions across evaluation stages." />

      <div role="tablist" aria-label="Evaluation stage" className="flex flex-wrap gap-2">
        {EVAL_TABS.map((t) => <PillTab key={t.id} active={tab === t.id} label={t.label} count={counts[t.id]} onClick={() => { setTab(t.id); setPage(1); }} />)}
      </div>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 print:hidden">
          <ExportButtons disabled={filtered.length === 0} onCsv={() => downloadCsv('assignment-evaluation.csv', toCsv(evalCsvRows(filtered)))} />
          <div className="relative w-full sm:w-64">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search submissions" placeholder="Search…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {current.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={search ? 'No submissions match your search.' : 'No submissions in this stage.'}
            {...(tab === 'returned' ? { body: 'Returned submissions will appear here once returning an evaluation to the student is tracked.' } : {})}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Student" k="student" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Offering" k="offering" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Subject" k="subject" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Cohort" k="cohort" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Instructor" k="instructor" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Submitted On" k="submitted" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                {marksCols ? <SortHead label="Marks" k="marks" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" /> : null}
                {marksCols ? <SortHead label="Evaluated On" k="evaluated" sortKey={sort.key} dir={sort.dir} onSort={onSort} /> : null}
                {tab === 'returned' ? <SortHead label="Returned On" k="evaluated" sortKey={sort.key} dir={sort.dir} onSort={onSort} /> : null}
                <TableHead className="text-right text-xs print:hidden">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((r, i) => (
                <TableRow
                  key={r.id}
                  className={cn('hover:bg-muted/30', tab === 'pending_verification' && 'cursor-pointer')}
                  // Naji UAT 2026-05-22 — on Pending Verification a row click opens the review.
                  {...(tab === 'pending_verification' ? { onClick: () => setVerifyRow(r) } : {})}
                >
                  <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>
                    <span className="block text-sm font-semibold">{r.studentName || '-'}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">{r.studentCode}</span>
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-muted-foreground">{r.course || '-'}</TableCell>
                  <TableCell className="max-w-[200px] text-sm text-muted-foreground">{r.offering || '-'}</TableCell>
                  <TableCell className="max-w-[200px] text-sm">
                    <button type="button" className="text-left text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setViewing(r); }}>
                      {r.subject || r.assignmentTitle || '-'}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[180px] text-sm text-muted-foreground">{r.cohort || '-'}</TableCell>
                  <TableCell className="text-sm">{r.instructor || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{r.submittedOn || '-'}</TableCell>
                  {marksCols ? <TableCell className="text-right text-sm font-medium tabular-nums">{r.marks || '-'} / {r.totalMarks || '-'}</TableCell> : null}
                  {marksCols || tab === 'returned' ? <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{r.evaluatedOn || '-'}</TableCell> : null}
                  <TableCell className="text-right print:hidden" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${r.studentName}`}>
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(r)}><Eye aria-hidden="true" /> View submission</DropdownMenuItem>
                        {tab === 'pending_evaluation' ? <DropdownMenuItem onClick={() => openEditor(r)}><ClipboardCheck aria-hidden="true" /> Evaluate</DropdownMenuItem> : null}
                        {tab === 'pending_verification' ? <DropdownMenuItem onClick={() => setVerifyRow(r)}><ShieldCheck aria-hidden="true" /> Review</DropdownMenuItem> : null}
                        {tab !== 'pending_evaluation' ? <DropdownMenuItem onClick={() => openEditor(r)}><RotateCcw aria-hidden="true" /> Re-Evaluate</DropdownMenuItem> : null}
                        <DropdownMenuItem onClick={() => download(r)}><Download aria-hidden="true" /> Download File</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>

      <DialogShell
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.studentName || 'Submission'}
        description={viewing ? [viewing.studentCode, EVAL_TABS.find((t) => t.id === viewing.status)?.label].filter(Boolean).join(' · ') : undefined}
        footer={viewing ? (
          <>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            {viewing.status === 'pending_verification' ? (
              <Button variant="outline" onClick={() => { const r = viewing; setViewing(null); setVerifyRow(r); }}>Review</Button>
            ) : null}
            <Button onClick={() => { const r = viewing; setViewing(null); openEditor(r); }}>
              {viewing.status === 'pending_evaluation' ? 'Evaluate' : 'Re-Evaluate'}
            </Button>
          </>
        ) : null}
      >
        {viewing ? <SubmissionDetails row={viewing} /> : null}
      </DialogShell>

      <DialogShell
        open={verifyRow !== null}
        onClose={() => setVerifyRow(null)}
        title="Verify Evaluation"
        footer={verifyRow ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Button variant="outline" disabled={verifying} onClick={() => { const r = verifyRow; setVerifyRow(null); openEditor(r); }}>Re-Evaluate</Button>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={verifying} onClick={() => setVerifyRow(null)}>Cancel</Button>
              <Button className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={verifying} onClick={() => void verify()}>
                <CheckCircle2 aria-hidden="true" className="size-4" /> {verifying ? 'Verifying…' : 'Verify & Publish'}
              </Button>
            </div>
          </div>
        ) : null}
      >
        {verifyRow ? <SubmissionDetails row={verifyRow} /> : null}
      </DialogShell>
    </div>
  );
}

function SubmissionDetails({ row }: { row: EvalRow }) {
  const items: Array<[string, React.ReactNode]> = [
    ['Student', <>{row.studentName || '-'}{row.studentCode ? <span className="ml-2 text-xs text-muted-foreground">({row.studentCode})</span> : null}</>],
    ['Assignment', row.assignmentTitle || '-'],
    ['Subject', row.subject || '-'],
    ['Course / Cohort', <>{row.course || '-'}{row.cohort ? <span className="ml-2 text-xs text-muted-foreground">· {row.cohort}</span> : null}</>],
    ['Offering', row.offering || '-'],
    ['Instructor', row.instructor || '-'],
    ['Submitted On', row.submittedOn || '-'],
    ['Marks', <span className="font-semibold text-primary">{row.marks || '-'} / {row.totalMarks || '-'}</span>],
  ];
  if (row.remarks) items.push(['Remarks', row.remarks]);
  items.push(['Submission', row.submissionFile ? (
    <a href={row.submissionFile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
      <FileText aria-hidden="true" className="size-4" /> Open submitted file <ExternalLink aria-hidden="true" className="size-3" />
    </a>
  ) : 'No file']);
  return (
    <dl className="divide-y divide-border text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-3 gap-2 py-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="col-span-2 text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
