import { useCallback } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { InstructorPortalApi } from '../instructor-portal-api.js';
import { InstructorLayoutProvider, useInstructorLayout } from './InstructorLayoutContext.js';
import { InstructorSidebar, InstructorSidebarMobile } from './InstructorSidebar.js';
import { InstructorNavbar } from './InstructorNavbar.js';
import { InstructorRouter } from '../routing/InstructorRouter.js';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface InstructorLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: InstructorPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function InstructorLayoutInner({ pathname, session, api, onNavigate, onLogout }: InstructorLayoutInnerProps) {
  const { mobileSidebarOpen, closeMobileSidebar } = useInstructorLayout();

  const handleNavigate = useCallback((href: string) => {
    closeMobileSidebar();
    onNavigate(href);
  }, [closeMobileSidebar, onNavigate]);

  return (
    <div className="student-dashboard flex h-screen overflow-hidden bg-student-bg">
      {/* Desktop Sidebar */}
      <InstructorSidebar pathname={pathname} session={session} onNavigate={handleNavigate} onLogout={onLogout} />

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => { if (!open) closeMobileSidebar(); }}>
        <SheetContent side="left" className="w-64 p-0 border-0" showCloseButton={false}>
          <InstructorSidebarMobile pathname={pathname} session={session} onNavigate={handleNavigate} onLogout={onLogout} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300">
        <InstructorNavbar session={session} onNavigate={handleNavigate} onLogout={onLogout} />
        <main id="main-content" aria-label="Main content" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-4 md:px-6">
          <InstructorRouter pathname={pathname} api={api} session={session} onNavigate={handleNavigate} />
        </main>
        <footer className="border-t border-slate-200/60 px-6 py-3 text-center text-xs text-student-muted">
          2026 &copy; Teacher&apos;s Training Institute of India.
        </footer>
      </div>
    </div>
  );
}

export interface InstructorLayoutProps {
  pathname: string;
  session: AuthSession;
  api: InstructorPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function InstructorLayout(props: InstructorLayoutProps) {
  return (
    <InstructorLayoutProvider api={props.api} session={props.session}>
      <InstructorLayoutInner {...props} />
    </InstructorLayoutProvider>
  );
}
