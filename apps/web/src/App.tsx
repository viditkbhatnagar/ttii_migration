import {
  AppErrorBoundary,
  AuthProvider,
  LegacyApiClient,
  LegacyAuthApi,
  ROLE_ROUTES,
  findRoleRoute,
  loadRoleShellAccess,
  normalizePathname,
  resolveShellPathForRole,
  useAuthState,
  type AuthApi,
  type RoleRouteDefinition,
} from '@ttii/frontend-core';
import type { PortalSurface } from '@ttii/shared-types';
import { InlineNotice, MetricCard, PortalScaffold, ShellCard } from '@ttii/ui';
import { useEffect, useMemo, useState } from 'react';

import { AdminPortal, normalizeAdminPath } from './admin/admin-portal.js';
import { AdminPortalApi } from './admin/admin-portal-api.js';
import { CentrePortal, normalizeCentrePath } from './centre/centre-portal.js';
import { CentrePortalApi } from './centre/centre-portal-api.js';
import { StudentPortal, normalizeStudentPath } from './student/student-portal.js';
import { StudentPortalApi } from './student/student-portal-api.js';

interface ShellMetric {
  label: string;
  value: string;
  detail: string;
  tone: 'neutral' | 'info' | 'success' | 'warning';
}

interface ShellCopy {
  roleLabel: string;
  title: string;
  subtitle: string;
  intro: string;
  focusAreas: readonly string[];
  metrics: readonly ShellMetric[];
}

const shellCopyMap: Record<Exclude<PortalSurface, 'student'>, ShellCopy> = {
  centre: {
    roleLabel: 'Centre App',
    title: 'Centre Dashboard',
    subtitle: 'Manage your centre operations',
    intro: 'Access cohort management, learner tracking, resources, wallet, and support from your centre dashboard.',
    focusAreas: [
      'Manage cohorts and enrolled learners.',
      'Track funding requests and wallet transactions.',
      'Access training videos and shared resources.',
    ],
    metrics: [
      {
        label: 'Sections',
        value: '9',
        detail: 'Dashboard, applications, students, courses, cohorts, live classes, resources, wallet, support.',
        tone: 'success',
      },
      {
        label: 'API client',
        value: '1',
        detail: 'Single API client contract across all portals.',
        tone: 'info',
      },
      {
        label: 'Access',
        value: 'Active',
        detail: 'Role-gated centre portal.',
        tone: 'neutral',
      },
    ],
  },
  admin: {
    roleLabel: 'Admin App',
    title: 'Admin Dashboard',
    subtitle: 'Platform administration and management',
    intro: 'Manage users, content, assessments, reports, and system settings from the admin dashboard.',
    focusAreas: [
      'User and application management across all roles.',
      'Content and assessment administration.',
      'System settings and reporting.',
    ],
    metrics: [
      {
        label: 'Sections',
        value: '6',
        detail: 'Dashboard, users, content, assessments, reports, settings.',
        tone: 'success',
      },
      {
        label: 'Roles managed',
        value: '3',
        detail: 'Admin, centre, and student roles.',
        tone: 'info',
      },
      {
        label: 'Access',
        value: 'Active',
        detail: 'Role-gated admin portal.',
        tone: 'neutral',
      },
    ],
  },
};

function usePathname(initialPath: string): string {
  const [pathname, setPathname] = useState(() => {
    if (typeof window === 'undefined') {
      return normalizePathname(initialPath);
    }

    return normalizePathname(window.location.pathname);
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const onPopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return pathname;
}

function navigateTo(pathname: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedPath = normalizePathname(pathname);
  if (window.location.pathname === normalizedPath) {
    return;
  }

  window.history.pushState({}, '', normalizedPath);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function resolveApiBaseUrl(): string {
  const value: unknown = import.meta.env.VITE_API_BASE_URL;
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  return 'http://localhost:4000/api';
}

function createDefaultAuthApi(baseUrl = resolveApiBaseUrl()): AuthApi {
  return new LegacyAuthApi(
    new LegacyApiClient({
      baseUrl,
    }),
  );
}

function createDefaultStudentPortalApi(baseUrl = resolveApiBaseUrl()): StudentPortalApi {
  return new StudentPortalApi(
    new LegacyApiClient({
      baseUrl,
    }),
  );
}

function createDefaultCentrePortalApi(baseUrl = resolveApiBaseUrl()): CentrePortalApi {
  return new CentrePortalApi(
    new LegacyApiClient({
      baseUrl,
    }),
  );
}

function createDefaultAdminPortalApi(baseUrl = resolveApiBaseUrl()): AdminPortalApi {
  return new AdminPortalApi(
    new LegacyApiClient({
      baseUrl,
    }),
  );
}

interface RoleShellRouteProps {
  route: RoleRouteDefinition;
  pathname: string;
  studentPortalApi: StudentPortalApi;
  centrePortalApi: CentrePortalApi;
  adminPortalApi: AdminPortalApi;
}

function RoleShellOverview({ route, pathname, guardStatus }: { route: RoleRouteDefinition; pathname: string; guardStatus: string }) {
  const content = shellCopyMap[route.surface as Exclude<PortalSurface, 'student'>];

  return (
    <PortalScaffold
      roleLabel={content.roleLabel}
      title={content.title}
      subtitle={content.subtitle}
      navItems={ROLE_ROUTES.map((item) => ({
        id: item.surface,
        label: item.label,
        href: item.path,
      }))}
      activeHref={pathname}
      onNavigate={navigateTo}
    >
      <section className="portal-intro">
        <p>{content.intro}</p>
      </section>

      <section className="metrics-grid" aria-label="Shell metrics">
        {content.metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} tone={metric.tone} />
        ))}
      </section>

      <section className="shell-cards-grid">
        <ShellCard title="Architecture anchors" subtitle="Reusable pieces shared across student, centre, and admin surfaces.">
          <ul>
            {content.focusAreas.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Guard telemetry" subtitle="Current route state resolved from new API auth endpoints." theme="dark">
          <ul>
            <li>Path: {pathname}</li>
            <li>Guard: {guardStatus}</li>
            <li>
              Source: /api/auth/me + /api/auth/portal/
              {route.surface}
            </li>
          </ul>
        </ShellCard>
      </section>
    </PortalScaffold>
  );
}

function RoleShellRoute({ route, pathname, studentPortalApi, centrePortalApi, adminPortalApi }: RoleShellRouteProps) {
  const { authApi, phase, session, logout } = useAuthState();
  const [guardStatus, setGuardStatus] = useState<'checking' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>(
    'checking',
  );
  const [guardMessage, setGuardMessage] = useState('Checking role guard with API auth.');

  useEffect(() => {
    if (phase === 'bootstrapping') {
      setGuardStatus('checking');
      setGuardMessage('Restoring session from persisted auth state.');
      return;
    }

    let disposed = false;

    const runGuardCheck = async (): Promise<void> => {
      const result = await loadRoleShellAccess({
        requiredSurface: route.surface,
        session,
        authApi,
      });

      if (disposed) {
        return;
      }

      setGuardStatus(result.status);
      setGuardMessage(result.message);
    };

    void runGuardCheck();

    return () => {
      disposed = true;
    };
  }, [authApi, phase, route.surface, session]);

  useEffect(() => {
    if (guardStatus !== 'ready') {
      return;
    }

    const normalizedPath = route.surface === 'student'
      ? normalizeStudentPath(pathname)
      : route.surface === 'centre'
        ? normalizeCentrePath(pathname)
        : normalizeAdminPath(pathname);
    if (normalizedPath !== pathname) {
      navigateTo(normalizedPath);
    }
  }, [guardStatus, pathname, route.surface]);

  if (guardStatus === 'checking') {
    return (
      <InlineNotice tone="info" title="Route guard in progress">
        {guardMessage}
      </InlineNotice>
    );
  }

  if (guardStatus === 'unauthenticated') {
    return (
      <InlineNotice tone="warning" title="Login required">
        <p>{guardMessage}</p>
        <button type="button" className="action-button" onClick={() => navigateTo('/')}>
          Go to login
        </button>
      </InlineNotice>
    );
  }

  if (guardStatus === 'forbidden') {
    return (
      <InlineNotice tone="danger" title="Access denied">
        <p>{guardMessage}</p>
        <button type="button" className="action-button" onClick={() => navigateTo(resolveShellPathForRole(session?.roleId ?? 2))}>
          Open my allowed shell
        </button>
      </InlineNotice>
    );
  }

  if (guardStatus === 'error') {
    return (
      <InlineNotice tone="danger" title="Route guard failed">
        {guardMessage}
      </InlineNotice>
    );
  }

  if (route.surface === 'student') {
    if (!session) {
      return (
        <InlineNotice tone="warning" title="Session missing">
          Student portal requires an active session.
        </InlineNotice>
      );
    }

    return (
      <StudentPortal
        pathname={pathname}
        session={session}
        api={studentPortalApi}
        onNavigate={navigateTo}
        onLogout={() => {
          void logout();
          navigateTo('/');
        }}
      />
    );
  }

  if (route.surface === 'centre') {
    if (!session) {
      return (
        <InlineNotice tone="warning" title="Session missing">
          Centre portal requires an active session.
        </InlineNotice>
      );
    }

    return (
      <CentrePortal
        pathname={pathname}
        session={session}
        api={centrePortalApi}
        onNavigate={navigateTo}
        onLogout={() => {
          void logout();
          navigateTo('/');
        }}
      />
    );
  }

  if (!session) {
    return (
      <InlineNotice tone="warning" title="Session missing">
        Admin portal requires an active session.
      </InlineNotice>
    );
  }

  if (route.surface === 'admin') {
    return (
      <AdminPortal
        pathname={pathname}
        session={session}
        api={adminPortalApi}
        onNavigate={navigateTo}
        onLogout={() => {
          void logout();
          navigateTo('/');
        }}
      />
    );
  }

  return <RoleShellOverview route={route} pathname={pathname} guardStatus={guardStatus} />;
}

function LoginHome() {
  const { error, clearError, login, logout, session } = useAuthState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('2');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setLoginError(null);

    try {
      const parsedRoleId = Number.parseInt(roleId, 10);
      const loginInput = {
        email,
        password,
        ...(Number.isFinite(parsedRoleId) ? { roleId: parsedRoleId } : {}),
      };
      const nextSession = await login(loginInput);

      navigateTo(resolveShellPathForRole(nextSession.roleId));
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to login with provided credentials.';
      setLoginError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="landing-shell">
      <header>
        <p className="eyebrow">TTII</p>
        <h1>Welcome to TTII</h1>
        <p className="lead-copy">
          Sign in to access your student, centre, or admin portal.
        </p>
      </header>

      {error ? (
        <InlineNotice tone="danger" title="Auth state warning">
          <p>{error.message}</p>
          <button type="button" className="action-button action-button--small" onClick={clearError}>
            Dismiss
          </button>
        </InlineNotice>
      ) : null}

      {session ? (
        <InlineNotice tone="success" title="Session active">
          <p>
            Logged in as role <strong>{session.roleId}</strong>. Continue to your guarded portal.
          </p>
          <div className="inline-actions">
            <button
              type="button"
              className="action-button action-button--small"
              onClick={() => navigateTo(resolveShellPathForRole(session.roleId))}
            >
              Open portal
            </button>
            <button
              type="button"
              className="action-button action-button--small action-button--ghost"
              onClick={() => {
                void logout();
              }}
            >
              Logout
            </button>
          </div>
        </InlineNotice>
      ) : null}

      {loginError ? (
        <InlineNotice tone="warning" title="Login failed">
          {loginError}
        </InlineNotice>
      ) : null}

      <section className="login-card" aria-label="Legacy auth bridge login">
        <h2>Sign in</h2>
        <p>Enter your credentials to access your portal.</p>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <label>
            Email or username
            <input
              name="email"
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@example.test"
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <label>
            Requested role
            <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
              <option value="2">Student (role_id 2)</option>
              <option value="7">Centre (role_id 7)</option>
              <option value="1">Admin (role_id 1)</option>
            </select>
          </label>

          <button type="submit" className="action-button" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in and open portal'}
          </button>
        </form>
      </section>
    </main>
  );
}

function findPortalRoute(pathname: string): RoleRouteDefinition | undefined {
  const normalizedPath = normalizePathname(pathname);
  const directRoute = findRoleRoute(normalizedPath);

  if (directRoute) {
    return directRoute;
  }

  return ROLE_ROUTES.find((route) => normalizedPath.startsWith(`${route.path}/`));
}

function PortalRouter({
  initialPath,
  studentPortalApi,
  centrePortalApi,
  adminPortalApi,
}: {
  initialPath: string;
  studentPortalApi: StudentPortalApi;
  centrePortalApi: CentrePortalApi;
  adminPortalApi: AdminPortalApi;
}) {
  const pathname = usePathname(initialPath);

  if (pathname === '/') {
    return <LoginHome />;
  }

  const route = findPortalRoute(pathname);
  if (!route) {
    return (
      <main className="landing-shell">
        <InlineNotice tone="warning" title="Unknown route">
          <p>No role shell is registered for: {pathname}</p>
          <button type="button" className="action-button" onClick={() => navigateTo('/')}>
            Go to login
          </button>
        </InlineNotice>
      </main>
    );
  }

  return (
    <RoleShellRoute
      route={route}
      pathname={pathname}
      studentPortalApi={studentPortalApi}
      centrePortalApi={centrePortalApi}
      adminPortalApi={adminPortalApi}
    />
  );
}

export interface AppProps {
  initialPath?: string;
  authApi?: AuthApi;
  studentPortalApi?: StudentPortalApi;
  centrePortalApi?: CentrePortalApi;
  adminPortalApi?: AdminPortalApi;
}

export default function App({ initialPath = '/', authApi, studentPortalApi, centrePortalApi, adminPortalApi }: AppProps) {
  const resolvedAuthApi = useMemo(() => authApi ?? createDefaultAuthApi(), [authApi]);
  const resolvedStudentPortalApi = useMemo(
    () => studentPortalApi ?? createDefaultStudentPortalApi(),
    [studentPortalApi],
  );
  const resolvedCentrePortalApi = useMemo(
    () => centrePortalApi ?? createDefaultCentrePortalApi(),
    [centrePortalApi],
  );
  const resolvedAdminPortalApi = useMemo(
    () => adminPortalApi ?? createDefaultAdminPortalApi(),
    [adminPortalApi],
  );

  return (
    <AppErrorBoundary>
      <AuthProvider authApi={resolvedAuthApi}>
        <PortalRouter
          initialPath={initialPath}
          studentPortalApi={resolvedStudentPortalApi}
          centrePortalApi={resolvedCentrePortalApi}
          adminPortalApi={resolvedAdminPortalApi}
        />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
