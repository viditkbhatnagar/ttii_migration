import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { CounsellorPortalApi } from '../counsellor-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

export interface CounsellorPageProps {
  api: CounsellorPortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export interface CounsellorRouteConfig {
  path: string;
  aliases?: string[];
  pageComponent: LazyExoticComponent<ComponentType<CounsellorPageProps>>;
  title: string;
}

const CounsellorDashboardPage = lazy(() => import('../pages/dashboard/CounsellorDashboardPage.js'));
const CounsellorApplicationsPage = lazy(() => import('../pages/applications/CounsellorApplicationsPage.js'));
const CounsellorStudentsPage = lazy(() => import('../pages/students/CounsellorStudentsPage.js'));
const CounsellorTargetsPage = lazy(() => import('../pages/targets/CounsellorTargetsPage.js'));
const CounsellorReferralsPage = lazy(() => import('../pages/referrals/CounsellorReferralsPage.js'));
const CounsellorSettingsPage = lazy(() => import('../pages/settings/CounsellorSettingsPage.js'));

export const COUNSELLOR_ROUTES: CounsellorRouteConfig[] = [
  { path: '/counsellor/dashboard', aliases: ['/counsellor', '/counsellor/'], pageComponent: CounsellorDashboardPage, title: 'Dashboard' },
  { path: '/counsellor/applications', pageComponent: CounsellorApplicationsPage, title: 'Applications' },
  { path: '/counsellor/students', pageComponent: CounsellorStudentsPage, title: 'Students' },
  { path: '/counsellor/targets', pageComponent: CounsellorTargetsPage, title: 'My Targets' },
  { path: '/counsellor/referrals', pageComponent: CounsellorReferralsPage, title: 'Referrals' },
  { path: '/counsellor/settings', pageComponent: CounsellorSettingsPage, title: 'Settings' },
];

export function resolveCounsellorRoute(pathname: string): CounsellorRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/counsellor';
  const direct = COUNSELLOR_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;
  const aliased = COUNSELLOR_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;
  return null;
}
