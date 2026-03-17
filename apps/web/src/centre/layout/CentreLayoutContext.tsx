import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface CentreLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const CentreLayoutCtx = createContext<CentreLayoutState | null>(null);

export function CentreLayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ sidebarCollapsed: collapsed, toggleSidebar }),
    [collapsed, toggleSidebar],
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
