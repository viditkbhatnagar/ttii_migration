import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

// Naji 2026-05-09 — Student Eligibility scaffolded under Exam.
// The page is parked while Naji finalises the field/column spec.
// Replace this body with the real table + filters once the spec lands.
export default function StudentEligibilityPage(_props: AdminPageProps) {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Student Eligibility" />

      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <p className="text-base font-semibold text-gray-900">Coming soon</p>
          <p className="mx-auto max-w-md text-sm text-gray-600">
            This module will show which students are eligible to attempt each
            exam, with course / cohort filters and the criteria that drive
            eligibility (attendance, course progress, fee status).
          </p>
          <p className="text-xs text-gray-500">
            Page scaffolded so the sidebar entry is in place. The table will
            populate once the eligibility rules are confirmed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
