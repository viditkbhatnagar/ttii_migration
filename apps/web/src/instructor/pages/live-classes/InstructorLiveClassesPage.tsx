import type { InstructorPageProps } from '../../routing/instructor-routes.js';

export default function InstructorLiveClassesPage(_props: InstructorPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">Live Classes</h1>
        <p className="mt-1 text-sm text-student-muted">Upcoming and past live sessions for your cohorts.</p>
      </div>

      <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm font-medium text-student-text">Live Classes list coming up next</p>
        <p className="mt-1 text-xs text-student-muted">Upcoming sessions will show a Start Class button; past sessions will show Watch Recording and View Attendance.</p>
      </div>
    </div>
  );
}
