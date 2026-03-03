import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { StudentPortalApi } from '../student-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

export interface StudentPageProps {
  api: StudentPortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export interface StudentRouteConfig {
  path: string;
  aliases?: string[];
  pageComponent: LazyExoticComponent<ComponentType<StudentPageProps>>;
  title: string;
}

const StudentDashboardPage = lazy(() => import('../pages/dashboard/StudentDashboardPage.js'));
const StudentLearningPage = lazy(() => import('../pages/learning/StudentLearningPage.js'));
const StudentAssessmentsPage = lazy(() => import('../pages/assessments/StudentAssessmentsPage.js'));
const StudentPaymentsPage = lazy(() => import('../pages/payments/StudentPaymentsPage.js'));
const StudentNotificationsPage = lazy(() => import('../pages/notifications/StudentNotificationsPage.js'));
const StudentSupportPage = lazy(() => import('../pages/support/StudentSupportPage.js'));
const StudentProfilePage = lazy(() => import('../pages/profile/StudentProfilePage.js'));

export const STUDENT_ROUTES: StudentRouteConfig[] = [
  { path: '/student/dashboard', aliases: ['/student', '/student/'], pageComponent: StudentDashboardPage, title: 'Dashboard' },
  { path: '/student/learning', pageComponent: StudentLearningPage, title: 'My Learning' },
  { path: '/student/assessments', pageComponent: StudentAssessmentsPage, title: 'Assessments' },
  { path: '/student/payments', pageComponent: StudentPaymentsPage, title: 'Payments' },
  { path: '/student/notifications', pageComponent: StudentNotificationsPage, title: 'Notifications' },
  { path: '/student/support', pageComponent: StudentSupportPage, title: 'Support' },
  { path: '/student/profile', pageComponent: StudentProfilePage, title: 'My Profile' },
];

export function resolveStudentRoute(pathname: string): StudentRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/student';

  const direct = STUDENT_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;

  const aliased = STUDENT_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;

  return null;
}
