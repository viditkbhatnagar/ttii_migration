import { useCallback, useEffect } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { StudentPortalApi } from '../student-portal-api.js';
import { StudentLayoutProvider } from './StudentLayoutContext.js';
import { useStudentLayout } from './StudentLayoutContext.js';
import { StudentSidebar, StudentSidebarMobile } from './StudentSidebar.js';
import { StudentNavbar } from './StudentNavbar.js';
import { StudentRouter } from '../routing/StudentRouter.js';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface StudentLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: StudentPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function StudentLayoutInner({ pathname, session, api, onNavigate, onLogout }: StudentLayoutInnerProps) {
  const { mobileSidebarOpen, closeMobileSidebar } = useStudentLayout();

  // The scroll container is <main id="main-content">, not window — so reset ITS
  // scroll to the top on every route change. Otherwise pages open at the
  // previous page's scroll offset (often the bottom). Ishfaq 2026-07-01.
  useEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0 });
  }, [pathname]);

  const handleNavigate = useCallback((href: string) => {
    closeMobileSidebar();
    onNavigate(href);
  }, [closeMobileSidebar, onNavigate]);

  return (
    <div className="student-dashboard flex h-screen overflow-hidden bg-student-bg">
      {/* Desktop Sidebar */}
      <StudentSidebar pathname={pathname} session={session} onNavigate={handleNavigate} onLogout={onLogout} />

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => { if (!open) closeMobileSidebar(); }}>
        <SheetContent side="left" className="w-64 p-0 border-0" showCloseButton={false}>
          <StudentSidebarMobile pathname={pathname} session={session} onNavigate={handleNavigate} onLogout={onLogout} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300">
        <StudentNavbar api={api} session={session} onNavigate={handleNavigate} onLogout={onLogout} />
        <main id="main-content" aria-label="Main content" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-6 pb-4 pt-4 md:px-8 lg:px-10">
          <StudentRouter pathname={pathname} api={api} session={session} onNavigate={handleNavigate} />
        </main>
        <footer className="border-t border-slate-200/60 px-6 py-3 text-center text-xs text-student-muted md:px-8 lg:px-10">
          2026 &copy; Teacher&apos;s Training Institute of India.
        </footer>
      </div>
    </div>
  );
}

export interface StudentLayoutProps {
  pathname: string;
  session: AuthSession;
  api: StudentPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function StudentLayout(props: StudentLayoutProps) {
  return (
    <StudentLayoutProvider api={props.api} session={props.session}>
      <StudentLayoutInner {...props} />
    </StudentLayoutProvider>
  );
}
