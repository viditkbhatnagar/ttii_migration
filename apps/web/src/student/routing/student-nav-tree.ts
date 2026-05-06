export interface StudentNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: 'general' | 'tools';
}

export const STUDENT_NAV_TREE: readonly StudentNavItem[] = [
  // General section
  { id: 'dashboard', label: 'Dashboard', href: '/student/dashboard', icon: 'LayoutDashboard', section: 'general' },
  { id: 'courses', label: 'Courses', href: '/student/courses', icon: 'BookOpen', section: 'general' },
  { id: 'grades', label: 'Grades', href: '/student/grades', icon: 'GraduationCap', section: 'general' },
  { id: 'payments', label: 'Payments', href: '/student/payments', icon: 'CreditCard', section: 'general' },
  // Notifications: accessible from the header bell; no sidebar entry.
  // Tools section
  { id: 'settings', label: 'Settings', href: '/student/settings', icon: 'Settings', section: 'tools' },
  { id: 'help', label: 'Help Center', href: '/student/help', icon: 'HelpCircle', section: 'tools' },
];

export function findActiveStudentNav(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  for (const item of STUDENT_NAV_TREE) {
    if (normalized === item.href || normalized.startsWith(item.href + '/')) {
      return item.id;
    }
  }
  // Backward compat aliases
  if (normalized === '/student' || normalized === '/student/') return 'dashboard';
  if (normalized.startsWith('/student/learning')) return 'courses';
  if (normalized.startsWith('/student/assessments')) return 'grades';
  if (normalized.startsWith('/student/profile')) return 'settings';
  if (normalized.startsWith('/student/support')) return 'help';
  return null;
}
