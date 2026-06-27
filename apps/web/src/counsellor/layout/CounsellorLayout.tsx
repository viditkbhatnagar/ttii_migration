import { useCallback, useEffect } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CounsellorPortalApi } from '../counsellor-portal-api.js';
import { CounsellorLayoutProvider, useCounsellorLayout } from './CounsellorLayoutContext.js';
import { CounsellorSidebar, CounsellorSidebarMobile } from './CounsellorSidebar.js';
import { CounsellorNavbar } from './CounsellorNavbar.js';
import { CounsellorRouter } from '../routing/CounsellorRouter.js';
import { resolveCounsellorRoute } from '../routing/counsellor-routes.js';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface CounsellorLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: CounsellorPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function CounsellorLayoutInner({ pathname, session, api, onNavigate, onLogout }: CounsellorLayoutInnerProps) {
  const { mobileSidebarOpen, closeMobileSidebar } = useCounsellorLayout();

  const handleNavigate = useCallback((href: string) => {
    closeMobileSidebar();
    onNavigate(href);
  }, [closeMobileSidebar, onNavigate]);

  // Reflect the active counsellor page in the browser tab title. Scoped to this
  // layout so the student/admin/centre portals are unaffected.
  useEffect(() => {
    const route = resolveCounsellorRoute(pathname);
    const pageTitle = route?.title ?? 'Counsellor';
    document.title = `${pageTitle} | TTII Counsellor`;
  }, [pathname]);

  return (
    <div
      className="counsellor-theme student-dashboard flex h-screen overflow-hidden"
      style={{ background: 'var(--cn-bg-gradient)' }}
    >
      <CounsellorSidebar pathname={pathname} session={session} onNavigate={handleNavigate} />

      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => { if (!open) closeMobileSidebar(); }}>
        <SheetContent side="left" className="counsellor-theme w-64 p-0 border-0" showCloseButton={false}>
          <CounsellorSidebarMobile pathname={pathname} session={session} onNavigate={handleNavigate} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <CounsellorNavbar session={session} onLogout={onLogout} />
        <main
          id="main-content"
          aria-label="Main content"
          className="min-w-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-4 lg:p-8"
        >
          <CounsellorRouter pathname={pathname} api={api} session={session} onNavigate={handleNavigate} />
        </main>
      </div>
    </div>
  );
}

export interface CounsellorLayoutProps {
  pathname: string;
  session: AuthSession;
  api: CounsellorPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function CounsellorLayout(props: CounsellorLayoutProps) {
  return (
    <CounsellorLayoutProvider api={props.api} session={props.session}>
      <CounsellorLayoutInner {...props} />
    </CounsellorLayoutProvider>
  );
}
