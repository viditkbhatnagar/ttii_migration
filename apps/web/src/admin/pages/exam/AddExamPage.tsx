import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';

// Naji 2026-05-09 — new Exam Creation wizard.
// Five steps:
//   1) Add Exam (basic info)
//   2) Scheduling
//   3) Question Setup
//   4) Student Allocation
//   5) Instructions + Notification (Publish)
// Re-Examination is a separate module that ships after this is done.
//
// Step 1 is fully functional in this commit. Steps 2–5 render
// placeholders so admins can see the layout while we build them out.

const STEPS: Array<{ id: number; label: string }> = [
  { id: 1, label: 'Add Exam' },
  { id: 2, label: 'Scheduling' },
  { id: 3, label: 'Question Setup' },
  { id: 4, label: 'Student Allocation' },
  { id: 5, label: 'Instructions & Notification' },
];

interface DraftState {
  id: string;
  exam_code: string;
  title: string;
  course_ids: string[];
  offering_ids: string[];
  from_date: string;
  to_date: string;
  from_time: string;
  to_time: string;
  duration_minutes: number;
  // Risha UAT 2026-05-27 — per-exam toggle. ON randomizes question
  // order for every student attempting the exam.
  shuffle_questions: boolean;
}

const emptyDraft: DraftState = {
  id: '',
  exam_code: '',
  title: '',
  course_ids: [],
  offering_ids: [],
  from_date: '',
  to_date: '',
  from_time: '',
  to_time: '',
  duration_minutes: 0,
  shuffle_questions: false,
};

export default function AddExamPage({ api, session, onNavigate }: AdminPageProps) {
  // Detect edit mode from URL — `/admin/exam/edit/:id` reuses this page.
  const editId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const m = window.location.pathname.match(/^\/admin\/exam\/edit\/(\d+)$/);
    return m?.[1] ?? '';
  }, []);

  const [activeStep, setActiveStep] = useState(1);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(editId));

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [allOfferings, setAllOfferings] = useState<Record<string, unknown>[]>([]);

  // Reference data.
  useEffect(() => {
    void api.loadCourses(session.token).then((rows) => setCourses(rows)).catch(() => setCourses([]));
  }, [api, session.token]);

  // Offerings for the picked courses.
  useEffect(() => {
    if (draft.course_ids.length === 0) {
      setAllOfferings([]);
      return;
    }
    let cancelled = false;
    void Promise.all(
      draft.course_ids.map((cid) => api.listOfferings(session.token, { course_id: cid, status: 'active' })),
    )
      .then((arrays) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: Record<string, unknown>[] = [];
        for (const arr of arrays) {
          for (const o of arr) {
            const id = asString(o.id);
            if (id && !seen.has(id)) {
              seen.add(id);
              merged.push(o);
            }
          }
        }
        setAllOfferings(merged);
      })
      .catch(() => { if (!cancelled) setAllOfferings([]); });
    return () => { cancelled = true; };
  }, [api, session.token, draft.course_ids]);

  // Load existing draft for edit mode.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoading(true);
    void api.getExamDraft(session.token, editId)
      .then((d) => {
        if (cancelled) return;
        const courseIds = (Array.isArray(d.course_ids) ? d.course_ids : []).map((v) => String(v)).filter(Boolean);
        const offeringIds = (Array.isArray(d.offering_ids) ? d.offering_ids : []).map((v) => String(v)).filter(Boolean);
        const dur = asString(d.duration);
        setDraft({
          id: asString(d.id) || editId,
          exam_code: asString(d.exam_code),
          title: asString(d.title),
          course_ids: courseIds,
          offering_ids: offeringIds,
          from_date: asString(d.from_date).slice(0, 10),
          to_date: asString(d.to_date).slice(0, 10),
          from_time: extractTime(asString(d.from_time)),
          to_time: extractTime(asString(d.to_time)),
          duration_minutes: dur ? Math.max(0, Number.parseInt(dur, 10) || 0) : 0,
          // Risha UAT 2026-05-27 — pre-fill the toggle. Tolerate the
          // value arriving as boolean / 1 / "1" / "true" depending on
          // the legacy MySQL driver.
          shuffle_questions: d.shuffle_questions === true
            || d.shuffle_questions === 1
            || d.shuffle_questions === '1'
            || d.shuffle_questions === 'true',
        });
      })
      .catch(() => { /* leave empty */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, session.token, editId]);

  // Compute duration whenever date/time fields change.
  useEffect(() => {
    if (!draft.from_date || !draft.to_date || !draft.from_time || !draft.to_time) return;
    const start = new Date(`${draft.from_date}T${draft.from_time}:00`);
    const end = new Date(`${draft.to_date}T${draft.to_time}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    setDraft((p) => p.duration_minutes === minutes ? p : { ...p, duration_minutes: minutes });
  }, [draft.from_date, draft.to_date, draft.from_time, draft.to_time]);

  const courseOptions = useMemo(
    () => toRecords(courses).map((c) => ({ id: asString(c.id), title: asString(c.title) })),
    [courses],
  );
  const offeringOptions = useMemo(
    () => allOfferings.map((o) => ({ id: asString(o.id), title: asString(o.title) || asString(o.offering_code) })),
    [allOfferings],
  );

  const toggleCourse = (id: string) => {
    setDraft((p) => {
      const has = p.course_ids.includes(id);
      const next = has ? p.course_ids.filter((x) => x !== id) : [...p.course_ids, id];
      // Drop offering selections that no longer belong to a picked course
      // (we'll re-derive when offerings reload). Keep the simple path —
      // clear offering selection on course change so admin reconfirms.
      return { ...p, course_ids: next, offering_ids: has ? p.offering_ids : p.offering_ids };
    });
  };
  const toggleOffering = (id: string) => {
    setDraft((p) => {
      const has = p.offering_ids.includes(id);
      return { ...p, offering_ids: has ? p.offering_ids.filter((x) => x !== id) : [...p.offering_ids, id] };
    });
  };

  const validateStep1 = (): string | null => {
    if (!draft.title.trim()) return 'Exam title is required.';
    if (draft.course_ids.length === 0) return 'Pick at least one course.';
    if (!draft.from_date || !draft.to_date) return 'Start and end date are required.';
    if (!draft.from_time || !draft.to_time) return 'Start and end time are required.';
    if (draft.duration_minutes <= 0) return 'End time must be after start time.';
    return null;
  };

  const saveDraft = async (then: 'stay' | 'next' | 'list'): Promise<void> => {
    const err = validateStep1();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const res = await api.saveExamDraft(session.token, {
        ...(draft.id ? { id: draft.id } : {}),
        title: draft.title.trim(),
        course_ids: draft.course_ids,
        offering_ids: draft.offering_ids,
        from_date: draft.from_date,
        to_date: draft.to_date,
        from_time: draft.from_time,
        to_time: draft.to_time,
        duration_minutes: draft.duration_minutes,
        // Risha UAT 2026-05-27 — persist the shuffle toggle.
        shuffle_questions: draft.shuffle_questions,
      });
      const status = (res as { status?: number }).status;
      const data = (res as { data?: Record<string, unknown> }).data ?? {};
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status !== 1) { toast.error(message); return; }
      const newId = asString(data.id) || draft.id;
      const code = asString(data.exam_code) || draft.exam_code;
      setDraft((p) => ({ ...p, id: newId, exam_code: code }));
      toast.success(message);
      if (then === 'list') onNavigate('/admin/exam/index');
      else if (then === 'next') setActiveStep(2);
    } catch (err2) {
      toast.error(err2 instanceof Error ? err2.message : 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading exam…" />;

  return (
    <div className="space-y-4">
      <AdminPageHeader title={editId ? 'Edit Exam' : 'Add Exam'}>
        <Button variant="outline" onClick={() => onNavigate('/admin/exam/index')}>Back to Exams</Button>
      </AdminPageHeader>

      {/* Step indicator */}
      <Card>
        <CardContent className="p-3">
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {STEPS.map((s) => {
              const isActive = activeStep === s.id;
              const isComplete = activeStep > s.id || (Boolean(draft.id) && s.id === 1);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => { if (s.id === 1 || draft.id) setActiveStep(s.id); }}
                    disabled={s.id !== 1 && !draft.id}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-ttii-primary text-white'
                        : isComplete
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <span className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : isComplete ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {s.id}
                    </span>
                    {s.label}
                  </button>
                </li>
              );
            })}
            {draft.exam_code ? (
              <li className="ml-auto rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Exam ID:</span> <span className="font-mono">{draft.exam_code}</span>
              </li>
            ) : null}
          </ol>
        </CardContent>
      </Card>

      {activeStep === 1 ? (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ex-title">Exam Title *</Label>
                <Input id="ex-title" value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setDraft((p) => ({ ...p, title: next })); }} placeholder="e.g. Mid-Semester Examination — November 2026" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Exam ID</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-700">
                  <span className="font-mono">{draft.exam_code || 'Auto-generated on first save'}</span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Courses * <span className="font-normal text-slate-500">({draft.course_ids.length} selected)</span></Label>
                <MultiPickerList
                  options={courseOptions}
                  selected={draft.course_ids}
                  onToggle={toggleCourse}
                  emptyText="No courses found."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Offerings <span className="font-normal text-slate-500">({draft.offering_ids.length} selected — pick a course first)</span></Label>
                <MultiPickerList
                  options={offeringOptions}
                  selected={draft.offering_ids}
                  onToggle={toggleOffering}
                  emptyText={draft.course_ids.length === 0 ? 'Pick a course first.' : 'No active offerings for the selected courses.'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ex-fdate">Start Date *</Label>
                <Input id="ex-fdate" type="date" value={draft.from_date} onChange={(e) => setDraft((p) => ({ ...p, from_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-tdate">End Date *</Label>
                <Input id="ex-tdate" type="date" value={draft.to_date} onChange={(e) => setDraft((p) => ({ ...p, to_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-ftime">Start Time *</Label>
                <Input id="ex-ftime" type="time" value={draft.from_time} onChange={(e) => setDraft((p) => ({ ...p, from_time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-ttime">End Time *</Label>
                <Input id="ex-ttime" type="time" value={draft.to_time} onChange={(e) => setDraft((p) => ({ ...p, to_time: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Duration (auto)</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-700">
                  {draft.duration_minutes > 0 ? `${draft.duration_minutes} minute${draft.duration_minutes === 1 ? '' : 's'}` : 'Computed from Start + End once both are set.'}
                </div>
              </div>
            </div>

            {/* Risha UAT 2026-05-27 — Shuffle Questions toggle. ON makes
                every student get a fresh random order of the same
                questions; OFF (default) keeps the saved sequence. */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={draft.shuffle_questions}
                  onChange={(e) => setDraft((p) => ({ ...p, shuffle_questions: e.target.checked }))}
                  className="mt-0.5 size-4 cursor-pointer rounded border-slate-300 text-ttii-primary focus:ring-2 focus:ring-ttii-primary"
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">
                    Shuffle questions for each student
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    When on, every learner attempting this exam sees the questions in a different random order. Off (default) keeps the saved sequence the same for everyone. The order is locked in once a learner starts the attempt, so resuming the same attempt shows the same order.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => { void saveDraft('list'); }} disabled={saving}>
                Save Draft & Close
              </Button>
              <Button
                className="bg-ttii-primary hover:bg-ttii-primary/90"
                onClick={() => { void saveDraft('next'); }}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save & Continue ›'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeStep === 2 ? (
        <SchedulingStep
          api={api}
          authToken={session.token}
          examId={draft.id}
          onSaved={() => setActiveStep(3)}
          onBack={() => setActiveStep(1)}
          onClose={() => onNavigate('/admin/exam/index')}
        />
      ) : null}

      {activeStep === 3 ? (
        <ComponentsStep
          api={api}
          authToken={session.token}
          examId={draft.id}
          onSaved={() => setActiveStep(4)}
          onBack={() => setActiveStep(2)}
          onClose={() => onNavigate('/admin/exam/index')}
        />
      ) : null}

      {activeStep === 4 ? (
        <AllocationsStep
          api={api}
          authToken={session.token}
          examId={draft.id}
          onSaved={() => setActiveStep(5)}
          onBack={() => setActiveStep(3)}
          onClose={() => onNavigate('/admin/exam/index')}
        />
      ) : null}

      {activeStep === 5 ? (
        <PublishStep
          api={api}
          authToken={session.token}
          examId={draft.id}
          onPublished={() => onNavigate('/admin/exam/index')}
          onBack={() => setActiveStep(4)}
        />
      ) : null}
    </div>
  );
}

function MultiPickerList({
  options,
  selected,
  onToggle,
  emptyText,
}: {
  options: Array<{ id: string; title: string }>;
  selected: string[];
  onToggle: (id: string) => void;
  emptyText: string;
}) {
  if (options.length === 0) {
    return <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">{emptyText}</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-1 rounded-md border border-slate-200 bg-white p-2 sm:grid-cols-2">
      {options.map((o) => {
        const isOn = selected.includes(o.id);
        return (
          <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm transition ${isOn ? 'bg-ttii-primary/10' : 'hover:bg-slate-50'}`}>
            <input type="checkbox" checked={isOn} onChange={() => onToggle(o.id)} className="size-4 rounded border-slate-300 text-ttii-primary focus:ring-ttii-primary" />
            <span className={`flex-1 ${isOn ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{o.title || `#${o.id}`}</span>
          </label>
        );
      })}
    </div>
  );
}

// ─── Step 2: Scheduling ────────────────────────────────────────────
interface ScheduleRow {
  id?: number;
  subject_id: number | null;
  subject_title: string;
  course_ids: string;
  available_courses: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
}

function SchedulingStep({
  api,
  authToken,
  examId,
  onSaved,
  onBack,
  onClose,
}: {
  api: AdminPageProps['api'];
  authToken: string;
  examId: string;
  onSaved: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const existing = await api.getExamSchedule(authToken, examId);
        if (cancelled) return;
        if (existing.length > 0) {
          setRows(existing.map((r) => ({
            id: asNumber(r.id),
            subject_id: r.subject_id ? asNumber(r.subject_id) : null,
            subject_title: asString(r.subject_title),
            course_ids: asString(r.course_ids),
            available_courses: asString(r.available_courses),
            exam_date: asString(r.exam_date).slice(0, 10),
            start_time: extractTime(asString(r.start_time)),
            end_time: extractTime(asString(r.end_time)),
            duration_minutes: asNumber(r.duration_minutes),
            total_marks: asNumber(r.total_marks),
            pass_marks: asNumber(r.pass_marks),
          })));
        } else {
          const suggestions = await api.getExamSchedulingSuggestions(authToken, examId);
          if (cancelled) return;
          setRows(suggestions.map((s) => ({
            subject_id: asNumber(s.subject_id),
            subject_title: asString(s.subject_title),
            course_ids: asString(s.course_ids),
            available_courses: asString(s.available_courses),
            exam_date: '',
            start_time: '',
            end_time: '',
            duration_minutes: 0,
            total_marks: 100,
            pass_marks: 40,
          })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  const updateRow = (idx: number, patch: Partial<ScheduleRow>) => {
    setRows((cur) => cur.map((r, i) => {
      if (i !== idx) return r;
      const next = { ...r, ...patch };
      if (patch.exam_date !== undefined || patch.start_time !== undefined || patch.end_time !== undefined) {
        if (next.exam_date && next.start_time && next.end_time) {
          const start = new Date(`${next.exam_date}T${next.start_time}:00`);
          const end = new Date(`${next.exam_date}T${next.end_time}:00`);
          if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            next.duration_minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
          }
        }
      }
      return next;
    }));
  };
  const removeRow = (idx: number) => setRows((cur) => cur.filter((_, i) => i !== idx));

  const handleSave = async (then: 'next' | 'close') => {
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        id: r.id,
        subject_id: r.subject_id,
        subject_title: r.subject_title,
        course_ids: r.course_ids,
        exam_date: r.exam_date,
        start_time: r.start_time,
        end_time: r.end_time,
        duration_minutes: r.duration_minutes,
        total_marks: r.total_marks,
        pass_marks: r.pass_marks,
      }));
      const res = await api.saveExamSchedule(authToken, examId, payload);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) { toast.success(message); if (then === 'next') onSaved(); else onClose(); }
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save schedule.');
    } finally { setSaving(false); }
  };

  if (loading) return <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading schedule…</CardContent></Card>;
  if (rows.length === 0) return (
    <Card><CardContent className="space-y-2 py-8 text-center text-sm text-slate-600">
      <p>No subjects found for the picked courses.</p>
      <p className="text-xs">Add subjects to those courses (Courses → Subjects) and revisit this step.</p>
      <div className="pt-2"><Button variant="outline" onClick={onBack}>‹ Back to Step 1</Button></div>
    </CardContent></Card>
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-slate-600">One row per Subject across the picked courses. Edit Date / Start / End / Marks per row. A subject shared by multiple courses runs as a single exam.</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Available Courses</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Start</th>
                <th className="px-3 py-2 text-left">End</th>
                <th className="px-3 py-2 text-right">Duration</th>
                <th className="px-3 py-2 text-right">Total Marks</th>
                <th className="px-3 py-2 text-right">Pass Marks</th>
                <th className="px-3 py-2 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, idx) => (
                <tr key={`${r.subject_id ?? r.subject_title}-${idx}`}>
                  <td className="px-3 py-2 font-medium text-slate-900">{r.subject_title}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{r.available_courses || '—'}</td>
                  <td className="px-3 py-2"><Input type="date" value={r.exam_date} onChange={(e) => updateRow(idx, { exam_date: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2"><Input type="time" value={r.start_time} onChange={(e) => updateRow(idx, { start_time: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2"><Input type="time" value={r.end_time} onChange={(e) => updateRow(idx, { end_time: e.target.value })} className="h-8" /></td>
                  <td className="px-3 py-2 text-right text-xs text-slate-600">{r.duration_minutes > 0 ? `${r.duration_minutes} min` : '—'}</td>
                  <td className="px-3 py-2 text-right"><Input type="number" min={0} value={r.total_marks} onChange={(e) => updateRow(idx, { total_marks: Number(e.target.value) || 0 })} className="h-8 w-20 text-right" /></td>
                  <td className="px-3 py-2 text-right"><Input type="number" min={0} value={r.pass_marks} onChange={(e) => updateRow(idx, { pass_marks: Number(e.target.value) || 0 })} className="h-8 w-20 text-right" /></td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeRow(idx)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete row">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onBack}>‹ Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { void handleSave('close'); }} disabled={saving}>Save & Close</Button>
            <Button className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => { void handleSave('next'); }} disabled={saving}>
              {saving ? 'Saving…' : 'Save & Continue ›'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 3: Question Setup ────────────────────────────────────────
interface ComponentRow {
  exam_subject_id: number;
  subject_title: string;
  component_type: 'mcq' | 'descriptive';
  num_questions: number;
  marks_each: number;
  negative_marks: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  word_limit: number;
}

function ComponentsStep({
  api,
  authToken,
  examId,
  onSaved,
  onBack,
  onClose,
}: {
  api: AdminPageProps['api'];
  authToken: string;
  examId: string;
  onSaved: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [schedule, components] = await Promise.all([
          api.getExamSchedule(authToken, examId),
          api.getExamComponents(authToken, examId),
        ]);
        if (cancelled) return;
        const compBySubject = new Map<number, Record<string, unknown>[]>();
        for (const c of components) {
          const sid = asNumber(c.exam_subject_id);
          const arr = compBySubject.get(sid) ?? [];
          arr.push(c);
          compBySubject.set(sid, arr);
        }
        const next: ComponentRow[] = [];
        for (const s of schedule) {
          const sid = asNumber(s.id);
          const subjectTitle = asString(s.subject_title);
          const existing = compBySubject.get(sid) ?? [];
          if (existing.length > 0) {
            for (const c of existing) {
              next.push({
                exam_subject_id: sid,
                subject_title: subjectTitle,
                component_type: asString(c.component_type) === 'descriptive' ? 'descriptive' : 'mcq',
                num_questions: asNumber(c.num_questions),
                marks_each: Number(c.marks_each ?? 0),
                negative_marks: Number(c.negative_marks ?? 0),
                shuffle_questions: Boolean(c.shuffle_questions),
                shuffle_options: Boolean(c.shuffle_options),
                word_limit: asNumber(c.word_limit),
              });
            }
          } else {
            next.push({ exam_subject_id: sid, subject_title: subjectTitle, component_type: 'mcq', num_questions: 10, marks_each: 1, negative_marks: 0, shuffle_questions: false, shuffle_options: false, word_limit: 0 });
          }
        }
        setRows(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  const setRow = (idx: number, patch: Partial<ComponentRow>) =>
    setRows((cur) => cur.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addComponent = (subject_id: number, subject_title: string, type: 'mcq' | 'descriptive') => {
    setRows((cur) => [...cur, { exam_subject_id: subject_id, subject_title, component_type: type, num_questions: type === 'mcq' ? 10 : 1, marks_each: 1, negative_marks: 0, shuffle_questions: false, shuffle_options: false, word_limit: type === 'descriptive' ? 200 : 0 }]);
  };
  const removeRow = (idx: number) => setRows((cur) => cur.filter((_, i) => i !== idx));

  const handleSave = async (then: 'next' | 'close') => {
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        exam_subject_id: r.exam_subject_id,
        component_type: r.component_type,
        num_questions: r.num_questions,
        marks_each: r.marks_each,
        negative_marks: r.negative_marks,
        shuffle_questions: r.shuffle_questions ? 1 : 0,
        shuffle_options: r.shuffle_options ? 1 : 0,
        word_limit: r.word_limit,
      }));
      const res = await api.saveExamComponents(authToken, examId, payload);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) { toast.success(message); if (then === 'next') onSaved(); else onClose(); }
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save components.');
    } finally { setSaving(false); }
  };

  if (loading) return <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading components…</CardContent></Card>;
  if (rows.length === 0) return (
    <Card><CardContent className="space-y-2 py-8 text-center text-sm text-slate-600">
      <p>No subjects yet. Save the schedule (Step 2) first.</p>
      <div className="pt-2"><Button variant="outline" onClick={onBack}>‹ Back to Step 2</Button></div>
    </CardContent></Card>
  );

  // Group rows by subject for cleaner UI.
  const grouped = new Map<number, { title: string; rows: Array<{ row: ComponentRow; idx: number }> }>();
  rows.forEach((r, idx) => {
    const g = grouped.get(r.exam_subject_id) ?? { title: r.subject_title, rows: [] };
    g.rows.push({ row: r, idx });
    grouped.set(r.exam_subject_id, g);
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-slate-600">For each subject, configure one or more components (MCQ and/or Descriptive).</p>

        {[...grouped.entries()].map(([sid, g]) => (
          <div key={sid} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{g.title}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addComponent(sid, g.title, 'mcq')}>+ MCQ</Button>
                <Button size="sm" variant="outline" onClick={() => addComponent(sid, g.title, 'descriptive')}>+ Descriptive</Button>
              </div>
            </div>
            <div className="space-y-2">
              {g.rows.map(({ row, idx }) => (
                <div key={idx} className="grid grid-cols-2 gap-3 rounded-md border border-slate-100 bg-slate-50/40 p-3 sm:grid-cols-6">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <select value={row.component_type} onChange={(e) => setRow(idx, { component_type: e.target.value as 'mcq' | 'descriptive' })} className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="mcq">MCQ</option>
                      <option value="descriptive">Descriptive</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">No. of Questions</Label>
                    <Input type="number" min={0} value={row.num_questions} onChange={(e) => setRow(idx, { num_questions: Number(e.target.value) || 0 })} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Marks each</Label>
                    <Input type="number" step="0.5" min={0} value={row.marks_each} onChange={(e) => setRow(idx, { marks_each: Number(e.target.value) || 0 })} className="mt-1 h-9" />
                  </div>
                  {row.component_type === 'mcq' ? (
                    <>
                      <div>
                        <Label className="text-xs">Negative Marks</Label>
                        <Input type="number" step="0.25" min={0} value={row.negative_marks} onChange={(e) => setRow(idx, { negative_marks: Number(e.target.value) || 0 })} className="mt-1 h-9" />
                      </div>
                      <div className="flex items-end gap-3 sm:col-span-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={row.shuffle_questions} onChange={(e) => setRow(idx, { shuffle_questions: e.target.checked })} className="size-4 rounded border-slate-300" />
                          Shuffle questions
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={row.shuffle_options} onChange={(e) => setRow(idx, { shuffle_options: e.target.checked })} className="size-4 rounded border-slate-300" />
                          Shuffle options
                        </label>
                        <button type="button" onClick={() => removeRow(idx)} className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">×</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs">Word Limit</Label>
                        <Input type="number" min={0} value={row.word_limit} onChange={(e) => setRow(idx, { word_limit: Number(e.target.value) || 0 })} className="mt-1 h-9" />
                      </div>
                      <div className="flex items-end justify-end sm:col-span-2">
                        <button type="button" onClick={() => removeRow(idx)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">×</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onBack}>‹ Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { void handleSave('close'); }} disabled={saving}>Save & Close</Button>
            <Button className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => { void handleSave('next'); }} disabled={saving}>
              {saving ? 'Saving…' : 'Save & Continue ›'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 4: Student Allocation ────────────────────────────────────
interface EligibleStudent {
  user_id: number;
  student_id: string;
  name: string;
  email: string;
  courses: string;
}

function AllocationsStep({
  api,
  authToken,
  examId,
  onSaved,
  onBack,
  onClose,
}: {
  api: AdminPageProps['api'];
  authToken: string;
  examId: string;
  onSaved: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      api.getExamEligibleStudents(authToken, examId),
      api.getExamAllocations(authToken, examId),
    ])
      .then(([list, current]) => {
        if (cancelled) return;
        setStudents(list.map((r) => ({
          user_id: asNumber(r.user_id),
          student_id: asString(r.student_id),
          name: asString(r.name),
          email: asString(r.email),
          courses: asString(r.courses),
        })));
        setPicked(new Set(current));
      })
      .catch(() => { if (!cancelled) setStudents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  const filtered = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q) || s.courses.toLowerCase().includes(q));
  }, [students, search]);

  const togglePick = (uid: number) => setPicked((prev) => { const next = new Set(prev); if (next.has(uid)) next.delete(uid); else next.add(uid); return next; });
  const allFilteredPicked = filtered.length > 0 && filtered.every((s) => picked.has(s.user_id));
  const toggleAll = () => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allFilteredPicked) {
        filtered.forEach((s) => next.delete(s.user_id));
      } else {
        filtered.forEach((s) => next.add(s.user_id));
      }
      return next;
    });
  };

  const handleSave = async (then: 'next' | 'close') => {
    setSaving(true);
    try {
      const res = await api.saveExamAllocations(authToken, examId, [...picked]);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) { toast.success(message); if (then === 'next') onSaved(); else onClose(); }
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save allocations.');
    } finally { setSaving(false); }
  };

  if (loading) return <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading eligible students…</CardContent></Card>;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-slate-600">Pick the students who will sit this exam. The list shows students with an active enrolment in the picked courses.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search name / email / student ID / course…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <span className="text-xs text-slate-500">{picked.size} of {students.length} selected</span>
          <Button size="sm" variant="outline" onClick={toggleAll} className="ml-auto">
            {allFilteredPicked ? 'Clear filtered' : 'Select filtered'}
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2"></th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Courses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-sm text-slate-500">No eligible students for the picked courses.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.user_id} className="hover:bg-slate-50/40">
                  <td className="px-3 py-2 text-center"><input type="checkbox" checked={picked.has(s.user_id)} onChange={() => togglePick(s.user_id)} className="size-4 rounded border-slate-300 text-ttii-primary focus:ring-ttii-primary" /></td>
                  <td className="px-3 py-2"><p className="font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.student_id}</p></td>
                  <td className="px-3 py-2 text-xs text-gray-600">{s.email}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{s.courses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onBack}>‹ Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { void handleSave('close'); }} disabled={saving}>Save & Close</Button>
            <Button className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => { void handleSave('next'); }} disabled={saving}>
              {saving ? 'Saving…' : 'Save & Continue ›'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 5: Instructions + Notification + Publish ─────────────────
interface InstructionTemplate { id: number; title: string; body: string }

function PublishStep({
  api,
  authToken,
  examId,
  onPublished,
  onBack,
}: {
  api: AdminPageProps['api'];
  authToken: string;
  examId: string;
  onPublished: () => void;
  onBack: () => void;
}) {
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [instructions, setInstructions] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInapp, setNotifyInapp] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tplTitle, setTplTitle] = useState('');
  const [tplBody, setTplBody] = useState('');

  useEffect(() => {
    let cancelled = false;
    void api.listExamInstructionTemplates(authToken)
      .then((rows) => {
        if (cancelled) return;
        setTemplates(rows.map((r) => ({ id: asNumber(r.id), title: asString(r.title), body: asString(r.body) })));
      })
      .catch(() => { /* leave empty */ });
    return () => { cancelled = true; };
  }, [api, authToken]);

  const reuseTemplate = (id: number) => {
    const t = templates.find((tp) => tp.id === id);
    if (t) setInstructions(t.body);
  };

  const saveAsTemplate = async () => {
    if (!tplTitle.trim()) { toast.error('Template title required.'); return; }
    setSavingTemplate(true);
    try {
      await api.createExamInstructionTemplate(authToken, { title: tplTitle.trim(), body: tplBody });
      toast.success('Template saved.');
      setShowTemplateForm(false);
      setTplTitle('');
      setTplBody('');
      const rows = await api.listExamInstructionTemplates(authToken);
      setTemplates(rows.map((r) => ({ id: asNumber(r.id), title: asString(r.title), body: asString(r.body) })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template.');
    } finally { setSavingTemplate(false); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await api.publishExam(authToken, examId, { instructions, notify_email: notifyEmail, notify_inapp: notifyInapp });
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Done.';
      if (status === 1) {
        toast.success(message);
        onPublished();
      } else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish.');
    } finally { setPublishing(false); }
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="ex-instr">Instructions</Label>
          <textarea id="ex-instr" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={8}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Write the instructions students will see before starting the exam." />
        </div>

        <div className="rounded-lg border border-slate-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Reusable instruction templates</p>
            <Button size="sm" variant="outline" onClick={() => setShowTemplateForm((v) => !v)}>
              {showTemplateForm ? 'Cancel' : '+ Save current as template'}
            </Button>
          </div>
          {showTemplateForm ? (
            <div className="mb-3 grid grid-cols-1 gap-2 rounded-md bg-slate-50 p-3">
              <Input placeholder="Template title" value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setTplTitle(next); }} />
              <textarea placeholder="Template body" value={tplBody || instructions} onChange={(e) => setTplBody(e.target.value)} rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <div className="flex justify-end">
                <Button size="sm" className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => { void saveAsTemplate(); }} disabled={savingTemplate}>
                  {savingTemplate ? 'Saving…' : 'Save Template'}
                </Button>
              </div>
            </div>
          ) : null}
          {templates.length === 0 ? (
            <p className="text-xs text-slate-500">No templates yet. Save the current Instructions as a template to reuse later.</p>
          ) : (
            <div className="space-y-1.5">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                  <span className="truncate text-slate-700">{t.title}</span>
                  <Button size="sm" variant="outline" onClick={() => reuseTemplate(t.id)}>Use</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-100 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Notify allocated students</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} className="size-4 rounded border-slate-300" />
              Email
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={notifyInapp} onChange={(e) => setNotifyInapp(e.target.checked)} className="size-4 rounded border-slate-300" />
              In-app notification
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onBack}>‹ Back</Button>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { void handlePublish(); }} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Publish Exam'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function extractTime(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/T(\d{2}:\d{2})/);
  if (m) return m[1] ?? '';
  // fallback: ISO date-only or empty
  return '';
}

void asNumber; // imported for potential future steps
