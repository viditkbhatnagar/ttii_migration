import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface StudentLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const StudentLayoutCtx = createContext<StudentLayoutState | null>(null);

export function StudentLayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ sidebarCollapsed: collapsed, toggleSidebar }),
    [collapsed, toggleSidebar],
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
