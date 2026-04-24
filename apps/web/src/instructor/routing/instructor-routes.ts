import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { InstructorPortalApi } from '../instructor-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

export interface InstructorPageProps {
  api: InstructorPortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export interface InstructorRouteConfig {
  path: string;
  aliases?: string[];
  pageComponent: LazyExoticComponent<ComponentType<InstructorPageProps>>;
  title: string;
}

const InstructorDashboardPage = lazy(() => import('../pages/dashboard/InstructorDashboardPage.js'));
const InstructorCohortsPage = lazy(() => import('../pages/cohorts/InstructorCohortsPage.js'));
const InstructorLiveClassesPage = lazy(() => import('../pages/live-classes/InstructorLiveClassesPage.js'));
const InstructorAssignmentsPage = lazy(() => import('../pages/assignments/InstructorAssignmentsPage.js'));
const InstructorSettingsPage = lazy(() => import('../pages/settings/InstructorSettingsPage.js'));

export const INSTRUCTOR_ROUTES: InstructorRouteConfig[] = [
  { path: '/instructor/dashboard', aliases: ['/instructor', '/instructor/'], pageComponent: InstructorDashboardPage, title: 'Dashboard' },
  { path: '/instructor/cohorts', pageComponent: InstructorCohortsPage, title: 'Cohorts' },
  { path: '/instructor/live-classes', pageComponent: InstructorLiveClassesPage, title: 'Live Classes' },
  { path: '/instructor/assignments', pageComponent: InstructorAssignmentsPage, title: 'Assignments' },
  { path: '/instructor/settings', pageComponent: InstructorSettingsPage, title: 'Settings' },
];

export function resolveInstructorRoute(pathname: string): InstructorRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/instructor';

  const direct = INSTRUCTOR_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;

  const aliased = INSTRUCTOR_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;

  return null;
}
