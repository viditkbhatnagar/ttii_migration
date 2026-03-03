import { Suspense, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveStudentRoute, type StudentPageProps } from './student-routes.js';
import type { StudentPortalApi } from '../student-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

function StudentPageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function StudentNotFoundPage({ pathname, onNavigate }: { pathname: string; onNavigate: (href: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <h2 className="text-lg font-semibold text-gray-900">Page Not Found</h2>
      <p className="text-sm text-gray-500">No student page registered for: <code className="text-xs">{pathname}</code></p>
      <button
        type="button"
        className="rounded-md bg-ttii-primary px-4 py-2 text-sm font-medium text-white hover:bg-ttii-primary/90"
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
      <PageComponent {...pageProps} />
    </Suspense>
  );
}
