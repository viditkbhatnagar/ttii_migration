import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { useConfirm } from '@/components/confirm-dialog';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

const Q_TYPE_LABELS: Record<number, string> = { 0: 'MCQ', 1: 'Descriptive' };

// Naji 2026-05-09 — Question Bank rebuilt to match the new spec:
//   1) Choose Subject (+ Course) and Type (MCQ / Descriptive).
//   2) Individual entry — type question + options + mark right answer
//      (MCQ) or just type question + solution (Descriptive).
//   3) OR Bulk upload — download a CSV template, fill in, upload, review,
//      then save.
export default function QuestionBankPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  // Filters
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [lessonFilter, setLessonFilter] = useState('');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [lessons, setLessons] = useState<Record<string, unknown>[]>([]);

  // Single-question modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mCourseId, setMCourseId] = useState('');
  const [mSubjectId, setMSubjectId] = useState('');
  const [mLessonId, setMLessonId] = useState('');
  const [mQType, setMQType] = useState<0 | 1>(0); // 0=MCQ, 1=Descriptive
  const [mTitle, setMTitle] = useState('');
  const [mHint, setMHint] = useState('');
  const [mSolution, setMSolution] = useState('');
  const [mOptions, setMOptions] = useState<string[]>(['', '', '', '']);
  const [mCorrect, setMCorrect] = useState<number | null>(null);
  const [mModalSubjects, setMModalSubjects] = useState<Record<string, unknown>[]>([]);
  const [mModalLessons, setMModalLessons] = useState<Record<string, unknown>[]>([]);

  // Bulk upload state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCourseId, setBulkCourseId] = useState('');
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  const [bulkSubjects, setBulkSubjects] = useState<Record<string, unknown>[]>([]);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load courses
  useEffect(() => {
    void api.loadCourses(session.token).then(setCourses).catch(() => undefined);
  }, [api, session.token]);

  // Cascade subjects/lessons for filters
  useEffect(() => {
    if (courseFilter) void api.loadSubjects(session.token, courseFilter).then(setSubjects).catch(() => setSubjects([]));
    else setSubjects([]);
    setSubjectFilter('');
    setLessonFilter('');
  }, [api, session.token, courseFilter]);
  useEffect(() => {
    if (subjectFilter) void api.loadLessons(session.token, subjectFilter).then(setLessons).catch(() => setLessons([]));
    else setLessons([]);
    setLessonFilter('');
  }, [api, session.token, subjectFilter]);

  // Cascade subjects/lessons for the single-question modal
  useEffect(() => {
    if (!mCourseId) { setMModalSubjects([]); return; }
    void api.loadSubjects(session.token, mCourseId).then(setMModalSubjects).catch(() => setMModalSubjects([]));
  }, [api, session.token, mCourseId]);
  useEffect(() => {
    if (!mSubjectId) { setMModalLessons([]); return; }
    void api.loadLessons(session.token, mSubjectId).then(setMModalLessons).catch(() => setMModalLessons([]));
  }, [api, session.token, mSubjectId]);

  // Cascade subjects for bulk dialog
  useEffect(() => {
    if (!bulkCourseId) { setBulkSubjects([]); return; }
    void api.loadSubjects(session.token, bulkCourseId).then(setBulkSubjects).catch(() => setBulkSubjects([]));
  }, [api, session.token, bulkCourseId]);

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setMCourseId('');
    setMSubjectId('');
    setMLessonId('');
    setMQType(0);
    setMTitle('');
    setMHint('');
    setMSolution('');
    setMOptions(['', '', '', '']);
    setMCorrect(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id));
    setMCourseId(asString(row.course_id));
    setMSubjectId(asString(row.subject_id));
    setMLessonId(asString(row.lesson_id));
    const qt = asNumber(row.q_type);
    setMQType(qt === 1 ? 1 : 0);
    setMTitle(asString(row.title));
    setMHint(asString(row.hint));
    setMSolution(asString(row.solution));
    let opts: string[] = [];
    let correct: number[] = [];
    try { const raw = JSON.parse(asString(row.options) || '[]') as unknown; if (Array.isArray(raw)) opts = raw.map((v) => asString(v)); } catch { /* leave empty */ }
    try { const raw = JSON.parse(asString(row.correct_answers) || '[]') as unknown; if (Array.isArray(raw)) correct = raw.map((v) => asNumber(v)); } catch { /* leave empty */ }
    setMOptions(opts.length > 0 ? opts : ['', '', '', '']);
    setMCorrect(correct.length > 0 ? (correct[0] ?? null) : null);
    setModalOpen(true);
  }, []);

  const setOption = (idx: number, val: string) => setMOptions((cur) => cur.map((o, i) => i === idx ? val : o));
  const addOption = () => setMOptions((cur) => cur.length < 6 ? [...cur, ''] : cur);
  const removeOption = (idx: number) => setMOptions((cur) => cur.length > 2 ? cur.filter((_, i) => i !== idx) : cur);

  const handleSave = useCallback(async () => {
    if (!mCourseId) { toast.error('Course is required.'); return; }
    if (!mSubjectId) { toast.error('Subject is required.'); return; }
    if (!mTitle.trim()) { toast.error('Question text is required.'); return; }
    if (mQType === 0) {
      const filled = mOptions.filter((o) => o.trim().length > 0);
      if (filled.length < 2) { toast.error('At least 2 options for MCQ.'); return; }
      if (mCorrect === null) { toast.error('Mark the correct answer.'); return; }
    }
    setSubmitting(true);
    try {
      const payload = {
        courseId: mCourseId,
        subjectId: mSubjectId,
        lessonId: mLessonId,
        qType: mQType,
        title: mTitle.trim(),
        numberOfOptions: mQType === 0 ? mOptions.filter((o) => o.trim().length > 0).length : 0,
        options: mQType === 0 ? JSON.stringify(mOptions.filter((o) => o.trim().length > 0)) : '[]',
        correctAnswers: mQType === 0 && mCorrect !== null ? JSON.stringify([mCorrect]) : '[]',
        hint: mHint.trim(),
        solution: mSolution.trim(),
      };
      if (editingId) await api.editQuestion(session.token, editingId, payload);
      else await api.addQuestion(session.token, payload);
      toast.success(editingId ? 'Question updated.' : 'Question added.');
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save question.');
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, session.token, editingId, mCourseId, mSubjectId, mLessonId, mQType, mTitle, mHint, mSolution, mOptions, mCorrect]);

  // Bulk upload helpers
  const downloadTemplate = () => {
    const headers = ['type (MCQ or Descriptive)', 'question_title', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option (A/B/C/D)', 'hint', 'solution'];
    const sample1 = ['MCQ', 'What is 2 + 2?', '3', '4', '5', '6', 'B', '', 'Basic addition'];
    const sample2 = ['Descriptive', 'Explain the principle of separation of powers in 200 words.', '', '', '', '', '', '', ''];
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
    const rows = parseCsv(text);
    if (rows.length < 2) { toast.error('CSV is empty.'); return; }
    const parsed: BulkRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const type = (r[0] ?? '').toLowerCase().trim();
      const title = (r[1] ?? '').trim();
      if (!title) continue;
      if (type === 'mcq') {
        const opts = [r[2], r[3], r[4], r[5]].map((v) => (v ?? '').trim()).filter((v) => v.length > 0);
        const correctLetter = (r[6] ?? '').trim().toUpperCase();
        const correctIdx = correctLetter ? correctLetter.charCodeAt(0) - 65 : -1;
        parsed.push({ qType: 0, title, options: opts, correctAnswers: correctIdx >= 0 && correctIdx < opts.length ? [correctIdx] : [], hint: (r[7] ?? '').trim(), solution: (r[8] ?? '').trim() });
      } else if (type === 'descriptive') {
        parsed.push({ qType: 1, title, options: [], correctAnswers: [], hint: (r[7] ?? '').trim(), solution: (r[8] ?? '').trim() });
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
      const rows = bulkRows.map((r) => ({
        course_id: bulkCourseId,
        subject_id: bulkSubjectId,
        q_type: r.qType,
        title: r.title,
        options: r.options,
        correct_answers: r.correctAnswers,
        hint: r.hint,
        solution: r.solution,
      }));
      const res = await api.bulkAddQuestions(session.token, rows as unknown as Record<string, unknown>[]);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Uploaded.';
      if (status === 1) {
        toast.success(message);
        setBulkOpen(false);
        setBulkRows([]);
        reload();
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk upload failed.');
    } finally {
      setBulkUploading(false);
    }
  };

  // Data + columns
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadQuestionBank(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(subjectFilter ? { subjectId: subjectFilter } : {}),
      ...(lessonFilter ? { lessonId: lessonFilter } : {}),
    }),
    [courseFilter, subjectFilter, lessonFilter],
  );

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id);
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this question?',
      description: 'This soft-deletes the question. It will no longer appear in the bank.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteQuestion(session.token, id);
      const status = (res as { status?: number }).status;
      if (status === 1) { toast.success('Question deleted.'); reload(); }
      else toast.error(asString((res as { message?: unknown }).message) || 'Could not delete.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete.');
    }
  }, [api, session.token, confirm, reload]);
  const questions = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'title', label: 'Question', sortable: true, render: (v) => { const t = asString(v); return t.length > 80 ? `${t.slice(0, 80)}…` : t; } },
    { key: 'course_title', label: 'Course' },
    { key: 'subject_title', label: 'Subject' },
    { key: 'q_type', label: 'Type', render: (v) => <AdminStatusBadge status={Q_TYPE_LABELS[asNumber(v)] ?? 'MCQ'} /> },
    { key: 'number_of_options', label: 'Options' },
    { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    { key: 'course', label: 'Course', type: 'select', value: courseFilter, placeholder: 'All Courses', options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })), onChange: setCourseFilter },
    { key: 'subject', label: 'Subject', type: 'select', value: subjectFilter, placeholder: 'All Subjects', options: subjects.map((s) => ({ label: asString(s.title), value: asString(s.id) })), onChange: setSubjectFilter },
    { key: 'lesson', label: 'Lesson', type: 'select', value: lessonFilter, placeholder: 'All Lessons', options: lessons.map((l) => ({ label: asString(l.title), value: asString(l.id) })), onChange: setLessonFilter },
  ], [courseFilter, subjectFilter, lessonFilter, courses, subjects, lessons]);

  if (loading) return <PageLoader label="Loading question bank…" />;
  if (error) return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Question Bank" addLabel="+ Add Question" onAdd={openAddModal}>
        <Button variant="outline" onClick={() => { setBulkRows([]); setBulkCourseId(''); setBulkSubjectId(''); setBulkOpen(true); }}>
          Bulk Upload
        </Button>
      </AdminPageHeader>

      <AdminFilterBar filters={filters} onApply={() => {}} onClear={() => { setCourseFilter(''); setSubjectFilter(''); setLessonFilter(''); }} />

      <AdminDataTable
        columns={columns}
        rows={questions}
        actions={[
          { label: 'Edit', onClick: (row) => openEditModal(row) },
          { label: 'Delete', onClick: (row) => { void handleDelete(row); }, variant: 'destructive' },
        ]}
      />

      {/* Single-question Add/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Question' : 'Add Question'}</DialogTitle>
            <DialogDescription>Pick the Subject and Type. For MCQ, add the choices and tick the correct answer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }} className="w-full min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Course *</Label>
                <select value={mCourseId} onChange={(e) => { setMCourseId(e.target.value); setMSubjectId(''); setMLessonId(''); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Choose Course</option>
                  {courses.map((c) => <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Subject *</Label>
                <select value={mSubjectId} onChange={(e) => { setMSubjectId(e.target.value); setMLessonId(''); }} disabled={!mCourseId} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">{mCourseId ? 'Choose Subject' : 'Pick a course first'}</option>
                  {mModalSubjects.map((s) => <option key={asString(s.id)} value={asString(s.id)}>{asString(s.title)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Lesson (optional)</Label>
                <select value={mLessonId} onChange={(e) => setMLessonId(e.target.value)} disabled={!mSubjectId} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">{mSubjectId ? 'No lesson' : 'Pick a subject first'}</option>
                  {mModalLessons.map((l) => <option key={asString(l.id)} value={asString(l.id)}>{asString(l.title)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Type *</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMQType(0)} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${mQType === 0 ? 'border-ttii-primary bg-ttii-primary/5 text-ttii-primary' : 'border-slate-200 text-slate-600'}`}>MCQ</button>
                  <button type="button" onClick={() => setMQType(1)} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${mQType === 1 ? 'border-ttii-primary bg-ttii-primary/5 text-ttii-primary' : 'border-slate-200 text-slate-600'}`}>Descriptive</button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Question *</Label>
              <textarea value={mTitle} onChange={(e) => setMTitle(e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Type the question here." />
            </div>

            {mQType === 0 ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                <div className="flex items-center justify-between">
                  <Label>Options *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addOption} disabled={mOptions.length >= 6}>+ Add option</Button>
                </div>
                <p className="text-xs text-slate-500">Tick the radio next to the correct answer.</p>
                {mOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={mCorrect === idx} onChange={() => setMCorrect(idx)} className="size-4" />
                    <span className="w-6 text-xs font-semibold text-slate-500">{String.fromCharCode(65 + idx)}.</span>
                    <Input value={opt} onChange={(e) => setOption(idx, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + idx)}`} className="flex-1" />
                    {mOptions.length > 2 ? <button type="button" onClick={() => removeOption(idx)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">×</button> : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Hint (optional)</Label>
                <textarea value={mHint} onChange={(e) => setMHint(e.target.value)} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <Label>{mQType === 1 ? 'Model Answer (optional)' : 'Solution (optional)'}</Label>
                <textarea value={mSolution} onChange={(e) => setMSolution(e.target.value)} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" className="bg-ttii-primary hover:bg-ttii-primary/90" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk upload dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="w-[min(960px,calc(100vw-2rem))] max-w-[min(960px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Bulk Upload Questions</DialogTitle>
            <DialogDescription>Pick course + subject, download the template, fill it in, then upload to review before saving.</DialogDescription>
          </DialogHeader>
          <div className="w-full min-w-0 space-y-4">
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
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
          <DialogFooter>
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
      // Skip CRLF
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
