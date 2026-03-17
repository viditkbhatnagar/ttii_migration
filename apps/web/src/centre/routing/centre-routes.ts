import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { CentrePortalApi } from '../centre-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

export interface CentrePageProps {
  api: CentrePortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export interface CentreRouteConfig {
  path: string;
  aliases?: string[];
  pageComponent: LazyExoticComponent<ComponentType<CentrePageProps>>;
  title: string;
}

const CentreDashboardPage = lazy(() => import('../pages/dashboard/CentreDashboardPage.js'));
const CentreApplicationsPage = lazy(() => import('../pages/applications/CentreApplicationsPage.js'));
const CentreStudentsPage = lazy(() => import('../pages/students/CentreStudentsPage.js'));
const CentreCoursesPage = lazy(() => import('../pages/courses/CentreCoursesPage.js'));
const CentreCohortsPage = lazy(() => import('../pages/cohorts/CentreCohortsPage.js'));
const CentreViewCohortPage = lazy(() => import('../pages/cohorts/CentreViewCohortPage.js'));
const CentreLiveClassPage = lazy(() => import('../pages/live/CentreLiveClassPage.js'));
const CentreResourcesPage = lazy(() => import('../pages/resources/CentreResourcesPage.js'));
const CentreWalletPage = lazy(() => import('../pages/wallet/CentreWalletPage.js'));
const CentreSupportPage = lazy(() => import('../pages/support/CentreSupportPage.js'));

export const CENTRE_ROUTES: CentreRouteConfig[] = [
  { path: '/centre/dashboard', aliases: ['/centre', '/centre/'], pageComponent: CentreDashboardPage, title: 'Dashboard' },
  { path: '/centre/applications', pageComponent: CentreApplicationsPage, title: 'Applications' },
  { path: '/centre/students', pageComponent: CentreStudentsPage, title: 'Students' },
  { path: '/centre/courses', pageComponent: CentreCoursesPage, title: 'Courses' },
  { path: '/centre/cohorts', pageComponent: CentreCohortsPage, title: 'Cohorts' },
  { path: '/centre/cohorts/view/:id', pageComponent: CentreViewCohortPage, title: 'View Cohort' },
  { path: '/centre/live', pageComponent: CentreLiveClassPage, title: 'Live Classes' },
  { path: '/centre/resources', pageComponent: CentreResourcesPage, title: 'Resources' },
  { path: '/centre/wallet', pageComponent: CentreWalletPage, title: 'Wallet' },
  { path: '/centre/support', pageComponent: CentreSupportPage, title: 'Support' },
];

export function resolveCentreRoute(pathname: string): CentreRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/centre';

  const direct = CENTRE_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;

  const aliased = CENTRE_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;

  for (const route of CENTRE_ROUTES) {
    if (!route.path.includes(':')) continue;
    const routeParts = route.path.split('/');
    const pathParts = normalized.split('/');
    if (routeParts.length !== pathParts.length) continue;
    const matches = routeParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
    if (matches) return route;
  }

  return null;
}

export function extractCentreRouteParams(routePath: string, pathname: string): Record<string, string> {
  const routeParts = routePath.split('/');
  const pathParts = pathname.replace(/\/$/, '').split('/');
  const params: Record<string, string> = {};

  routeParts.forEach((part, i) => {
    if (part.startsWith(':')) {
      params[part.slice(1)] = pathParts[i] ?? '';
    }
  });

  return params;
}
