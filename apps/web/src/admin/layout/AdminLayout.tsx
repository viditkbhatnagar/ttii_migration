import { useCallback } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { AdminPortalApi } from '../admin-portal-api.js';
import { AdminLayoutProvider, useAdminLayout } from './AdminLayoutContext.js';
import { AdminSidebar, AdminSidebarMobile } from './AdminSidebar.js';
import { AdminNavbar } from './AdminNavbar.js';
import { AdminBreadcrumb } from './AdminBreadcrumb.js';
import { AdminFooter } from './AdminFooter.js';
import { AdminRouter } from '../routing/AdminRouter.js';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AdminLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: AdminPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function AdminLayoutInner({ pathname, session, api, onNavigate, onLogout }: AdminLayoutInnerProps) {
  const { mobileSidebarOpen, closeMobileSidebar } = useAdminLayout();

  const handleNavigate = useCallback((href: string) => {
    closeMobileSidebar();
    onNavigate(href);
  }, [closeMobileSidebar, onNavigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-ttii-page-bg">
      {/* Desktop Sidebar */}
      <AdminSidebar pathname={pathname} roleId={session.roleId} onNavigate={handleNavigate} />

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => { if (!open) closeMobileSidebar(); }}>
        <SheetContent side="left" className="w-[280px] p-0 border-0" showCloseButton={false}>
          <AdminSidebarMobile pathname={pathname} roleId={session.roleId} onNavigate={handleNavigate} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-200">
        <AdminNavbar onNavigate={handleNavigate} onLogout={onLogout} />
        <AdminBreadcrumb pathname={pathname} onNavigate={handleNavigate} />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pb-4 md:px-6">
          <AdminRouter pathname={pathname} api={api} session={session} onNavigate={handleNavigate} />
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
