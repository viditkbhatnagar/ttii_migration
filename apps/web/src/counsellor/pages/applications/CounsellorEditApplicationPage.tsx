import AdminAddApplicationPage from '../../../admin/pages/applications/AddApplicationPage.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

// Naji UAT 2026-05-16 — Edit Application on the counsellor portal.
// Wraps the admin AddApplicationPage (which handles both add and edit
// based on the URL) and rewrites the /admin prefix in navigation
// callbacks so the in-page links stay on the counsellor portal.
export default function CounsellorEditApplicationPage({ api, session, onNavigate }: CounsellorPageProps) {
  const wrappedNavigate = (href: string) =>
    onNavigate(href.replace(/^\/admin\b/, '/counsellor'));
  return <AdminAddApplicationPage api={api.admin} session={session} onNavigate={wrappedNavigate} />;
}
