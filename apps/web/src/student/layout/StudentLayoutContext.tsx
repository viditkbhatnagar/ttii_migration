import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { StudentPortalApi } from '../student-portal-api.js';

interface StudentCurrentUser {
  name: string;
  initials: string;
  username: string;
  image: string;
  studentId: string;
}

interface StudentLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  currentUser: StudentCurrentUser | null;
  refreshCurrentUser: () => void;
}

const StudentLayoutCtx = createContext<StudentLayoutState | null>(null);

function computeInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') return 'ST';
  return (
    trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || 'ST'
  );
}

interface StudentLayoutProviderProps {
  children: ReactNode;
  api: StudentPortalApi;
  session: AuthSession;
}

export function StudentLayoutProvider({ children, api, session }: StudentLayoutProviderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<StudentCurrentUser | null>(null);
  const [userVersion, setUserVersion] = useState(0);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const refreshCurrentUser = useCallback(() => {
    setUserVersion((v) => v + 1);
  }, []);

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
          username: profile.username,
          image: profile.image,
          studentId: profile.studentId,
        });
      } catch {
        if (cancelled) return;
        setCurrentUser({ name: '', initials: 'ST', username: '', image: '', studentId: '' });
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

  return <StudentLayoutCtx value={value}>{children}</StudentLayoutCtx>;
}

export function useStudentLayout(): StudentLayoutState {
  const ctx = useContext(StudentLayoutCtx);
  if (!ctx) {
    throw new Error('useStudentLayout must be used within StudentLayoutProvider');
  }
  return ctx;
}
