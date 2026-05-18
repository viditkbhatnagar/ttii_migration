import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { ArrowLeft } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { useConfirm } from '@/components/confirm-dialog';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

type SubjectRow = {
  id: number;
  subject_code: string | null;
  title: string | null;
  courses: { id: number; title: string }[];
  mcq_count: number;
  descriptive_count: number;
};

// Naji UAT 2026-05-18 — Question Bank detail per subject:
//   - Header: code | name | course chips
//   - Tabs: MCQ | Descriptive
//   - Each tab lists the questions of that type, with Edit + Delete
//   - Add Question button pre-fills subject + type from this page's context
export default function ViewSubjectQuestionsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const subjectId = useMemo(() => {
    const match = window.location.pathname.match(/\/admin\/question_bank\/view\/(.+)/);
    return match?.[1] ?? '';
  }, []);

  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = MCQ, 1 = Descriptive

  // Subject header — comes from the same /subjects endpoint, filtered to one row.
  const { data: subjectData, loading: subjectLoading, error: subjectError } = useAdminPageData(
    () => (subjectId ? api.loadQuestionBankSubjects(session.token, { subjectId }) : Promise.resolve([] as Record<string, unknown>[])),
    [subjectId],
  );
  const subject = useMemo(() => {
    const list = toRecords(subjectData);
    return (list[0] ?? null) as unknown as SubjectRow | null;
  }, [subjectData]);

  // Questions list for the active tab.
  const { data: qData, loading: qLoading, error: qError, reload: reloadQuestions } = useAdminPageData(
    () => (subjectId
      ? api.loadQuestionBank(session.token, { subjectId, qType: activeTab })
      : Promise.resolve([] as Record<string, unknown>[])),
    [subjectId, activeTab],
  );
  const questions = useMemo(() => toRecords(qData), [qData]);

  // ── Add / Edit modal ─────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mLessonId, setMLessonId] = useState('');
  const [mCourseId, setMCourseId] = useState('');
  const [mTitle, setMTitle] = useState('');
  const [mHint, setMHint] = useState('');
  const [mSolution, setMSolution] = useState('');
  const [mOptions, setMOptions] = useState<string[]>(['', '', '', '']);
  const [mCorrect, setMCorrect] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Record<string, unknown>[]>([]);

  // Pick the first linked course as default if no course is set yet on the
  // question. Subjects can belong to multiple courses; the user can switch
  // inside the form if they want a different one.
  const defaultCourseId = useMemo(() => asString(subject?.courses?.[0]?.id ?? ''), [subject]);

  useEffect(() => {
    if (!subjectId) { setLessons([]); return; }
    void api.loadLessons(session.token, subjectId).then(setLessons).catch(() => setLessons([]));
  }, [api, session.token, subjectId]);

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setMCourseId(defaultCourseId);
    setMLessonId('');
    setMTitle('');
    setMHint('');
    setMSolution('');
    setMOptions(['', '', '', '']);
    setMCorrect(null);
    setModalOpen(true);
  }, [defaultCourseId]);

  const openEditModal = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id));
    setMCourseId(asString(row.course_id) || defaultCourseId);
    setMLessonId(asString(row.lesson_id));
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
  }, [defaultCourseId]);

  const setOption = (idx: number, val: string) => setMOptions((cur) => cur.map((o, i) => i === idx ? val : o));
  const addOption = () => setMOptions((cur) => cur.length < 6 ? [...cur, ''] : cur);
  const removeOption = (idx: number) => setMOptions((cur) => cur.length > 2 ? cur.filter((_, i) => i !== idx) : cur);

  const handleSave = useCallback(async () => {
    if (!subjectId) { toast.error('Missing subject.'); return; }
    if (!mTitle.trim()) { toast.error('Question text is required.'); return; }
    if (activeTab === 0) {
      const filled = mOptions.filter((o) => o.trim().length > 0);
      if (filled.length < 2) { toast.error('At least 2 options for MCQ.'); return; }
      if (mCorrect === null) { toast.error('Mark the correct answer.'); return; }
    }
    setSubmitting(true);
    try {
      const payload = {
        courseId: mCourseId,
        subjectId,
        lessonId: mLessonId,
        qType: activeTab,
        title: mTitle.trim(),
        numberOfOptions: activeTab === 0 ? mOptions.filter((o) => o.trim().length > 0).length : 0,
        options: activeTab === 0 ? JSON.stringify(mOptions.filter((o) => o.trim().length > 0)) : '[]',
        correctAnswers: activeTab === 0 && mCorrect !== null ? JSON.stringify([mCorrect]) : '[]',
        hint: mHint.trim(),
        solution: mSolution.trim(),
      };
      if (editingId) await api.editQuestion(session.token, editingId, payload);
      else await api.addQuestion(session.token, payload);
      toast.success(editingId ? 'Question updated.' : 'Question added.');
      setModalOpen(false);
      reloadQuestions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save question.');
    } finally {
      setSubmitting(false);
    }
  }, [api, session.token, subjectId, activeTab, editingId, mCourseId, mLessonId, mTitle, mHint, mSolution, mOptions, mCorrect, reloadQuestions]);

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
      if (status === 1) { toast.success('Question deleted.'); reloadQuestions(); }
      else toast.error(asString((res as { message?: unknown }).message) || 'Could not delete.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete.');
    }
  }, [api, session.token, confirm, reloadQuestions]);

  const mcqColumns: DataTableColumn[] = useMemo(() => [
    {
      key: 'title',
      label: 'Question',
      sortable: true,
      render: (v) => { const t = asString(v); return t.length > 100 ? `${t.slice(0, 100)}…` : t; },
    },
    { key: 'number_of_options', label: 'Options', render: (v) => asNumber(v) || '—' },
    { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
  ], []);

  const descColumns: DataTableColumn[] = useMemo(() => [
    {
      key: 'title',
      label: 'Question',
      sortable: true,
      render: (v) => { const t = asString(v); return t.length > 140 ? `${t.slice(0, 140)}…` : t; },
    },
    { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
  ], []);

  if (subjectLoading) return <PageLoader label="Loading subject…" />;
  if (subjectError || !subject) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {subjectError ?? 'Subject not found or has no questions yet.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to Question Bank"
          onClick={() => onNavigate('/admin/question_bank/index')}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <h1 className="text-xl font-semibold text-slate-900">Question Bank</h1>
      </div>

      {/* Header card: code | name | courses */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Code</div>
            <div className="text-base font-semibold text-slate-900">{subject.subject_code || '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Subject</div>
            <div className="text-base font-semibold text-slate-900">{subject.title || '—'}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Courses</div>
            {subject.courses.length === 0 ? (
              <div className="text-sm text-slate-400">—</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {subject.courses.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {c.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([
          { key: 0 as const, label: `MCQ (${subject.mcq_count})` },
          { key: 1 as const, label: `Descriptive (${subject.descriptive_count})` },
        ]).map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'border-ttii-primary text-ttii-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              aria-pressed={active}
            >
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto pb-1">
          <Button size="sm" className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={openAddModal}>
            + Add {activeTab === 0 ? 'MCQ' : 'Descriptive'} Question
          </Button>
        </div>
      </div>

      {/* Questions table */}
      {qLoading ? (
        <PageLoader label="Loading questions…" />
      ) : qError ? (
        <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{qError}</CardContent></Card>
      ) : (
        <AdminDataTable
          columns={activeTab === 0 ? mcqColumns : descColumns}
          rows={questions}
          actions={[
            { label: 'Edit', onClick: (row) => openEditModal(row) },
            { label: 'Delete', onClick: (row) => { void handleDelete(row); }, variant: 'destructive' },
          ]}
        />
      )}

      {/* Add/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} {activeTab === 0 ? 'MCQ' : 'Descriptive'} Question</DialogTitle>
            <DialogDescription>
              Subject: {subject.title || '—'}
              {subject.subject_code ? ` (${subject.subject_code})` : ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }} className="w-full min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Course *</Label>
                <select value={mCourseId} onChange={(e) => setMCourseId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Choose Course</option>
                  {subject.courses.map((c) => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Lesson (optional)</Label>
                <select value={mLessonId} onChange={(e) => setMLessonId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">No lesson</option>
                  {lessons.map((l) => <option key={asString(l.id)} value={asString(l.id)}>{asString(l.title)}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Question *</Label>
              <textarea value={mTitle} onChange={(e) => setMTitle(e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Type the question here." />
            </div>

            {activeTab === 0 ? (
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
                <Label>{activeTab === 1 ? 'Model Answer (optional)' : 'Solution (optional)'}</Label>
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
    </div>
  );
}
