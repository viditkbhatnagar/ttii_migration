import { Suspense, useMemo } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { resolveInstructorRoute, type InstructorPageProps } from './instructor-routes.js';
import type { InstructorPortalApi } from '../instructor-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

function InstructorPageSkeleton() {
  return <PageLoader />;
}

function InstructorNotFoundPage({ pathname, onNavigate }: { pathname: string; onNavigate: (href: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-12 text-center">
      <h2 className="text-lg font-semibold text-student-text">Page Not Found</h2>
      <p className="text-sm text-student-muted">No instructor page registered for: <code className="text-xs">{pathname}</code></p>
      <button
        type="button"
        className="rounded-xl bg-student-primary px-4 py-2 text-sm font-medium text-white hover:bg-student-primary/90 transition-colors"
        onClick={() => onNavigate('/instructor/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

interface InstructorRouterProps {
  pathname: string;
  api: InstructorPortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export function InstructorRouter({ pathname, api, session, onNavigate }: InstructorRouterProps) {
  const route = useMemo(() => resolveInstructorRoute(pathname), [pathname]);

  if (!route) {
    return <InstructorNotFoundPage pathname={pathname} onNavigate={onNavigate} />;
  }

  const PageComponent = route.pageComponent;
  const pageProps: InstructorPageProps = { api, session, onNavigate };

  return (
    <Suspense fallback={<InstructorPageSkeleton />}>
      <div className="animate-in fade-in duration-200">
        <PageComponent {...pageProps} />
      </div>
    </Suspense>
  );
}
