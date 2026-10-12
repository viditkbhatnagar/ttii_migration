import { useCallback, useEffect } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { AdminPortalApi } from '../admin-portal-api.js';
import { AdminLayoutProvider, useAdminLayout } from './AdminLayoutContext.js';
import { AdminSidebar, AdminSidebarMobile } from './AdminSidebar.js';
import { AdminNavbar } from './AdminNavbar.js';
import { AdminRouter } from '../routing/AdminRouter.js';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

interface AdminLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: AdminPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function AdminLayoutInner({ pathname, session, api, onNavigate, onLogout }: AdminLayoutInnerProps) {
  const { mobileSidebarOpen, closeMobileSidebar } = useAdminLayout();

  // Naji admin design (2026-10-12): the theme lives on <html> while the admin
  // portal is open, so dialogs, popovers and menus portaled to <body> get it
  // too (a class on this div would not reach them). Removed on the way out so
  // the student / centre / counsellor portals keep their own look.
  useEffect(() => {
    document.documentElement.classList.add('admin-theme');
    return () => document.documentElement.classList.remove('admin-theme');
  }, []);

  const handleNavigate = useCallback((href: string) => {
    closeMobileSidebar();
    onNavigate(href);
  }, [closeMobileSidebar, onNavigate]);

  // Naji's shell (2026-10-12): his fixed sidebar + light navbar + a lightly
  // padded content area on the page background. No breadcrumb or footer in
  // his design — the sidebar's active item and each page's own title say where
  // you are. <main> stays the scroll container so the sidebar and navbar hold.
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar (lg and up) */}
      <AdminSidebar pathname={pathname} roleId={session.roleId} onNavigate={handleNavigate} />

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => { if (!open) closeMobileSidebar(); }}>
        <SheetContent side="left" className="w-72 max-w-[85vw] gap-0 border-r border-border p-0 shadow-xl" showCloseButton={false}>
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <SheetDescription className="sr-only">Sections of the admin portal</SheetDescription>
          <AdminSidebarMobile pathname={pathname} roleId={session.roleId} onNavigate={handleNavigate} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <AdminNavbar onNavigate={handleNavigate} onLogout={onLogout} api={api} session={session} />
        <main id="main-content" aria-label="Main content" className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 sm:px-3">
          <AdminRouter pathname={pathname} api={api} session={session} onNavigate={handleNavigate} />
        </main>
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
