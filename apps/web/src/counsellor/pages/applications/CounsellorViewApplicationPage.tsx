import AdminViewApplicationPage from '../../../admin/pages/applications/ViewApplicationPage.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

// Naji 2026-05-08 — counsellor portal mounts the same View Application
// page used by admins so the Lead Snapshot, stage actions, and the
// Generate / Save Payment Link dialog are all available to counsellors.
export default function CounsellorViewApplicationPage({ api, session, onNavigate }: CounsellorPageProps) {
  const wrappedNavigate = (href: string) =>
    onNavigate(href.replace(/^\/admin\b/, '/counsellor'));
  return <AdminViewApplicationPage api={api.admin} session={session} onNavigate={wrappedNavigate} />;
}
