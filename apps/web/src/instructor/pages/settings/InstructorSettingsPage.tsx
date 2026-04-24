import type { InstructorPageProps } from '../../routing/instructor-routes.js';

export default function InstructorSettingsPage(_props: InstructorPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">Settings</h1>
        <p className="mt-1 text-sm text-student-muted">Update your profile and password.</p>
      </div>

      <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm font-medium text-student-text">Settings coming up next</p>
        <p className="mt-1 text-xs text-student-muted">Profile details and change-password flow will be wired here.</p>
      </div>
    </div>
  );
}
