import { Suspense, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveStudentRoute, type StudentPageProps } from './student-routes.js';
import type { StudentPortalApi } from '../student-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

function StudentPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <Skeleton className="h-4 w-72 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
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
