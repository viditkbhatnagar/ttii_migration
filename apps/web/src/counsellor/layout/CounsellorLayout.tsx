import { useCallback } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CounsellorPortalApi } from '../counsellor-portal-api.js';
import { CounsellorLayoutProvider, useCounsellorLayout } from './CounsellorLayoutContext.js';
import { CounsellorSidebar, CounsellorSidebarMobile } from './CounsellorSidebar.js';
import { CounsellorNavbar } from './CounsellorNavbar.js';
import { CounsellorRouter } from '../routing/CounsellorRouter.js';
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

  return (
    <div className="student-dashboard flex h-screen overflow-hidden bg-student-bg">
      <CounsellorSidebar pathname={pathname} session={session} onNavigate={handleNavigate} onLogout={onLogout} />

      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => { if (!open) closeMobileSidebar(); }}>
        <SheetContent side="left" className="w-64 p-0 border-0" showCloseButton={false}>
          <CounsellorSidebarMobile pathname={pathname} session={session} onNavigate={handleNavigate} onLogout={onLogout} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300">
        <CounsellorNavbar session={session} onNavigate={handleNavigate} onLogout={onLogout} />
        <main id="main-content" aria-label="Main content" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-4 md:px-6">
          <CounsellorRouter pathname={pathname} api={api} session={session} onNavigate={handleNavigate} />
        </main>
        <footer className="border-t border-slate-200/60 px-6 py-3 text-center text-xs text-student-muted">
          2026 &copy; Teacher&apos;s Training Institute of India.
        </footer>
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
