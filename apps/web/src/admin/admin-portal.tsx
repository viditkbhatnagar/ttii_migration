import type { AuthSession } from '@ttii/frontend-core';
import type { AdminPortalApi } from './admin-portal-api.js';
import { AdminLayout } from './layout/AdminLayout.js';

interface AdminPortalProps {
  pathname: string;
  session: AuthSession;
  api: AdminPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function normalizeAdminPath(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed === '/admin' || trimmed === '/admin/') {
    return '/admin/dashboard/index';
  }
  return trimmed;
}

export function resolveAdminSection(_pathname: string): string | null {
  return 'dashboard';
}

export function AdminPortal({ pathname, session, api, onNavigate, onLogout }: AdminPortalProps) {
  return (
    <AdminLayout
      pathname={pathname}
      session={session}
      api={api}
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
}
