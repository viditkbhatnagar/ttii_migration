import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asBoolean, asNumber, asString } from '../../../shared/utils/admin-data-utils.js';
import {
  DEFAULT_QUESTION_MARK,
  UNSCHEDULED_SECTION_KEY,
  autoFillSelection,
  buildSections,
  describeParts,
  missingIn,
  orderBySections,
  planPickFor,
  preferFresh,
  reusedCount,
  sectionStats,
  toQuestionOption,
  toSubjectPlan,
  type QuestionOption,
  type QuestionSection,
  type SubjectPick,
  type SubjectPlan,
} from './question-assign-model.js';

/** What the admin is looking at when it isn't (yet) what is stored. */
export interface AutoFillNotice {
  /** 'auto' = ran by itself on first open; 'manual' = the admin asked for it. */
  origin: 'auto' | 'manual';
  /** 'this exam' or a subject title. */
  label: string;
  picked: number;
  shortfall: number;
}

interface Args {
  api: AdminPageProps['api'];
  authToken: string;
  examId: string;
  /** A published exam's sittings keep their own copy of the questions until re-published. */
  isPublished: boolean;
  /**
   * TTII 2026-10-16 — a supplementary exam's regular papers' questions: listed
   * last in each subject, so Auto-fill takes them only when the bank is short.
   * Must be a stable Set (it seeds the first-open auto-fill).
   */
  avoidIds?: ReadonlySet<number> | undefined;
  onSaved: () => void;
  onClose: () => void;
}

const NONE: ReadonlySet<number> = new Set();

/** Step 4 state and actions — moved verbatim out of the single-file wizard. */
export function useAssignQuestions({ api, authToken, examId, isPublished, avoidIds = NONE, onSaved, onClose }: Args) {
  const confirm = useConfirm();
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
  // Risha 2026-10-01 — saved questions that have since been deleted from the
  // Question Bank (exam 28: 149 of 219, after a re-upload). The student player
  // drops them, so they are kept out of the selection and named in a banner.
  const [deletedSavedCount, setDeletedSavedCount] = useState(0);
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
        const mappedOptions = preferFresh(opts.map(toQuestionOption), avoidIds);
        const mappedPlans = plan.map(toSubjectPlan);
        setOptions(mappedOptions);
        setPlans(mappedPlans);
        const sel = new Map<number, number>();
        let deletedSaved = 0;
        for (const a of assigned) {
          const qid = asNumber(a.question_id);
          if (qid <= 0) continue;
          if (asBoolean(a.question_deleted)) { deletedSaved += 1; continue; }
          sel.set(qid, Number(a.mark ?? 0) || 0);
        }
        setDeletedSavedCount(deletedSaved);
        setSavedCount(sel.size);
        // Risha UAT 2026-08-06 — first open of a never-assigned exam fills
        // itself from the Step 3 plan. A saved selection is NEVER overwritten:
        // the admin's stored paper outranks anything we would propose, and
        // re-running the fill on top of it is an explicit button.
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
        // Saving now would store the paper without the deleted questions, so
        // say it differs from what is stored.
        if (deletedSaved > 0) setDirty(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, authToken, examId, avoidIds]);

  const sections = useMemo<QuestionSection[]>(() => buildSections(options, plans), [options, plans]);
  // Picked questions that are also on the regular exam's papers (supplementary only).
  const reused = useMemo(() => reusedCount(selected, avoidIds), [selected, avoidIds]);

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

  // A newly ticked question inherits its subject's planned MCQ mark; the
  // Default mark box is the fallback for a subject with no Step 3 setup.
  const markForSection = (s: QuestionSection): number =>
    s.plan && s.plan.mcq_marks_each > 0 ? s.plan.mcq_marks_each : defaultMark;
  const statsForSection = (s: QuestionSection) => sectionStats(s, selected);
  const reorder = (next: Map<number, number>) => orderBySections(sections, next);

  const toggle = (s: QuestionSection, id: number) => {
    setDirty(true);
    setSelected((cur) => {
      const next = new Map(cur);
      if (next.has(id)) next.delete(id);
      else next.set(id, markForSection(s));
      return reorder(next);
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
      return reorder(next);
    });
  };
  const selectAllIn = (s: QuestionSection, items: QuestionOption[]) => {
    setDirty(true);
    setSelected((cur) => {
      const next = new Map(cur);
      const mark = markForSection(s);
      for (const o of items) if (!next.has(o.id)) next.set(o.id, mark);
      return reorder(next);
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

  const hasPlan = sections.some((s) => s.plan !== null);

  // Risha UAT 2026-08-06 — re-runnable fill, for after Step 3 changes. It
  // REPLACES rather than tops up, so the paper always matches the plan the
  // admin is looking at; anything picked by hand is confirmed away first.
  const autoFillWholeExam = async () => {
    if (!hasPlan) return;
    if (selected.size > 0 && !(await confirm({
      title: `Replace all ${selected.size} picked question${selected.size === 1 ? '' : 's'}?`,
      description: "They are replaced with your Step 3 plan. Anything picked by hand — including questions outside this exam's schedule — is dropped.",
      confirmText: 'Replace',
      variant: 'destructive',
    }))) return;
    const filled = autoFillSelection(sections, defaultMark);
    setSelected(filled.selection);
    setDirty(true);
    setAutoFill({ origin: 'manual', label: 'this exam', picked: filled.picked, shortfall: filled.shortfall });
    toast.success(`Auto-filled ${filled.picked} question${filled.picked === 1 ? '' : 's'} from the plan. Not saved yet.`);
  };

  const autoFillSubject = async (s: QuestionSection) => {
    const pick = picks.get(s.key);
    if (!pick) return;
    const current = statsForSection(s).count;
    if (current > 0 && !(await confirm({
      title: `Replace ${s.title}'s questions?`,
      description: `The ${current} question${current === 1 ? '' : 's'} picked for ${s.title} are replaced with its Step 3 plan.`,
      confirmText: 'Replace',
      variant: 'destructive',
    }))) return;
    setDirty(true);
    setSelected((cur) => {
      const next = new Map(cur);
      for (const o of s.items) next.delete(o.id);
      for (const id of pick.ids) next.set(id, pick.mark);
      return reorder(next);
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

  // Risha UAT 2026-08-06 — the penalty comes from the subject's Step 3
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
        setDeletedSavedCount(0);
        if (questions.length === 0) toast('No questions assigned — students won’t be able to take this exam yet.');
        // Saving changes the exam's question pool only; each live subject
        // sitting keeps its own copy until the exam is published again.
        else if (isPublished) toast.success(`${message} Re-publish the exam (Step 6) to update the live subject sittings.`, { duration: 8000 });
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

  return {
    usedOnRegular: avoidIds, reused,
    options, sections, picks, shortfalls, selected, defaultMark, setDefaultMark, query, setQuery,
    savedCount, dirty, deletedSavedCount, autoFill, collapsed, loading, saving, hasPlan,
    statsForSection, toggle, setMark, selectFirstN, selectAllIn, clearSection,
    autoFillWholeExam, autoFillSubject, toggleSection, handleSave,
  };
}

export type AssignQuestionsController = ReturnType<typeof useAssignQuestions>;
