import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CounsellorPageProps } from '../../counsellor/routing/counsellor-routes.js';
import type { AssociatePortalApi } from '../associate-portal-api.js';

// Associates render the counsellor pages verbatim, backed by an
// AssociatePortalApi (a CounsellorPortalApi subtype whose reads are scoped to
// the associate's own data). AssociatePortalApi is assignable to
// CounsellorPortalApi, so the imported counsellor components accept it directly.
export interface AssociatePageProps {
  api: AssociatePortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export interface AssociateRouteConfig {
  path: string;
  aliases?: string[];
  pageComponent: LazyExoticComponent<ComponentType<CounsellorPageProps>>;
  title: string;
}

// Dashboard is the associate re-export of CounsellorDashboardPage; the rest are
// the counsellor page components themselves.
const AssociateDashboardPage = lazy(() => import('../pages/dashboard/AssociateDashboardPage.js'));
const CounsellorApplicationsPage = lazy(() => import('../../counsellor/pages/applications/CounsellorApplicationsPage.js'));
const CounsellorViewApplicationPage = lazy(() => import('../../counsellor/pages/applications/CounsellorViewApplicationPage.js'));
const CounsellorEditApplicationPage = lazy(() => import('../../counsellor/pages/applications/CounsellorEditApplicationPage.js'));
const CounsellorAddLeadPage = lazy(() => import('../../counsellor/pages/leads/CounsellorAddLeadPage.js'));
const CounsellorStudentsPage = lazy(() => import('../../counsellor/pages/students/CounsellorStudentsPage.js'));
const CounsellorViewStudentPage = lazy(() => import('../../counsellor/pages/students/CounsellorViewStudentPage.js'));
const CounsellorTargetsPage = lazy(() => import('../../counsellor/pages/targets/CounsellorTargetsPage.js'));
const CounsellorReferralsPage = lazy(() => import('../../counsellor/pages/referrals/CounsellorReferralsPage.js'));
const CounsellorSettingsPage = lazy(() => import('../../counsellor/pages/settings/CounsellorSettingsPage.js'));
const CounsellorPerformancePage = lazy(() => import('../../counsellor/pages/performance/CounsellorPerformancePage.js'));
const CounsellorCoursesPage = lazy(() => import('../../counsellor/pages/courses/CounsellorCoursesPage.js'));
const CounsellorCourseDetailPage = lazy(() => import('../../counsellor/pages/courses/CounsellorCourseDetailPage.js'));
const CounsellorReportsPage = lazy(() => import('../../counsellor/pages/reports/CounsellorReportsPage.js'));
const CounsellorPaymentsPage = lazy(() => import('../../counsellor/pages/payments/CounsellorPaymentsPage.js'));
const CounsellorTrainingPage = lazy(() => import('../../counsellor/pages/training/CounsellorTrainingPage.js'));
const CounsellorResourcesPage = lazy(() => import('../../counsellor/pages/resources/CounsellorResourcesPage.js'));

export const ASSOCIATE_ROUTES: AssociateRouteConfig[] = [
  { path: '/associate/dashboard', aliases: ['/associate', '/associate/'], pageComponent: AssociateDashboardPage, title: 'Dashboard' },
  { path: '/associate/applications', aliases: ['/associate/applications/index'], pageComponent: CounsellorApplicationsPage, title: 'Applications' },
  { path: '/associate/applications/view/:id', pageComponent: CounsellorViewApplicationPage, title: 'View Application' },
  { path: '/associate/applications/edit/:id', pageComponent: CounsellorEditApplicationPage, title: 'Edit Application' },
  { path: '/associate/leads/add', pageComponent: CounsellorAddLeadPage, title: 'Add Lead' },
  { path: '/associate/leads/edit/:id', pageComponent: CounsellorAddLeadPage, title: 'Edit Lead' },
  { path: '/associate/students', pageComponent: CounsellorStudentsPage, title: 'Students' },
  { path: '/associate/students/view/:id', pageComponent: CounsellorViewStudentPage, title: 'View Student' },
  { path: '/associate/targets', pageComponent: CounsellorTargetsPage, title: 'My Targets' },
  { path: '/associate/performance', pageComponent: CounsellorPerformancePage, title: 'Performance' },
  { path: '/associate/courses', pageComponent: CounsellorCoursesPage, title: 'Courses' },
  { path: '/associate/courses/view/:id', pageComponent: CounsellorCourseDetailPage, title: 'Course Detail' },
  { path: '/associate/payments', pageComponent: CounsellorPaymentsPage, title: 'Payments' },
  { path: '/associate/training', pageComponent: CounsellorTrainingPage, title: 'Training' },
  { path: '/associate/resources', pageComponent: CounsellorResourcesPage, title: 'Resources' },
  { path: '/associate/reports', pageComponent: CounsellorReportsPage, title: 'Reports' },
  { path: '/associate/referrals', pageComponent: CounsellorReferralsPage, title: 'Referrals' },
  { path: '/associate/settings', pageComponent: CounsellorSettingsPage, title: 'Settings' },
];

// Param routes (e.g. /:id) — match by prefix when no exact / aliased route
// matches above. Longest prefix wins so /associate/applications/view/:id takes
// priority over /associate/applications. Mirrors resolveCounsellorRoute.
const PARAM_ROUTE_PATTERNS: Array<{ prefix: string; route: AssociateRouteConfig }> = [];
for (const r of ASSOCIATE_ROUTES) {
  if (r.path.includes('/:')) {
    const prefix = r.path.split('/:')[0]!;
    PARAM_ROUTE_PATTERNS.push({ prefix, route: r });
  }
}

export function resolveAssociateRoute(pathname: string): AssociateRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/associate';
  const direct = ASSOCIATE_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;
  const aliased = ASSOCIATE_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;
  const matches = PARAM_ROUTE_PATTERNS
    .filter((p) => normalized.startsWith(`${p.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  return matches[0]?.route ?? null;
}
