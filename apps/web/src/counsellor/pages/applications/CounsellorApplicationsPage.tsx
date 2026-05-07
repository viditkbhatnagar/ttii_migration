import AdminApplicationsPage from '../../../admin/pages/applications/ApplicationsPage.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

// Naji 2026-05-08 — counsellor portal mounts the same Applications
// list (with stage tabs, Add Lead button, View / Edit row actions)
// that admins use. Backend listLeads + listAdminApplications already
// scope by pipeline_user when role_id=9, so a counsellor only sees
// their own leads.
export default function CounsellorApplicationsPage({ api, session, onNavigate }: CounsellorPageProps) {
  const wrappedNavigate = (href: string) =>
    onNavigate(href.replace(/^\/admin\b/, '/counsellor'));
  return <AdminApplicationsPage api={api.admin} session={session} onNavigate={wrappedNavigate} />;
}
