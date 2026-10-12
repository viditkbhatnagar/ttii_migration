import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Download, FileDown, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { Pill, StatBox } from '../../shared/components/ui-kit.js';
import { KIND_LABEL, kindOf, type SubjectRow } from './question-bank-model.js';
import { downloadQuestionTemplate } from './question-template.js';
import {
  afterImport,
  errorReportRows,
  readImportFile,
  reportCounts,
  toBulkPayload,
  toFailures,
  toReport,
  type FileProblem,
  type ImportRow,
  type RowReport,
} from './question-import-model.js';

// Bulk Upload in Naji's design: Subject → Template → Upload → Validate &
// Preview → Import. The preview is the server's own dry run (the same rules as
// a single add, plus the duplicate check), so what it says is what the import
// does. After the import the rows that went in are dropped; any that did not
// stay on screen with their reason.

const STEPS = ['Select Subject', 'Download Template', 'Upload File', 'Validate & Preview', 'Import'];

const STATUS_PILL: Record<RowReport['status'], { tone: 'emerald' | 'amber' | 'rose'; label: string }> = {
  ok: { tone: 'emerald', label: 'Ready' },
  duplicate: { tone: 'amber', label: 'Duplicate' },
  invalid: { tone: 'rose', label: 'Error' },
};

export function BulkUploadDialog({
  open, subjects, initialSubjectId, api, token, onClose, onImported,
}: {
  open: boolean;
  subjects: SubjectRow[] | null;
  initialSubjectId: number | null;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState(1);
  const [subjectId, setSubjectId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [problems, setProblems] = useState<FileProblem[]>([]);
  const [report, setReport] = useState<RowReport[] | null>(null);
  const [reasons, setReasons] = useState<Map<number, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSubjectId(initialSubjectId ? String(initialSubjectId) : '');
    setFileName('');
    setRows([]);
    setProblems([]);
    setReport(null);
    setReasons(null);
  }, [open, initialSubjectId]);

  const subject = useMemo(() => (subjects ?? []).find((s) => String(s.id) === subjectId) ?? null, [subjects, subjectId]);
  // A question carries one course: the subject's first linked course unless chosen.
  useEffect(() => { setCourseId(String(subject?.courses[0]?.id ?? '')); }, [subject]);
  const counts = report ? reportCounts(report) : null;
  const reportByRow = useMemo(() => new Map((report ?? []).map((r) => [r.row, r])), [report]);

  const readFile = async (file: File) => {
    setFileName(file.name);
    setReport(null);
    setReasons(null);
    try {
      const parsed = readImportFile(await file.text());
      setRows(parsed.rows);
      setProblems(parsed.problems);
      if (parsed.rows.length === 0) toast.error('No questions could be read from this file.');
    } catch {
      toast.error('Could not read this file.');
    }
  };

  const validate = async () => {
    if (!subjectId || rows.length === 0) return;
    setBusy(true);
    try {
      const res = await api.bulkAddQuestions(token, toBulkPayload(rows, subjectId, courseId), { dryRun: true });
      if (res.status !== 1) { toast.error(asString(res.message) || 'Could not validate the file.'); return; }
      setReport(toReport(res.data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not validate the file.');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await api.bulkAddQuestions(token, toBulkPayload(rows, subjectId, courseId));
      const message = asString(res.message);
      const result = afterImport(rows, toReport(res.data), toFailures(res.data));
      if (result.imported > 0) onImported();
      if (res.status === 1 && result.remaining.length === 0) toast.success(message || 'Questions imported.');
      else if (result.imported > 0) toast.warning(message);
      else toast.error(message || 'Nothing was imported.');
      setRows(result.remaining);
      setReasons(result.reasons);
      setReport(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    const next = Math.min(STEPS.length, step + 1);
    setStep(next);
    if (next === 4 && !report) void validate();
  };
  const canContinue = (step === 1 && subject !== null) || step === 2 || (step === 3 && rows.length > 0) || (step === 4 && !busy && (counts?.ok ?? 0) > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        style={{ width: 'min(860px, calc(100vw - 2rem))', maxWidth: 'min(860px, calc(100vw - 2rem))' }}
      >
        <DialogHeader className="shrink-0 space-y-3 border-b border-border p-5">
          <DialogTitle className="flex items-center gap-2"><Upload aria-hidden="true" className="size-4" /> Bulk Upload Questions</DialogTitle>
          <DialogDescription>Import a batch of questions into one subject from a CSV file.</DialogDescription>
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-[11px]">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const active = step >= n;
              return (
                <li key={label} className="flex items-center" aria-current={step === n ? 'step' : undefined}>
                  <span className={cn('flex size-6 items-center justify-center rounded-full text-[10px] font-semibold', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{n}</span>
                  <span className={cn('ml-1.5', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                  {n < STEPS.length ? <span aria-hidden="true" className="mx-2 h-px w-4 bg-border sm:w-6" /> : null}
                </li>
              );
            })}
          </ol>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="min-h-[220px] rounded-xl border border-border bg-muted/30 p-4">
            {step === 1 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Step 1 · Select Subject</p>
                <select aria-label="Subject" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={subjects === null}>
                  <option value="">{subjects === null ? 'Loading subjects…' : 'Select subject'}</option>
                  {(subjects ?? []).map((s) => <option key={s.id} value={String(s.id)}>{s.code ? `${s.code} · ${s.title}` : s.title}</option>)}
                </select>
                {subject && subject.courses.length > 1 ? (
                  <label className="block space-y-1 text-xs text-muted-foreground">
                    <span>File the questions under course (the subject is shared — its questions show for every linked course)</span>
                    <select aria-label="Course" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                      {subject.courses.map((c) => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
                    </select>
                  </label>
                ) : null}
                <p className="text-xs text-muted-foreground">All uploaded questions will be mapped to the selected subject.</p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Step 2 · Download Sample Template</p>
                <p className="text-xs text-muted-foreground">
                  One question per row: type (MCQ or Descriptive), question, options A–D, and the correct option letter. For True / False, use MCQ with
                  options True and False. Blank options at the end are ignored; a blank option in the middle is an error.
                </p>
                <Button variant="outline" className="gap-1.5" onClick={downloadQuestionTemplate}><FileDown aria-hidden="true" className="size-4" /> Download CSV Template</Button>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Step 3 · Upload CSV File</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Upload aria-hidden="true" className="size-6 text-muted-foreground" />
                  <span className="text-sm">Click to choose a .csv file</span>
                  {fileName ? <span className="text-xs text-primary">{fileName} · {rows.length} question{rows.length === 1 ? '' : 's'} read</span> : null}
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = ''; }} />
                {problems.length > 0 ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    <p className="font-medium">{problems.length} line{problems.length === 1 ? '' : 's'} could not be read and will be left out:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {problems.slice(0, 8).map((p) => <li key={p.line}>Line {p.line}: {p.reason}</li>)}
                      {problems.length > 8 ? <li>…and {problems.length - 8} more (see the error report in the next step).</li> : null}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Step 4 · Validate &amp; Preview</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={() => { void validate(); }}>
                      <CheckCircle2 aria-hidden="true" className="size-3.5" /> {busy ? 'Validating…' : 'Re-validate'}
                    </Button>
                    {report && (counts?.ok ?? 0) < report.length + problems.length ? (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadCsv('question-upload-errors.csv', toCsv(errorReportRows(rows, report, problems)))}>
                        <Download aria-hidden="true" className="size-3.5" /> Download Error Report
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Checks the type, empty text, options and answer, and questions already in this subject (or twice in the file).</p>
                {counts ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatBox label="Total" value={rows.length + problems.length} tone="primary" />
                    <StatBox label="Ready" value={counts.ok} tone="emerald" />
                    <StatBox label="Duplicates" value={counts.duplicate} tone="amber" />
                    <StatBox label="Errors" value={counts.invalid + problems.length} tone="rose" />
                  </div>
                ) : null}
                {report ? <PreviewTable rows={rows} statusOf={(i) => reportByRow.get(i + 1)} /> : null}
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-3">
                {reasons === null ? (
                  <div className="space-y-2 py-6 text-center">
                    <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
                    <p className="text-sm font-medium">Ready to import {counts?.ok ?? 0} question{counts?.ok === 1 ? '' : 's'} into {subject?.title ?? 'the subject'}</p>
                    <p className="text-xs text-muted-foreground">Duplicates and rows with errors are skipped.</p>
                  </div>
                ) : rows.length === 0 ? (
                  <div className="space-y-2 py-6 text-center">
                    <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
                    <p className="text-sm font-medium">All questions imported.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">{rows.length} row{rows.length === 1 ? ' was' : 's were'} not imported — fix {rows.length === 1 ? 'it' : 'them'} in the file and upload again:</p>
                    <PreviewTable rows={rows} reasonOf={(row) => reasons.get(row.line) ?? ''} />
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>Close</Button>
          {step > 1 && reasons === null ? <Button variant="outline" disabled={busy} onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</Button> : null}
          {step < STEPS.length ? (
            <Button onClick={goNext} disabled={!canContinue}>Continue</Button>
          ) : reasons === null ? (
            <Button className="gap-1.5" disabled={busy || (counts?.ok ?? 0) === 0} onClick={() => { void runImport(); }}>
              <CheckCircle2 aria-hidden="true" className="size-4" /> {busy ? 'Importing…' : 'Import Questions'}
            </Button>
          ) : (
            <Button onClick={() => { setStep(3); setReasons(null); setFileName(''); setRows([]); setProblems([]); }}>Upload another file</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewTable({
  rows, statusOf, reasonOf,
}: {
  rows: ImportRow[];
  statusOf?: (index: number) => RowReport | undefined;
  reasonOf?: (row: ImportRow) => string;
}) {
  return (
    <div className="max-h-[300px] overflow-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-14 text-xs">Line</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Question</TableHead>
            <TableHead className="text-xs">Answer</TableHead>
            <TableHead className="text-xs">{statusOf ? 'Status' : 'Reason'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const q = row.question;
            const status = statusOf?.(i);
            const answer = q.qType === 1 ? '—' : q.correctAnswers.map((c) => `${String.fromCharCode(65 + c)}. ${q.options[c] ?? ''}`).join(', ');
            return (
              <TableRow key={`${row.line}-${i}`}>
                <TableCell className="text-xs text-muted-foreground">{row.line}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{KIND_LABEL[kindOf(q.qType, q.options)]}</TableCell>
                <TableCell className="max-w-[320px] text-xs"><p className="line-clamp-2">{q.title}</p></TableCell>
                <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground" title={answer}>{answer}</TableCell>
                <TableCell className="max-w-[240px] text-xs">
                  {status ? (
                    <div className="space-y-0.5">
                      <Pill tone={STATUS_PILL[status.status].tone}>{STATUS_PILL[status.status].label}</Pill>
                      {status.reason ? <p className="text-muted-foreground">{status.reason}</p> : null}
                    </div>
                  ) : (
                    <span className="text-rose-700">{reasonOf?.(row)}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
