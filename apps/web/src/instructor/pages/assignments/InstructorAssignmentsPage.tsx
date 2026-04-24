import type { InstructorPageProps } from '../../routing/instructor-routes.js';

export default function InstructorAssignmentsPage(_props: InstructorPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">Assignments</h1>
        <p className="mt-1 text-sm text-student-muted">Review and grade student submissions across your cohorts.</p>
      </div>

      <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm font-medium text-student-text">Assignment grading coming up next</p>
        <p className="mt-1 text-xs text-student-muted">You'll see assignments with pending submissions, plus a grading flow for marks and feedback.</p>
      </div>
    </div>
  );
}
