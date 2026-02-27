import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface AdminLayoutState {
  sidebarCollapsed: boolean;
  expandedGroups: Set<string>;
  toggleSidebar: () => void;
  toggleGroup: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
}

const AdminLayoutCtx = createContext<AdminLayoutState | null>(null);

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const expandGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      if (prev.has(groupId)) return prev;
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ sidebarCollapsed: collapsed, expandedGroups, toggleSidebar, toggleGroup, expandGroup }),
    [collapsed, expandedGroups, toggleSidebar, toggleGroup, expandGroup],
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
