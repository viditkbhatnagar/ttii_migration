import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CounsellorPortalApi } from '../counsellor-portal-api.js';

interface CounsellorCurrentUser {
  name: string;
  initials: string;
  email: string;
  image: string;
}

export interface CounsellorNotification {
  id: string;
  type: string;
  title: string;
  detail: string;
  createdAt: string | null;
}

interface CounsellorLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  currentUser: CounsellorCurrentUser | null;
  refreshCurrentUser: () => void;
  /** Real monthly target achievement % (sidebar "Monthly Goal" card). null until loaded. */
  monthlyGoalPct: number | null;
  /** Latest application events, surfaced as topbar notifications. */
  notifications: CounsellorNotification[];
}

const CounsellorLayoutCtx = createContext<CounsellorLayoutState | null>(null);

function computeInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') return 'CN';
  return (
    trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || 'CN'
  );
}

interface CounsellorLayoutProviderProps {
  children: ReactNode;
  api: CounsellorPortalApi;
  session: AuthSession;
}

export function CounsellorLayoutProvider({ children, api, session }: CounsellorLayoutProviderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CounsellorCurrentUser | null>(null);
  const [userVersion, setUserVersion] = useState(0);
  const [monthlyGoalPct, setMonthlyGoalPct] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<CounsellorNotification[]>([]);

  const toggleSidebar = useCallback(() => setCollapsed((v) => !v), []);
  const toggleMobileSidebar = useCallback(() => setMobileOpen((v) => !v), []);
  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);
  const refreshCurrentUser = useCallback(() => setUserVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await api.loadProfile(session.token, session);
        if (cancelled) return;
        const name = profile.name.trim();
        setCurrentUser({
          name,
          initials: computeInitials(name),
          email: profile.email,
          image: profile.image,
        });
      } catch {
        if (cancelled) return;
        setCurrentUser({ name: '', initials: 'CN', email: '', image: '' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, session, userVersion]);

  // Best-effort: pull the dashboard once for the sidebar Monthly-Goal % and the
  // topbar notifications feed (real application events). Failures stay silent —
  // the chrome simply renders its empty state.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const dash = await api.loadCounsellorDashboard(session.token);
        if (cancelled) return;
        const kpis = (dash.kpis ?? {}) as Record<string, unknown>;
        const pct = Number(kpis.achievementPct);
        setMonthlyGoalPct(Number.isFinite(pct) ? pct : 0);
        const activity = Array.isArray(dash.recentActivity) ? dash.recentActivity : [];
        const asStr = (v: unknown, fallback: string): string =>
          typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
        setNotifications(
          activity.slice(0, 6).map((raw, i) => {
            const e = (raw ?? {}) as Record<string, unknown>;
            const createdAt = e.createdAt;
            return {
              id: asStr(e.id, String(i)),
              type: asStr(e.type, 'event'),
              title: asStr(e.title, 'Activity'),
              detail: asStr(e.detail, ''),
              createdAt: typeof createdAt === 'string' ? createdAt : null,
            };
          }),
        );
      } catch {
        if (cancelled) return;
        setMonthlyGoalPct(0);
        setNotifications([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, session]);

  const value = useMemo(
    () => ({
      sidebarCollapsed: collapsed,
      toggleSidebar,
      mobileSidebarOpen: mobileOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      currentUser,
      refreshCurrentUser,
      monthlyGoalPct,
      notifications,
    }),
    [
      collapsed,
      toggleSidebar,
      mobileOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      currentUser,
      refreshCurrentUser,
      monthlyGoalPct,
      notifications,
    ],
  );

  return <CounsellorLayoutCtx value={value}>{children}</CounsellorLayoutCtx>;
}

export function useCounsellorLayout(): CounsellorLayoutState {
  const ctx = useContext(CounsellorLayoutCtx);
  if (!ctx) {
    throw new Error('useCounsellorLayout must be used within CounsellorLayoutProvider');
  }
  return ctx;
}
