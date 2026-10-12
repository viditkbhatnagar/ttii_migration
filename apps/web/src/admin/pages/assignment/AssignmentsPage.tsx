import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, ClipboardCheck, Eye, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import { titleCaseEachWord } from '@/lib/text-format';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { RichTextEditor } from '../../shared/components/RichTextEditor.js';
import { dmy, nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { ExportButtons, Pager, PillTab, SortHead } from '../cohorts/list-ui.js';
import { DialogShell } from '../cohorts/view/DialogShell.js';
import {
  filterSummary,
  sortSummary,
  submittedPercent,
  summaryCounts,
  summaryCsvRows,
  toSummaryRows,
  type SummaryRow,
  type SummarySortKey,
  type SummaryTab,
} from './assignment-model.js';

// Assignment Summary (TTII 2026-10-12), rebuilt after Naji's
// AssignmentSummaryModule: course filter, evaluation pills, search + export, a
// sortable paged table, View and Edit dialogs. Grading itself stays on the
// per-assignment submissions page (/admin/assignment/submissions/:id).

const PAGE_SIZE = 10;
const TABS: Array<{ id: SummaryTab; label: string }> = [
  { id: 'pending', label: 'Evaluation Pending' },
  { id: 'completed', label: 'Evaluation Completed' },
  { id: 'all', label: 'All' },
];

export default function AssignmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [courseFilter, setCourseFilter] = useState('');
  // Default to Evaluation Pending so coordinators land on actionable rows.
  const [tab, setTab] = useState<SummaryTab>('pending');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SummarySortKey; dir: SortDir }>({ key: 'due', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [viewing, setViewing] = useState<SummaryRow | null>(null);
  const [editing, setEditing] = useState<SummaryRow | null>(null);

  useEffect(() => {
    api.loadCourses(session.token)
      .then((list) => setCourses(list.map((c) => ({ id: asString(c.id), title: asString(c.title) })).filter((c) => c.id && c.title)))
      .catch(() => setCourses([]));
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toSummaryRows(await api.loadAdminAssignments(session.token, courseFilter ? { courseId: courseFilter } : {})),
    [courseFilter],
  );
  const rows = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => summaryCounts(filterSummary(rows, 'all', search)), [rows, search]);
  const filtered = useMemo(() => sortSummary(filterSummary(rows, tab, search), sort.key, sort.dir), [rows, tab, search, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const onSort = (k: SummarySortKey) => setSort((s) => nextSort(s, k));
  const submissionsPage = (a: SummaryRow) => onNavigate(`/admin/assignment/submissions/${a.id}`);

  const remove = async (a: SummaryRow) => {
    const ok = await confirm({ title: `Delete "${a.title}"?`, description: 'This action cannot be undone.', confirmText: 'Delete', variant: 'destructive' });
    if (!ok) return;
    try {
      const res = await api.deleteAssignment(session.token, a.id);
      toast.success(asString(res.message) || 'Assignment deleted');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete assignment');
    }
  };

  if (loading) return <PageLoader label="Loading assignments…" />;
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
      <PageTitle title="Assignment Summary" subtitle="Overview of assignments across cohorts with evaluation status." />

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)] print:hidden">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select aria-label="Course" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <Button variant="outline" size="sm" className="h-9" onClick={() => { setCourseFilter(''); setSearch(''); setPage(1); }}>Clear</Button>
        </div>
      </Card>

      <div role="tablist" aria-label="Evaluation status" className="flex flex-wrap gap-2">
        {TABS.map((t) => <PillTab key={t.id} active={tab === t.id} label={t.label} count={counts[t.id]} onClick={() => { setTab(t.id); setPage(1); }} />)}
      </div>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 print:hidden">
          <ExportButtons disabled={filtered.length === 0} onCsv={() => downloadCsv('assignment-summary.csv', toCsv(summaryCsvRows(filtered)))} />
          <div className="relative w-full sm:w-64">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search assignments" placeholder="Search…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {current.length === 0 ? (
          <EmptyState icon={ClipboardList} title={rows.length === 0 ? 'No assignments yet.' : 'No assignments match your filters.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Title" k="title" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Cohort" k="cohort" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Marks" k="marks" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="Added" k="added" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Due Date" k="due" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Total Students" k="totalStudents" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="Submissions" k="submissions" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="Evaluated" k="evaluated" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <TableHead className="text-right text-xs print:hidden">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((a, i) => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <button type="button" onClick={() => setViewing(a)} className="text-left text-sm font-medium text-primary hover:underline">{a.title || '(untitled)'}</button>
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">{a.course || '-'}</TableCell>
                  <TableCell className="max-w-[200px] text-sm text-muted-foreground">{a.cohort || '-'}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{a.marks}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{a.addedOn || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dmy(a.dueYmd) || '-'}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{a.totalStudents}</TableCell>
                  <TableCell className="text-right">
                    <button type="button" className="text-sm font-medium tabular-nums text-primary hover:underline" title="Open submissions" onClick={() => submissionsPage(a)}>{a.submissions}</button>
                  </TableCell>
                  <TableCell className={`text-right text-sm font-medium tabular-nums ${a.evalStatus === 'completed' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {a.evaluated} / {a.submissions}
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${a.title}`}>
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(a)}><Eye aria-hidden="true" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => submissionsPage(a)}><ClipboardCheck aria-hidden="true" /> Evaluate submissions</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(a)}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => void remove(a)}><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
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
        title={viewing?.title || 'Assignment'}
        description={viewing ? [viewing.cohort, viewing.course].filter(Boolean).join(' · ') : undefined}
        footer={viewing ? (
          <>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            <Button onClick={() => { const a = viewing; setViewing(null); submissionsPage(a); }}>Evaluate submissions</Button>
          </>
        ) : null}
      >
        {viewing ? (
          <dl className="divide-y divide-border text-sm">
            {[
              ['Maximum Marks', String(viewing.marks)],
              ['Added / Due', `${viewing.addedOn || '-'} → ${dmy(viewing.dueYmd) || '-'}`],
              ['Total Students', String(viewing.totalStudents)],
              ['Submitted', `${viewing.submissions} (${submittedPercent(viewing)}%)`],
              ['Not Submitted', String(Math.max(0, viewing.totalStudents - viewing.submissions))],
              ['Evaluated', `${viewing.evaluated} / ${viewing.submissions}`],
              ['Evaluation Status', viewing.evalStatus === 'completed' ? 'Completed' : 'Pending'],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-2 gap-2 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </DialogShell>

      {editing ? (
        <EditAssignmentDialog
          api={api}
          token={session.token}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      ) : null}
    </div>
  );
}

function EditAssignmentDialog({
  api, token, row, onClose, onSaved,
}: { api: AdminPageProps['api']; token: string; row: SummaryRow; onClose: () => void; onSaved: () => void }) {
  const r = row.raw;
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(asString(r.description));
  const [totalMarks, setTotalMarks] = useState(String(row.marks));
  const [dueDate, setDueDate] = useState(row.dueYmd);
  const [instructions, setInstructions] = useState(asString(r.instructions));
  const [saving, setSaving] = useState(false);

  const marksError = totalMarks !== '' && Number(totalMarks) < 0 ? 'Marks cannot be negative.' : '';

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.editAssignment(token, row.id, {
        title,
        description,
        totalMarks: Number(totalMarks),
        dueDate,
        instructions,
        // The edit endpoint rewrites every column, so send back what this
        // dialog does not edit — the old dialog omitted these and so blanked
        // the question file and the from / due times on every save.
        file: asString(r.file),
        fromTime: asString(r.from_time),
        toTime: asString(r.to_time),
        courseId: asString(r.course_id),
        cohortId: asString(r.cohort_id),
      });
      toast.success(asString(res.message) || 'Assignment updated');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  };

  const thisYear = new Date().getFullYear();
  return (
    <DialogShell
      open
      onClose={onClose}
      title="Edit Assignment"
      description={row.cohort || undefined}
      width={640}
      onSubmit={() => void save()}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !title.trim() || !dueDate || marksError !== ''}>{saving ? 'Saving…' : 'Save'}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-title">Title *</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setTitle(next); }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-description">Description</Label>
          <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-marks">Maximum Marks</Label>
            <Input id="edit-marks" type="number" min={0} value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
            {marksError ? <p role="alert" className="text-xs text-destructive">{marksError}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-due">Due Date *</Label>
            <DmyDateInput id="edit-due" value={dueDate} onChange={setDueDate} minYear={thisYear - 3} maxYear={thisYear + 2} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Instructions</Label>
          <RichTextEditor value={instructions} onChange={setInstructions} />
        </div>
      </div>
    </DialogShell>
  );
}
