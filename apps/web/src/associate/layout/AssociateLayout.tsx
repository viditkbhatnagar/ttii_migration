import { useCallback, useEffect } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CentrePortalApi } from '../../centre/centre-portal-api.js';
import { AssociateLayoutProvider, useAssociateLayout } from './AssociateLayoutContext.js';
import { AssociateSidebar, AssociateSidebarMobile } from './AssociateSidebar.js';
import { AssociateNavbar } from './AssociateNavbar.js';
import { AssociateRouter } from '../routing/AssociateRouter.js';
import { resolveAssociateRoute } from '../routing/associate-routes.js';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AssociateLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function AssociateLayoutInner({ pathname, session, api, onNavigate, onLogout }: AssociateLayoutInnerProps) {
  const { mobileSidebarOpen, closeMobileSidebar } = useAssociateLayout();

  const handleNavigate = useCallback((href: string) => {
    closeMobileSidebar();
    onNavigate(href);
  }, [closeMobileSidebar, onNavigate]);

  // Reflect the active associate page in the browser tab title. Scoped to this
  // layout so the student/admin/centre/counsellor portals are unaffected.
  useEffect(() => {
    const route = resolveAssociateRoute(pathname);
    const pageTitle = route?.title ?? 'Associate';
    document.title = `${pageTitle} | TTII Associate`;
  }, [pathname]);

  return (
    <div
      className="counsellor-theme student-dashboard flex h-screen overflow-hidden"
      style={{ background: 'var(--cn-bg-gradient)' }}
    >
      <AssociateSidebar pathname={pathname} session={session} onNavigate={handleNavigate} />

      <Sheet open={mobileSidebarOpen} onOpenChange={(open) => { if (!open) closeMobileSidebar(); }}>
        <SheetContent side="left" className="counsellor-theme w-64 p-0 border-0" showCloseButton={false}>
          <AssociateSidebarMobile pathname={pathname} session={session} onNavigate={handleNavigate} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AssociateNavbar session={session} onLogout={onLogout} />
        <main
          id="main-content"
          aria-label="Main content"
          className="min-w-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-4 lg:p-8"
        >
          <AssociateRouter pathname={pathname} api={api} session={session} onNavigate={handleNavigate} />
        </main>
      </div>
    </div>
  );
}

export interface AssociateLayoutProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function AssociateLayout(props: AssociateLayoutProps) {
  return (
    <AssociateLayoutProvider api={props.api} session={props.session}>
      <AssociateLayoutInner {...props} />
    </AssociateLayoutProvider>
  );
}
