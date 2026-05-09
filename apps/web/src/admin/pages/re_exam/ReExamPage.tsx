import { useCallback, useMemo, useState, Fragment } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

// Naji 2026-05-09 — Re-Examination
//   Lists published exams + missed-students count. Click to drill in,
//   reschedule each missed student with a new date / time window.

interface OverviewRow {
  exam_id: number;
  exam_code: string;
  title: string;
  from_date: string;
  allocated: number;
  attempted: number;
  missed: number;
}

interface MissedStudent {
  user_id: number;
  student_id: string;
  name: string;
  email: string;
}

export default function ReExamPage({ api, session }: AdminPageProps) {
  const [openExam, setOpenExam] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleStudent, setScheduleStudent] = useState<MissedStudent | null>(null);
  const [scheduleSubjectId, setScheduleSubjectId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listReExaminations(session.token),
    [],
  );
  const overview = useMemo<OverviewRow[]>(() => toRecords(data).map((r) => ({
    exam_id: asNumber(r.exam_id),
    exam_code: asString(r.exam_code),
    title: asString(r.title),
    from_date: asString(r.from_date),
    allocated: asNumber(r.allocated),
    attempted: asNumber(r.attempted),
    missed: asNumber(r.missed),
  })), [data]);

  const openDetail = useCallback(async (examId: number) => {
    if (openExam === examId) { setOpenExam(null); setDetail(null); return; }
    setOpenExam(examId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await api.getReExaminationDetail(session.token, String(examId));
      setDetail(d);
    } finally { setDetailLoading(false); }
  }, [api, session.token, openExam]);

  const openSchedule = (student: MissedStudent, subjectId: number | null) => {
    setScheduleStudent(student);
    setScheduleSubjectId(subjectId);
    setNewDate('');
    setNewStart('');
    setNewEnd('');
    setNotes('');
    setScheduleOpen(true);
  };

  const handleSchedule = useCallback(async () => {
    if (!openExam || !scheduleStudent) return;
    if (!newDate || !newStart || !newEnd) { toast.error('Date and times are required.'); return; }
    setScheduling(true);
    try {
      await api.scheduleReExamination(session.token, {
        exam_id: String(openExam),
        ...(scheduleSubjectId ? { exam_subject_id: scheduleSubjectId } : {}),
        user_id: scheduleStudent.user_id,
        new_date: newDate,
        new_start_time: newStart,
        new_end_time: newEnd,
        notes,
      });
      toast.success('Re-exam scheduled.');
      setScheduleOpen(false);
      const d = await api.getReExaminationDetail(session.token, String(openExam));
      setDetail(d);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule.');
    } finally { setScheduling(false); }
  }, [api, session.token, openExam, scheduleStudent, scheduleSubjectId, newDate, newStart, newEnd, notes]);

  if (loading) return <PageLoader label="Loading re-examinations…" />;
  if (error) return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;

  const detailData = detail?.data as { exam?: Record<string, unknown>; subjects?: Record<string, unknown>[]; missed_students?: MissedStudent[]; scheduled?: Record<string, unknown>[] } | undefined;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Re-Examination">
        <Button variant="outline" onClick={reload}>Refresh</Button>
      </AdminPageHeader>
      <p className="-mt-2 text-sm text-gray-500">Click View on an exam to see who missed it and reschedule them individually.</p>

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
                  <th className="px-3 py-2 text-right">Missed</th>
                  <th className="px-3 py-2 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">No published exams yet.</td></tr>
                ) : overview.map((r) => (
                  <Fragment key={r.exam_id}>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-3 py-2"><p className="text-sm font-medium text-gray-900">{r.title || '—'}</p><p className="font-mono text-[11px] text-gray-500">{r.exam_code}</p></td>
                      <td className="px-3 py-2 text-xs text-gray-700">{formatDate(r.from_date) || '—'}</td>
                      <td className="px-3 py-2 text-right text-sm text-gray-700">{r.allocated}</td>
                      <td className="px-3 py-2 text-right text-sm text-emerald-700">{r.attempted}</td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-red-600">{r.missed}</td>
                      <td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => { void openDetail(r.exam_id); }}>{openExam === r.exam_id ? 'Hide' : 'View'}</Button></td>
                    </tr>
                    {openExam === r.exam_id ? (
                      <tr>
                        <td colSpan={6} className="bg-slate-50/40 p-4">
                          {detailLoading ? <p className="text-center text-sm text-gray-500">Loading…</p> : detailData ? (
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subjects in this exam</p>
                                <p className="text-xs text-slate-600">{(detailData.subjects ?? []).map((s) => asString(s.subject_title)).join(' · ') || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Students who missed</p>
                                {(detailData.missed_students ?? []).length === 0 ? (
                                  <p className="text-xs text-emerald-700">All allocated students attempted this exam.</p>
                                ) : (
                                  <div className="overflow-x-auto rounded-md border border-slate-200">
                                    <table className="w-full text-sm">
                                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Student</th>
                                          <th className="px-3 py-2 text-left">Email</th>
                                          <th className="px-3 py-2 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {(detailData.missed_students ?? []).map((s) => (
                                          <tr key={s.user_id}>
                                            <td className="px-3 py-2"><p className="font-medium text-gray-900">{s.name || '—'}</p><p className="text-xs text-gray-500">{s.student_id}</p></td>
                                            <td className="px-3 py-2 text-xs text-gray-600">{s.email}</td>
                                            <td className="px-3 py-2 text-right"><Button size="sm" className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => openSchedule(s, asNumber(detailData.subjects?.[0]?.id) || null)}>Reschedule</Button></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                              {(detailData.scheduled ?? []).length > 0 ? (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Already scheduled re-exams</p>
                                  <ul className="text-xs text-slate-600">
                                    {(detailData.scheduled ?? []).map((s, idx) => (
                                      <li key={idx}>User #{asString(s.user_id)} — {formatDate(s.new_date)} {asString(s.new_start_time).slice(11, 16)}–{asString(s.new_end_time).slice(11, 16)}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
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

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="w-[min(480px,calc(100vw-2rem))] max-w-[min(480px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Schedule Re-Exam</DialogTitle>
            <DialogDescription>For {scheduleStudent?.name || scheduleStudent?.email}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>New Date</Label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start Time</Label><Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></div>
              <div className="space-y-1"><Label>End Time</Label><Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Notes (optional)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Medical leave — fresh window" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>Cancel</Button>
            <Button className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => { void handleSchedule(); }} disabled={scheduling}>
              {scheduling ? 'Scheduling…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
