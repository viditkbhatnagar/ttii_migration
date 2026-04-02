import { Suspense, useMemo } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { resolveStudentRoute, type StudentPageProps } from './student-routes.js';
import type { StudentPortalApi } from '../student-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

function StudentPageSkeleton() {
  return <PageLoader />;
}

function StudentNotFoundPage({ pathname, onNavigate }: { pathname: string; onNavigate: (href: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-12 text-center">
      <h2 className="text-lg font-semibold text-student-text">Page Not Found</h2>
      <p className="text-sm text-student-muted">No student page registered for: <code className="text-xs">{pathname}</code></p>
      <button
        type="button"
        className="rounded-xl bg-student-primary px-4 py-2 text-sm font-medium text-white hover:bg-student-primary/90 transition-colors"
        onClick={() => onNavigate('/student/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

interface StudentRouterProps {
  pathname: string;
  api: StudentPortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export function StudentRouter({ pathname, api, session, onNavigate }: StudentRouterProps) {
  const route = useMemo(() => resolveStudentRoute(pathname), [pathname]);

  if (!route) {
    return <StudentNotFoundPage pathname={pathname} onNavigate={onNavigate} />;
  }

  const PageComponent = route.pageComponent;
  const pageProps: StudentPageProps = { api, session, onNavigate };

  return (
    <Suspense fallback={<StudentPageSkeleton />}>
      <div className="animate-in fade-in duration-200">
        <PageComponent {...pageProps} />
      </div>
    </Suspense>
  );
}
