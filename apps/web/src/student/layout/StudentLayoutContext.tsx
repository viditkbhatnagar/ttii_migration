import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface StudentLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const StudentLayoutCtx = createContext<StudentLayoutState | null>(null);

export function StudentLayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const value = useMemo(
    () => ({ sidebarCollapsed: collapsed, toggleSidebar, mobileSidebarOpen: mobileOpen, toggleMobileSidebar, closeMobileSidebar }),
    [collapsed, toggleSidebar, mobileOpen, toggleMobileSidebar, closeMobileSidebar],
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
