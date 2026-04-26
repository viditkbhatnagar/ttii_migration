import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface AdminLayoutState {
  sidebarCollapsed: boolean;
  expandedGroups: Set<string>;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  toggleGroup: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const AdminLayoutCtx = createContext<AdminLayoutState | null>(null);

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  // Accordion behaviour: only one nav group can be expanded at a time.
  // Clicking an already-open group closes it; clicking a different one
  // closes the previous and opens the new one.
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      if (prev.has(groupId)) {
        return new Set();
      }
      return new Set([groupId]);
    });
  }, []);

  const expandGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      if (prev.size === 1 && prev.has(groupId)) return prev;
      return new Set([groupId]);
    });
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const value = useMemo(
    () => ({ sidebarCollapsed: collapsed, expandedGroups, mobileSidebarOpen: mobileOpen, toggleSidebar, toggleGroup, expandGroup, toggleMobileSidebar, closeMobileSidebar }),
    [collapsed, expandedGroups, mobileOpen, toggleSidebar, toggleGroup, expandGroup, toggleMobileSidebar, closeMobileSidebar],
  );

  return <AdminLayoutCtx value={value}>{children}</AdminLayoutCtx>;
}

export function useAdminLayout(): AdminLayoutState {
  const ctx = useContext(AdminLayoutCtx);
  if (!ctx) {
    throw new Error('useAdminLayout must be used within AdminLayoutProvider');
  }
  return ctx;
}
