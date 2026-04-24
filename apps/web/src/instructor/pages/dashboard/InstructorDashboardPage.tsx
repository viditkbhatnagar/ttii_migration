import { useInstructorLayout } from '../../layout/InstructorLayoutContext.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

export default function InstructorDashboardPage(_props: InstructorPageProps) {
  const { currentUser } = useInstructorLayout();
  const firstName = (currentUser?.name.split(/\s+/)[0] ?? '').trim();
  const greetingName = firstName || 'there';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">
          Welcome back, {greetingName}
        </h1>
        <p className="mt-1 text-sm text-student-muted">
          Your classes, cohorts, and assignments at a glance.
        </p>
      </div>

      <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm font-medium text-student-text">Dashboard content coming up next</p>
        <p className="mt-1 text-xs text-student-muted">Upcoming classes, past sessions, and assignment stats will appear here.</p>
      </div>
    </div>
  );
}
