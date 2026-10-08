import { Award } from 'lucide-react';
import type { StudentPageProps } from '../../routing/student-routes.js';

// TTII 2026-10-08 — this page used to treat any course at 100% lesson progress
// as an EARNED certificate: a "Verified" badge, an "Issued" date taken from the
// enrolment date, and a reference built client-side as TTII-<year>-<course id>,
// identical for every student on that course. No certificate record exists
// behind any of it — TTII has never issued one through the LMS — so a student
// could screenshot a "verified" certificate the institute never granted.
//
// Certificates are the last phase of the exam module (issued from exam
// results). Until then the page is out of the sidebar and says plainly how a
// certificate is earned; the route stays so an old link does not 404.
export default function StudentCertificatesPage(_props: StudentPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">Certificates</h1>
      </div>
      <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <Award aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
        <p className="text-sm text-slate-600">
          Your certificate is issued by TTII after you complete your course and pass the final examination.
        </p>
        <p className="mt-1 text-sm text-slate-500">Once it is issued, you will find it here.</p>
      </div>
    </div>
  );
}
