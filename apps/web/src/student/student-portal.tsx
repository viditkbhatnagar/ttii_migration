import type { AuthSession } from '@ttii/frontend-core';
import type { StudentPortalApi } from './student-portal-api.js';
import { StudentLayout } from './layout/StudentLayout.js';

interface StudentPortalProps {
  pathname: string;
  session: AuthSession;
  api: StudentPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function normalizeStudentPath(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed === '/student' || trimmed === '/student/') {
    return '/student/dashboard';
  }
  return trimmed;
}

export function resolveStudentSection(_pathname: string): string | null {
  return 'dashboard';
}

export function StudentPortal({ pathname, session, api, onNavigate, onLogout }: StudentPortalProps) {
  return (
    <StudentLayout
      pathname={pathname}
      session={session}
      api={api}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
