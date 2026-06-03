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
const StudentLiveClassPage = lazy(() => import('../pages/live-classes/StudentLiveClassPage.js'));
const StudentAssessmentsPage = lazy(() => import('../pages/assessments/StudentAssessmentsPage.js'));
const StudentGradesPage = lazy(() => import('../pages/grades/StudentGradesPage.js'));
const StudentCalendarPage = lazy(() => import('../pages/calendar/StudentCalendarPage.js'));
const StudentPaymentsPage = lazy(() => import('../pages/payments/StudentPaymentsPage.js'));
const StudentNotificationsPage = lazy(() => import('../pages/notifications/StudentNotificationsPage.js'));
const StudentSupportPage = lazy(() => import('../pages/support/StudentSupportPage.js'));
const StudentProfilePage = lazy(() => import('../pages/profile/StudentProfilePage.js'));

export const STUDENT_ROUTES: StudentRouteConfig[] = [
  { path: '/student/dashboard', aliases: ['/student', '/student/'], pageComponent: StudentDashboardPage, title: 'Dashboard' },
  { path: '/student/courses', aliases: ['/student/learning'], pageComponent: StudentLearningPage, title: 'My Courses' },
  { path: '/student/live-classes', aliases: ['/student/live'], pageComponent: StudentLiveClassPage, title: 'Live Classes' },
  { path: '/student/assignments', aliases: ['/student/assessments'], pageComponent: StudentAssessmentsPage, title: 'Assignments' },
  { path: '/student/exams', pageComponent: StudentAssessmentsPage, title: 'Exams' },
  { path: '/student/grades', pageComponent: StudentGradesPage, title: 'Grades' },
  { path: '/student/payments', pageComponent: StudentPaymentsPage, title: 'Payments' },
  { path: '/student/calendar', pageComponent: StudentCalendarPage, title: 'Calendar' },
  { path: '/student/notifications', pageComponent: StudentNotificationsPage, title: 'Notifications' },
  { path: '/student/help', aliases: ['/student/support'], pageComponent: StudentSupportPage, title: 'Help Center' },
  { path: '/student/settings', aliases: ['/student/profile'], pageComponent: StudentProfilePage, title: 'Settings' },
];

export function resolveStudentRoute(pathname: string): StudentRouteConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/student';

  const direct = STUDENT_ROUTES.find((r) => r.path === normalized);
  if (direct) return direct;

  const aliased = STUDENT_ROUTES.find((r) => r.aliases?.includes(normalized));
  if (aliased) return aliased;

  return null;
}
