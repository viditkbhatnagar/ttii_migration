import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CounsellorPortalApi } from '../counsellor-portal-api.js';

interface CounsellorCurrentUser {
  name: string;
  initials: string;
  email: string;
  image: string;
}

interface CounsellorLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  currentUser: CounsellorCurrentUser | null;
  refreshCurrentUser: () => void;
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

  const value = useMemo(
    () => ({
      sidebarCollapsed: collapsed,
      toggleSidebar,
      mobileSidebarOpen: mobileOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      currentUser,
      refreshCurrentUser,
    }),
    [collapsed, toggleSidebar, mobileOpen, toggleMobileSidebar, closeMobileSidebar, currentUser, refreshCurrentUser],
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
