import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseOnBlur } from '@/lib/text-format';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatMonthLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const m = MONTH_NAMES[d.getMonth()] ?? '';
  return `${m} ${d.getFullYear()}`;
}

function buildCohortCode(subjectShort: string, dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const mmm = MONTH_ABBR[d.getMonth()] ?? '';
  const yy = String(d.getFullYear()).slice(-2);
  return `${subjectShort.toUpperCase()}${mmm}${yy}`;
}

export default function AddCohortPage({ api, session, onNavigate }: AdminPageProps) {
  // Risha UAT 2026-05-27 — reused for /admin/cohorts/edit/:id too.
  // When the URL carries an id we load the existing cohort, pre-fill
  // every field, lock the course picker to that one course (editing
  // never spawns N cohorts), and POST to editAdminCohort on save.
  const editCohortId = useMemo(() => {
    const m = window.location.pathname.match(/\/admin\/cohorts\/edit\/([^/?#]+)/);
    return m?.[1] ?? null;
  }, []);
  const isEditMode = editCohortId !== null;

  const [title, setTitle] = useState('');
  const [cohortCode, setCohortCode] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [courseIds, setCourseIds] = useState<Set<string>>(new Set());
  const [instructorId, setInstructorId] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offeringIds, setOfferingIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  // Once the existing-cohort row has been hydrated we suppress the
  // auto-generate Name + Code effect (otherwise editing the dates
  // would clobber a hand-edited title).
  const [hydrated, setHydrated] = useState(!isEditMode);

  // Naji 2026-06-25 — a cohort can be created "For Subject" (the existing
  // subject-first flow) or "For Course" (directly for a Lesson-wise course,
  // no subject — one cohort for the entire course).
  const [cohortType, setCohortType] = useState<'subject' | 'course'>('subject');

  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [instructors, setInstructors] = useState<Record<string, unknown>[]>([]);
  const [languages, setLanguages] = useState<Record<string, unknown>[]>([]);
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.listAllSubjects(session.token),
      api.loadInstructors(session.token),
      api.loadLanguages(session.token),
      api.loadCourses(session.token),
    ]).then(([s, ins, langs, crs]) => {
      setSubjects(s);
      setInstructors(ins);
      setLanguages(langs);
      setCourses(crs);
    }).catch(() => {});
  }, [api, session.token]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => asString(s.id) === subjectId) ?? null,
    [subjects, subjectId],
  );
  const subjectCourses = useMemo(() => {
    if (!selectedSubject) return [] as Record<string, unknown>[];
    return toRecords(selectedSubject.courses);
  }, [selectedSubject]);

  // For Course mode: only Lesson-wise courses (structure_type === 2) — they
  // have no subjects, so a cohort attaches to the whole course (Naji 2026-06-25).
  const lessonWiseCourses = useMemo(
    () => courses.filter((c) => Number(c.structure_type) === 2),
    [courses],
  );
  // The course list the picker shows depends on the cohort type.
  const courseOptions = cohortType === 'course' ? lessonWiseCourses : subjectCourses;

  // Subject change → clear courses & offerings. Skipped on the first
  // pass while we hydrate the existing cohort in edit mode — otherwise
  // the loader's setSubjectId() would wipe the courseIds we just set.
  useEffect(() => {
    if (!hydrated) return;
    setCourseIds(new Set());
    setOfferingIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // Load offerings for ALL selected courses (multi-course) and union them.
  // In edit mode we keep the loaded selection until the user actually
  // changes the course; otherwise hydrate would wipe the offering ticks
  // we just restored.
  useEffect(() => {
    if (courseIds.size === 0) {
      setOfferings([]);
      if (hydrated) setOfferingIds(new Set());
      return;
    }
    let cancelled = false;
    void Promise.all(
      Array.from(courseIds).map((cid) =>
        api.listOfferings(session.token, { course_id: cid }).catch(() => [] as Record<string, unknown>[]),
      ),
    ).then((lists) => {
      if (cancelled) return;
      const seen = new Set<string>();
      const merged: Record<string, unknown>[] = [];
      for (const list of lists) {
        for (const o of list) {
          const id = asString(o.id);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          merged.push(o);
        }
      }
      setOfferings(merged);
    });
    if (hydrated) setOfferingIds(new Set());
    return () => {
      cancelled = true;
    };
  }, [api, session.token, courseIds, hydrated]);

  // Auto-generate Name + Code as soon as Subject + Start Date are both set.
  // Skipped while we're still loading the existing cohort in edit mode
  // — otherwise the auto-fill would overwrite the values we just loaded.
  useEffect(() => {
    if (!hydrated) return;
    if (isEditMode) return;
    if (cohortType !== 'subject') return;
    if (!subjectId || !startDate) return;
    const subject = subjects.find((s) => asString(s.id) === subjectId);
    if (!subject) return;
    const subjectTitle = asString(subject.title);
    const subjectShort = asString(subject.short_name) || subjectTitle.replace(/[^A-Za-z]/g, '').slice(0, 2);
    const monthLabel = formatMonthLabel(startDate);
    if (subjectTitle && monthLabel) setTitle(`${subjectTitle} - ${monthLabel}`);
    setCohortCode(buildCohortCode(subjectShort, startDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, startDate, cohortType]);

  // For Course mode: auto-generate Name + Code from the first selected
  // Lesson-wise course + start date (Naji 2026-06-25 — no subject to key off).
  useEffect(() => {
    if (!hydrated) return;
    if (isEditMode) return;
    if (cohortType !== 'course') return;
    if (courseIds.size === 0 || !startDate) return;
    const firstId = Array.from(courseIds)[0];
    const course = courses.find((c) => asString(c.id) === firstId);
    if (!course) return;
    const courseTitle = asString(course.title);
    const courseShort = asString(course.short_name) || courseTitle.replace(/[^A-Za-z]/g, '').slice(0, 2);
    const monthLabel = formatMonthLabel(startDate);
    if (courseTitle && monthLabel) setTitle(`${courseTitle} - ${monthLabel}`);
    setCohortCode(buildCohortCode(courseShort, startDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIds, startDate, cohortType]);

  const handleToggleCourse = useCallback((id: string) => {
    setCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleOffering = useCallback((id: string) => {
    setOfferingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Risha UAT 2026-05-27 — load the cohort being edited and pre-fill
  // every field. Runs once on mount when an :id is on the URL.
  useEffect(() => {
    if (!isEditMode || !editCohortId) return;
    let cancelled = false;
    void (async () => {
      try {
        const detail = await api.getCohortDetail(session.token, editCohortId);
        if (cancelled) return;
        const c = (detail?.data as Record<string, unknown> | undefined) ?? detail;
        if (!c || typeof c !== 'object') {
          toast.error('Could not load this cohort.');
          setLoadingEdit(false);
          setHydrated(true);
          return;
        }
        const row = c;
        const inner = row.cohort;
        const cohort: Record<string, unknown> =
          typeof inner === 'object' && inner !== null ? (inner as Record<string, unknown>) : row;
        setTitle(asString(cohort.title));
        setCohortCode(asString(cohort.cohort_id) || asString(cohort.cohort_code));
        // A cohort with no subject_id was created "For Course" (Lesson-wise).
        setCohortType(asString(cohort.subject_id) ? 'subject' : 'course');
        setSubjectId(asString(cohort.subject_id));
        // Naji 2026-08-19 — a cohort can serve several programs. Prefer the
        // full set; fall back to the scalar for cohorts predating the pivot.
        const courseIdList = Array.isArray(cohort.course_ids)
          ? (cohort.course_ids as unknown[]).map((v) => asString(v)).filter(Boolean)
          : [];
        const cId = asString(cohort.course_id);
        if (courseIdList.length > 0) setCourseIds(new Set(courseIdList));
        else if (cId) setCourseIds(new Set([cId]));
        setInstructorId(asString(cohort.instructor_id));
        setLanguageId(asString(cohort.language_id));
        const sd = asString(cohort.start_date);
        const ed = asString(cohort.end_date);
        setStartDate(sd ? sd.slice(0, 10) : '');
        setEndDate(ed ? ed.slice(0, 10) : '');
        // Offerings — backend returns `offering_ids` array on the detail
        // (mirrored from cohort_offerings pivot).
        const offIds = Array.isArray(cohort.offering_ids)
          ? (cohort.offering_ids as unknown[]).map((v) => asString(v)).filter(Boolean)
          : [];
        setOfferingIds(new Set(offIds));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load cohort.');
      } finally {
        if (!cancelled) {
          setLoadingEdit(false);
          setHydrated(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [api, session.token, editCohortId, isEditMode]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Cohort name is required.');
      return;
    }
    if (courseIds.size === 0) {
      toast.error('Pick at least one course.');
      return;
    }
    setSubmitting(true);
    const courseIdList = Array.from(courseIds);
    const offeringIdList = Array.from(offeringIds);

    // Risha UAT 2026-05-27 — edit mode updates a single existing row;
    // we never spawn N new cohorts when editing.
    if (isEditMode && editCohortId) {
      const cid = courseIdList[0] ?? '';
      try {
        const res = await api.editAdminCohort(session.token, editCohortId, {
          title,
          cohortCode,
          // courseId stays the PRIMARY; courseIds carries every program.
          courseId: cid,
          courseIds: courseIdList,
          subjectId,
          centreId: '',
          instructorId,
          languageId,
          startDate,
          endDate,
          offeringIds: offeringIdList,
        });
        if (res && (res as { status?: number }).status === 0) {
          toast.error(asString((res as { message?: unknown }).message) || 'Failed to update cohort.');
        } else {
          toast.success('Cohort updated.');
          onNavigate('/admin/cohorts/index');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update cohort.');
      }
      setSubmitting(false);
      return;
    }

    // Naji 2026-08-19 — ONE cohort carrying every ticked program.
    //
    // This used to loop and POST once per course, producing N cohort rows that
    // shared a title, code, dates and instructor. That is exactly what Naji
    // asked us to stop: PG and Diploma ended up in separate cohorts, so the
    // same class had two schedules, two attendance sheets and a split roster.
    // The server stores courseIds[0] as the primary cohorts.course_id (for the
    // many readers still on that column) and the full set in cohort_courses.
    try {
      const res = await api.addAdminCohort(session.token, {
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
        offeringIds: offeringIdList,
      });
      setSubmitting(false);
      if (res && (res as { status?: number }).status === 0) {
        toast.error(asString((res as { message?: unknown }).message) || 'Failed to create cohort.');
        return;
      }
      toast.success(
        courseIdList.length > 1
          ? `Cohort created for ${courseIdList.length} programs.`
          : 'Cohort created.',
      );
      onNavigate('/admin/cohorts/index');
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : 'Failed to create cohort.');
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title={isEditMode ? 'Edit Cohort' : 'Add Cohort'} />

      <Card className="mx-auto max-w-2xl">
        <CardContent className="space-y-4 p-6">
          {/* Cohort Type — Naji 2026-06-25. "For Subject" keeps the existing
              subject-first flow; "For Course" skips the subject and attaches
              the cohort directly to a Lesson-wise course. */}
          <div className="space-y-2">
            <Label htmlFor="cohortType">Cohort Type</Label>
            <select
              id="cohortType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={cohortType}
              onChange={(e) => {
                const v = e.target.value === 'course' ? 'course' : 'subject';
                setCohortType(v);
                setSubjectId('');
                setCourseIds(new Set());
                setOfferingIds(new Set());
                setTitle('');
                setCohortCode('');
              }}
            >
              <option value="subject">For Subject</option>
              <option value="course">For Course (Lesson-wise)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {cohortType === 'course'
                ? 'Pick a Lesson-wise course directly — one cohort for the whole course (no subject).'
                : 'Choose a subject, then the courses linked to it.'}
            </p>
          </div>

          {/* Subject — only for the subject-wise cohort type. */}
          {cohortType === 'subject' ? (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <select
                id="subject"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={asString(s.id)} value={asString(s.id)}>{asString(s.title)}</option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Multi-course picker — replaces the single dropdown so a cohort
              can run across more than one course. Naji 2026-05-04. For Course
              mode lists Lesson-wise courses directly (Naji 2026-06-25). */}
          <div className="space-y-2">
            <Label>Courses</Label>
            {cohortType === 'subject' && !subjectId ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Select a subject first.
              </p>
            ) : courseOptions.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                {cohortType === 'course'
                  ? 'No Lesson-wise courses found. Create one under Courses → Course (Course Structure = Lesson wise).'
                  : 'No courses linked to this subject.'}
              </p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {courseOptions.map((c) => {
                  const id = asString(c.id);
                  const checked = courseIds.has(id);
                  // Course mode = one cohort for the whole course, so it's a
                  // single choice (otherwise every cohort would inherit the
                  // first course's auto-name). Subject mode stays multi-select.
                  const single = cohortType === 'course';
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <input
                        type={single ? 'radio' : 'checkbox'}
                        name={single ? 'cohort-course' : undefined}
                        checked={checked}
                        onChange={() => { if (single) setCourseIds(new Set([id])); else handleToggleCourse(id); }}
                      />
                      <span className="text-sm">{asString(c.title) || `Course #${id}`}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {cohortType === 'course'
                ? 'Pick the Lesson-wise course for this cohort.'
                : 'Pick one or more programs. Ticking several creates ONE shared cohort '
                  + 'they all attend together — one schedule, one attendance sheet. '
                  + 'Each learner still sees only their own programme\u2019s content.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Offerings</Label>
            {courseIds.size === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Select at least one course to see available offerings.
              </p>
            ) : offerings.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                No offerings available for the selected course(s) yet.
              </p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {offerings.map((o) => {
                  const id = asString(o.id);
                  const checked = offeringIds.has(id);
                  const mode = asString(o.delivery_mode);
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleOffering(id)}
                      />
                      <span className="text-sm">{asString(o.title) || `Offering #${id}`}</span>
                      {mode ? (
                        <Badge variant="secondary" className="text-xs">
                          {mode === 'self_paced' ? 'Self-Paced' : mode === 'cohort' ? 'Cohort' : mode}
                        </Badge>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select one or more offerings this cohort runs under.
            </p>
          </div>

          {/* Cohort Name / Code live BELOW the offering picker because they
              auto-generate from Subject + Start Date. Admins rarely need to
              touch them — moving them down keeps the form's natural top-down
              flow and avoids confusion when fields auto-fill (Naji 2026-05-04). */}
          <div className="space-y-2">
            <Label htmlFor="title">Cohort Name *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={titleCaseOnBlur(setTitle)}
              placeholder="Auto-generated from Subject + Start Month"
            />
            <p className="text-xs text-muted-foreground">
              {cohortType === 'course'
                ? 'Auto-fills as Course + Start Date once both are set.'
                : 'Auto-fills as Subject + Start Date once both are set.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cohortCode">Cohort Code</Label>
            <Input
              id="cohortCode"
              value={cohortCode}
              onChange={(e) => setCohortCode(e.target.value)}
              placeholder={cohortType === 'course' ? 'Auto-generated from Course short name + start month' : 'Auto-generated from Subject short name + start month'}
            />
            <p className="text-xs text-muted-foreground">
              Format: <code>SHORT</code> + <code>MMM</code> + <code>YY</code> (e.g. <code>MMJAN26</code>).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor</Label>
              <select
                id="instructor"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
              >
                <option value="">Select Instructor</option>
                {instructors.map((ins) => (
                  <option key={asString(ins.id)} value={asString(ins.id)}>{asString(ins.name)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={languageId}
                onChange={(e) => setLanguageId(e.target.value)}
              >
                <option value="">Select Language</option>
                {languages.map((l) => (
                  <option key={asString(l.id)} value={asString(l.id)}>{asString(l.title)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onNavigate('/admin/cohorts/index')}>
              Cancel
            </Button>
            <Button
              onClick={() => { void handleSubmit(); }}
              disabled={submitting || loadingEdit || !title.trim() || courseIds.size === 0}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {isEditMode
                ? (submitting ? 'Saving…' : 'Save Changes')
                : (submitting
                  ? 'Creating...'
                  : courseIds.size > 1
                    ? `Create Cohort for ${courseIds.size} Programs`
                    : 'Create Cohort')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
