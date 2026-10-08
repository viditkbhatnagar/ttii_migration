import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, Download, Eye, Info, Search, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  OVERALL_LABEL,
  formatPeriod,
  formatYmd,
  resultSheetCsv,
  type ExamResultsDetail as Detail,
  type OverallResult,
  type StudentResult,
} from './exam-results-model.js';
import { ExamStatusBadge, OverallBadge, SittingMark, StatBox } from './result-ui.js';
import { StudentResultDialog } from './StudentResultDialog.js';

// One exam's result sheet (Naji's Result Management profile): header with the
// publish action, outcome tiles, then Student Results and Subject Summary tabs.

type Tab = 'students' | 'subjects';

function downloadCsv(filename: string, csv: string): void {
  // Byte-order mark so Excel opens the UTF-8 names correctly.
  const blob = new Blob([`${String.fromCharCode(0xfeff)}${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoked on the next tick: Safari cancels a download whose URL is revoked
  // synchronously after click().
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Notice({ tone, icon: Icon, children }: { tone: 'amber' | 'sky' | 'emerald'; icon: typeof Info; children: React.ReactNode }) {
  const cls = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[tone];
  return (
    <div role="status" className={cn('flex items-start gap-2 rounded-xl border px-4 py-3 text-sm', cls)}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Users; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon aria-hidden="true" className="size-4" /> {label}
    </button>
  );
}

const RESULT_FILTERS: Array<'all' | OverallResult> = ['all', 'passed', 'failed', 'incomplete', 'absent', 'pending'];

export function ExamResultsDetail({
  detail, publishing, onBack, onPublish,
}: { detail: Detail; publishing: boolean; onBack: () => void; onPublish: () => void }) {
  const [tab, setTab] = useState<Tab>('students');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<'all' | OverallResult>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [openStudent, setOpenStudent] = useState<StudentResult | null>(null);

  const { totals } = detail;
  const students = useMemo(() => {
    const q = search.trim().toLowerCase();
    return detail.students.filter((s) => {
      if (result !== 'all' && s.overall !== result) return false;
      if (flaggedOnly && !s.flagged) return false;
      return !q || s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q);
    });
  }, [detail.students, search, result, flaggedOnly]);

  const lastDate = detail.sittings.map((s) => s.date).filter(Boolean).sort().at(-1) ?? '';
  const canPublish = detail.status === 'ready';

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" onClick={onBack}>
        <ArrowLeft aria-hidden="true" className="size-4" /> All exam results
      </Button>

      <Card className="gap-0 p-0 shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{detail.examCode || `Exam ${detail.examId}`}</p>
              <h1 className="mt-0.5 text-xl font-bold text-foreground sm:text-2xl">{detail.title}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {[detail.courses.join(', '), formatPeriod(detail.fromDate, detail.toDate), `${detail.sittings.length} subject${detail.sittings.length === 1 ? '' : 's'}`, `${totals.students} students`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <ExamStatusBadge status={detail.status} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" disabled={!canPublish || publishing} onClick={onPublish}>
              <Send aria-hidden="true" className="size-4" /> {publishing ? 'Publishing…' : 'Publish Exam Results'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={detail.students.length === 0}
              onClick={() => downloadCsv(`results-${detail.examCode || detail.examId}.csv`, resultSheetCsv(detail))}
            >
              <Download aria-hidden="true" className="size-4" /> Export Result Sheet
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <StatBox label="Students" value={totals.students} tone="blue" />
            <StatBox label="Passed" value={totals.passed} tone="emerald" />
            <StatBox label="Failed" value={totals.failed} tone="rose" />
            <StatBox label="Incomplete" value={totals.incomplete} tone="amber" />
            <StatBox label="Absent" value={totals.absent} tone="slate" />
            <StatBox label="Pending" value={totals.pending} tone="blue" />
            <StatBox label="Needs a check" value={totals.flagged} tone="amber" />
            <StatBox label="Pass %" value={`${totals.passPercentage}%`} tone="emerald" />
          </div>

          <div className="mt-4 space-y-2">
            {detail.status === 'in_progress' ? (
              <Notice tone="sky" icon={Info}>
                This exam is still running. Results can be published after the last sitting{lastDate ? ` on ${formatYmd(lastDate)}` : ''} has closed.
              </Notice>
            ) : null}
            {detail.status === 'published' ? (
              <Notice tone="emerald" icon={CheckCircle2}>
                Published{detail.publishedAt ? ` on ${new Date(detail.publishedAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}` : ''}
                {detail.publishedBy ? ` by ${detail.publishedBy}` : ''}. Students can see their marks and result for every subject.
              </Notice>
            ) : null}
            {totals.flagged > 0 && detail.status !== 'published' ? (
              <Notice tone="amber" icon={AlertTriangle}>
                <strong>{totals.flagged} student{totals.flagged === 1 ? ' has' : 's have'}</strong> a paper with almost no answers saved, often submitted within minutes.
                That usually means a technical problem, not a real attempt. Check these before publishing.{' '}
                <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { setTab('students'); setFlaggedOnly(true); }}>
                  Show them
                </button>
              </Notice>
            ) : null}
          </div>
        </div>

        <div role="tablist" aria-label="Result views" className="flex gap-1 border-t border-border bg-muted/30 px-4">
          <TabButton active={tab === 'students'} onClick={() => setTab('students')} icon={Users} label="Student Results" />
          <TabButton active={tab === 'subjects'} onClick={() => setTab('subjects')} icon={BookOpen} label="Subject Summary" />
        </div>
      </Card>

      {tab === 'students' ? (
        <Card className="gap-0 overflow-hidden p-0 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search students" placeholder="Search name or student ID…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select
              aria-label="Filter by result"
              value={result}
              onChange={(e) => setResult(e.target.value as 'all' | OverallResult)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {RESULT_FILTERS.map((r) => (
                <option key={r} value={r}>{r === 'all' ? 'All results' : OVERALL_LABEL[r]}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="size-4 accent-primary" />
              Needs a check only
            </label>
          </div>

          {students.length === 0 ? (
            <p role="status" className="px-6 py-12 text-center text-sm text-muted-foreground">
              {detail.students.length === 0 ? 'No students are allocated to this exam.' : 'No students match these filters.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs">Student</TableHead>
                  {detail.sittings.map((s) => (
                    <TableHead key={s.examId} className="min-w-[96px] text-xs" title={s.subjectTitle}>
                      <span className="block max-w-[120px] truncate">{s.subjectTitle}</span>
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        /{s.totalMarks}{s.passMarks !== null ? ` · pass ${s.passMarks}` : ''}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Result</TableHead>
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.userId} className={s.flagged ? 'bg-amber-50/40' : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {s.name}
                        {s.flagged ? <AlertTriangle aria-label="Needs a check" className="size-3.5 text-amber-600" /> : null}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{s.studentCode}</div>
                    </TableCell>
                    {s.sittings.map((c) => (
                      <TableCell key={c.examId} title={c.flag ?? undefined} className={c.flag ? 'bg-amber-100/60' : undefined}>
                        <SittingMark cell={c} />
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {s.obtained}/{s.maxMarks}
                      <span className="block text-[11px] text-muted-foreground">{s.percentage}% · {s.subjectsPassed}/{s.subjectsTotal} passed</span>
                    </TableCell>
                    <TableCell><OverallBadge result={s.overall} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setOpenStudent(s)}>
                        <Eye aria-hidden="true" className="size-3.5" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            Pass means the subject mark reached its pass mark. A student passes the exam when every subject is passed.
          </p>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Marks</TableHead>
                <TableHead className="text-xs">Students</TableHead>
                <TableHead className="text-xs">Passed</TableHead>
                <TableHead className="text-xs">Failed</TableHead>
                <TableHead className="text-xs">Absent</TableHead>
                <TableHead className="text-xs">Average</TableHead>
                <TableHead className="text-xs">Pass %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.subjects.map((s) => (
                <TableRow key={s.examId}>
                  <TableCell className="text-sm font-medium">{s.subjectTitle}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatYmd(s.date) || '—'}
                    {!s.closed ? <span className="block text-[10px] text-sky-700">Not held yet</span> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{s.totalMarks}{s.passMarks !== null ? ` (pass ${s.passMarks})` : ''}</TableCell>
                  <TableCell className="text-sm tabular-nums">{s.students}</TableCell>
                  <TableCell className="text-sm tabular-nums text-emerald-700">{s.passed}</TableCell>
                  <TableCell className="text-sm tabular-nums text-rose-700">{s.failed}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-600">{s.absent}</TableCell>
                  <TableCell className="text-sm tabular-nums">{s.averageMarks}</TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums">{s.passed + s.failed > 0 ? `${s.passPercentage}%` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <StudentResultDialog
        student={openStudent}
        sittings={detail.sittings}
        onClose={() => setOpenStudent(null)}
      />
    </div>
  );
}
