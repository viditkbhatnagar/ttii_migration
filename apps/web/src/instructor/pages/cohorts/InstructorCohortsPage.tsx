import type { InstructorPageProps } from '../../routing/instructor-routes.js';

export default function InstructorCohortsPage(_props: InstructorPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">My Cohorts</h1>
        <p className="mt-1 text-sm text-student-muted">Cohorts you are currently teaching.</p>
      </div>

      <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm font-medium text-student-text">Cohorts list coming up next</p>
        <p className="mt-1 text-xs text-student-muted">You'll see each cohort with its learners and upcoming sessions.</p>
      </div>
    </div>
  );
}
