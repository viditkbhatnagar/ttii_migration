import AdminAddLeadPage from '../../../admin/pages/applications/AddLeadPage.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

// Naji 2026-05-08 — thin wrapper that mounts the admin Add Lead page
// inside the counsellor portal. The backend's `/admin/leads/add` route
// is open to role_id=9 and stamps pipeline_user from the logged-in
// user, so a counsellor's leads stay scoped to them.
export default function CounsellorAddLeadPage({ api, session, onNavigate }: CounsellorPageProps) {
  const wrappedNavigate = (href: string) =>
    onNavigate(href.replace(/^\/admin\b/, '/counsellor'));
  return <AdminAddLeadPage api={api.admin} session={session} onNavigate={wrappedNavigate} />;
}
