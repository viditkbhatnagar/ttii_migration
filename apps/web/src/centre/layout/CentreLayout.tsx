import type { AuthSession } from '@ttii/frontend-core';
import type { CentrePortalApi } from '../centre-portal-api.js';
import { CentreLayoutProvider } from './CentreLayoutContext.js';
import { CentreSidebar } from './CentreSidebar.js';
import { CentreNavbar } from './CentreNavbar.js';
import { CentreBreadcrumb } from './CentreBreadcrumb.js';
import { CentreRouter } from '../routing/CentreRouter.js';

interface CentreLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function CentreLayoutInner({ pathname, session, api, onNavigate, onLogout }: CentreLayoutInnerProps) {
  const roleLabel = session.roleId === 10 ? 'Associate' : 'Centre';

  return (
    <div className="flex h-screen overflow-hidden bg-ttii-page-bg">
      <CentreSidebar pathname={pathname} roleId={session.roleId} onNavigate={onNavigate} />
      <div className="flex min-h-screen flex-1 flex-col transition-all duration-200">
        <CentreNavbar roleLabel={roleLabel} onLogout={onLogout} />
        <CentreBreadcrumb pathname={pathname} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto px-6 pb-4">
          <CentreRouter pathname={pathname} api={api} session={session} onNavigate={onNavigate} />
        </main>
        <footer className="border-t border-gray-200 px-6 py-3 text-center text-xs text-gray-400">
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
