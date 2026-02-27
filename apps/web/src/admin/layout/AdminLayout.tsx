import type { AuthSession } from '@ttii/frontend-core';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../admin-portal-api.js';
import { AdminLayoutProvider, useAdminLayout } from './AdminLayoutContext.js';
import { AdminSidebar } from './AdminSidebar.js';
import { AdminNavbar } from './AdminNavbar.js';
import { AdminBreadcrumb } from './AdminBreadcrumb.js';
import { AdminFooter } from './AdminFooter.js';
import { AdminRouter } from '../routing/AdminRouter.js';

interface AdminLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: AdminPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function AdminLayoutInner({ pathname, session, api, onNavigate, onLogout }: AdminLayoutInnerProps) {
  const { sidebarCollapsed } = useAdminLayout();

  return (
    <div className="flex h-screen overflow-hidden bg-ttii-page-bg">
      <AdminSidebar pathname={pathname} onNavigate={onNavigate} />
      <div
        className={cn(
          'flex min-h-screen flex-1 flex-col transition-all duration-200',
        )}
      >
        <AdminNavbar onNavigate={onNavigate} onLogout={onLogout} />
        <AdminBreadcrumb pathname={pathname} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto px-6 pb-4">
          <AdminRouter pathname={pathname} api={api} session={session} onNavigate={onNavigate} />
        </main>
        <AdminFooter />
      </div>
    </div>
  );
}

export interface AdminLayoutProps {
  pathname: string;
  session: AuthSession;
  api: AdminPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function AdminLayout(props: AdminLayoutProps) {
  return (
    <AdminLayoutProvider>
      <AdminLayoutInner {...props} />
    </AdminLayoutProvider>
  );
}
