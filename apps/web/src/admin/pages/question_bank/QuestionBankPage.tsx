import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

// Naji UAT 2026-05-18 — Question Bank reorganised by Subject. The page now
// lists one row per subject with course chips + MCQ/Descriptive counts and a
// View action that opens /admin/question_bank/view/:subjectId (tabbed by type
// with Edit/Delete on each row). Add Question moved into the detail page so
// the subject + type are pre-filled from context. Bulk upload stays here
// since the CSV upload already picks its own course/subject per batch.
export default function QuestionBankPage({ api, session, onNavigate }: AdminPageProps) {
  // Filters
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  // Bulk upload state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCourseId, setBulkCourseId] = useState('');
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  const [bulkSubjects, setBulkSubjects] = useState<Record<string, unknown>[]>([]);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load courses for filter + bulk dialog
  useEffect(() => {
    void api.loadCourses(session.token).then(setCourses).catch(() => undefined);
  }, [api, session.token]);

  useEffect(() => {
    if (!bulkCourseId) { setBulkSubjects([]); return; }
    void api.loadSubjects(session.token, bulkCourseId).then(setBulkSubjects).catch(() => setBulkSubjects([]));
  }, [api, session.token, bulkCourseId]);

  // List rows — one per subject with question counts.
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadQuestionBankSubjects(session.token, courseFilter ? { courseId: courseFilter } : {}),
    [courseFilter],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'subject_code', label: 'Subject Code', sortable: true, render: (v) => asString(v) || '—' },
    { key: 'title', label: 'Subject Name', sortable: true, render: (v) => asString(v) || '—' },
    {
      key: 'courses',
      label: 'Courses',
      render: (value) => {
        const list = Array.isArray(value) ? (value as Array<{ id: number; title: string }>) : [];
        if (list.length === 0) return <span className="text-xs text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                {c.title}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'mcq_count',
      label: 'MCQ',
      sortable: true,
      render: (v) => (
        <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-blue-50 px-2 text-xs font-semibold text-blue-700">
          {asNumber(v)}
        </span>
      ),
    },
    {
      key: 'descriptive_count',
      label: 'Descriptive',
      sortable: true,
      render: (v) => (
        <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-purple-50 px-2 text-xs font-semibold text-purple-700">
          {asNumber(v)}
        </span>
      ),
    },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course',
      label: 'Course',
      type: 'select',
      value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
  ], [courseFilter, courses]);

  const handleView = useCallback((row: Record<string, unknown>) => {
    const id = asString(row.id);
    if (!id) return;
    onNavigate(`/admin/question_bank/view/${id}`);
  }, [onNavigate]);

  // Bulk upload helpers
  const downloadTemplate = () => {
    // Risha UAT 2026-05-22 — dropped the hint + solution columns from
    // the template; the team doesn't capture those for question bank
    // imports, so seeing them in the CSV was confusing.
    const headers = ['type (MCQ or Descriptive)', 'question_title', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option (A/B/C/D)'];
    const sample1 = ['MCQ', 'What is 2 + 2?', '3', '4', '5', '6', 'B'];
    const sample2 = ['Descriptive', 'Explain the principle of separation of powers in 200 words.', '', '', '', '', ''];
    const csv = [headers, sample1, sample2].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question-bank-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const csvRows = parseCsv(text);
    if (csvRows.length < 2) { toast.error('CSV is empty.'); return; }
    const parsed: BulkRow[] = [];
    for (let i = 1; i < csvRows.length; i++) {
      const r = csvRows[i];
      if (!r) continue;
      const type = (r[0] ?? '').toLowerCase().trim();
      const title = (r[1] ?? '').trim();
      if (!title) continue;
      if (type === 'mcq') {
        const opts = [r[2], r[3], r[4], r[5]].map((v) => (v ?? '').trim()).filter((v) => v.length > 0);
        const correctLetter = (r[6] ?? '').trim().toUpperCase();
        const correctIdx = correctLetter ? correctLetter.charCodeAt(0) - 65 : -1;
        // Risha UAT 2026-05-22 — hint/solution dropped from template;
        // still tolerate them when present (legacy CSVs) but default
        // to empty when the column is absent.
        parsed.push({
          qType: 0,
          title,
          options: opts,
          correctAnswers: correctIdx >= 0 && correctIdx < opts.length ? [correctIdx] : [],
          hint: (r[7] ?? '').trim(),
          solution: (r[8] ?? '').trim(),
        });
      } else if (type === 'descriptive') {
        parsed.push({
          qType: 1,
          title,
          options: [],
          correctAnswers: [],
          hint: (r[7] ?? '').trim(),
          solution: (r[8] ?? '').trim(),
        });
      }
    }
    if (parsed.length === 0) { toast.error('No valid rows in CSV.'); return; }
    setBulkRows(parsed);
  };

  const removeBulkRow = (idx: number) => setBulkRows((cur) => cur.filter((_, i) => i !== idx));

  const handleBulkUpload = async () => {
    if (!bulkCourseId || !bulkSubjectId) { toast.error('Pick course + subject for the upload.'); return; }
    if (bulkRows.length === 0) { toast.error('Nothing to upload.'); return; }
    setBulkUploading(true);
    try {
      const payload = bulkRows.map((r) => ({
        course_id: bulkCourseId,
        subject_id: bulkSubjectId,
        q_type: r.qType,
        title: r.title,
        options: r.options,
        correct_answers: r.correctAnswers,
        hint: r.hint,
        solution: r.solution,
      }));
      const res = await api.bulkAddQuestions(session.token, payload as unknown as Record<string, unknown>[]);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Uploaded.';
      const data = (res as { data?: { failures?: Array<{ row: number; title: string; error: string }> } }).data;
      const failures = Array.isArray(data?.failures) ? data.failures : [];
      if (status === 1) {
        toast.success(message);
        setBulkOpen(false);
        setBulkRows([]);
        reload();
      } else if (failures.length > 0) {
        const first = failures[0];
        const sample = first ? ` First error (row ${first.row}): ${first.error}` : '';
        toast.error(`${message}${sample}`);
        console.error('[QuestionBank.bulkUpload] per-row failures:', failures);
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk upload failed.');
    } finally {
      setBulkUploading(false);
    }
  };

  if (loading) return <PageLoader label="Loading question bank…" />;
  if (error) return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Question Bank">
        {/* Risha UAT 2026-05-22 — renamed from "Bulk Upload" to make the
            CSV intent explicit. The dialog still hosts both Download
            Template and Upload CSV inline. */}
        <Button variant="outline" onClick={() => { setBulkRows([]); setBulkCourseId(''); setBulkSubjectId(''); setBulkOpen(true); }}>
          Upload CSV
        </Button>
      </AdminPageHeader>

      <AdminFilterBar filters={filters} onApply={() => {}} onClear={() => setCourseFilter('')} />

      <AdminDataTable
        columns={columns}
        rows={rows}
        actions={[
          { label: 'View', onClick: (row) => handleView(row) },
        ]}
      />

      {/* Bulk upload dialog */}
      {/* Risha UAT 2026-05-25 — a 50-row CSV review pushed the footer
          off-screen so the Upload button was unreachable. Cap the dialog
          height at 90vh, pin header + footer, and scroll the middle body. */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="flex max-h-[90vh] w-[min(960px,calc(100vw-2rem))] max-w-[min(960px,calc(100vw-2rem))] flex-col">
          <DialogHeader>
            <DialogTitle>Upload Questions via CSV</DialogTitle>
            <DialogDescription>Pick course + subject, download the template, fill it in, then upload to review before saving.</DialogDescription>
          </DialogHeader>
          <div className="w-full min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Course *</Label>
                <select value={bulkCourseId} onChange={(e) => { setBulkCourseId(e.target.value); setBulkSubjectId(''); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Choose Course</option>
                  {courses.map((c) => <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Subject *</Label>
                <select value={bulkSubjectId} onChange={(e) => setBulkSubjectId(e.target.value)} disabled={!bulkCourseId} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">{bulkCourseId ? 'Choose Subject' : 'Pick a course first'}</option>
                  {bulkSubjects.map((s) => <option key={asString(s.id)} value={asString(s.id)}>{asString(s.title)}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Button type="button" variant="outline" onClick={downloadTemplate}>Download CSV Template</Button>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Choose CSV File</Button>
              <span className="text-xs text-slate-500">{bulkRows.length > 0 ? `${bulkRows.length} row(s) parsed.` : 'Use the template — first row is headers; one question per row.'}</span>
            </div>

            {bulkRows.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Question</th>
                      <th className="px-3 py-2 text-left">Options</th>
                      <th className="px-3 py-2 text-left">Correct</th>
                      <th className="px-3 py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkRows.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2"><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${r.qType === 0 ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{r.qType === 0 ? 'MCQ' : 'Descriptive'}</span></td>
                        <td className="px-3 py-2"><p className="text-sm text-gray-900">{r.title.length > 80 ? r.title.slice(0, 80) + '…' : r.title}</p></td>
                        <td className="px-3 py-2 text-xs text-gray-600">{r.options.length > 0 ? r.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(' · ') : '—'}</td>
                        <td className="px-3 py-2 text-xs text-emerald-700">{r.qType === 0 && r.correctAnswers.length > 0 && r.correctAnswers[0] !== undefined ? String.fromCharCode(65 + r.correctAnswers[0]) : '—'}</td>
                        <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeBulkRow(idx)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
          <DialogFooter className="shrink-0 border-t border-slate-200 pt-3">
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkUploading}>Cancel</Button>
            <Button type="button" className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => { void handleBulkUpload(); }} disabled={bulkUploading || bulkRows.length === 0 || !bulkCourseId || !bulkSubjectId}>
              {bulkUploading ? 'Uploading…' : `Upload ${bulkRows.length} Question(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BulkRow {
  qType: 0 | 1;
  title: string;
  options: string[];
  correctAnswers: number[];
  hint: string;
  solution: string;
}

// Minimal RFC-4180-ish CSV parser for our template (handles quoted fields with commas / newlines).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { cur.push(field); field = ''; i++; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      rows.push(cur); cur = [];
      i++;
      continue;
    }
    field += c; i++;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}
