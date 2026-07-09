import type { AuthSession } from '@ttii/frontend-core';
import type { CentrePortalApi } from '../centre/centre-portal-api.js';
import { AssociateLayout } from './layout/AssociateLayout.js';

interface AssociatePortalProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function normalizeAssociatePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed === '/associate' || trimmed === '/associate/') {
    return '/associate/dashboard';
  }
  return trimmed;
}

export function AssociatePortal({ pathname, session, api, onNavigate, onLogout }: AssociatePortalProps) {
  return (
    <AssociateLayout
      pathname={pathname}
      session={session}
      api={api}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
