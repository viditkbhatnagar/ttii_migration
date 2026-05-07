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
const CounsellorViewApplicationPage = lazy(() => import('../pages/applications/CounsellorViewApplicationPage.js'));
const CounsellorAddLeadPage = lazy(() => import('../pages/leads/CounsellorAddLeadPage.js'));
const CounsellorStudentsPage = lazy(() => import('../pages/students/CounsellorStudentsPage.js'));
const CounsellorTargetsPage = lazy(() => import('../pages/targets/CounsellorTargetsPage.js'));
const CounsellorReferralsPage = lazy(() => import('../pages/referrals/CounsellorReferralsPage.js'));
const CounsellorSettingsPage = lazy(() => import('../pages/settings/CounsellorSettingsPage.js'));

export const COUNSELLOR_ROUTES: CounsellorRouteConfig[] = [
  { path: '/counsellor/dashboard', aliases: ['/counsellor', '/counsellor/'], pageComponent: CounsellorDashboardPage, title: 'Dashboard' },
  // Naji 2026-05-08 — Lead workflow parity with admin portal.
  { path: '/counsellor/applications', aliases: ['/counsellor/applications/index'], pageComponent: CounsellorApplicationsPage, title: 'Applications' },
  { path: '/counsellor/applications/view/:id', pageComponent: CounsellorViewApplicationPage, title: 'View Application' },
  { path: '/counsellor/leads/add', pageComponent: CounsellorAddLeadPage, title: 'Add Lead' },
  { path: '/counsellor/leads/edit/:id', pageComponent: CounsellorAddLeadPage, title: 'Edit Lead' },
  { path: '/counsellor/students', pageComponent: CounsellorStudentsPage, title: 'Students' },
  { path: '/counsellor/targets', pageComponent: CounsellorTargetsPage, title: 'My Targets' },
  { path: '/counsellor/referrals', pageComponent: CounsellorReferralsPage, title: 'Referrals' },
  { path: '/counsellor/settings', pageComponent: CounsellorSettingsPage, title: 'Settings' },
];

// Param routes (e.g. /:id) — match by prefix when no exact / aliased
// route matches above. Mirrors the admin router's pattern.
const PARAM_ROUTE_PATTERNS: Array<{ prefix: string; route: CounsellorRouteConfig }> = [];
for (const r of COUNSELLOR_ROUTES) {
  if (r.path.includes('/:')) {
    const prefix = r.path.split('/:')[0]!;
    PARAM_ROUTE_PATTERNS.push({ prefix, route: r });
  }
}

export function resolveCounsellorRoute(pathname: string): CounsellorRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/counsellor';
  const direct = COUNSELLOR_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;
  const aliased = COUNSELLOR_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;
  // Param fallback — longest prefix wins so /counsellor/applications/view/:id
  // takes priority over /counsellor/applications.
  const matches = PARAM_ROUTE_PATTERNS
    .filter((p) => normalized.startsWith(`${p.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  return matches[0]?.route ?? null;
}
