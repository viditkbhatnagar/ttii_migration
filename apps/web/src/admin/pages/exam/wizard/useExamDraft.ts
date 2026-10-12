import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asBoolean, asNumber, asString, toRecords } from '../../../shared/utils/admin-data-utils.js';
import {
  emptyDraft,
  emptyMeta,
  extractTime,
  minutesBetween,
  parseFlag,
  validateStep1,
  type DraftMeta,
  type DraftState,
  type WizardStepId,
} from './wizard-model.js';

export interface PickOption { id: string; title: string }

/** Edit mode is read from the URL — `/admin/exam/edit/:id` reuses the add page. */
function readEditId(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.pathname.match(/^\/admin\/exam\/edit\/(\d+)$/);
  return m?.[1] ?? '';
}

/**
 * The wizard's shared state: the Step 1 draft, the exam-row meta Step 6 needs,
 * the course / offering pickers, and the Step 1 save. Behaviour is unchanged
 * from the single-file wizard — same endpoints, payloads and messages.
 */
export function useExamDraft({ api, session, onNavigate }: AdminPageProps) {
  const editId = useMemo(readEditId, []);
  const [activeStep, setActiveStep] = useState<WizardStepId>(1);
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
          shuffle_questions: parseFlag(d.shuffle_questions),
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
    const minutes = minutesBetween(draft.from_date, draft.from_time, draft.to_date, draft.to_time);
    if (minutes === null) return;
    setDraft((p) => p.duration_minutes === minutes ? p : { ...p, duration_minutes: minutes });
  }, [draft.from_date, draft.to_date, draft.from_time, draft.to_time]);

  const courseOptions = useMemo<PickOption[]>(
    () => toRecords(courses).map((c) => ({ id: asString(c.id), title: asString(c.title) })),
    [courses],
  );
  const offeringOptions = useMemo<PickOption[]>(
    () => allOfferings.map((o) => ({ id: asString(o.id), title: asString(o.title) || asString(o.offering_code) })),
    [allOfferings],
  );

  const patchDraft = (patch: Partial<DraftState>) => setDraft((p) => ({ ...p, ...patch }));

  const toggleCourse = (id: string) => {
    setDraft((p) => {
      const has = p.course_ids.includes(id);
      const next = has ? p.course_ids.filter((x) => x !== id) : [...p.course_ids, id];
      // Offering selections are kept; the admin reconfirms them below.
      return { ...p, course_ids: next };
    });
  };
  const toggleOffering = (id: string) => {
    setDraft((p) => {
      const has = p.offering_ids.includes(id);
      return { ...p, offering_ids: has ? p.offering_ids.filter((x) => x !== id) : [...p.offering_ids, id] };
    });
  };

  const goToList = () => onNavigate('/admin/exam/index');

  const saveDraft = async (then: 'stay' | 'next' | 'list'): Promise<void> => {
    const err = validateStep1(draft);
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
      if (then === 'list') goToList();
      else if (then === 'next') setActiveStep(2);
    } catch (err2) {
      toast.error(err2 instanceof Error ? err2.message : 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  return {
    editId,
    activeStep,
    setActiveStep,
    draft,
    patchDraft,
    saving,
    loading,
    meta,
    metaLoaded,
    courseOptions,
    offeringOptions,
    toggleCourse,
    toggleOffering,
    saveDraft,
    goToList,
  };
}

export type ExamDraftController = ReturnType<typeof useExamDraft>;
