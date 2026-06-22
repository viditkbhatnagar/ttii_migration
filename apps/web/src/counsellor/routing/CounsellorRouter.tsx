import { Suspense, useMemo } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { resolveCounsellorRoute, type CounsellorPageProps } from './counsellor-routes.js';
import type { CounsellorPortalApi } from '../counsellor-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

function CounsellorPageSkeleton() {
  return <PageLoader />;
}

function CounsellorNotFoundPage({ pathname, onNavigate }: { pathname: string; onNavigate: (href: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-12 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Page Not Found</h2>
      <p className="text-sm text-cn-muted-fg">No counsellor page registered for: <code className="text-xs">{pathname}</code></p>
      <button
        type="button"
        className="rounded-xl bg-cn-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cn-orange/90"
        onClick={() => onNavigate('/counsellor/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

interface CounsellorRouterProps {
  pathname: string;
  api: CounsellorPortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export function CounsellorRouter({ pathname, api, session, onNavigate }: CounsellorRouterProps) {
  const route = useMemo(() => resolveCounsellorRoute(pathname), [pathname]);

  if (!route) {
    return <CounsellorNotFoundPage pathname={pathname} onNavigate={onNavigate} />;
  }

  const PageComponent = route.pageComponent;
  const pageProps: CounsellorPageProps = { api, session, onNavigate };

  return (
    <Suspense fallback={<CounsellorPageSkeleton />}>
      <div className="animate-in fade-in duration-200">
        <PageComponent {...pageProps} />
      </div>
    </Suspense>
  );
}
