import { useCallback, useMemo, useState, Fragment } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

// Naji 2026-05-09 — Evaluation drill-down.
//   Top: list of published exams with allocated/attempted counts +
//   "Result published" status. Click → expands to show subjects in
//   that exam → click subject → expands to show students with their
//   MCQ auto-score. (Manual descriptive grading dialog ships with
//   the per-question UI in a follow-up — for now the page surfaces
//   how many descriptive answers are graded vs pending.)
//   Per exam: a "Publish Results" button that emails students.

interface ExamRow { exam_id: number; exam_code: string; title: string; from_date: string; allocated: number; attempted: number; result_published: boolean }
interface SubjectRow { exam_subject_id: number; subject_title: string; exam_date: string; total_marks: number; pass_marks: number; mcq_questions: number; descriptive_questions: number }
interface StudentRow { user_id: number; student_id: string; name: string; email: string; attempt_id: number | null; attempted: boolean; submit_status: boolean; mcq_score: number; correct: number; incorrect: number; skip: number; descriptive_graded: number }

export default function ExamEvaluationPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [openExam, setOpenExam] = useState<number | null>(null);
  const [openSubject, setOpenSubject] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [publishing, setPublishing] = useState<number | null>(null);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listEvaluationExams(session.token),
    [],
  );
  const exams = useMemo<ExamRow[]>(() => toRecords(data).map((r) => ({
    exam_id: asNumber(r.exam_id),
    exam_code: asString(r.exam_code),
    title: asString(r.title),
    from_date: asString(r.from_date),
    allocated: asNumber(r.allocated),
    attempted: asNumber(r.attempted),
    result_published: Boolean(r.result_published),
  })), [data]);

  const openExamRow = useCallback(async (examId: number) => {
    if (openExam === examId) { setOpenExam(null); setSubjects([]); setOpenSubject(null); setStudents([]); return; }
    setOpenExam(examId);
    setOpenSubject(null);
    setStudents([]);
    setSubjectsLoading(true);
    try {
      const rows = await api.listEvaluationSubjects(session.token, String(examId));
      setSubjects(rows.map((r) => ({
        exam_subject_id: asNumber(r.exam_subject_id),
        subject_title: asString(r.subject_title),
        exam_date: asString(r.exam_date),
        total_marks: asNumber(r.total_marks),
        pass_marks: asNumber(r.pass_marks),
        mcq_questions: asNumber(r.mcq_questions),
        descriptive_questions: asNumber(r.descriptive_questions),
      })));
    } finally { setSubjectsLoading(false); }
  }, [api, session.token, openExam]);

  const openSubjectRow = useCallback(async (subjectId: number, examId: number) => {
    if (openSubject === subjectId) { setOpenSubject(null); setStudents([]); return; }
    setOpenSubject(subjectId);
    setStudentsLoading(true);
    try {
      const rows = await api.listEvaluationStudents(session.token, String(examId));
      setStudents(rows.map((r) => ({
        user_id: asNumber(r.user_id),
        student_id: asString(r.student_id),
        name: asString(r.name),
        email: asString(r.email),
        attempt_id: r.attempt_id === null || r.attempt_id === undefined ? null : asNumber(r.attempt_id),
        attempted: Boolean(r.attempted),
        submit_status: Boolean(r.submit_status),
        mcq_score: asNumber(r.mcq_score),
        correct: asNumber(r.correct),
        incorrect: asNumber(r.incorrect),
        skip: asNumber(r.skip),
        descriptive_graded: asNumber(r.descriptive_graded),
      })));
    } finally { setStudentsLoading(false); }
  }, [api, session.token, openSubject]);

  const handlePublish = useCallback(async (exam: ExamRow) => {
    if (!(await confirm({ title: 'Publish results?', description: `Students allocated to "${exam.title}" will be emailed and can see their score on the portal.`, confirmText: 'Publish', variant: 'default' }))) return;
    setPublishing(exam.exam_id);
    try {
      const res = await api.publishExamResults(session.token, String(exam.exam_id));
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Done.';
      if (status === 1) {
        toast.success(message);
        reload();
      } else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish.');
    } finally { setPublishing(null); }
  }, [api, session.token, confirm, reload]);

  if (loading) return <PageLoader label="Loading evaluation…" />;
  if (error) return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Evaluation">
        <Button variant="outline" onClick={reload}>Refresh</Button>
      </AdminPageHeader>
      <p className="-mt-2 text-sm text-gray-500">MCQ answers are auto-evaluated. Descriptive answers need manual grading. Publish results once everything is reviewed.</p>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Exam</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Allocated</th>
                  <th className="px-3 py-2 text-right">Attempted</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">No published exams yet.</td></tr>
                ) : exams.map((e) => (
                  <Fragment key={e.exam_id}>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-3 py-2"><p className="text-sm font-medium text-gray-900">{e.title || '—'}</p><p className="font-mono text-[11px] text-gray-500">{e.exam_code}</p></td>
                      <td className="px-3 py-2 text-xs text-gray-700">{formatDate(e.from_date) || '—'}</td>
                      <td className="px-3 py-2 text-right text-sm text-gray-700">{e.allocated}</td>
                      <td className="px-3 py-2 text-right text-sm text-emerald-700">{e.attempted}</td>
                      <td className="px-3 py-2 text-center">
                        {e.result_published ? <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Result Published</span>
                          : <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Pending</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => { void openExamRow(e.exam_id); }}>{openExam === e.exam_id ? 'Hide' : 'View'}</Button>
                          {!e.result_published ? (
                            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { void handlePublish(e); }} disabled={publishing === e.exam_id}>
                              {publishing === e.exam_id ? 'Publishing…' : 'Publish Results'}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {openExam === e.exam_id ? (
                      <tr>
                        <td colSpan={6} className="bg-slate-50/40 p-4">
                          {subjectsLoading ? <p className="text-center text-sm text-gray-500">Loading subjects…</p> : subjects.length === 0 ? (
                            <p className="text-center text-sm text-gray-500">No subjects scheduled for this exam.</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subjects</p>
                              <div className="overflow-x-auto rounded-md border border-slate-200">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Subject</th>
                                      <th className="px-3 py-2 text-left">Date</th>
                                      <th className="px-3 py-2 text-right">Marks (Pass)</th>
                                      <th className="px-3 py-2 text-right">MCQ Q</th>
                                      <th className="px-3 py-2 text-right">Descriptive Q</th>
                                      <th className="px-3 py-2 text-right" />
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {subjects.map((s) => (
                                      <Fragment key={s.exam_subject_id}>
                                        <tr>
                                          <td className="px-3 py-2 font-medium text-gray-900">{s.subject_title}</td>
                                          <td className="px-3 py-2 text-xs text-gray-700">{formatDate(s.exam_date) || '—'}</td>
                                          <td className="px-3 py-2 text-right text-xs text-gray-700">{s.total_marks} ({s.pass_marks})</td>
                                          <td className="px-3 py-2 text-right text-xs text-blue-700">{s.mcq_questions}</td>
                                          <td className="px-3 py-2 text-right text-xs text-purple-700">{s.descriptive_questions}</td>
                                          <td className="px-3 py-2 text-right">
                                            <Button size="sm" variant="outline" onClick={() => { void openSubjectRow(s.exam_subject_id, e.exam_id); }}>
                                              {openSubject === s.exam_subject_id ? 'Hide students' : 'View students'}
                                            </Button>
                                          </td>
                                        </tr>
                                        {openSubject === s.exam_subject_id ? (
                                          <tr>
                                            <td colSpan={6} className="bg-white p-3">
                                              {studentsLoading ? <p className="text-center text-xs text-gray-500">Loading students…</p> : students.length === 0 ? (
                                                <p className="text-center text-xs text-gray-500">No students allocated.</p>
                                              ) : (
                                                <div className="overflow-x-auto rounded-md border border-slate-200">
                                                  <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                      <tr>
                                                        <th className="px-3 py-2 text-left">Student</th>
                                                        <th className="px-3 py-2 text-center">Status</th>
                                                        <th className="px-3 py-2 text-right">MCQ Score</th>
                                                        <th className="px-3 py-2 text-right">Correct</th>
                                                        <th className="px-3 py-2 text-right">Skip</th>
                                                        <th className="px-3 py-2 text-right">Descriptive</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                      {students.map((st) => (
                                                        <tr key={st.user_id}>
                                                          <td className="px-3 py-2"><p className="font-medium text-gray-900">{st.name || '—'}</p><p className="text-xs text-gray-500">{st.email}</p></td>
                                                          <td className="px-3 py-2 text-center">
                                                            {st.submit_status ? <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Submitted</span>
                                                              : st.attempted ? <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">In progress</span>
                                                              : <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Missed</span>}
                                                          </td>
                                                          <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">{st.mcq_score}</td>
                                                          <td className="px-3 py-2 text-right text-xs text-emerald-700">{st.correct}</td>
                                                          <td className="px-3 py-2 text-right text-xs text-gray-600">{st.skip}</td>
                                                          <td className="px-3 py-2 text-right text-xs">
                                                            {s.descriptive_questions === 0 ? <span className="text-gray-400">—</span>
                                                              : <span className={st.descriptive_graded > 0 ? 'text-emerald-700' : 'text-amber-700'}>{st.descriptive_graded} graded</span>}
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        ) : null}
                                      </Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
