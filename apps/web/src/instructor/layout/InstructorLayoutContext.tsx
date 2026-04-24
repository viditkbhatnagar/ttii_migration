import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { InstructorPortalApi } from '../instructor-portal-api.js';

interface InstructorCurrentUser {
  name: string;
  initials: string;
  email: string;
  image: string;
}

interface InstructorLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  currentUser: InstructorCurrentUser | null;
  refreshCurrentUser: () => void;
}

const InstructorLayoutCtx = createContext<InstructorLayoutState | null>(null);

function computeInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') return 'IN';
  return (
    trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || 'IN'
  );
}

interface InstructorLayoutProviderProps {
  children: ReactNode;
  api: InstructorPortalApi;
  session: AuthSession;
}

export function InstructorLayoutProvider({ children, api, session }: InstructorLayoutProviderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<InstructorCurrentUser | null>(null);
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
        setCurrentUser({ name: '', initials: 'IN', email: '', image: '' });
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

  return <InstructorLayoutCtx value={value}>{children}</InstructorLayoutCtx>;
}

export function useInstructorLayout(): InstructorLayoutState {
  const ctx = useContext(InstructorLayoutCtx);
  if (!ctx) {
    throw new Error('useInstructorLayout must be used within InstructorLayoutProvider');
  }
  return ctx;
}
