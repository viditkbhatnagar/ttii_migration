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
import { InlineNotice, MetricCard, PortalScaffold, ShellCard } from '@ttii/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ConfirmDialogProvider } from '@/components/confirm-dialog';

import { detectPortalFromSubdomain, getSubdomainRedirectPath } from './lib/subdomain.js';
import { AdminPortal, normalizeAdminPath } from './admin/admin-portal.js';
import { AdminPortalApi } from './admin/admin-portal-api.js';
import { CentrePortal, normalizeCentrePath } from './centre/centre-portal.js';
import { CentrePortalApi } from './centre/centre-portal-api.js';
import { InstructorPortal, normalizeInstructorPath } from './instructor/instructor-portal.js';
import { InstructorPortalApi } from './instructor/instructor-portal-api.js';
import { CounsellorPortal, normalizeCounsellorPath } from './counsellor/counsellor-portal.js';
import { CounsellorPortalApi } from './counsellor/counsellor-portal-api.js';
import { StudentPortal, normalizeStudentPath } from './student/student-portal.js';
import { StudentPortalApi } from './student/student-portal-api.js';
import ForgotPasswordFlow from './auth/ForgotPasswordFlow.js';
import { SsoButtons } from './auth/SsoButtons.js';
import { SsoCompleteProfileModal } from './auth/SsoCompleteProfileModal.js';
import PublicApplyPage from './public/PublicApplyPage.js';

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

const shellCopyMap: Record<'admin' | 'centre', ShellCopy> = {
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
  // SSR/test safety: when window is unavailable, fall back to a placeholder
  // that will be overridden on the client's first real render.
  if (typeof window === 'undefined') return '/api';
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

function createDefaultInstructorPortalApi(baseUrl = resolveApiBaseUrl()): InstructorPortalApi {
  return new InstructorPortalApi(
    new LegacyApiClient({
      baseUrl,
    }),
  );
}

function createDefaultCounsellorPortalApi(baseUrl = resolveApiBaseUrl()): CounsellorPortalApi {
  return new CounsellorPortalApi(
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
  instructorPortalApi: InstructorPortalApi;
  counsellorPortalApi: CounsellorPortalApi;
}

function RoleShellOverview({ route, pathname, guardStatus }: { route: RoleRouteDefinition; pathname: string; guardStatus: string }) {
  const content = shellCopyMap[route.surface as 'admin' | 'centre'];

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

function RoleShellRoute({ route, pathname, studentPortalApi, centrePortalApi, adminPortalApi, instructorPortalApi, counsellorPortalApi }: RoleShellRouteProps) {
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
        : route.surface === 'instructor'
          ? normalizeInstructorPath(pathname)
          : route.surface === 'counsellor'
            ? normalizeCounsellorPath(pathname)
            : normalizeAdminPath(pathname);
    if (normalizedPath !== pathname) {
      navigateTo(normalizedPath);
    }
  }, [guardStatus, pathname, route.surface]);

  // Auto-redirect to the login landing when the guard determines the user
  // is signed out (Naji 2026-04-30 — force-refresh + logout was leaving the
  // URL on the protected page with the "Login required" notice instead of
  // sending the user to /). Skip when we're already on '/' so we don't
  // ping-pong; phase must be 'ready' so we don't redirect during the
  // initial bootstrap before the session has been loaded.
  useEffect(() => {
    if (phase !== 'ready') return;
    if (guardStatus !== 'unauthenticated') return;
    if (pathname === '/' || pathname === '/forgot-password') return;
    navigateTo('/');
  }, [guardStatus, pathname, phase]);

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

  if (route.surface === 'instructor') {
    if (!session) {
      return (
        <InlineNotice tone="warning" title="Session missing">
          Instructor portal requires an active session.
        </InlineNotice>
      );
    }

    return (
      <InstructorPortal
        pathname={pathname}
        session={session}
        api={instructorPortalApi}
        onNavigate={navigateTo}
        onLogout={() => {
          void logout();
          navigateTo('/');
        }}
      />
    );
  }

  if (route.surface === 'counsellor') {
    if (!session) {
      return (
        <InlineNotice tone="warning" title="Session missing">
          Counsellor portal requires an active session.
        </InlineNotice>
      );
    }

    return (
      <CounsellorPortal
        pathname={pathname}
        session={session}
        api={counsellorPortalApi}
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

const SUBDOMAIN_DEFAULT_ROLE_ID: Record<string, string> = {
  admin: '1',       // Super Admin
  student: '2',     // Student (already default)
  centre: '4',      // Centre
};

// Roles a given subdomain is allowed to log in as. Drives the Login As
// dropdown — when only one option matches, the dropdown is hidden because
// the subdomain already determines the role.
//
// Instructor (role 3) logs in via admin.teachersindia.in but lands on
// /instructor (see resolveShellPathForRole). Including them here lifts
// the "This account is not allowed on this portal" gate that previously
// blocked faculty logins. Naji 2026-05-04.
const SUBDOMAIN_ROLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  admin: [
    { value: '1', label: 'Super Admin' },
    { value: '3', label: 'Instructor' },
    { value: '8', label: 'Sub Admin' },
    { value: '9', label: 'Counsellor' },
  ],
  student: [{ value: '2', label: 'Student' }],
  // Naji UAT 2026-05-15 — Centre portal login was blocking every
  // Centre owner with "This account is not allowed on this portal"
  // because this allowlist had role 4 (Team Lead) instead of 7
  // (Centre). The four existing centres (Hanahadhi, upCarrera, TTC
  // Bepur, new centre) all have proper users rows with role_id=7 and
  // passwords; the only reason they couldn't sign in was this list.
  // Backend CENTRE_PORTAL_ROLES was already [7, 10] — only the frontend
  // candidate filter was wrong.
  centre: [
    { value: '7', label: 'Centre' },
    { value: '10', label: 'Associate' },
  ],
};

const ALL_ROLE_OPTIONS = [
  { value: '1', label: 'Super Admin' },
  { value: '2', label: 'Student' },
  { value: '3', label: 'Instructor' },
  { value: '4', label: 'Team Lead' },
  { value: '7', label: 'Centre' },
  { value: '8', label: 'Sub Admin' },
  { value: '9', label: 'Counsellor' },
  { value: '10', label: 'Associate' },
];

function LoginHome({ studentPortalApi }: { studentPortalApi: StudentPortalApi }) {
  const { authApi, error, clearError, login, applyExternalSession, logout, session } = useAuthState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const portal = useMemo(() => detectPortalFromSubdomain(), []);
  const isStudentPortal = portal === 'student';
  const roleOptions = useMemo(() => {
    if (portal && SUBDOMAIN_ROLE_OPTIONS[portal]) return SUBDOMAIN_ROLE_OPTIONS[portal];
    return ALL_ROLE_OPTIONS;
  }, [portal]);
  // Subdomain default role used by the Forgot Password link (the upfront
  // Login As dropdown is gone, so this is the only consumer left).
  const _defaultRole = portal && SUBDOMAIN_ROLE_OPTIONS[portal]?.[0]
    ? SUBDOMAIN_ROLE_OPTIONS[portal][0].value
    : portal ? (SUBDOMAIN_DEFAULT_ROLE_ID[portal] ?? '2') : '2';
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  type PendingCandidate = { user_id: number; role_id: number; label: string; sublabel: string };
  const [pendingCandidates, setPendingCandidates] = useState<PendingCandidate[] | null>(null);
  // After SSO login, optionally show the "complete your profile" modal
  // when the student's phone is missing. Naji 2026-05-06.
  const [profileCompletionSession, setProfileCompletionSession] = useState<{ token: string; userId: string; roleId: number } | null>(null);

  // Microsoft auth-code redirect-back handler. The /api/auth/sso/microsoft/callback
  // route 302s here with auth_token + user_id + role_id (+ requires_profile=1).
  // We capture the params, persist the session, clean the URL, and either
  // show the profile-completion modal or route straight to the dashboard.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('auth_token');
    const userId = params.get('user_id');
    const roleIdRaw = params.get('role_id');
    const ssoErr = params.get('sso_error');
    if (ssoErr) {
      setLoginError(ssoErr);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    if (!authToken || !userId || !roleIdRaw) return;
    const roleId = Number.parseInt(roleIdRaw, 10);
    if (!Number.isFinite(roleId)) return;
    const requiresProfile = params.get('requires_profile') === '1';
    const incomingSession = { token: authToken, userId, roleId };
    applyExternalSession(incomingSession);
    window.history.replaceState({}, '', window.location.pathname);
    if (requiresProfile) {
      setProfileCompletionSession(incomingSession);
    } else {
      navigateTo(resolveShellPathForRole(roleId));
    }
  }, [applyExternalSession]);

  const handleGoogleSsoSuccess = useCallback(
    (incomingSession: { token: string; userId: string; roleId: number }, requiresProfileCompletion: boolean) => {
      setLoginError(null);
      applyExternalSession(incomingSession);
      if (requiresProfileCompletion) {
        setProfileCompletionSession(incomingSession);
      } else {
        navigateTo(resolveShellPathForRole(incomingSession.roleId));
      }
    },
    [applyExternalSession],
  );

  const handleProfileCompletionDone = useCallback(() => {
    if (!profileCompletionSession) return;
    const next = profileCompletionSession;
    setProfileCompletionSession(null);
    navigateTo(resolveShellPathForRole(next.roleId));
  }, [profileCompletionSession]);

  const allowedRoleValues = useMemo(() => new Set(roleOptions.map((o) => o.value)), [roleOptions]);
  const roleLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of ALL_ROLE_OPTIONS) map.set(o.value, o.label);
    return map;
  }, []);

  const finalizeLogin = useCallback(async (chosenRoleId: number, chosenUserId?: number) => {
    const loginInput = {
      email,
      password,
      ...(Number.isFinite(chosenRoleId) ? { roleId: chosenRoleId } : {}),
      ...(typeof chosenUserId === 'number' ? { userId: chosenUserId } : {}),
    };
    const nextSession = await login(loginInput);
    navigateTo(resolveShellPathForRole(nextSession.roleId));
  }, [email, password, login]);

  const onSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setLoginError(null);
    setPendingCandidates(null);

    try {
      // Resolve all user records the email + password match. Scope to the
      // subdomain's allowed roles. Then either log in directly (one
      // candidate), or show a picker (multi-row email — one card per
      // distinct user record so duplicate-email students can pick which
      // identity to enter).
      const allCandidates = await authApi.resolveLoginCandidates({ email, password });
      const matching = allCandidates.filter((c) => allowedRoleValues.has(String(c.role_id)));

      if (matching.length === 0) {
        if (allCandidates.length > 0) {
          setLoginError('This account is not allowed on this portal.');
        } else {
          setLoginError('Email or password is incorrect.');
        }
        setSubmitting(false);
        return;
      }
      if (matching.length === 1) {
        const only = matching[0]!;
        await finalizeLogin(only.role_id, only.user_id);
        setSubmitting(false);
        return;
      }
      // Multiple matches: build picker entries. Label = name (or role label),
      // sublabel = role + student id when present.
      const cards: PendingCandidate[] = matching.map((c) => {
        const roleLabel = roleLabelByValue.get(String(c.role_id)) ?? `Role ${c.role_id}`;
        const display = c.name?.trim() || roleLabel;
        const sub = [roleLabel, c.student_id].filter(Boolean).join(' • ');
        return { user_id: c.user_id, role_id: c.role_id, label: display, sublabel: sub };
      });
      setPendingCandidates(cards);
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to login with provided credentials.';
      setLoginError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onPickCandidate = async (candidate: PendingCandidate): Promise<void> => {
    setSubmitting(true);
    setLoginError(null);
    try {
      await finalizeLogin(candidate.role_id, candidate.user_id);
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to continue with selected role.';
      setLoginError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* If already logged in, show a quick redirect card */
  if (session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div aria-hidden="true" className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="size-8 text-emerald-600" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Session Active</h2>
          <p className="mt-2 text-sm text-slate-500">Logged in as role <strong>{session.roleId}</strong></p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-[#5b7fea] to-[#6c63ff] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6c63ff]"
              onClick={() => navigateTo(resolveShellPathForRole(session.roleId))}
            >
              Open Portal
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
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
    <main className="grid min-h-screen w-full grid-cols-1 bg-white animate-[shellEnter_360ms_ease] lg:grid-cols-2" style={{ fontFamily: "'Inter', 'Manrope', system-ui, -apple-system, sans-serif" }}>
      {/* ── Left Panel: Gradient Hero ──────────────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14"
        style={{
          background: 'linear-gradient(135deg, #3B5BBE 0%, #5263BF 20%, #8B6BAA 45%, #C4714E 70%, #E8864E 85%, #E87932 100%)',
        }}
      >
        {/* Logo */}
        <div className="relative z-10">
          <img
            src="/logos/ttii-full-white.svg"
            alt="Teachers' Training Institute of India"
            className="h-14 w-auto"
          />
        </div>

        {/* Tagline + supporting copy */}
        <div className="relative z-10 max-w-xl space-y-6 text-white">
          <h1 className="font-bold leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}>
            Become a<br />Future-Ready<br />Teacher Today.
          </h1>
          <p className="text-base leading-relaxed text-white/85 sm:text-lg">
            India's professional training institute for educators. Live classes, certified curricula, and dedicated counsellors — all in one place.
          </p>
          <ul className="space-y-2.5 text-sm text-white/85">
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-white" strokeWidth={2.5} />
              <span>Live + recorded sessions you can revisit anytime</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-white" strokeWidth={2.5} />
              <span>Industry-recognised certifications</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-white" strokeWidth={2.5} />
              <span>One-on-one counsellor support throughout your journey</span>
            </li>
          </ul>
        </div>

        {/* Footer attribution */}
        <p className="relative z-10 text-xs text-white/70">© {new Date().getFullYear()} Teachers' Training Institute of India</p>

        {/* Sparkle decorations */}
        <svg aria-hidden="true" className="pointer-events-none absolute" style={{ top: '50%', left: '12%', width: '70px', height: '70px', opacity: 0.25 }} viewBox="0 0 50 50" fill="none">
          <path d="M25 0 Q26 18 25 25 Q24 32 25 50 Q26 32 25 25 Q32 24 50 25 Q32 26 25 25 Q18 24 0 25 Q18 26 25 25 Q26 18 25 0Z" fill="#FFFFFF" />
        </svg>
        <svg aria-hidden="true" className="pointer-events-none absolute" style={{ top: '20%', right: '10%', width: '50px', height: '50px', opacity: 0.25 }} viewBox="0 0 50 50" fill="none">
          <path d="M25 0 Q26 18 25 25 Q24 32 25 50 Q26 32 25 25 Q32 24 50 25 Q32 26 25 25 Q18 24 0 25 Q18 26 25 25 Q26 18 25 0Z" fill="#FFFFFF" />
        </svg>
        <svg aria-hidden="true" className="pointer-events-none absolute" style={{ bottom: '14%', right: '24%', width: '44px', height: '44px', opacity: 0.22 }} viewBox="0 0 50 50" fill="none">
          <path d="M25 0 Q26 18 25 25 Q24 32 25 50 Q26 32 25 25 Q32 24 50 25 Q32 26 25 25 Q18 24 0 25 Q18 26 25 25 Q26 18 25 0Z" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Mobile-only branded header (since the gradient panel is hidden under lg) */}
      <div
        className="flex items-center justify-center px-6 py-8 lg:hidden"
        style={{ background: 'linear-gradient(135deg, #3B5BBE 0%, #8B6BAA 50%, #E87932 100%)' }}
      >
        <img
          src="/logos/ttii-full-white.svg"
          alt="Teachers' Training Institute of India"
          className="h-12 w-auto"
        />
      </div>

      {/* ── Right Panel: Login Form ─────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center bg-white px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-extrabold text-slate-900" style={{ fontSize: 'clamp(32px, 3.5vw, 44px)', lineHeight: '1.1', letterSpacing: '-0.5px' }}>Welcome back</h2>
            <p className="mt-2.5 text-sm text-slate-500">Sign in with your LMS credentials to continue.</p>
          </div>

          {/* Error messages */}
          {error ? (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error.message}</p>
              <button type="button" className="mt-1 text-xs font-semibold text-red-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded" onClick={clearError}>Dismiss</button>
            </div>
          ) : null}

          {loginError ? (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loginError}
            </div>
          ) : null}

          {/* Post-password picker. One card per matching user record so an
              email shared across multiple student rows (e.g., the same
              email used for several students under different courses) is
              disambiguated by name + role. Replaces the form so the user
              can't accidentally re-submit. */}
          {pendingCandidates ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Continue as…</p>
                <p className="mt-1 text-xs text-slate-500">
                  Your email is linked to more than one account on this portal. Pick which one to enter.
                </p>
              </div>
              <div className="space-y-2">
                {pendingCandidates.map((c) => (
                  <button
                    key={`${c.user_id}-${c.role_id}`}
                    type="button"
                    disabled={submitting}
                    onClick={() => { void onPickCandidate(c); }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex items-center gap-3">
                      <User aria-hidden="true" className="size-4 text-slate-400" />
                      <span>
                        <span className="block text-sm font-medium text-slate-800">{c.label}</span>
                        {c.sublabel ? <span className="block text-xs text-slate-500">{c.sublabel}</span> : null}
                      </span>
                    </span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="text-xs text-slate-500 underline-offset-2 hover:underline"
                onClick={() => setPendingCandidates(null)}
              >
                ← back to login
              </button>
            </div>
          ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-semibold text-slate-800">Email Address</label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  name="email"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter Your Mail"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-800">Password</label>
              <div className="relative">
                <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter Your Password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  aria-controls="login-password"
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword
                    ? <EyeOff aria-hidden="true" className="size-4" />
                    : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </div>

            {/* Login As dropdown removed — the system now resolves roles
                after correct email + password and shows a picker when an
                account is valid for more than one role on this subdomain. */}

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-offset-0 focus:ring-blue-400"
                />
                <span className="text-sm text-slate-600">Remember Me</span>
              </label>
              <button
                type="button"
                className="rounded text-sm font-semibold text-slate-800 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                onClick={() => navigateTo(`/forgot-password?role_id=${encodeURIComponent(_defaultRole)}`)}
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="h-12 w-full rounded-full border-none font-semibold tracking-wide text-white transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4A6EDB] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              style={{
                background: 'linear-gradient(90deg, #6B8FEF 0%, #4A6EDB 100%)',
                boxShadow: '0 8px 24px rgba(74, 110, 219, 0.40)',
                fontSize: '15px',
                letterSpacing: '0.02em',
              }}
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          )}

          {/* Sign in with Google / Microsoft — student portal only.
              Component fetches /auth/sso/config; if neither IdP is
              configured the whole block stays hidden. */}
          {isStudentPortal && !pendingCandidates ? (
            <div className="mt-5">
              <SsoButtons
                authApi={authApi}
                onGoogleSuccess={handleGoogleSsoSuccess}
                onError={(message) => setLoginError(message)}
              />
            </div>
          ) : null}

          {/* Need Help */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">Need Help?</p>
            <p className="mt-1 text-sm font-bold text-slate-800">Contact Support</p>
            <a
              href="mailto:support@teachersindia.in"
              className="rounded text-sm text-slate-500 transition-colors hover:text-[#4B6EDB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              support@teachersindia.in
            </a>
          </div>
        </div>
      </div>

      {profileCompletionSession ? (
        <SsoCompleteProfileModal
          api={studentPortalApi}
          session={profileCompletionSession}
          onComplete={handleProfileCompletionDone}
        />
      ) : null}
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
  instructorPortalApi,
  counsellorPortalApi,
}: {
  initialPath: string;
  studentPortalApi: StudentPortalApi;
  centrePortalApi: CentrePortalApi;
  adminPortalApi: AdminPortalApi;
  instructorPortalApi: InstructorPortalApi;
  counsellorPortalApi: CounsellorPortalApi;
}) {
  const pathname = usePathname(initialPath);
  const subdomainPortal = useMemo(() => detectPortalFromSubdomain(), []);
  const { authApi, session } = useAuthState();

  // Public Application Form (Naji 2026-05-05) — student receives a
  // tokenised URL after the registration fee is confirmed; no login.
  // Detected up-front; the early-return happens BELOW the hooks so
  // hook order stays stable across renders.
  const isPublicApply = pathname.startsWith('/apply/');
  const applyToken = isPublicApply
    ? (pathname.slice('/apply/'.length).split('/')[0] ?? '')
    : '';

  // On subdomain, redirect root or wrong-portal paths to the correct portal —
  // but ONLY when the user is authenticated. Otherwise let `/` render the
  // login form; auto-redirecting an unauthenticated user to a protected path
  // lands them on the "Login required" guard screen instead of a login form.
  useEffect(() => {
    if (isPublicApply) return;
    if (!subdomainPortal) return;
    if (!session) return;
    const redirect = getSubdomainRedirectPath(subdomainPortal, pathname);
    if (redirect) {
      navigateTo(redirect);
    }
  }, [isPublicApply, subdomainPortal, pathname, session]);

  if (isPublicApply) {
    return <PublicApplyPage token={applyToken} />;
  }

  // Forgot Password flow — role_id is forwarded so multi-role accounts
  // (same email, e.g. Centre + Super Admin) hit the right user record.
  if (pathname === '/forgot-password') {
    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const roleIdRaw = search?.get('role_id');
    const parsedRole = roleIdRaw ? Number.parseInt(roleIdRaw, 10) : NaN;
    const fpRoleId = Number.isFinite(parsedRole) && parsedRole > 0 ? parsedRole : undefined;
    const subdomainRole = subdomainPortal ? Number.parseInt(SUBDOMAIN_DEFAULT_ROLE_ID[subdomainPortal] ?? '', 10) : NaN;
    const fallbackRole = Number.isFinite(subdomainRole) && subdomainRole > 0 ? subdomainRole : undefined;
    return (
      <ForgotPasswordFlow
        authApi={authApi}
        onBackToLogin={() => navigateTo('/')}
        {...(fpRoleId !== undefined ? { roleId: fpRoleId } : fallbackRole !== undefined ? { roleId: fallbackRole } : {})}
      />
    );
  }

  if (pathname === '/') {
    return <LoginHome studentPortalApi={studentPortalApi} />;
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
      instructorPortalApi={instructorPortalApi}
      counsellorPortalApi={counsellorPortalApi}
    />
  );
}

export interface AppProps {
  initialPath?: string;
  authApi?: AuthApi;
  studentPortalApi?: StudentPortalApi;
  centrePortalApi?: CentrePortalApi;
  adminPortalApi?: AdminPortalApi;
  instructorPortalApi?: InstructorPortalApi;
  counsellorPortalApi?: CounsellorPortalApi;
}

export default function App({ initialPath = '/', authApi, studentPortalApi, centrePortalApi, adminPortalApi, instructorPortalApi, counsellorPortalApi }: AppProps) {
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
  const resolvedInstructorPortalApi = useMemo(
    () => instructorPortalApi ?? createDefaultInstructorPortalApi(),
    [instructorPortalApi],
  );
  const resolvedCounsellorPortalApi = useMemo(
    () => counsellorPortalApi ?? createDefaultCounsellorPortalApi(),
    [counsellorPortalApi],
  );

  return (
    <AppErrorBoundary>
      <AuthProvider authApi={resolvedAuthApi}>
        <ConfirmDialogProvider>
          <PortalRouter
            initialPath={initialPath}
            studentPortalApi={resolvedStudentPortalApi}
            centrePortalApi={resolvedCentrePortalApi}
            adminPortalApi={resolvedAdminPortalApi}
            instructorPortalApi={resolvedInstructorPortalApi}
            counsellorPortalApi={resolvedCounsellorPortalApi}
          />
        </ConfirmDialogProvider>
      </AuthProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </AppErrorBoundary>
  );
}
