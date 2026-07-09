import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CentrePortalApi } from '../../centre/centre-portal-api.js';

interface AssociateCurrentUser {
  name: string;
  initials: string;
  email: string;
  image: string;
}

export interface AssociateNotification {
  id: string;
  type: string;
  title: string;
  detail: string;
  createdAt: string | null;
}

interface AssociateLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  currentUser: AssociateCurrentUser | null;
  refreshCurrentUser: () => void;
  /** Topbar notifications feed. Associates have no target/CRM feed, so this
   *  stays empty (the navbar renders its "all caught up" empty state). */
  notifications: readonly AssociateNotification[];
}

const AssociateLayoutCtx = createContext<AssociateLayoutState | null>(null);

// Associates have no CRM/target notifications feed. A stable module-level empty
// array keeps the topbar's "all caught up" state without churning memo deps.
const EMPTY_NOTIFICATIONS: readonly AssociateNotification[] = [];

function computeInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') return 'AS';
  return (
    trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || 'AS'
  );
}

interface AssociateLayoutProviderProps {
  children: ReactNode;
  api: CentrePortalApi;
  session: AuthSession;
}

export function AssociateLayoutProvider({ children, api, session }: AssociateLayoutProviderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AssociateCurrentUser | null>(null);
  const [userVersion, setUserVersion] = useState(0);

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
        setCurrentUser({ name: '', initials: 'AS', email: '', image: '' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, session, userVersion]);

  const value = useMemo(
    () => ({
      sidebarCollapsed: collapsed,
      toggleSidebar,
      mobileSidebarOpen: mobileOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      currentUser,
      refreshCurrentUser,
      notifications: EMPTY_NOTIFICATIONS,
    }),
    [
      collapsed,
      toggleSidebar,
      mobileOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      currentUser,
      refreshCurrentUser,
    ],
  );

  return <AssociateLayoutCtx value={value}>{children}</AssociateLayoutCtx>;
}

export function useAssociateLayout(): AssociateLayoutState {
  const ctx = useContext(AssociateLayoutCtx);
  if (!ctx) {
    throw new Error('useAssociateLayout must be used within AssociateLayoutProvider');
  }
  return ctx;
}
