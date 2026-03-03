import type { AuthSession } from '@ttii/frontend-core';
import type { StudentPortalApi } from '../student-portal-api.js';
import { StudentLayoutProvider } from './StudentLayoutContext.js';
import { StudentSidebar } from './StudentSidebar.js';
import { StudentNavbar } from './StudentNavbar.js';
import { StudentRouter } from '../routing/StudentRouter.js';

interface StudentLayoutInnerProps {
  pathname: string;
  session: AuthSession;
  api: StudentPortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function StudentLayoutInner({ pathname, session, api, onNavigate, onLogout }: StudentLayoutInnerProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-ttii-page-bg">
      <StudentSidebar pathname={pathname} session={session} onNavigate={onNavigate} />
      <div className="flex min-h-screen flex-1 flex-col transition-all duration-200">
        <StudentNavbar session={session} onNavigate={onNavigate} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto px-6 pb-4 pt-4">
          <StudentRouter pathname={pathname} api={api} session={session} onNavigate={onNavigate} />
        </main>
        <footer className="border-t border-gray-200 px-6 py-3 text-center text-xs text-gray-400">
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
    <StudentLayoutProvider>
      <StudentLayoutInner {...props} />
    </StudentLayoutProvider>
  );
}
