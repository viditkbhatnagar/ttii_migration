import AdminViewStudentPage from '../../../admin/pages/students/ViewStudentPage.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

// Naji UAT 2026-05-16 — View Student inside the counsellor portal.
// Mounts the admin ViewStudentPage (which reads the studentId from the
// URL's last segment, so /counsellor/students/view/:id works as-is)
// and rewrites the /admin prefix on outbound navigation so the
// in-page links stay on the counsellor portal. Counsellors only see
// students they own (pipeline_user scoping already enforced by the
// backend listStudents query for role_id=9). Add Enrolment runs
// through /admin/students/:id/add-enrolment, which permits role 9.
export default function CounsellorViewStudentPage({ api, session, onNavigate }: CounsellorPageProps) {
  const wrappedNavigate = (href: string) =>
    onNavigate(href.replace(/^\/admin\b/, '/counsellor'));
  return <AdminViewStudentPage api={api.admin} session={session} onNavigate={wrappedNavigate} />;
}
