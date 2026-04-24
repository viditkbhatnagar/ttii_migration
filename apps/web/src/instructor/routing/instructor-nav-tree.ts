export interface InstructorNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: 'general' | 'tools';
}

export const INSTRUCTOR_NAV_TREE: readonly InstructorNavItem[] = [
  // General section
  { id: 'dashboard', label: 'Dashboard', href: '/instructor/dashboard', icon: 'LayoutDashboard', section: 'general' },
  { id: 'cohorts', label: 'Cohorts', href: '/instructor/cohorts', icon: 'Users', section: 'general' },
  { id: 'live-classes', label: 'Live Classes', href: '/instructor/live-classes', icon: 'Video', section: 'general' },
  { id: 'assignments', label: 'Assignments', href: '/instructor/assignments', icon: 'ClipboardCheck', section: 'general' },
  // Tools section
  { id: 'settings', label: 'Settings', href: '/instructor/settings', icon: 'Settings', section: 'tools' },
];

export function findActiveInstructorNav(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  for (const item of INSTRUCTOR_NAV_TREE) {
    if (normalized === item.href || normalized.startsWith(item.href + '/')) {
      return item.id;
    }
  }
  if (normalized === '/instructor' || normalized === '/instructor/') return 'dashboard';
  return null;
}
