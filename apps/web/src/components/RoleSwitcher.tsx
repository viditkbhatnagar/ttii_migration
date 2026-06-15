import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import {
  LegacyApiClient,
  LegacyAuthApi,
  resolvePortalSurfaceForRole,
  resolveShellPathForRole,
  writeStoredSession,
  type AuthApi,
  type SwitchableRole,
} from '@ttii/frontend-core';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { detectPortalFromSubdomain } from '@/lib/subdomain';

// Human-readable labels for each legacy role id. Mirrors ROLE_LABELS in the
// admin navbar so the switcher reads the same as the role badge.
const ROLE_LABELS: Record<number, string> = {
  1: 'Super Admin',
  2: 'Student',
  3: 'Instructor',
  4: 'Centre',
  7: 'Centre',
  8: 'Admin',
  9: 'Counsellor',
  10: 'Associate',
};

// The role switcher only ever moves a user between roles served on the SAME
// subdomain. Each subdomain serves a fixed set of surfaces:
//   admin.teachersindia.in       → admin + instructor
//   admissions.teachersindia.in  → centre + counsellor (Counsellor moved here
//                                   off admin, Naji 2026-06-15)
//   learn.teachersindia.in       → student
const PORTAL_SURFACE_SETS: Record<string, Set<string>> = {
  admin: new Set(['admin', 'instructor']),
  centre: new Set(['centre', 'counsellor']),
  student: new Set(['student']),
};

// Surfaces switchable on the CURRENT subdomain. Off-subdomain (dev / direct
// path) we allow the full admin-side + admissions-side set so the switcher
// still works locally.
function switchableSurfacesForCurrentHost(): Set<string> {
  const portal = detectPortalFromSubdomain();
  if (portal) return PORTAL_SURFACE_SETS[portal] ?? new Set<string>();
  return new Set(['admin', 'instructor', 'centre', 'counsellor']);
}

function resolveApiBaseUrl(): string {
  const value: unknown = import.meta.env.VITE_API_BASE_URL;
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  if (typeof window === 'undefined') return '/api';
  return `${window.location.origin}/api`;
}

interface RoleSwitcherProps {
  /** The current active session — token gates the API calls; roleId marks the
   *  active row in the dropdown. */
  session: { token: string; userId: string; roleId: number };
  /** Optional injected AuthApi (tests). Falls back to a default LegacyAuthApi. */
  authApi?: AuthApi;
  /** Dark navbar (admin) vs light navbar (instructor/counsellor) styling. */
  variant?: 'dark' | 'light';
}

/**
 * Post-login role switcher. A user whose email maps to several roles on the
 * same subdomain (e.g. Admin + Instructor + Counsellor on admin.teachersindia.in)
 * can switch role here WITHOUT re-entering their password.
 *
 * Security: the backend is the source of truth. /auth/my_roles returns ONLY
 * the roles this session password-verified at login (or all same-email rows
 * for SSO). /auth/switch_role re-checks that the target is in that set before
 * minting a new session. This component never decides what's allowed — it
 * renders what the server returns and asks the server to switch.
 *
 * Renders nothing when the user has one or zero same-subdomain roles.
 */
export function RoleSwitcher({ session, authApi, variant = 'dark' }: RoleSwitcherProps) {
  const resolvedAuthApi = useMemo<AuthApi>(
    () => authApi ?? new LegacyAuthApi(new LegacyApiClient({ baseUrl: resolveApiBaseUrl() })),
    [authApi],
  );

  const [roles, setRoles] = useState<SwitchableRole[]>([]);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fetched = await resolvedAuthApi.getSwitchableRoles(session.token);
        if (!cancelled) setRoles(fetched);
      } catch {
        // Switching is a convenience, never block the navbar on its failure.
        if (!cancelled) setRoles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedAuthApi, session.token]);

  // Only roles served on the CURRENT subdomain are valid switch targets.
  const sameSubdomainRoles = useMemo(() => {
    const allowed = switchableSurfacesForCurrentHost();
    return roles.filter((role) => allowed.has(resolvePortalSurfaceForRole(role.roleId)));
  }, [roles]);

  const handleSwitch = async (role: SwitchableRole): Promise<void> => {
    // No-op when picking the role you're already in.
    if (role.roleId === session.roleId && role.userId === session.userId) {
      return;
    }
    setError(null);
    setSwitchingTo(role.userId);
    try {
      const { session: nextSession } = await resolvedAuthApi.switchRole(session.token, role.userId);
      // Persist the freshly-minted session, then hard-reload into the target
      // shell. A full navigation re-bootstraps AuthProvider from localStorage
      // and remounts the correct portal shell — no stale context to reconcile.
      writeStoredSession(nextSession);
      const shellPath = resolveShellPathForRole(nextSession.roleId);
      if (typeof window !== 'undefined') {
        window.location.assign(shellPath);
      }
    } catch (switchError: unknown) {
      const message = switchError instanceof Error ? switchError.message : 'Unable to switch role.';
      setError(message);
      setSwitchingTo(null);
    }
  };

  // Hide entirely unless the user genuinely has more than one role on this
  // subdomain — a single-role user gets no switcher.
  if (sameSubdomainRoles.length <= 1) {
    return null;
  }

  const activeLabel = ROLE_LABELS[session.roleId] ?? 'Current role';
  const isDark = variant === 'dark';

  const triggerClass = isDark
    ? 'gap-2 text-white hover:bg-white/10'
    : 'gap-2 text-slate-700 hover:bg-slate-100';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Switch role"
          className={triggerClass}
        >
          <span className="text-[11px] uppercase tracking-wide opacity-70">Role</span>
          <span className="text-sm font-medium">{activeLabel}</span>
          <ChevronsUpDown aria-hidden="true" className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sameSubdomainRoles.map((role) => {
          const label = ROLE_LABELS[role.roleId] ?? `Role ${role.roleId}`;
          const isActive = role.roleId === session.roleId && role.userId === session.userId;
          const isSwitching = switchingTo === role.userId;
          return (
            <DropdownMenuItem
              key={`${role.userId}-${role.roleId}`}
              disabled={isActive || switchingTo !== null}
              onSelect={(event) => {
                // Keep the menu logic in our handler; prevent Radix from
                // closing before the async switch kicks off.
                event.preventDefault();
                void handleSwitch(role);
              }}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium">{label}</span>
                {role.name ? <span className="text-xs text-muted-foreground">{role.name}</span> : null}
              </span>
              {isSwitching ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
              ) : isActive ? (
                <Check aria-hidden="true" className="size-4 text-ttii-primary" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
        {error ? (
          <>
            <DropdownMenuSeparator />
            <p role="alert" className="px-2 py-1.5 text-xs text-destructive">{error}</p>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
