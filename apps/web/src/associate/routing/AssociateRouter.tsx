import { Suspense, useMemo } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { resolveAssociateRoute, type AssociatePageProps } from './associate-routes.js';
import type { CentrePortalApi } from '../../centre/centre-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

function AssociatePageSkeleton() {
  return <PageLoader />;
}

function AssociateNotFoundPage({ pathname, onNavigate }: { pathname: string; onNavigate: (href: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-12 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Page Not Found</h2>
      <p className="text-sm text-cn-muted-fg">No associate page registered for: <code className="text-xs">{pathname}</code></p>
      <button
        type="button"
        className="rounded-xl bg-cn-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cn-orange/90"
        onClick={() => onNavigate('/associate/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

interface AssociateRouterProps {
  pathname: string;
  api: CentrePortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export function AssociateRouter({ pathname, api, session, onNavigate }: AssociateRouterProps) {
  const route = useMemo(() => resolveAssociateRoute(pathname), [pathname]);

  if (!route) {
    return <AssociateNotFoundPage pathname={pathname} onNavigate={onNavigate} />;
  }

  const PageComponent = route.pageComponent;
  const pageProps: AssociatePageProps = { api, session, onNavigate };

  return (
    <Suspense fallback={<AssociatePageSkeleton />}>
      <div className="animate-in fade-in duration-200">
        <PageComponent {...pageProps} />
      </div>
    </Suspense>
  );
}
