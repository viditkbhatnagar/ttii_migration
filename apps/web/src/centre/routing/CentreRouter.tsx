import { lazy, Suspense, useMemo } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { resolveCentreRoute, type CentrePageProps } from './centre-routes.js';
import type { CentrePortalApi } from '../centre-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

const AssociateDashboardPage = lazy(() => import('../pages/dashboard/AssociateDashboardPage.js'));

function CentrePageSkeleton() {
  return <PageLoader />;
}

function CentreNotFoundPage({ pathname, onNavigate }: { pathname: string; onNavigate: (href: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <h2 className="text-lg font-semibold text-gray-900">Page Not Found</h2>
      <p className="text-sm text-gray-500">No centre page registered for: <code className="text-xs">{pathname}</code></p>
      <button
        type="button"
        className="rounded-md bg-ttii-primary px-4 py-2 text-sm font-medium text-white hover:bg-ttii-primary/90"
        onClick={() => onNavigate('/centre/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

interface CentreRouterProps {
  pathname: string;
  api: CentrePortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export function CentreRouter({ pathname, api, session, onNavigate }: CentreRouterProps) {
  const route = useMemo(() => resolveCentreRoute(pathname), [pathname]);

  if (!route) {
    return <CentreNotFoundPage pathname={pathname} onNavigate={onNavigate} />;
  }

  const isAssociateDashboard = session.roleId === 10 && route.title === 'Dashboard';
  const PageComponent = isAssociateDashboard ? AssociateDashboardPage : route.pageComponent;
  const pageProps: CentrePageProps = { api, session, onNavigate };

  return (
    <Suspense fallback={<CentrePageSkeleton />}>
      <PageComponent {...pageProps} />
    </Suspense>
  );
}
