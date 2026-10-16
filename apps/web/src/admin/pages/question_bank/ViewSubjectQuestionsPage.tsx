import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, BookOpen, ChevronLeft, ChevronRight, ClipboardList, Download,
  Eye, FileText, GraduationCap, Layers, ListChecks, Pencil, Plus, Search, Trash2, Upload, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import { TONE, type Tone } from '../../shared/components/ui-tones.js';
import { BulkUploadDialog } from './BulkUploadDialog.js';
import { QuestionFormView, type FormMode } from './QuestionFormView.js';
import { SubjectPickerDialog } from './SubjectPickerDialog.js';
import {
  KIND_LABEL,
  KIND_TONE,
  filterQuestions,
  questionsCsvRows,
  sortQuestions,
  statusLabel,
  statusTone,
  toQuestionRows,
  toSubjectDetail,
  type KindFilter,
  type QuestionRow,
  type QuestionSortKey,
  type SortDir,
} from './question-bank-model.js';
import { useSubjectOptions } from './use-subject-options.js';

// Question Bank → one subject (TTII 2026-10-12, Naji's SubjectDetailView): a
// hero card with the subject's courses and counts, search + type filters, and
// a selectable question table (Q-00123 ids, "used in exams") with View / Edit
// / Delete per row and a bulk bar — Export selected, Move to subject, Delete.
// Add / Edit / View open the full question form in place. A question in a
// published exam cannot be deleted or moved; the server keeps it and says so.

const PAGE_SIZE = 10;
type View = { kind: 'list' } | { kind: 'form'; mode: FormMode; questionId: number | null };

function subjectIdFromPath(): string {
  return /\/admin\/question_bank\/view\/(\d+)/.exec(window.location.pathname)?.[1] ?? '';
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: Tone }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={cn('flex size-7 items-center justify-center rounded-lg', TONE[tone].tile)}><Icon aria-hidden="true" className="size-3.5" /></span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function SortHead({
  label, k, sortKey, dir, onSort, className,
}: { label: string; k: QuestionSortKey; sortKey: QuestionSortKey; dir: SortDir; onSort: (k: QuestionSortKey) => void; className?: string }) {
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

function UsedPill({ q }: { q: QuestionRow }) {
  if (q.usedInExams === 0) return <Pill tone="slate">Not used</Pill>;
  const n = `${q.usedInExams} exam${q.usedInExams === 1 ? '' : 's'}`;
  if (q.usedInPublished.length === 0) return <Pill tone="blue">{n}</Pill>;
  return <span title={`Published: ${q.usedInPublished.join(', ')}`}><Pill tone="amber">{n} · published</Pill></span>;
}

/** Toast a bulk result: the server message, plus the first few skipped reasons. */
function toastResult(res: Record<string, unknown>): void {
  const message = asString(res.message);
  const data = res.data && typeof res.data === 'object' ? (res.data as { skipped?: Array<{ code?: string; reason?: string }> }) : {};
  const skipped = Array.isArray(data.skipped) ? data.skipped : [];
  const detail = skipped.slice(0, 3).map((s) => `${asString(s.code)}: ${asString(s.reason)}`).join(' ');
  const text = [message, detail, skipped.length > 3 ? '…' : ''].filter(Boolean).join(' ');
  if (res.status !== 1) toast.error(text || 'Nothing was changed.', { duration: 12000 });
  else if (skipped.length > 0) toast.warning(text, { duration: 12000 });
  else toast.success(message || 'Done.');
}

export default function ViewSubjectQuestionsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const subjectId = subjectIdFromPath();
  const [view, setView] = useState<View>(() => (
    new URLSearchParams(window.location.search).get('add') === '1' ? { kind: 'form', mode: 'add', questionId: null } : { kind: 'list' }
  ));
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('');
  const [sortKey, setSortKey] = useState<QuestionSortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { subjects: allSubjects, reload: reloadSubjects } = useSubjectOptions(api, session.token, moveOpen || bulkOpen);

  // "?add=1" (Add Question from the list) is consumed once, not on refresh.
  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  const header = useAdminPageData(async () => toSubjectDetail(await api.loadQuestionBankSubject(session.token, subjectId)), [subjectId]);
  const questions = useAdminPageData(async () => toQuestionRows(await api.loadQuestionBank(session.token, { subjectId })), [subjectId]);
  const reloadHeader = header.reload;
  const reloadQuestions = questions.reload;
  const reloadAll = useCallback(() => { reloadHeader(); reloadQuestions(); }, [reloadHeader, reloadQuestions]);

  const rows = useMemo(() => questions.data ?? [], [questions.data]);
  const filtered = useMemo(() => sortQuestions(filterQuestions(rows, search, kind), sortKey, sortDir), [rows, search, kind, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  // A reload can drop selected questions (deleted / moved elsewhere).
  useEffect(() => {
    setSelected((cur) => {
      const live = new Set(rows.map((r) => r.id));
      const next = new Set([...cur].filter((id) => live.has(id)));
      return next.size === cur.size ? cur : next;
    });
  }, [rows]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const authors = useMemo(() => new Map((header.data?.authors ?? []).map((a) => [a.id, a.name])), [header.data]);
  const authorName = useCallback((id: number) => (id > 0 ? authors.get(id) ?? `User ${id}` : '—'), [authors]);

  const onSort = (k: QuestionSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'title' || k === 'kind' ? 'asc' : 'desc'); }
  };
  const pageAllChecked = current.length > 0 && current.every((q) => selected.has(q.id));
  const togglePage = () => setSelected((cur) => {
    const next = new Set(cur);
    for (const q of current) { if (pageAllChecked) next.delete(q.id); else next.add(q.id); }
    return next;
  });
  const toggleOne = (id: number) => setSelected((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const deleteOne = async (q: QuestionRow): Promise<boolean> => {
    const ok = await confirm({ title: `Delete ${q.code}?`, description: 'The question is removed from the bank. A draft exam that uses it will need it replaced before it can be published.', confirmText: 'Delete', variant: 'destructive' });
    if (!ok) return false;
    try {
      const res = await api.deleteQuestion(session.token, String(q.id));
      if (res.status !== 1) { toast.error(asString(res.message) || 'Could not delete the question.'); return false; }
      toast.success(asString(res.message) || 'Question deleted.');
      reloadAll();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the question.');
      return false;
    }
  };

  const deleteSelected = async () => {
    const ids = [...selected];
    const ok = await confirm({
      title: `Delete ${ids.length} selected question${ids.length === 1 ? '' : 's'}?`,
      description: 'Questions in a published exam are kept and listed. This cannot be undone from here.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    setBusy(true);
    try {
      toastResult(await api.bulkDeleteQuestions(session.token, ids));
      setSelected(new Set());
      reloadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the questions.');
    } finally {
      setBusy(false);
    }
  };

  const moveSelected = async (target: number) => {
    setBusy(true);
    try {
      toastResult(await api.bulkMoveQuestions(session.token, [...selected], target));
      setMoveOpen(false);
      setSelected(new Set());
      reloadAll();
      reloadSubjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not move the questions.');
    } finally {
      setBusy(false);
    }
  };

  if ((header.loading && !header.data) || (questions.loading && !questions.data)) return <PageLoader label="Loading subject…" />;
  const detail = header.data;
  if (!detail || header.error || questions.error) {
    return (
      <Card>
        <CardContent role="alert" className="space-y-4 py-8 text-center text-sm text-red-600">
          <p>{header.error ?? questions.error ?? 'Subject not found.'}</p>
          <Button variant="outline" onClick={() => onNavigate('/admin/question_bank/index')}>Back to Question Bank</Button>
        </CardContent>
      </Card>
    );
  }
  const subject = detail.subject;
  const exportRows = (list: QuestionRow[], name: string) => downloadCsv(name, toCsv(questionsCsvRows(list.map((q) => ({ ...q, subjectTitle: q.subjectTitle || subject.title })))));

  if (view.kind === 'form') {
    const question = view.questionId === null ? null : rows.find((r) => r.id === view.questionId) ?? null;
    return (
      <QuestionFormView
        key={`${view.mode}-${view.questionId ?? 'new'}`}
        mode={question ? view.mode : 'add'}
        subject={subject}
        question={question}
        authorName={authorName}
        api={api}
        token={session.token}
        onBack={() => setView({ kind: 'list' })}
        onSaved={() => { setView({ kind: 'list' }); reloadAll(); }}
        onEdit={(id) => setView({ kind: 'form', mode: 'edit', questionId: id })}
        onDelete={(q) => { void deleteOne(q).then((done) => { if (done) setView({ kind: 'list' }); }); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNavigate('/admin/question_bank/index')}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to Question Bank
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden border-primary/20 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><BookOpen aria-hidden="true" className="size-7" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{subject.title}</h1>
                {subject.code ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{subject.code}</span> : null}
                <Pill tone={statusTone(subject.status)}>{statusLabel(subject.status)}</Pill>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><GraduationCap aria-hidden="true" className="size-3.5" /> {subject.courses.map((c) => c.title).join(', ') || 'Not linked to a course'}</span>
                <span className="inline-flex items-center gap-1"><Layers aria-hidden="true" className="size-3.5" /> {subject.courses.length} course mapping{subject.courses.length === 1 ? '' : 's'}</span>
                <span className="inline-flex items-center gap-1"><ClipboardList aria-hidden="true" className="size-3.5" /> {subject.total} total questions</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={() => exportRows(filtered, `questions-${subject.code || subject.id}.csv`)}>
              <Download aria-hidden="true" className="size-4" /> Export Questions
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkOpen(true)}><Upload aria-hidden="true" className="size-4" /> Bulk Upload</Button>
            <Button size="sm" className="gap-1.5" onClick={() => setView({ kind: 'form', mode: 'add', questionId: null })}><Plus aria-hidden="true" className="size-4" /> Add Question</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-3">
          <MiniStat label="Total Questions" value={subject.total} tone="primary" icon={Layers} />
          <MiniStat label="MCQs (incl. True / False)" value={subject.mcq} tone="blue" icon={ListChecks} />
          <MiniStat label="Descriptive" value={subject.descriptive} tone="amber" icon={FileText} />
        </div>
      </Card>

      <Card className="gap-0 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search questions" placeholder="Search question text or ID" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select aria-label="Type" className="h-9 w-[170px] rounded-md border border-input bg-background px-3 text-sm" value={kind} onChange={(e) => { setKind(e.target.value as KindFilter); setPage(1); }}>
            <option value="">All types</option>
            {(Object.keys(KIND_LABEL) as Array<keyof typeof KIND_LABEL>).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </div>

        {selected.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="text-xs font-medium text-primary">{selected.size} selected</span>
            {selected.size < filtered.length ? (
              <button type="button" className="text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => setSelected(new Set(filtered.map((q) => q.id)))}>
                Select all {filtered.length}
              </button>
            ) : null}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRows(rows.filter((q) => selected.has(q.id)), `selected-questions-${subject.code || subject.id}.csv`)}>
              <Download aria-hidden="true" className="size-3.5" /> Export Selected
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => setMoveOpen(true)}>
              <Layers aria-hidden="true" className="size-3.5" /> Move to Another Subject
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 hover:text-rose-700" disabled={busy} onClick={() => { void deleteSelected(); }}>
              <Trash2 aria-hidden="true" className="size-3.5" /> Delete Selected
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={() => setSelected(new Set())}><X aria-hidden="true" className="size-3.5" /> Clear</Button>
          </div>
        ) : null}
      </Card>

      <Card className="gap-0 overflow-hidden p-0 shadow-sm">
        {current.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={rows.length === 0 ? 'No questions in this subject yet.' : 'No questions match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => setView({ kind: 'form', mode: 'add', questionId: null })}>Add the first question</Button>
              : <Button variant="outline" size="sm" onClick={() => { setSearch(''); setKind(''); }}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10"><Checkbox aria-label="Select this page" checked={pageAllChecked} onCheckedChange={togglePage} /></TableHead>
                <SortHead label="Question ID" k="id" sortKey={sortKey} dir={sortDir} onSort={onSort} className="w-28" />
                <SortHead label="Question" k="title" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Type" k="kind" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Used in exams" k="used" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <SortHead label="Last Updated" k="updatedAt" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((q) => {
                const locked = q.usedInPublished.length > 0;
                return (
                  <TableRow key={q.id} data-state={selected.has(q.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox aria-label={`Select ${q.code}`} checked={selected.has(q.id)} onCheckedChange={() => toggleOne(q.id)} /></TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{q.code}</TableCell>
                    <TableCell className="max-w-[420px] whitespace-normal">
                      <p className="line-clamp-2 text-sm text-foreground" title={q.title || undefined}>{q.title || '—'}</p>
                    </TableCell>
                    <TableCell><Pill tone={KIND_TONE[q.kind]}>{KIND_LABEL[q.kind]}</Pill></TableCell>
                    <TableCell><UsedPill q={q} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(q.updatedAt) || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-8" title="View" aria-label={`View ${q.code}`} onClick={() => setView({ kind: 'form', mode: 'view', questionId: q.id })}>
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Edit" aria-label={`Edit ${q.code}`} onClick={() => setView({ kind: 'form', mode: 'edit', questionId: q.id })}>
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-rose-600 hover:text-rose-700"
                          title={locked ? `In a published exam (${q.usedInPublished.join(', ')}) — cannot be deleted` : 'Delete'}
                          aria-label={`Delete ${q.code}`}
                          disabled={locked}
                          onClick={() => { void deleteOne(q); }}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span>
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

      <SubjectPickerDialog
        open={moveOpen}
        title="Move to another subject"
        description={`${selected.size} selected question${selected.size === 1 ? '' : 's'}. Questions in a published exam, or already in the chosen subject, stay where they are.`}
        confirmLabel={`Move ${selected.size} question${selected.size === 1 ? '' : 's'}`}
        busyLabel="Moving…"
        subjects={allSubjects}
        excludeId={subject.id}
        busy={busy}
        onClose={() => setMoveOpen(false)}
        onPick={(id) => { void moveSelected(id); }}
      />
      <BulkUploadDialog
        open={bulkOpen}
        subjects={allSubjects}
        initialSubjectId={subject.id}
        api={api}
        token={session.token}
        onClose={() => setBulkOpen(false)}
        onImported={() => { reloadAll(); reloadSubjects(); }}
      />
    </div>
  );
}
