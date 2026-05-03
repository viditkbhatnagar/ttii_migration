import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

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
  const [title, setTitle] = useState('');
  const [cohortCode, setCohortCode] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offeringIds, setOfferingIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [instructors, setInstructors] = useState<Record<string, unknown>[]>([]);
  const [languages, setLanguages] = useState<Record<string, unknown>[]>([]);
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.listAllSubjects(session.token),
      api.loadInstructors(session.token),
      api.loadLanguages(session.token),
    ]).then(([s, ins, langs]) => {
      setSubjects(s);
      setInstructors(ins);
      setLanguages(langs);
    }).catch(() => {});
  }, [api, session.token]);

  // Subject-scoped courses come from the subject record itself (see
  // /admin/course/subjects/all which embeds the linked `courses` array).
  const selectedSubject = useMemo(
    () => subjects.find((s) => asString(s.id) === subjectId) ?? null,
    [subjects, subjectId],
  );
  const subjectCourses = useMemo(() => {
    if (!selectedSubject) return [] as Record<string, unknown>[];
    return toRecords(selectedSubject.courses);
  }, [selectedSubject]);

  // Subject change → clear course/offerings; course change → clear offerings.
  useEffect(() => {
    setCourseId('');
    setOfferingIds(new Set());
  }, [subjectId]);

  useEffect(() => {
    if (courseId) {
      api.listOfferings(session.token, { course_id: courseId })
        .then((os) => setOfferings(os))
        .catch(() => setOfferings([]));
    } else {
      setOfferings([]);
    }
    setOfferingIds(new Set());
  }, [api, session.token, courseId]);

  // Auto-generate Name + Code as soon as Subject + Start Date are both set.
  useEffect(() => {
    if (!subjectId || !startDate) return;
    const subject = subjects.find((s) => asString(s.id) === subjectId);
    if (!subject) return;
    const subjectTitle = asString(subject.title);
    const subjectShort = asString(subject.short_name) || subjectTitle.replace(/[^A-Za-z]/g, '').slice(0, 2);
    const monthLabel = formatMonthLabel(startDate);
    if (subjectTitle && monthLabel) setTitle(`${subjectTitle} - ${monthLabel}`);
    setCohortCode(buildCohortCode(subjectShort, startDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, startDate]);

  const handleToggleOffering = useCallback((id: string) => {
    setOfferingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await api.addAdminCohort(session.token, {
        title,
        cohortCode,
        courseId,
        subjectId,
        centreId: '',
        instructorId,
        languageId,
        startDate,
        endDate,
        offeringIds: Array.from(offeringIds),
      });
      onNavigate('/admin/cohorts/index');
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Add Cohort" />

      <Card className="mx-auto max-w-2xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Cohort Name *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-generated from Subject + Start Month"
            />
            <p className="text-xs text-muted-foreground">
              Auto-fills as Subject + Start Date once both are set.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cohortCode">Cohort Code</Label>
            <Input
              id="cohortCode"
              value={cohortCode}
              onChange={(e) => setCohortCode(e.target.value)}
              placeholder="Auto-generated from Subject short name + start month"
            />
            <p className="text-xs text-muted-foreground">
              Format: <code>SHORT</code> + <code>MMM</code> + <code>YY</code> (e.g. <code>MMJAN26</code>).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <select
                id="course"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={!subjectId}
              >
                <option value="">{subjectId ? 'Select Course' : 'Select a subject first'}</option>
                {subjectCourses.map((c) => (
                  <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Offerings</Label>
            {!courseId ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Select a course to see available offerings.
              </p>
            ) : offerings.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                No offerings available for this course yet.
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
                      className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted cursor-pointer"
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
              disabled={submitting || !title.trim()}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {submitting ? 'Creating...' : 'Create Cohort'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
