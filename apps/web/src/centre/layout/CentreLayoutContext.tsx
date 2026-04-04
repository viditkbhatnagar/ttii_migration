import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface CentreLayoutState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const CentreLayoutCtx = createContext<CentreLayoutState | null>(null);

export function CentreLayoutProvider({ children }: { children: ReactNode }) {
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
    () => ({ sidebarCollapsed: collapsed, mobileSidebarOpen: mobileOpen, toggleSidebar, toggleMobileSidebar, closeMobileSidebar }),
    [collapsed, mobileOpen, toggleSidebar, toggleMobileSidebar, closeMobileSidebar],
  );

  return <CentreLayoutCtx value={value}>{children}</CentreLayoutCtx>;
}

export function useCentreLayout(): CentreLayoutState {
  const ctx = useContext(CentreLayoutCtx);
  if (!ctx) {
    throw new Error('useCentreLayout must be used within CentreLayoutProvider');
  }
  return ctx;
}
