import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { CentrePortalApi } from '../../centre/centre-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

// Associates ride the associate-scoped CentrePortalApi (loadApplications /
// loadStudents / loadTrainingVideos are already scoped to the associate on the
// backend). The page bodies for Applications / Students / Training are reused
// verbatim from the Centre portal — associates keep their current data — while
// the Dashboard is a bespoke counsellor-styled surface (no target widgets).
export interface AssociatePageProps {
  api: CentrePortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export interface AssociateRouteConfig {
  path: string;
  aliases?: string[];
  pageComponent: LazyExoticComponent<ComponentType<AssociatePageProps>>;
  title: string;
}

const AssociateDashboardPage = lazy(() => import('../pages/dashboard/AssociateDashboardPage.js'));
// Reused Centre page bodies (CentrePageProps is structurally identical to
// AssociatePageProps — both take { api: CentrePortalApi; session; onNavigate }).
const CentreApplicationsPage = lazy(() => import('../../centre/pages/applications/CentreApplicationsPage.js'));
const CentreStudentsPage = lazy(() => import('../../centre/pages/students/CentreStudentsPage.js'));
const CentreTrainingPage = lazy(() => import('../../centre/pages/training/CentreTrainingPage.js'));

export const ASSOCIATE_ROUTES: AssociateRouteConfig[] = [
  { path: '/associate/dashboard', aliases: ['/associate', '/associate/'], pageComponent: AssociateDashboardPage, title: 'Dashboard' },
  { path: '/associate/applications', pageComponent: CentreApplicationsPage, title: 'Applications' },
  { path: '/associate/students', pageComponent: CentreStudentsPage, title: 'Students' },
  { path: '/associate/training', pageComponent: CentreTrainingPage, title: 'Training' },
];

export function resolveAssociateRoute(pathname: string): AssociateRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/associate';
  const direct = ASSOCIATE_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;
  const aliased = ASSOCIATE_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;
  return null;
}
