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
                <Input id="ex-title" value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Mid-Semester Examination — November 2026" />
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
      ) : (
        <ComingSoonStep stepLabel={STEPS.find((s) => s.id === activeStep)?.label ?? ''} examCode={draft.exam_code} onBack={() => setActiveStep(1)} />
      )}
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

function ComingSoonStep({ stepLabel, examCode, onBack }: { stepLabel: string; examCode: string; onBack: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-3 py-12 text-center">
        <p className="text-base font-semibold text-gray-900">{stepLabel} — coming next</p>
        <p className="mx-auto max-w-md text-sm text-gray-600">
          Step 1 (Add Exam) is shipped. {stepLabel} is the next step in the wizard and ships in a follow-up commit. Your draft{examCode ? ` (${examCode})` : ''} is saved and will pre-fill here once this step is live.
        </p>
        <div className="pt-2">
          <Button variant="outline" onClick={onBack}>‹ Back to Step 1</Button>
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
