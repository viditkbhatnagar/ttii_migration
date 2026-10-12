import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { titleCaseOnBlur } from '@/lib/text-format';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { autoNameAndCode, cohortFormError } from './cohort-form-model.js';
import { ymdOf } from './list-model.js';

// Add / Edit Cohort form (TTII 2026-10-12, Naji's Add Cohort dialog). Shared by
// the dialog on the Cohorts list and the /admin/cohorts/add + /edit/:id pages,
// which stay because other screens link to them. The rules are AddCohortPage's:
//
// - ONE cohort carries every ticked program (Naji 2026-08-19): courseIds[0] is
//   the primary cohorts.course_id, the full set goes to cohort_courses.
// - "For Subject" (subject-first, multi-course) vs "For Course" (one Lesson-wise
//   course, no subject — Naji 2026-06-25).
// - Edit sends offering_ids and course_ids back, and the server REPLACES both
//   pivots with what it receives.
//
// Fixed here: the old page cleared the offering ticks from an effect that also
// re-ran when edit-mode hydration finished, so opening Edit wiped the loaded
// offerings and "Save Changes" posted an empty list — deleting the cohort's
// cohort_offerings rows (no deleted_at, unrecoverable). Ticks are now cleared
// only by the user's own subject / course / type change.

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

interface CohortFormProps {
  api: AdminPageProps['api'];
  token: string;
  /** Cohort id to edit, or null to create. */
  editCohortId: string | null;
  /** 'dialog' scrolls the fields between a fixed header and footer. */
  layout: 'dialog' | 'page';
  onSaved: () => void;
  onCancel: () => void;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">{children}</p>;
}

function toggleIn(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function CohortForm({ api, token, editCohortId, layout, onSaved, onCancel }: CohortFormProps) {
  const isEditMode = editCohortId !== null;
  const [cohortType, setCohortType] = useState<'subject' | 'course'>('subject');
  const [title, setTitle] = useState('');
  const [cohortCode, setCohortCode] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [courseIds, setCourseIds] = useState<Set<string>>(new Set());
  const [offeringIds, setOfferingIds] = useState<Set<string>>(new Set());
  const [instructorId, setInstructorId] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);

  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [instructors, setInstructors] = useState<Record<string, unknown>[]>([]);
  const [languages, setLanguages] = useState<Record<string, unknown>[]>([]);
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([api.listAllSubjects(token), api.loadInstructors(token), api.loadLanguages(token), api.loadCourses(token)])
      .then(([s, ins, langs, crs]) => {
        setSubjects(s);
        setInstructors(ins);
        setLanguages(langs);
        setCourses(crs);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Could not load the form options.'));
  }, [api, token]);

  // Edit: load the cohort and pre-fill every field (Risha UAT 2026-05-27).
  useEffect(() => {
    if (!editCohortId) return;
    let cancelled = false;
    void (async () => {
      try {
        const detail = await api.getCohortDetail(token, editCohortId);
        if (cancelled) return;
        const inner = detail.cohort ?? (detail.data as Record<string, unknown> | undefined)?.cohort;
        if (!inner || typeof inner !== 'object') {
          toast.error(asString(detail.message) || 'Could not load this cohort.');
          return;
        }
        const c = inner as Record<string, unknown>;
        setTitle(asString(c.title));
        setCohortCode(asString(c.cohort_id) || asString(c.cohort_code));
        setCohortType(asString(c.subject_id) ? 'subject' : 'course');
        setSubjectId(asString(c.subject_id));
        const list = Array.isArray(c.course_ids) ? c.course_ids.map((v) => asString(v)).filter(Boolean) : [];
        const primary = asString(c.course_id);
        setCourseIds(new Set(list.length > 0 ? list : primary ? [primary] : []));
        setInstructorId(asString(c.instructor_id));
        setLanguageId(asString(c.language_id));
        setStartDate(ymdOf(c.start_date));
        setEndDate(ymdOf(c.end_date));
        setOfferingIds(new Set(Array.isArray(c.offering_ids) ? c.offering_ids.map((v) => asString(v)).filter(Boolean) : []));
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load cohort.');
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, token, editCohortId]);

  const selectedSubject = useMemo(() => subjects.find((s) => asString(s.id) === subjectId) ?? null, [subjects, subjectId]);
  const subjectCourses = useMemo(() => (selectedSubject ? toRecords(selectedSubject.courses) : []), [selectedSubject]);
  const lessonWiseCourses = useMemo(() => courses.filter((c) => Number(c.structure_type) === 2), [courses]);
  const courseOptions = cohortType === 'course' ? lessonWiseCourses : subjectCourses;

  // Offerings for every selected course, merged. Loading never touches the ticks.
  const courseKey = useMemo(() => [...courseIds].sort().join(','), [courseIds]);
  useEffect(() => {
    const ids = courseKey ? courseKey.split(',') : [];
    if (ids.length === 0) {
      setOfferings([]);
      return;
    }
    let cancelled = false;
    void Promise.all(ids.map((cid) => api.listOfferings(token, { course_id: cid }).catch(() => [] as Record<string, unknown>[])))
      .then((lists) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: Record<string, unknown>[] = [];
        for (const o of lists.flat()) {
          const id = asString(o.id);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          merged.push(o);
        }
        setOfferings(merged);
      });
    return () => { cancelled = true; };
  }, [api, token, courseKey]);

  // Create only: name + code follow the subject (or, For Course, the first
  // course) and the start date. Keyed on those inputs alone so a hand-edited
  // name survives anything else changing — e.g. ticking a second program.
  useEffect(() => {
    if (isEditMode || cohortType !== 'subject' || !startDate) return;
    const auto = autoNameAndCode(subjects.find((s) => asString(s.id) === subjectId) ?? null, startDate);
    if (!auto) return;
    setTitle(auto.title);
    setCohortCode(auto.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, startDate, cohortType]);

  useEffect(() => {
    if (isEditMode || cohortType !== 'course' || !startDate) return;
    const first = courseKey.split(',')[0] ?? '';
    const auto = autoNameAndCode(courses.find((c) => asString(c.id) === first) ?? null, startDate);
    if (!auto) return;
    setTitle(auto.title);
    setCohortCode(auto.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseKey, startDate, cohortType]);

  const changeType = (v: 'subject' | 'course') => {
    setCohortType(v);
    setSubjectId('');
    setCourseIds(new Set());
    setOfferingIds(new Set());
    setTitle('');
    setCohortCode('');
  };
  const changeSubject = (id: string) => {
    setSubjectId(id);
    setCourseIds(new Set());
    setOfferingIds(new Set());
  };
  const pickCourse = (id: string) => {
    setCourseIds((prev) => (cohortType === 'course' ? new Set([id]) : toggleIn(prev, id)));
    setOfferingIds(new Set());
  };

  const formError = cohortFormError({ title, courseCount: courseIds.size, startDate, endDate });
  const dateError = startDate && endDate && endDate < startDate ? 'End date must be on or after the start date.' : '';

  const submit = async () => {
    if (formError) {
      toast.error(formError);
      return;
    }
    const courseIdList = [...courseIds];
    const input = {
      title,
      cohortCode,
      courseId: courseIdList[0] ?? '',
      courseIds: courseIdList,
      subjectId,
      centreId: '',
      instructorId,
      languageId,
      startDate,
      endDate,
      offeringIds: [...offeringIds],
    };
    setSubmitting(true);
    try {
      const res = editCohortId ? await api.editAdminCohort(token, editCohortId, input) : await api.addAdminCohort(token, input);
      if (res && (res as { status?: number }).status === 0) {
        toast.error(asString((res as { message?: unknown }).message) || (editCohortId ? 'Failed to update cohort.' : 'Failed to create cohort.'));
        return;
      }
      toast.success(
        editCohortId ? 'Cohort updated.' : courseIdList.length > 1 ? `Cohort created for ${courseIdList.length} programs.` : 'Cohort created.',
      );
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : editCohortId ? 'Failed to update cohort.' : 'Failed to create cohort.');
    } finally {
      setSubmitting(false);
    }
  };

  const thisYear = new Date().getFullYear();
  const fields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cohort-type">Cohort Type</Label>
        <select id="cohort-type" className={SELECT_CLASS} value={cohortType} disabled={loadingEdit} onChange={(e) => changeType(e.target.value === 'course' ? 'course' : 'subject')}>
          <option value="subject">For Subject</option>
          <option value="course">For Course (Lesson-wise)</option>
        </select>
        <Hint>
          {cohortType === 'course'
            ? 'Pick a Lesson-wise course directly — one cohort for the whole course (no subject).'
            : 'Choose a subject, then the courses linked to it.'}
        </Hint>
      </div>

      {cohortType === 'subject' ? (
        <div className="space-y-1.5">
          <Label htmlFor="cohort-subject">Subject</Label>
          <select id="cohort-subject" className={SELECT_CLASS} value={subjectId} disabled={loadingEdit} onChange={(e) => changeSubject(e.target.value)}>
            <option value="">Select Subject</option>
            {subjects.map((s) => <option key={asString(s.id)} value={asString(s.id)}>{asString(s.title)}</option>)}
          </select>
        </div>
      ) : null}

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium">Courses</legend>
        {cohortType === 'subject' && !subjectId ? (
          <EmptyBox>Select a subject first.</EmptyBox>
        ) : courseOptions.length === 0 ? (
          <EmptyBox>
            {cohortType === 'course'
              ? 'No Lesson-wise courses found. Create one under Courses → Course (Course Structure = Lesson wise).'
              : 'No courses linked to this subject.'}
          </EmptyBox>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {courseOptions.map((c) => {
              const id = asString(c.id);
              const single = cohortType === 'course';
              return (
                <label key={id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input
                    type={single ? 'radio' : 'checkbox'}
                    name={single ? 'cohort-course' : undefined}
                    className="size-4 accent-primary"
                    checked={courseIds.has(id)}
                    onChange={() => pickCourse(id)}
                  />
                  <span>{asString(c.title) || `Course #${id}`}</span>
                </label>
              );
            })}
          </div>
        )}
        <Hint>
          {cohortType === 'course'
            ? 'Pick the Lesson-wise course for this cohort.'
            : 'Pick one or more programs. Ticking several creates ONE shared cohort they all attend together — one schedule, one attendance sheet. Each learner still sees only their own programme’s content.'}
        </Hint>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium">Offerings</legend>
        {courseIds.size === 0 ? (
          <EmptyBox>Select at least one course to see available offerings.</EmptyBox>
        ) : offerings.length === 0 ? (
          <EmptyBox>No offerings available for the selected course(s) yet.</EmptyBox>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {offerings.map((o) => {
              const id = asString(o.id);
              const mode = asString(o.delivery_mode);
              return (
                <label key={id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input type="checkbox" className="size-4 accent-primary" checked={offeringIds.has(id)} onChange={() => setOfferingIds((prev) => toggleIn(prev, id))} />
                  <span>{asString(o.title) || `Offering #${id}`}</span>
                  {mode ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {mode === 'self_paced' ? 'Self-Paced' : mode === 'cohort' ? 'Cohort' : mode}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        )}
        <Hint>Select one or more offerings this cohort runs under.</Hint>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="cohort-title">Cohort Name <span className="text-destructive">*</span></Label>
        <Input id="cohort-title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={titleCaseOnBlur(setTitle)} placeholder={cohortType === 'course' ? 'Auto-generated from Course + Start Month' : 'Auto-generated from Subject + Start Month'} />
        <Hint>{cohortType === 'course' ? 'Auto-fills as Course + Start Date once both are set.' : 'Auto-fills as Subject + Start Date once both are set.'}</Hint>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cohort-code">Cohort Code</Label>
        <Input id="cohort-code" value={cohortCode} onChange={(e) => setCohortCode(e.target.value)} placeholder={cohortType === 'course' ? 'Auto-generated from Course short name + start month' : 'Auto-generated from Subject short name + start month'} />
        <Hint>Format: SHORT + MMM + YY (e.g. MMJAN26).</Hint>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cohort-instructor">Instructor</Label>
          <select id="cohort-instructor" className={SELECT_CLASS} value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
            <option value="">Select Instructor</option>
            {instructors.map((ins) => <option key={asString(ins.id)} value={asString(ins.id)}>{asString(ins.name)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cohort-language">Language</Label>
          <select id="cohort-language" className={SELECT_CLASS} value={languageId} onChange={(e) => setLanguageId(e.target.value)}>
            <option value="">Select Language</option>
            {languages.map((l) => <option key={asString(l.id)} value={asString(l.id)}>{asString(l.title)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cohort-start">Start Date</Label>
          <DmyDateInput id="cohort-start" value={startDate} onChange={setStartDate} minYear={thisYear - 5} maxYear={thisYear + 2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cohort-end">End Date</Label>
          <DmyDateInput id="cohort-end" value={endDate} onChange={setEndDate} minYear={thisYear - 5} maxYear={thisYear + 2} />
          {dateError ? <p role="alert" className="text-xs text-destructive">{dateError}</p> : null}
        </div>
      </div>
    </div>
  );

  const saveLabel = isEditMode
    ? (submitting ? 'Saving…' : 'Save Changes')
    : submitting ? 'Creating…' : courseIds.size > 1 ? `Create Cohort for ${courseIds.size} Programs` : 'Create Cohort';

  const footer = (
    <div className={cn('flex justify-end gap-2', layout === 'dialog' ? 'shrink-0 border-t border-border px-6 py-4' : 'pt-2')}>
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={submitting || loadingEdit || formError !== null}>{saveLabel}</Button>
    </div>
  );

  return (
    <form
      className={layout === 'dialog' ? 'flex min-h-0 flex-1 flex-col' : 'space-y-4'}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {layout === 'dialog' ? <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{fields}</div> : fields}
      {footer}
    </form>
  );
}
