import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, asNumber } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

export default function AddCohortPage({ api, session, onNavigate }: AdminPageProps) {
  const [title, setTitle] = useState('');
  const [cohortCode, setCohortCode] = useState('');
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [centreId, setCentreId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [centres, setCentres] = useState<Record<string, unknown>[]>([]);
  const [instructors, setInstructors] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadCentres(session.token),
      api.loadInstructors(session.token),
    ]).then(([c, ce, ins]) => {
      setCourses(c);
      setCentres(ce);
      setInstructors(ins);
    }).catch(() => {});
  }, [api, session.token]);

  useEffect(() => {
    const cId = Number(courseId);
    if (cId > 0) {
      api.loadSubjects(session.token, cId).then(setSubjects).catch(() => {});
    } else {
      setSubjects([]);
    }
    setSubjectId('');
  }, [api, session.token, courseId]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await api.addAdminCohort(session.token, {
        title,
        cohortCode,
        courseId: Number(courseId) || 0,
        subjectId: Number(subjectId) || 0,
        centreId: Number(centreId) || 0,
        instructorId: Number(instructorId) || 0,
        startDate,
        endDate,
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
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cohort title" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cohortCode">Cohort Code</Label>
            <Input id="cohortCode" value={cohortCode} onChange={(e) => setCohortCode(e.target.value)} placeholder="Auto-generated if empty" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <select
                id="course"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={asNumber(c.id)} value={String(asNumber(c.id))}>{asString(c.title)}</option>
                ))}
              </select>
            </div>

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
                  <option key={asNumber(s.id)} value={String(asNumber(s.id))}>{asString(s.title)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="centre">Centre</Label>
              <select
                id="centre"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={centreId}
                onChange={(e) => setCentreId(e.target.value)}
              >
                <option value="">Select Centre</option>
                {centres.map((c) => (
                  <option key={asNumber(c.id)} value={String(asNumber(c.id))}>{asString(c.title)}</option>
                ))}
              </select>
            </div>

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
                  <option key={asNumber(ins.id)} value={String(asNumber(ins.id))}>{asString(ins.name)}</option>
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
              onClick={handleSubmit}
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
