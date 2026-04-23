import { useCallback } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CentrePortalApi } from '../centre-portal-api.js';
import { CentreLayoutProvider, useCentreLayout } from './CentreLayoutContext.js';
import { CentreSidebar, CentreSidebarMobile } from './CentreSidebar.js';
import { CentreNavbar } from './CentreNavbar.js';
import { CentreBreadcrumb } from './CentreBreadcrumb.js';
import { CentreRouter } from '../routing/CentreRouter.js';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface CentreLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function CentreLayoutInner({ pathname, session, api, onNavigate, onLogout }: CentreLayoutInnerProps) {
  const { mobileSidebarOpen, closeMobileSidebar } = useCentreLayout();
  const roleLabel = session.roleId === 10 ? 'Associate' : 'Centre';

  const handleNavigate = useCallback((href: string) => {
    closeMobileSidebar();
    onNavigate(href);
  }, [closeMobileSidebar, onNavigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-ttii-page-bg">
      {/* Desktop Sidebar */}
      <CentreSidebar pathname={pathname} roleId={session.roleId} onNavigate={handleNavigate} />

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => { if (!open) closeMobileSidebar(); }}>
        <SheetContent side="left" className="w-[280px] p-0 border-0" showCloseButton={false}>
          <CentreSidebarMobile pathname={pathname} roleId={session.roleId} onNavigate={handleNavigate} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-200">
        <CentreNavbar roleLabel={roleLabel} onLogout={onLogout} />
        <CentreBreadcrumb pathname={pathname} onNavigate={handleNavigate} />
        <main id="main-content" aria-label="Main content" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pb-4 md:px-6">
          <CentreRouter pathname={pathname} api={api} session={session} onNavigate={handleNavigate} />
        </main>
        <footer className="border-t border-gray-200 px-4 py-3 text-center text-xs text-gray-400 md:px-6">
          2026 &copy; Teacher&apos;s Training Institute of India.
        </footer>
      </div>
    </div>
  );
}

export interface CentreLayoutProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function CentreLayout(props: CentreLayoutProps) {
  return (
    <CentreLayoutProvider>
      <CentreLayoutInner {...props} />
    </CentreLayoutProvider>
  );
}
