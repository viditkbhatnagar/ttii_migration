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

import { detectPortalFromSubdomain, getSubdomainRedirectPath } from './lib/subdomain.js';
import { AdminPortal, normalizeAdminPath } from './admin/admin-portal.js';
import { AdminPortalApi } from './admin/admin-portal-api.js';
import { CentrePortal, normalizeCentrePath } from './centre/centre-portal.js';
import { CentrePortalApi } from './centre/centre-portal-api.js';
import { StudentPortal, normalizeStudentPath } from './student/student-portal.js';
import { StudentPortalApi } from './student/student-portal-api.js';
import ForgotPasswordFlow from './auth/ForgotPasswordFlow.js';

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

  // In production (single-service deploy), derive from current origin.
  // In dev, set VITE_API_BASE_URL=http://localhost:4000/api in .env
  return `${window.location.origin}/api`;
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
      <section className="border-l-4 border-teal-600 px-3.5 py-2.5 bg-teal-50/80 rounded-r-xl leading-relaxed text-gray-700">
        <p>{content.intro}</p>
      </section>

      <section className="grid grid-cols-3 gap-3 max-md:grid-cols-2 max-sm:grid-cols-1" aria-label="Shell metrics">
        {content.metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} tone={metric.tone} />
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
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
// test comment
  if (guardStatus === 'unauthenticated') {
    return (
      <InlineNotice tone="warning" title="Login required">
        <p>{guardMessage}</p>
        <button
          type="button"
          className="border-0 rounded-xl px-4 py-2.5 bg-teal-700 text-white font-bold cursor-pointer hover:-translate-y-px transition-transform"
          onClick={() => navigateTo('/')}
        >
          Go to login
        </button>
      </InlineNotice>
    );
  }

  if (guardStatus === 'forbidden') {
    return (
      <InlineNotice tone="danger" title="Access denied">
        <p>{guardMessage}</p>
        <button
          type="button"
          className="border-0 rounded-xl px-4 py-2.5 bg-teal-700 text-white font-bold cursor-pointer hover:-translate-y-px transition-transform"
          onClick={() => navigateTo(resolveShellPathForRole(session?.roleId ?? 2))}
        >
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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

  /* If already logged in, show a quick redirect card */
  if (session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="size-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Session Active</h2>
          <p className="mt-2 text-sm text-gray-500">Logged in as role <strong>{session.roleId}</strong></p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-[#5b7fea] to-[#6c63ff] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition-transform"
              onClick={() => navigateTo(resolveShellPathForRole(session.roleId))}
            >
              Open Portal
            </button>
            <button
              type="button"
              className="rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:-translate-y-0.5 transition-transform"
              onClick={() => { void logout(); }}
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1a2e] p-4 animate-[shellEnter_360ms_ease]" style={{ fontFamily: "'Inter', 'Manrope', system-ui, -apple-system, sans-serif" }}>
      <div className="flex w-full max-w-[900px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.20)] lg:flex-row" style={{ minHeight: '552px' }}>
        {/* ── Left Panel: Gradient Hero ──────────────────────────────────── */}
        <div
          className="relative overflow-hidden p-8 lg:w-1/2 lg:p-10 flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, #3B5BBE 0%, #5263BF 20%, #8B6BAA 45%, #C4714E 70%, #E8864E 85%, #E87932 100%)',
            minHeight: '280px',
          }}
        >
          {/* Logo — full white version on gradient background */}
          <div className="relative z-10">
            <img
              src="/logos/ttii-full-white.svg"
              alt="Teachers' Training Institute of India"
              className="h-12 w-auto"
            />
          </div>

          {/* Tagline */}
          <h1 className="relative z-10 mt-12 font-bold leading-tight text-white lg:mt-0" style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', letterSpacing: '-0.5px' }}>
            Become a<br />Future-Ready<br />Teacher Today.
          </h1>

          {/* Sparkle decorations (4-pointed stars) */}
          <svg className="absolute pointer-events-none" style={{ top: '55%', left: '18%', width: '55px', height: '55px', opacity: 0.3 }} viewBox="0 0 50 50" fill="none">
            <path d="M25 0 Q26 18 25 25 Q24 32 25 50 Q26 32 25 25 Q32 24 50 25 Q32 26 25 25 Q18 24 0 25 Q18 26 25 25 Q26 18 25 0Z" fill="#FFFFFF" />
          </svg>
          <svg className="absolute pointer-events-none" style={{ bottom: '14%', left: '38%', width: '90px', height: '90px', opacity: 0.32 }} viewBox="0 0 50 50" fill="none">
            <path d="M25 0 Q26 18 25 25 Q24 32 25 50 Q26 32 25 25 Q32 24 50 25 Q32 26 25 25 Q18 24 0 25 Q18 26 25 25 Q26 18 25 0Z" fill="#FFFFFF" />
          </svg>
          <svg className="absolute pointer-events-none" style={{ top: '32%', right: '14%', width: '38px', height: '38px', opacity: 0.28 }} viewBox="0 0 50 50" fill="none">
            <path d="M25 0 Q26 18 25 25 Q24 32 25 50 Q26 32 25 25 Q32 24 50 25 Q32 26 25 25 Q18 24 0 25 Q18 26 25 25 Q26 18 25 0Z" fill="#FFFFFF" />
          </svg>
          <svg className="absolute pointer-events-none" style={{ bottom: '38%', right: '22%', width: '45px', height: '45px', opacity: 0.25 }} viewBox="0 0 50 50" fill="none">
            <path d="M25 0 Q26 18 25 25 Q24 32 25 50 Q26 32 25 25 Q32 24 50 25 Q32 26 25 25 Q18 24 0 25 Q18 26 25 25 Q26 18 25 0Z" fill="#FFFFFF" />
          </svg>
        </div>

        {/* ── Right Panel: Login Form ─────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center bg-white px-8 py-10 lg:w-1/2 lg:px-12">
          <div className="w-full max-w-sm">
            {/* Heading */}
            <div className="mb-8 text-center">
              <h2 className="font-extrabold text-[#111111]" style={{ fontSize: '40px', lineHeight: '1.1', letterSpacing: '-0.5px' }}>Welcome</h2>
              <p className="mt-2.5 text-sm text-[#666666]">Enter Your LMS Credentials To Continue.</p>
            </div>

          {/* Error messages */}
          {error ? (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <p>{error.message}</p>
              <button type="button" className="mt-1 text-xs font-semibold text-red-600 underline" onClick={clearError}>Dismiss</button>
            </div>
          ) : null}

          {loginError ? (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {loginError}
            </div>
          ) : null}

          {/* Form */}
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-semibold text-gray-800">Email Address</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  id="login-email"
                  name="email"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter Your Mail"
                  autoComplete="username"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-semibold text-gray-800">Password</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter Your Password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-1.5">
              <label htmlFor="login-role" className="text-sm font-semibold text-gray-800">Login As</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <select
                  id="login-role"
                  value={roleId}
                  onChange={(event) => setRoleId(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                >
                  <option value="1">Super Admin</option>
                  <option value="2">Student</option>
                  <option value="3">Instructor</option>
                  <option value="4">Team Lead</option>
                  <option value="7">Centre</option>
                  <option value="8">Sub Admin</option>
                  <option value="9">Counsellor</option>
                  <option value="10">Associate</option>
                </select>
                <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </div>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Remember Me</span>
              </label>
              <button
                type="button"
                className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors"
                onClick={() => navigateTo('/forgot-password')}
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full h-12 rounded-full text-white font-semibold tracking-wide border-none transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              style={{
                background: 'linear-gradient(90deg, #6B8FEF 0%, #4A6EDB 100%)',
                boxShadow: '0 8px 24px rgba(74, 110, 219, 0.40)',
                fontSize: '15px',
                letterSpacing: '0.02em',
              }}
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Need Help */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#666666]">Need Help?</p>
            <p className="text-sm font-bold text-[#222222] mt-1">Contact Support</p>
            <a href="mailto:support@teachersindia.in" className="text-sm text-[#666666] hover:text-[#4B6EDB]">support@teachersindia.in</a>
          </div>
          </div>
        </div>
      </div>
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
  const subdomainPortal = useMemo(() => detectPortalFromSubdomain(), []);
  const { authApi } = useAuthState();

  // On subdomain, redirect root or wrong-portal paths to the correct portal
  useEffect(() => {
    if (!subdomainPortal) return;
    const redirect = getSubdomainRedirectPath(subdomainPortal, pathname);
    if (redirect) {
      navigateTo(redirect);
    }
  }, [subdomainPortal, pathname]);

  // Forgot Password flow
  if (pathname === '/forgot-password') {
    return <ForgotPasswordFlow authApi={authApi} onBackToLogin={() => navigateTo('/')} />;
  }

  if (pathname === '/' && !subdomainPortal) {
    return <LoginHome />;
  }

  // Still loading redirect on subdomain
  if (pathname === '/' && subdomainPortal) {
    return null;
  }

  const route = findPortalRoute(pathname);
  if (!route) {
    return (
      <main className="w-[min(900px,calc(100%-2rem))] mx-auto py-9 pb-14 grid gap-5">
        <InlineNotice tone="warning" title="Unknown route">
          <p>No role shell is registered for: {pathname}</p>
          <button
            type="button"
            className="border-0 rounded-xl px-4 py-2.5 bg-teal-700 text-white font-bold cursor-pointer hover:-translate-y-px transition-transform"
            onClick={() => navigateTo('/')}
          >
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
