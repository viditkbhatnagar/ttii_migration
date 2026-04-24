import type { AuthSession } from '@ttii/frontend-core';
import type { InstructorPortalApi } from './instructor-portal-api.js';
import { InstructorLayout } from './layout/InstructorLayout.js';

interface InstructorPortalProps {
  pathname: string;
  session: AuthSession;
  api: InstructorPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function normalizeInstructorPath(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed === '/instructor' || trimmed === '/instructor/') {
    return '/instructor/dashboard';
  }
  return trimmed;
}

export function resolveInstructorSection(_pathname: string): string | null {
  return 'dashboard';
}

export function InstructorPortal({ pathname, session, api, onNavigate, onLogout }: InstructorPortalProps) {
  return (
    <InstructorLayout
      pathname={pathname}
      session={session}
      api={api}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
