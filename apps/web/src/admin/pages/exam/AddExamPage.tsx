import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
// Risha UAT 2026-08-06 — a native <input type="date"> rejects a typed
// dd/mm/yyyy and a native <input type="time"> silently files "2:00" as 02:00
// (that is how 21 live classes ended up at 2 AM). Both traps already have a
// shared guard in the repo; exam scheduling was still using the raw controls.
// The calendar button is hidden here: DmyDatePicker's trigger is labelled
// "Change date of birth", which is wrong wording for an exam date.
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { ClassTimeInput } from '@/components/ui/class-time-input';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, asNumber, asBoolean, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';

// Naji 2026-05-09 — new Exam Creation wizard.
// Six steps:
//   1) Add Exam (basic info)
//   2) Scheduling
//   3) Question Setup (component plan: counts/marks per subject)
//   4) Assign Questions (pick real questions from the bank -> exam_questions)
//   5) Student Allocation
//   6) Instructions + Notification (Publish)
// Re-Examination is a separate module that ships after this is done.
//
// Naji 2026-06-09 — added step 4 "Assign Questions". The component step only
// stores planning metadata; the student player serves questions from
// exam_questions, so without this step an exam is never takeable.

const STEPS: Array<{ id: number; label: string }> = [
  { id: 1, label: 'Add Exam' },
  { id: 2, label: 'Scheduling' },
  { id: 3, label: 'Question Setup' },
  { id: 4, label: 'Assign Questions' },
  { id: 5, label: 'Student Allocation' },
  { id: 6, label: 'Instructions & Notification' },
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

// The shared dd/mm/yyyy field defaults its year dropdown to a date-of-birth
// window (100 years back, nothing in the future). Exam dates are near-future.
const EXAM_YEAR_MIN = new Date().getFullYear() - 1;
const EXAM_YEAR_MAX = new Date().getFullYear() + 5;

// Step 6 state that lives on the exam row rather than in the wizard draft.
// Risha UAT 2026-08-06 — "Despite of giving instructions before, still
// invisible when opened for editing. It was saved before." PublishStep used to
// start with an empty textarea and publishing wrote that empty string back.
interface DraftMeta {
  instructions: string;
  notify_email: boolean;
  notify_inapp: boolean;
  status: string;
  is_published: boolean;
  /** Subject sittings already materialised by a previous publish. */
  child_count: number;
}

const emptyMeta: DraftMeta = {
  instructions: '',
  notify_email: true,
  notify_inapp: true,
  status: 'draft',
  is_published: false,
  child_count: 0,
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
  // Risha UAT 2026-08-06 — Step 6 reads the saved instructions from here
  // instead of starting blank. `metaLoaded` stays false when the draft fetch
  // failed, so Step 6 knows not to treat its empty textarea as the truth.
  const [meta, setMeta] = useState<DraftMeta>(emptyMeta);
  const [metaLoaded, setMetaLoaded] = useState(!editId);

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
        setMeta({
          instructions: asString(d.instructions),
          notify_email: asBoolean(d.notify_email),
          notify_inapp: asBoolean(d.notify_inapp),
          status: asString(d.status) || 'draft',
          is_published: asBoolean(d.is_published) || asString(d.status) === 'published',
          child_count: asNumber(d.child_count),
        });
        setMetaLoaded(true);
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
                <DmyDateInput id="ex-fdate" value={draft.from_date} onChange={(iso) => setDraft((p) => ({ ...p, from_date: iso }))} hidePicker minYear={EXAM_YEAR_MIN} maxYear={EXAM_YEAR_MAX} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-tdate">End Date *</Label>
                <DmyDateInput id="ex-tdate" value={draft.to_date} onChange={(iso) => setDraft((p) => ({ ...p, to_date: iso }))} hidePicker minYear={EXAM_YEAR_MIN} maxYear={EXAM_YEAR_MAX} />
              </div>
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <ClassTimeInput value={draft.from_time} onChange={(hhmm) => setDraft((p) => ({ ...p, from_time: hhmm }))} />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <ClassTimeInput value={draft.to_time} onChange={(hhmm) => setDraft((p) => ({ ...p, to_time: hhmm }))} />
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
        <QuestionsStep
          api={api}
          authToken={session.token}
          examId={draft.id}
          onSaved={() => setActiveStep(5)}
          onBack={() => setActiveStep(3)}
          onClose={() => onNavigate('/admin/exam/index')}
        />
      ) : null}

      {activeStep === 5 ? (
        <AllocationsStep
          api={api}
          authToken={session.token}
          examId={draft.id}
          onSaved={() => setActiveStep(6)}
          onBack={() => setActiveStep(4)}
          onClose={() => onNavigate('/admin/exam/index')}
        />
      ) : null}

      {activeStep === 6 ? (
        <PublishStep
          api={api}
          authToken={session.token}
          examId={draft.id}
          meta={meta}
          metaLoaded={metaLoaded}
          onPublished={() => onNavigate('/admin/exam/index')}
          onBack={() => setActiveStep(5)}
          onClose={() => onNavigate('/admin/exam/index')}
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
                  <td className="px-3 py-2"><DmyDateInput value={r.exam_date} onChange={(iso) => updateRow(idx, { exam_date: iso })} hidePicker className="h-8 w-28" minYear={EXAM_YEAR_MIN} maxYear={EXAM_YEAR_MAX} /></td>
                  <td className="px-3 py-2"><ClassTimeInput value={r.start_time} onChange={(v) => updateRow(idx, { start_time: v })} className="h-8" /></td>
                  <td className="px-3 py-2"><ClassTimeInput value={r.end_time} onChange={(v) => updateRow(idx, { end_time: v })} className="h-8" /></td>
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
// Risha UAT 2026-08-06 — "gave 70 questions, editing shows 10 again". The
// underlying cause is that re-saving Step 2 renumbered exam_subjects and
// orphaned the saved components (fixed backend-side), but the wizard made it
// unreadable by drawing the hardcoded default 10 as a real value. A row now
// carries `configured`, and an unconfigured row shows its default as a
// placeholder so "not configured" can never be mistaken for "saved as 10".
interface ComponentRow {
  /** Client-side identity — index keys break when a row is removed. */
  uid: string;
  exam_subject_id: number;
  subject_title: string;
  component_type: 'mcq' | 'descriptive';
  configured: boolean;
  num_questions: number;
  marks_each: number;
  negative_marks: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  word_limit: number;
  /** What an unconfigured row saves as — derived from Step 2's total marks. */
  default_questions: number;
}

// Fallback when Step 2 carries no marks for the subject to derive from.
const FALLBACK_QUESTION_COUNT = 10;

let componentRowSeq = 0;
const nextComponentUid = (): string => {
  componentRowSeq += 1;
  return `cr-${componentRowSeq}`;
};

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
          // One question per mark is the only count Step 2 actually implies;
          // anything cleverer would be inventing data the admin never entered.
          const totalMarks = asNumber(s.total_marks);
          const derived = totalMarks > 0 ? totalMarks : FALLBACK_QUESTION_COUNT;
          const existing = compBySubject.get(sid) ?? [];
          if (existing.length > 0) {
            for (const c of existing) {
              next.push({
                uid: nextComponentUid(),
                exam_subject_id: sid,
                subject_title: subjectTitle,
                component_type: asString(c.component_type) === 'descriptive' ? 'descriptive' : 'mcq',
                configured: true,
                num_questions: asNumber(c.num_questions),
                marks_each: Number(c.marks_each ?? 0),
                negative_marks: Number(c.negative_marks ?? 0),
                shuffle_questions: Boolean(c.shuffle_questions),
                shuffle_options: Boolean(c.shuffle_options),
                word_limit: asNumber(c.word_limit),
                default_questions: derived,
              });
            }
          } else {
            next.push({ uid: nextComponentUid(), exam_subject_id: sid, subject_title: subjectTitle, component_type: 'mcq', configured: false, num_questions: derived, marks_each: 1, negative_marks: 0, shuffle_questions: false, shuffle_options: false, word_limit: 0, default_questions: derived });
          }
        }
        setRows(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  // Keyed by uid, not by array index: the UI renders grouped by subject, and
  // an index-keyed remove leaves React reusing the removed row's DOM for its
  // sibling — the "wrong numbers after deleting a component" class of bug.
  const setRow = (uid: string, patch: Partial<ComponentRow>) =>
    setRows((cur) => cur.map((r) => r.uid === uid ? { ...r, ...patch } : r));
  const addComponent = (subject_id: number, subject_title: string, type: 'mcq' | 'descriptive') => {
    // An explicitly added component counts as configured — the admin asked for it.
    const fallback = rows.find((r) => r.exam_subject_id === subject_id)?.default_questions ?? FALLBACK_QUESTION_COUNT;
    setRows((cur) => [...cur, { uid: nextComponentUid(), exam_subject_id: subject_id, subject_title, component_type: type, configured: true, num_questions: type === 'mcq' ? fallback : 1, marks_each: 1, negative_marks: 0, shuffle_questions: false, shuffle_options: false, word_limit: type === 'descriptive' ? 200 : 0, default_questions: fallback }]);
  };
  const removeRow = (uid: string) => setRows((cur) => cur.filter((r) => r.uid !== uid));

  const handleSave = async (then: 'next' | 'close') => {
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        exam_subject_id: r.exam_subject_id,
        component_type: r.component_type,
        num_questions: r.configured ? r.num_questions : r.default_questions,
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
  const grouped = new Map<number, { title: string; rows: ComponentRow[] }>();
  for (const r of rows) {
    const g = grouped.get(r.exam_subject_id) ?? { title: r.subject_title, rows: [] };
    g.rows.push(r);
    grouped.set(r.exam_subject_id, g);
  }
  const unconfiguredCount = rows.filter((r) => !r.configured).length;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-slate-600">For each subject, configure one or more components (MCQ and/or Descriptive).</p>

        {unconfiguredCount > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {unconfiguredCount === 1 ? '1 subject has' : `${unconfiguredCount} subjects have`} no saved question setup yet. Those rows show a
            greyed-out suggested count as a placeholder, not a saved value — type a number to set it. Saving keeps the suggestion if you leave it blank.
          </p>
        ) : null}

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
              {g.rows.map((row) => (
                <div key={row.uid} className={`grid grid-cols-2 gap-3 rounded-md border p-3 sm:grid-cols-6 ${row.configured ? 'border-slate-100 bg-slate-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <select value={row.component_type} onChange={(e) => setRow(row.uid, { component_type: e.target.value as 'mcq' | 'descriptive', configured: true })} className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="mcq">MCQ</option>
                      <option value="descriptive">Descriptive</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">No. of Questions</Label>
                    {/* Empty + placeholder, never a fake value: Risha read the old
                        hardcoded 10 as her saved 70 having been lost. */}
                    <Input
                      type="number"
                      min={0}
                      value={row.configured ? row.num_questions : ''}
                      placeholder={String(row.default_questions)}
                      onChange={(e) => setRow(row.uid, { num_questions: Number(e.target.value) || 0, configured: true })}
                      className="mt-1 h-9"
                    />
                    {!row.configured ? <p className="mt-1 text-[11px] leading-tight text-amber-800">Not set — saves as {row.default_questions}.</p> : null}
                  </div>
                  <div>
                    <Label className="text-xs">Marks each</Label>
                    <Input type="number" step="0.5" min={0} value={row.marks_each} onChange={(e) => setRow(row.uid, { marks_each: Number(e.target.value) || 0, configured: true })} className="mt-1 h-9" />
                  </div>
                  {row.component_type === 'mcq' ? (
                    <>
                      <div>
                        <Label className="text-xs">Negative Marks</Label>
                        <Input type="number" step="0.25" min={0} value={row.negative_marks} onChange={(e) => setRow(row.uid, { negative_marks: Number(e.target.value) || 0, configured: true })} className="mt-1 h-9" />
                      </div>
                      <div className="flex items-end gap-3 sm:col-span-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={row.shuffle_questions} onChange={(e) => setRow(row.uid, { shuffle_questions: e.target.checked, configured: true })} className="size-4 rounded border-slate-300" />
                          Shuffle questions
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={row.shuffle_options} onChange={(e) => setRow(row.uid, { shuffle_options: e.target.checked, configured: true })} className="size-4 rounded border-slate-300" />
                          Shuffle options
                        </label>
                        <button type="button" onClick={() => removeRow(row.uid)} className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">×</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs">Word Limit</Label>
                        <Input type="number" min={0} value={row.word_limit} onChange={(e) => setRow(row.uid, { word_limit: Number(e.target.value) || 0, configured: true })} className="mt-1 h-9" />
                      </div>
                      <div className="flex items-end justify-end sm:col-span-2">
                        <button type="button" onClick={() => removeRow(row.uid)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">×</button>
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

// ─── Step 4: Assign Questions ──────────────────────────────────────
// Picks real question_bank rows for the exam and writes exam_questions —
// the link the student player + availability check require (Naji 2026-06-09).
//
// Risha UAT 2026-08-06 — "This part doesn't have a clarity. Which subject, how
// many questions in each subject. How to choose in bulk are all a concern now."
// Steps 2 and 3 are per-SUBJECT but this step was one flat list of every
// question in the course under a single "Selected: 167" counter, so there was
// no way to tell whether a subject had hit the count Step 3 planned for it.
// The picker is now one collapsible section per scheduled subject, in Step 2
// order, each carrying its own selected/target and marks/total plus bulk
// actions. Questions from subjects this exam does not sit stay in their own
// collapsed section rather than being mixed in silently.
interface QuestionOption {
  id: number;
  title: string;
  subject_id: number | null;
  subject_title: string;
  /** Links the question to a Step 2 row; null when its subject isn't scheduled. */
  exam_subject_id: number | null;
  /** question_bank.q_type — 0 = MCQ, 1 = Descriptive. */
  q_type: number;
  in_scheduled_subject: boolean;
}

// One scheduled subject's plan, from getExamQuestionPlan (Step 2 + Step 3).
interface SubjectPlan {
  exam_subject_id: number;
  subject_id: number | null;
  subject_title: string;
  mcq_target: number;
  descriptive_target: number;
  total_target: number;
  total_marks: number;
  mcq_marks_each: number;
  mcq_negative_marks: number;
}

interface QuestionSection {
  key: string;
  title: string;
  /** null for a legacy exam with no Step 2 schedule, and for the stray bucket. */
  plan: SubjectPlan | null;
  /** True only for the "not in this exam's schedule" bucket. */
  unscheduled: boolean;
  items: QuestionOption[];
}

const UNSCHEDULED_SECTION_KEY = 'not-scheduled';

// The mark an auto-filled question gets when its subject has no Step 3
// marks_each to inherit. Same value the Default mark box starts on, so the two
// can never silently disagree.
const DEFAULT_QUESTION_MARK = 1;

// Risha UAT 2026-08-06 — "showing an option to choose the questions, we
// discussed this as auto fetch the no of questios from question bank." Step 3
// already records how many MCQ / descriptive questions each subject wants, so
// Step 4 now fills itself from that plan instead of asking for 167 hand-ticked
// checkboxes. Manual ticking is untouched: the auto-fill only seeds the
// selection in the browser, and nothing reaches exam_questions until Save.
//
// Grouping the bank into Step 2 sittings is needed both by the picker (a
// useMemo) and by the first-open auto-fill (inside the load effect, before any
// memo has run), so it lives out here as a pure function.
function buildSections(options: QuestionOption[], plans: SubjectPlan[]): QuestionSection[] {
  if (plans.length === 0) {
    // No plan came back. `in_scheduled_subject` still tells us whether the
    // exam has a schedule at all, so the stray bucket stays meaningful.
    const anyScheduled = options.some((o) => o.in_scheduled_subject);
    const bySubject = new Map<string, QuestionSection>();
    const strays: QuestionOption[] = [];
    for (const o of options) {
      if (anyScheduled && !o.in_scheduled_subject) { strays.push(o); continue; }
      const key = `subject-${o.subject_id ?? 'none'}`;
      const existing = bySubject.get(key);
      if (existing) { existing.items.push(o); continue; }
      bySubject.set(key, {
        key,
        title: o.subject_title || (o.subject_id === null ? 'No subject' : `Subject #${o.subject_id}`),
        plan: null,
        unscheduled: false,
        items: [o],
      });
    }
    const flat = [...bySubject.values()];
    if (strays.length > 0) {
      flat.push({ key: UNSCHEDULED_SECTION_KEY, title: "Not in this exam's schedule", plan: null, unscheduled: true, items: strays });
    }
    return flat;
  }

  const claimed = new Set<number>();
  const out: QuestionSection[] = [];
  for (const p of plans) {
    const items = options.filter((o) => {
      if (claimed.has(o.id)) return false;
      // exam_subject_id is the exact link; subject_id is the fallback for a
      // row the backend could not resolve to a single Step 2 sitting.
      if (o.exam_subject_id !== null) return o.exam_subject_id === p.exam_subject_id;
      return p.subject_id !== null && o.subject_id === p.subject_id;
    });
    for (const o of items) claimed.add(o.id);
    out.push({
      key: `plan-${p.exam_subject_id}`,
      title: p.subject_title || `Subject #${p.subject_id ?? p.exam_subject_id}`,
      plan: p,
      unscheduled: false,
      items,
    });
  }
  const strays = options.filter((o) => !claimed.has(o.id));
  if (strays.length > 0) {
    out.push({ key: UNSCHEDULED_SECTION_KEY, title: "Not in this exam's schedule", plan: null, unscheduled: true, items: strays });
  }
  return out;
}

/** One "asked for vs. actually in the bank" line of a subject's fill. */
interface PickPart { label: string; wanted: number; got: number }

interface SubjectPick {
  /** Bank question ids, in the order they should be numbered. */
  ids: number[];
  /** The mark each picked question gets — the subject's Step 3 marks_each. */
  mark: number;
  parts: PickPart[];
}

// What the plan asks for, and what the bank can actually supply.
//
// The pick is DELIBERATELY deterministic — the first N of the subject's bank
// rows in the order listExamQuestionOptions returned them (the backend orders
// by subject then id). It is not randomised, because exam.shuffle_questions
// already randomises the order per student at attempt time, and a random pick
// would make two auto-fills of the same exam produce two different papers —
// impossible for an admin to review, re-verify or explain to a student.
function planPickFor(s: QuestionSection, fallbackMark: number): SubjectPick {
  const plan = s.plan;
  const mark = plan && plan.mcq_marks_each > 0 ? plan.mcq_marks_each : fallbackMark;
  if (!plan) return { ids: [], mark, parts: [] };
  const mcqWanted = Math.max(0, plan.mcq_target);
  const descWanted = Math.max(0, plan.descriptive_target);
  // An older exam whose Step 3 setup names neither type still has a total to
  // honour; fill it in bank order rather than refusing to fill at all.
  if (mcqWanted === 0 && descWanted === 0) {
    const wanted = Math.max(0, plan.total_target);
    const take = s.items.slice(0, wanted);
    return { ids: take.map((o) => o.id), mark, parts: [{ label: 'question', wanted, got: take.length }] };
  }
  const mcqs = s.items.filter((o) => o.q_type !== 1).slice(0, mcqWanted);
  const descs = s.items.filter((o) => o.q_type === 1).slice(0, descWanted);
  return {
    ids: [...mcqs, ...descs].map((o) => o.id),
    mark,
    parts: [
      { label: 'MCQ', wanted: mcqWanted, got: mcqs.length },
      { label: 'descriptive', wanted: descWanted, got: descs.length },
    ],
  };
}

/** Questions the plan asked for that the bank could not supply. */
function missingIn(pick: SubjectPick): number {
  return pick.parts.reduce((n, p) => n + Math.max(0, p.wanted - p.got), 0);
}

/** "42 of 70 MCQ · 5 of 5 descriptive" — only the types the plan asked for. */
function describeParts(parts: PickPart[]): string {
  return parts.filter((p) => p.wanted > 0).map((p) => `${p.got} of ${p.wanted} ${p.label}`).join(' · ');
}

// Whole-exam fill. Sections are walked in Step 2 order and each subject's
// questions are inserted together, so the Map's insertion order — which is
// what becomes question_no — reads subject 1, then subject 2, then subject 3.
// Subjects with no Step 3 plan (and the stray bucket) are never auto-filled;
// picking those is always a deliberate act.
function autoFillSelection(
  sections: QuestionSection[],
  fallbackMark: number,
): { selection: Map<number, number>; picked: number; shortfall: number } {
  const selection = new Map<number, number>();
  let shortfall = 0;
  for (const s of sections) {
    if (!s.plan) continue;
    const pick = planPickFor(s, fallbackMark);
    for (const id of pick.ids) selection.set(id, pick.mark);
    shortfall += missingIn(pick);
  }
  return { selection, picked: selection.size, shortfall };
}

/** What the admin is looking at when it isn't (yet) what is stored. */
interface AutoFillNotice {
  /** 'auto' = ran by itself on first open; 'manual' = the admin asked for it. */
  origin: 'auto' | 'manual';
  /** 'this exam' or a subject title. */
  label: string;
  picked: number;
  shortfall: number;
}

function QuestionsStep({
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
  const [options, setOptions] = useState<QuestionOption[]>([]);
  const [plans, setPlans] = useState<SubjectPlan[]>([]);
  // questionId -> marks (insertion order preserved => question_no order).
  const [selected, setSelected] = useState<Map<number, number>>(new Map());
  const [defaultMark, setDefaultMark] = useState(DEFAULT_QUESTION_MARK);
  const [query, setQuery] = useState('');
  // Risha UAT 2026-08-06 — an admin must never have to guess whether the list
  // in front of them is stored or merely proposed. `savedCount` is what
  // exam_questions actually holds, `dirty` says the picker has moved since,
  // and `autoFill` describes the proposal on screen (null once it is saved).
  const [savedCount, setSavedCount] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [autoFill, setAutoFill] = useState<AutoFillNotice | null>(null);
  // Section keys the admin has folded away. Tracking the closed ones (rather
  // than the open ones) keeps a section that arrives later expanded by default.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set([UNSCHEDULED_SECTION_KEY]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [opts, assigned, plan] = await Promise.all([
          api.listExamQuestionOptions(authToken, examId),
          api.getExamQuestions(authToken, examId),
          // Advisory: a legacy exam with no Step 2 rows must still be
          // assignable, so a failure here degrades to a flat subject grouping
          // rather than blanking the picker.
          api.getExamQuestionPlan(authToken, examId).catch(() => [] as Record<string, unknown>[]),
        ]);
        if (cancelled) return;
        const mappedOptions: QuestionOption[] = opts.map((o) => ({
          id: asNumber(o.id),
          title: asString(o.title),
          subject_id: o.subject_id === null || o.subject_id === undefined ? null : asNumber(o.subject_id),
          subject_title: asString(o.subject_title),
          exam_subject_id: o.exam_subject_id === null || o.exam_subject_id === undefined ? null : asNumber(o.exam_subject_id),
          q_type: asNumber(o.q_type),
          in_scheduled_subject: asBoolean(o.in_scheduled_subject),
        }));
        const mappedPlans: SubjectPlan[] = plan.map((p) => ({
          exam_subject_id: asNumber(p.exam_subject_id),
          subject_id: p.subject_id === null || p.subject_id === undefined ? null : asNumber(p.subject_id),
          subject_title: asString(p.subject_title),
          mcq_target: asNumber(p.mcq_target),
          descriptive_target: asNumber(p.descriptive_target),
          total_target: asNumber(p.total_target),
          total_marks: asNumber(p.total_marks),
          mcq_marks_each: asNumber(p.mcq_marks_each),
          mcq_negative_marks: asNumber(p.mcq_negative_marks),
        }));
        setOptions(mappedOptions);
        setPlans(mappedPlans);
        const sel = new Map<number, number>();
        for (const a of assigned) {
          const qid = asNumber(a.question_id);
          if (qid > 0) sel.set(qid, Number(a.mark ?? 0) || 0);
        }
        setSavedCount(sel.size);
        // Risha UAT 2026-08-06 — first open of a never-assigned exam fills
        // itself from the Step 3 plan. A saved selection is NEVER overwritten:
        // the admin's stored paper outranks anything we would propose, and
        // re-running the fill on top of it is an explicit button below.
        if (sel.size === 0 && mappedPlans.length > 0) {
          const filled = autoFillSelection(buildSections(mappedOptions, mappedPlans), DEFAULT_QUESTION_MARK);
          if (filled.picked > 0) {
            setSelected(filled.selection);
            setDirty(true);
            setAutoFill({ origin: 'auto', label: 'this exam', picked: filled.picked, shortfall: filled.shortfall });
            return;
          }
        }
        setSelected(sel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  const sections = useMemo<QuestionSection[]>(() => buildSections(options, plans), [options, plans]);

  // What the plan asks of each subject, and how much of it the bank can cover.
  // Computed for every planned subject whether or not the auto-fill ran, since
  // a short bank is a fact about the exam, not about how it was filled.
  const picks = useMemo(() => {
    const m = new Map<string, SubjectPick>();
    for (const s of sections) if (s.plan) m.set(s.key, planPickFor(s, defaultMark));
    return m;
  }, [sections, defaultMark]);

  // Risha UAT 2026-08-06 — an exam that publishes short is an exam-day
  // problem, so a bank that cannot meet Step 3's counts is stated outright
  // (per subject and as a total) rather than quietly under-filling.
  const shortfalls = useMemo(() => {
    const out: Array<{ key: string; title: string; missing: number; detail: string }> = [];
    for (const s of sections) {
      const pick = picks.get(s.key);
      if (!pick) continue;
      const missing = missingIn(pick);
      if (missing > 0) out.push({ key: s.key, title: s.title, missing, detail: describeParts(pick.parts) });
    }
    return out;
  }, [sections, picks]);
  const totalMissing = shortfalls.reduce((n, r) => n + r.missing, 0);
  const hasPlan = sections.some((s) => s.plan !== null);

  // question_no comes out of this Map's insertion order, so every membership
  // change re-lays it in Step 2 order. Without this, a subject auto-filled or
  // ticked second would number its questions after subject 3's.
  const orderedBySection = (next: Map<number, number>): Map<number, number> => {
    const out = new Map<number, number>();
    for (const s of sections) {
      for (const o of s.items) {
        const mark = next.get(o.id);
        if (mark !== undefined) out.set(o.id, mark);
      }
    }
    // A question already assigned but no longer in the bank listing keeps its
    // place at the end rather than being dropped behind the admin's back.
    for (const [id, mark] of next) if (!out.has(id)) out.set(id, mark);
    return out;
  };

  // A newly ticked question inherits its subject's planned MCQ mark; the
  // Default mark box is the fallback for a subject with no Step 3 setup.
  const markForSection = (s: QuestionSection): number =>
    s.plan && s.plan.mcq_marks_each > 0 ? s.plan.mcq_marks_each : defaultMark;

  const statsForSection = (s: QuestionSection): { count: number; marks: number } => {
    let count = 0;
    let marks = 0;
    for (const o of s.items) {
      const m = selected.get(o.id);
      if (m === undefined) continue;
      count += 1;
      if (Number.isFinite(m)) marks += m;
    }
    return { count, marks };
  };

  const toggle = (s: QuestionSection, id: number) => {
    setDirty(true);
    setSelected((cur) => {
      const next = new Map(cur);
      if (next.has(id)) next.delete(id);
      else next.set(id, markForSection(s));
      return orderedBySection(next);
    });
  };
  const setMark = (id: number, mark: number) => {
    setDirty(true);
    setSelected((cur) => {
      if (!cur.has(id)) return cur;
      const next = new Map(cur);
      next.set(id, mark);
      return next;
    });
  };

  // Bulk actions. Insertion order into the Map becomes question_no, so these
  // add in list order — the same semantics as ticking the boxes by hand.
  const selectFirstN = (s: QuestionSection, items: QuestionOption[], n: number) => {
    setDirty(true);
    setSelected((cur) => {
      const next = new Map(cur);
      for (const o of s.items) next.delete(o.id);
      const mark = markForSection(s);
      for (const o of items.slice(0, Math.max(0, n))) next.set(o.id, mark);
      return orderedBySection(next);
    });
  };
  const selectAllIn = (s: QuestionSection, items: QuestionOption[]) => {
    setDirty(true);
    setSelected((cur) => {
      const next = new Map(cur);
      const mark = markForSection(s);
      for (const o of items) if (!next.has(o.id)) next.set(o.id, mark);
      return orderedBySection(next);
    });
  };
  const clearSection = (s: QuestionSection) => {
    setDirty(true);
    setSelected((cur) => {
      const next = new Map(cur);
      for (const o of s.items) next.delete(o.id);
      return next;
    });
  };

  // Risha UAT 2026-08-06 — re-runnable fill, for after Step 3 changes. It
  // REPLACES rather than tops up, so the paper always matches the plan the
  // admin is looking at; anything picked by hand is confirmed away first.
  const autoFillWholeExam = () => {
    if (!hasPlan) return;
    if (selected.size > 0 && !window.confirm(
      `Replace all ${selected.size} question${selected.size === 1 ? '' : 's'} currently picked with your Step 3 plan?\n\nAnything picked by hand — including questions outside this exam's schedule — is dropped.`,
    )) return;
    const filled = autoFillSelection(sections, defaultMark);
    setSelected(filled.selection);
    setDirty(true);
    setAutoFill({ origin: 'manual', label: 'this exam', picked: filled.picked, shortfall: filled.shortfall });
    toast.success(`Auto-filled ${filled.picked} question${filled.picked === 1 ? '' : 's'} from the plan. Not saved yet.`);
  };

  const autoFillSubject = (s: QuestionSection) => {
    const pick = picks.get(s.key);
    if (!pick) return;
    const current = statsForSection(s).count;
    if (current > 0 && !window.confirm(
      `Replace the ${current} question${current === 1 ? '' : 's'} picked for ${s.title} with its Step 3 plan?`,
    )) return;
    setDirty(true);
    setSelected((cur) => {
      const next = new Map(cur);
      for (const o of s.items) next.delete(o.id);
      for (const id of pick.ids) next.set(id, pick.mark);
      return orderedBySection(next);
    });
    setAutoFill({ origin: 'manual', label: s.title, picked: pick.ids.length, shortfall: missingIn(pick) });
    toast.success(`${s.title}: auto-filled ${pick.ids.length} question${pick.ids.length === 1 ? '' : 's'}. Not saved yet.`);
  };

  const toggleSection = (key: string) =>
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Risha UAT 2026-08-06 — the penalty now comes from the subject's Step 3
  // negative_marks. The backend used to hard-code -1 for every unmarked MCQ,
  // penalising exams whose admin never configured negative marking at all.
  const negativeByQuestion = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of sections) {
      const neg = s.plan?.mcq_negative_marks ?? 0;
      if (neg <= 0) continue;
      for (const o of s.items) if (o.q_type !== 1) m.set(o.id, neg);
    }
    return m;
  }, [sections]);

  const search = query.trim().toLowerCase();
  const visibleIn = (s: QuestionSection): QuestionOption[] =>
    search ? s.items.filter((o) => o.title.toLowerCase().includes(search)) : s.items;
  const matchCount = sections.reduce((sum, s) => sum + visibleIn(s).length, 0);

  const totalMarks = [...selected.values()].reduce((s, m) => s + (Number.isFinite(m) ? m : 0), 0);

  const handleSave = async (then: 'next' | 'close') => {
    setSaving(true);
    try {
      const questions = [...selected.entries()].map(([question_id, mark]) => {
        const negative = negativeByQuestion.get(question_id) ?? 0;
        return negative > 0 ? { question_id, mark, negative_mark: negative } : { question_id, mark };
      });
      const res = await api.saveExamQuestions(authToken, examId, questions);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) {
        // The proposal is now the stored paper, so the "review and Save"
        // banner must go — it would otherwise keep claiming this is unsaved.
        setSavedCount(questions.length);
        setDirty(false);
        setAutoFill(null);
        if (questions.length === 0) toast('No questions assigned — students won’t be able to take this exam yet.');
        else toast.success(message);
        if (then === 'next') onSaved(); else onClose();
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign questions.');
    } finally {
      setSaving(false);
    }
  };

  if (!examId) return (
    <Card><CardContent className="space-y-2 py-8 text-center text-sm text-slate-600">
      <p>Save Step 1 first to assign questions.</p>
      <div className="pt-2"><Button variant="outline" onClick={onBack}>‹ Back</Button></div>
    </CardContent></Card>
  );
  if (loading) return <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading questions…</CardContent></Card>;
  if (options.length === 0) return (
    <Card><CardContent className="space-y-2 py-8 text-center text-sm text-slate-600">
      <p>No questions found for this exam’s course(s).</p>
      <p className="text-xs">Add questions in the Question Bank for the exam’s course, then revisit this step.</p>
      <div className="flex justify-center gap-2 pt-2">
        <Button variant="outline" onClick={onBack}>‹ Back</Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </CardContent></Card>
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Questions for this exam</p>
            <p className="text-xs text-slate-500">Selected: <strong>{selected.size}</strong> · Total marks: <strong>{totalMarks}</strong></p>
            {/* Saved, edited or proposed — never left to guesswork. */}
            <p className={`mt-0.5 text-xs ${dirty ? 'font-medium text-amber-700' : 'text-slate-400'}`}>
              {dirty
                ? savedCount > 0
                  ? `Not saved yet — ${savedCount} question${savedCount === 1 ? '' : 's'} currently stored on this exam.`
                  : 'Not saved yet — nothing is stored on this exam.'
                : savedCount > 0
                  ? 'Showing the questions saved on this exam.'
                  : 'No questions saved on this exam yet.'}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Default mark</Label>
              <Input type="number" step="0.5" min={0} value={defaultMark} onChange={(e) => setDefaultMark(Number(e.target.value) || 0)} className="mt-1 h-9 w-24" />
              <p className="mt-1 text-[11px] text-slate-400">Used only where Step 3 sets no marks.</p>
            </div>
            <div>
              <Button
                variant="outline"
                className="h-9"
                onClick={autoFillWholeExam}
                disabled={!hasPlan}
                title={hasPlan
                  ? "Fills every subject with the number of questions Step 3 planned for it, taking them from the top of that subject's bank."
                  : 'Needs a subject schedule (Step 2) and question setup (Step 3).'}
              >
                Auto-fill from plan
              </Button>
              <p className="mt-1 text-[11px] text-slate-400">
                {hasPlan ? 'Re-run after changing Step 3.' : 'Set up Steps 2 and 3 to use this.'}
              </p>
            </div>
          </div>
        </div>

        {/* Risha UAT 2026-08-06 — the fill is a PROPOSAL. It is loud about
            being unsaved, because a paper that looks assigned but never
            reached exam_questions is an exam nobody can sit. */}
        {autoFill ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <p className="font-semibold">
              {autoFill.origin === 'auto'
                ? 'Auto-filled from your Step 3 plan — review and Save'
                : 'Re-filled from your Step 3 plan — review and Save'}
            </p>
            <p className="mt-0.5 text-xs">
              {autoFill.picked} question{autoFill.picked === 1 ? '' : 's'} picked for {autoFill.label}, using the number of questions each subject was given in Step 3.
              {' '}Nothing is stored until you press Save &amp; Continue or Save &amp; Close — until then this exam still has {savedCount === 0 ? 'no questions' : `its ${savedCount} saved question${savedCount === 1 ? '' : 's'}`}.
              {autoFill.shortfall > 0 ? ` ${autoFill.shortfall} could not be filled — the question bank is short; see below.` : ''}
              {' '}Tick, untick or change marks freely before saving.
            </p>
          </div>
        ) : null}

        {/* Honest under-fill: which subjects are short, and by how much. */}
        {totalMissing > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              Question bank is short for {shortfalls.length} subject{shortfalls.length === 1 ? '' : 's'} — {totalMissing} question{totalMissing === 1 ? '' : 's'} missing.
            </p>
            <ul className="mt-1.5 space-y-1">
              {shortfalls.map((r) => (
                <li key={r.key} className="text-xs">
                  <span className="font-medium">{r.title}</span> — bank has {r.detail}
                  <span className="ml-1 rounded bg-amber-200/70 px-1.5 py-0.5 font-medium">{r.missing} short</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Auto-fill takes everything the bank does have, so those subjects will publish under their planned count. Add the missing questions in Question Bank and re-run Auto-fill, or lower the count in Step 3.
            </p>
          </div>
        ) : null}

        {/* Per-subject progress at a glance, so the targets are readable
            without scrolling the picker. */}
        {sections.some((s) => s.plan !== null) ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sections.filter((s) => s.plan !== null).map((s) => {
              const stats = statsForSection(s);
              const target = s.plan?.total_target ?? 0;
              const pick = picks.get(s.key);
              const missing = pick ? missingIn(pick) : 0;
              // Summed from the pick itself so the two numbers can't disagree
              // with each other if a plan's total drifts from its per-type counts.
              const planned = pick ? pick.parts.reduce((n, p) => n + p.wanted, 0) : 0;
              const available = pick ? pick.parts.reduce((n, p) => n + p.got, 0) : 0;
              const tone = target <= 0
                ? 'border-slate-200 bg-slate-50 text-slate-600'
                : stats.count === target
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : stats.count > target
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-600';
              return (
                <div key={s.key} className={`rounded-md border px-3 py-2 ${tone}`}>
                  <p className="truncate text-xs font-semibold">{s.title}</p>
                  <p className="text-[11px]">
                    {stats.count}{target > 0 ? ` / ${target}` : ''} questions · {stats.marks}{(s.plan?.total_marks ?? 0) > 0 ? ` / ${s.plan?.total_marks}` : ''} marks
                  </p>
                  {/* Without this the card reads as an admin who simply hasn't
                      finished picking, when the bank cannot reach the target. */}
                  {missing > 0 ? (
                    <p className="text-[11px] font-medium text-amber-800">Bank short {missing} — max {available} of {planned}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <Input placeholder="Search questions…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9" />

        <div className="max-h-[420px] overflow-y-auto rounded-md border border-slate-200 bg-white">
          {matchCount === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No questions match.</p>
          ) : sections.map((s) => {
            const isOpen = !collapsed.has(s.key);
            const visible = visibleIn(s);
            const stats = statsForSection(s);
            const target = s.plan?.total_target ?? 0;
            const planMarks = s.plan?.total_marks ?? 0;
            const pick = picks.get(s.key);
            const missing = pick ? missingIn(pick) : 0;
            const countTone = target <= 0
              ? 'bg-slate-100 text-slate-600'
              : stats.count === target
                ? 'bg-emerald-100 text-emerald-800'
                : stats.count > target
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-600';
            const markTone = planMarks <= 0
              ? 'bg-slate-100 text-slate-600'
              : stats.marks === planMarks
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900';
            // "12 still to pick" is a lie when only 4 of those 12 exist in the
            // bank, so the shortfall is named in the same breath.
            const hint = target <= 0
              ? ''
              : stats.count === target
                ? 'Matches the plan.'
                : stats.count > target
                  ? `${stats.count - target} more than planned.`
                  : missing > 0
                    ? `${target - stats.count} still to pick — the bank is ${missing} short of the plan.`
                    : `${target - stats.count} still to pick.`;
            return (
              <section key={s.key} className="border-b border-slate-100 last:border-b-0">
                {/* Sticky so the subject's counts stay on screen while its own
                    questions scroll past. */}
                <div className={`sticky top-0 z-10 border-b border-slate-100 px-3 py-2 ${s.unscheduled ? 'bg-slate-50/95' : 'bg-white/95'} backdrop-blur`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button type="button" onClick={() => toggleSection(s.key)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className="shrink-0 text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{s.title}</span>
                        <span className="block text-[11px] text-slate-500">
                          {s.plan
                            ? `Plan: ${s.plan.mcq_target} MCQ · ${s.plan.descriptive_target} descriptive · ${s.plan.total_marks} marks`
                            : s.unscheduled
                              ? 'These subjects have no sitting in Step 2 — assigning them is usually a mistake.'
                              : `${s.items.length} question${s.items.length === 1 ? '' : 's'} in the bank`}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {missing > 0 ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900" title={`Bank has ${describeParts(pick?.parts ?? [])}.`}>
                          bank short {missing}
                        </span>
                      ) : null}
                      <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${countTone}`}>
                        {stats.count}{target > 0 ? ` / ${target}` : ''} picked
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${markTone}`}>
                        {stats.marks}{planMarks > 0 ? ` / ${planMarks}` : ''} marks
                      </span>
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {/* Per-subject re-run, for when only one subject's Step 3
                          setup changed. Splits by type the way the plan does,
                          which "Select first N" (a flat list slice) cannot. */}
                      {pick ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-sky-200 bg-sky-50 px-2 text-xs text-sky-900 hover:bg-sky-100"
                          title={`Replaces this subject's selection with its Step 3 plan (${describeParts(pick.parts)}).`}
                          onClick={() => autoFillSubject(s)}
                        >
                          Auto-fill {pick.ids.length}
                        </Button>
                      ) : null}
                      {target > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          title={`Replaces this subject's selection with the first ${target} questions listed.`}
                          onClick={() => selectFirstN(s, visible, target)}
                        >
                          Select first {target}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => selectAllIn(s, visible)}>
                        Select all{search ? ` shown (${visible.length})` : ` (${s.items.length})`}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => clearSection(s)} disabled={stats.count === 0}>
                        Clear
                      </Button>
                      {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
                      {search ? <span className="text-[11px] text-slate-400">Bulk actions apply to the search results; Clear empties the whole subject.</span> : null}
                    </div>
                  ) : null}
                </div>

                {isOpen ? (
                  <div className="space-y-1 p-2">
                    {visible.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-500">{search ? 'No questions match the search in this subject.' : 'No questions in the bank for this subject.'}</p>
                    ) : visible.map((o) => {
                      const isOn = selected.has(o.id);
                      return (
                        <div key={o.id} className={`flex items-center gap-3 rounded-md p-2 text-sm transition ${isOn ? 'bg-ttii-primary/10' : 'hover:bg-slate-50'}`}>
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                            <input type="checkbox" checked={isOn} onChange={() => toggle(s, o.id)} className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-ttii-primary focus:ring-ttii-primary" />
                            <span className="min-w-0">
                              <span className={`block truncate ${isOn ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{o.title || `Question #${o.id}`}</span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {/* Step 3 plans MCQ and Descriptive counts separately,
                                    so the admin has to be able to tell them apart. */}
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${o.q_type === 1 ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
                                  {o.q_type === 1 ? 'Descriptive' : 'MCQ'}
                                </span>
                                {o.subject_title ? <span className="text-xs text-slate-400">{o.subject_title}</span> : null}
                              </span>
                            </span>
                          </label>
                          {isOn ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="text-xs text-slate-400">marks</span>
                              <Input type="number" step="0.5" min={0} value={selected.get(o.id) ?? 0} onChange={(e) => setMark(o.id, Number(e.target.value) || 0)} className="h-8 w-20" />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
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

// ─── Step 5: Student Allocation ────────────────────────────────────
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

// ─── Step 6: Instructions + Notification + Publish ─────────────────
interface InstructionTemplate { id: number; title: string; body: string }

function PublishStep({
  api,
  authToken,
  examId,
  meta,
  metaLoaded,
  onPublished,
  onBack,
  onClose,
}: {
  api: AdminPageProps['api'];
  authToken: string;
  examId: string;
  meta: DraftMeta;
  metaLoaded: boolean;
  onPublished: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [instructions, setInstructions] = useState(meta.instructions);
  // Only a real edit is worth sending. Publishing used to post the (empty)
  // textarea back over the stored instructions every time — Risha's "it was
  // saved before" disappearance. Untouched => omit => the backend keeps them.
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  // Risha UAT 2026-08-06 — these two boxes are the exam's STORED preference and
  // nothing else, so they round-trip verbatim. They used to start UNTICKED on an
  // already-published exam (so a re-publish wouldn't re-spam), but Save & Close
  // then PERSISTED that 0/0: the exam was permanently opted out of publish mail
  // AND out of the 24h/1h reminder cron, which skips notify_email = 0. "Don't
  // email again for THIS re-publish" is the separate, non-persisted Re-send tick
  // below — a save must never turn off a preference the admin didn't turn off.
  // exam.notify_email/notify_inapp default to 1, so a stored 0 is always a
  // deliberate un-tick; no "looks unset, force it back ON" guess is warranted.
  const [notifyEmail, setNotifyEmail] = useState(meta.notify_email);
  const [notifyInapp, setNotifyInapp] = useState(meta.notify_inapp);
  // A tick the admin made outranks a late-arriving draft — same rule as the
  // instructions textarea, whose initialiser was otherwise the final word.
  const [notifyDirty, setNotifyDirty] = useState(false);
  const [resendNotification, setResendNotification] = useState(false);
  const [sittings, setSittings] = useState<number | null>(null);
  const [publishError, setPublishError] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
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

  // Keep in step with a late-arriving draft, but never overwrite typing.
  useEffect(() => {
    if (instructionsDirty) return;
    setInstructions(meta.instructions);
  }, [meta.instructions, instructionsDirty]);

  // Same for the notification preference — without this the useState
  // initialiser is the final word, and a draft that resolves after Step 6
  // mounts would be silently ignored.
  useEffect(() => {
    if (notifyDirty) return;
    setNotifyEmail(meta.notify_email);
    setNotifyInapp(meta.notify_inapp);
  }, [meta.notify_email, meta.notify_inapp, notifyDirty]);

  // Publishing now materialises one exam row per Step 2 subject, so say how
  // many sittings the button is about to create.
  useEffect(() => {
    if (!examId) { setSittings(0); return; }
    let cancelled = false;
    void api.getExamSchedule(authToken, examId)
      .then((rows) => { if (!cancelled) setSittings(rows.length); })
      .catch(() => { if (!cancelled) setSittings(null); });
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  const editInstructions = (value: string) => {
    setInstructions(value);
    setInstructionsDirty(true);
  };

  const reuseTemplate = (id: number) => {
    const t = templates.find((tp) => tp.id === id);
    if (t) editInstructions(t.body);
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

  // Risha UAT 2026-08-06 — publishing was the only way to persist the
  // instructions, which is what forced a re-publish (and a second round of
  // emails) for a wording tweak.
  const handleSaveInstructions = async () => {
    // Risha UAT 2026-08-06 — Save & Close has no "leave the stored text alone"
    // form: it always writes the textarea. That is right for an edit and right
    // for a deliberate clear, but when the draft fetch failed the box is blank
    // for want of data — saving would blank instructions nobody touched, which
    // is the exact disappearance this step set out to fix.
    if (!metaLoaded && !instructionsDirty) {
      toast.error('Couldn’t load this exam’s saved instructions. Reload the page before saving, or type the instructions you want stored.');
      return;
    }
    setSavingInstructions(true);
    try {
      const res = await api.saveExamInstructions(authToken, examId, {
        instructions,
        notify_email: notifyEmail,
        notify_inapp: notifyInapp,
      });
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) { toast.success(message); onClose(); }
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save instructions.');
    } finally { setSavingInstructions(false); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError('');
    try {
      const res = await api.publishExam(authToken, examId, {
        ...(instructionsDirty ? { instructions } : {}),
        notify_email: notifyEmail,
        notify_inapp: notifyInapp,
        ...(meta.is_published ? { resend_notification: resendNotification } : {}),
      });
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Done.';
      if (status === 1) {
        toast.success(message);
        onPublished();
      } else {
        // A refusal names the subjects missing a date or time. A toast is too
        // short-lived for that, so keep it on the page as well.
        setPublishError(message);
        toast.error(message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish.';
      setPublishError(msg);
      toast.error(msg);
    } finally { setPublishing(false); }
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        {meta.is_published ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">This exam is already published.</p>
            <p className="mt-0.5 text-xs">
              {meta.child_count > 0
                ? `${meta.child_count} subject sitting${meta.child_count === 1 ? '' : 's'} ${meta.child_count === 1 ? 'is' : 'are'} live for allocated students.`
                : 'It is live for allocated students.'}
              {' '}Re-publishing applies your edits to the sittings. Allocated students have already been notified — they only get another email if you tick “Re-send notification” below.
            </p>
          </div>
        ) : null}

        {!metaLoaded ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Couldn’t load this exam’s saved instructions.</p>
            <p className="mt-0.5 text-xs">Anything you type below replaces them. Publishing without typing leaves whatever is stored untouched.</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="ex-instr">Instructions</Label>
          <textarea id="ex-instr" value={instructions} onChange={(e) => editInstructions(e.target.value)} rows={8}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Write the instructions students will see before starting the exam." />
          {/* Untouched, rewritten and deliberately-cleared are three different
              intents. Untouched sends nothing so the stored text survives; a
              clear is a real write, and Publish can't carry it yet (the publish
              route still reads '' as "no instructions supplied"). */}
          <p className="text-xs text-slate-500">
            {!instructionsDirty
              ? 'Showing the instructions saved on this exam.'
              : instructions.trim()
                ? 'Edited — Save & Close or Publish will store this text.'
                : 'Cleared — Save & Close will remove the saved instructions.'}
          </p>
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
          <p className="text-sm font-semibold text-slate-900">Notify allocated students</p>
          {/* These are the exam's saved preference — the reminder job reads the
              same Email box, so leaving it off also silences the 24h/1h nudges. */}
          <p className="mb-2 text-xs text-slate-500">Saved on the exam. The Email box also controls the 24-hour and 1-hour exam reminders.</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={notifyEmail} onChange={(e) => { setNotifyEmail(e.target.checked); setNotifyDirty(true); }} className="size-4 rounded border-slate-300" />
              Email
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={notifyInapp} onChange={(e) => { setNotifyInapp(e.target.checked); setNotifyDirty(true); }} className="size-4 rounded border-slate-300" />
              In-app notification
            </label>
          </div>
          {meta.is_published ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <input type="checkbox" checked={resendNotification} onChange={(e) => setResendNotification(e.target.checked)} className="mt-0.5 size-4 rounded border-slate-300" />
              <span className="min-w-0 flex-1 text-xs text-amber-900">
                <span className="block font-medium">Re-send notification to allocated students</span>
                <span className="mt-0.5 block">Leave off to change this exam without emailing everyone a second time.</span>
              </span>
            </label>
          ) : null}
        </div>

        {/* What Publish actually does now — one exam row per Step 2 subject. */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {sittings === null ? (
            <p>Couldn’t read this exam’s subject schedule. Check Step 2 before publishing.</p>
          ) : sittings > 0 ? (
            <p>
              Publishing will {meta.is_published ? 'update' : 'create'} <strong>{sittings}</strong> subject sitting{sittings === 1 ? '' : 's'} — one per subject scheduled in Step 2.
              Students see the individual sittings, each with its own date, time, duration and marks.
            </p>
          ) : (
            <p>No per-subject schedule on this exam, so publishing makes it live as a single sitting using the Step 1 dates.</p>
          )}
        </div>

        {publishError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Couldn’t publish</p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs">{publishError}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onBack}>‹ Back</Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { void handleSaveInstructions(); }} disabled={savingInstructions || publishing}>
              {savingInstructions ? 'Saving…' : 'Save & Close'}
            </Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { void handlePublish(); }} disabled={publishing || savingInstructions}>
              {publishing ? 'Publishing…' : meta.is_published ? 'Update & Re-publish' : 'Publish Exam'}
            </Button>
          </div>
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
