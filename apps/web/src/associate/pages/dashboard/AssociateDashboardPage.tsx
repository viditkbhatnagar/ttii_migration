// Associates render the EXACT counsellor dashboard. It reads via
// api.loadCounsellorDashboard, which the AssociatePortalApi override points at
// the associate-scoped /centre/associate/dashboard endpoint — so the identical
// UI is backed by the associate's own data (targets zeroed on the backend).
export { default } from '../../../counsellor/pages/dashboard/CounsellorDashboardPage.js';
