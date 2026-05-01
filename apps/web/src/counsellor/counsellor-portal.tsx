import type { AuthSession } from '@ttii/frontend-core';
import type { CounsellorPortalApi } from './counsellor-portal-api.js';
import { CounsellorLayout } from './layout/CounsellorLayout.js';

interface CounsellorPortalProps {
  pathname: string;
  session: AuthSession;
  api: CounsellorPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function normalizeCounsellorPath(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed === '/counsellor' || trimmed === '/counsellor/') {
    return '/counsellor/dashboard';
  }
  return trimmed;
}

export function CounsellorPortal({ pathname, session, api, onNavigate, onLogout }: CounsellorPortalProps) {
  return (
    <CounsellorLayout
      pathname={pathname}
      session={session}
      api={api}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
