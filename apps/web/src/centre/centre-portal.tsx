import type { AuthSession } from '@ttii/frontend-core';
import type { CentrePortalApi } from './centre-portal-api.js';
import { CentreLayout } from './layout/CentreLayout.js';

export function normalizeCentrePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed === '/centre' || trimmed === '/centre/') {
    return '/centre/dashboard';
  }
  return trimmed;
}

interface CentrePortalProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function CentrePortal({ pathname, session, api, onNavigate, onLogout }: CentrePortalProps) {
  return (
    <CentreLayout
      pathname={pathname}
      session={session}
      api={api}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
