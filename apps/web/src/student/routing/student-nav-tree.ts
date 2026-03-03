export interface StudentNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

export const STUDENT_NAV_TREE: readonly StudentNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/student/dashboard', icon: 'LayoutDashboard' },
  { id: 'learning', label: 'My Learning', href: '/student/learning', icon: 'BookOpen' },
  { id: 'assessments', label: 'Assessments', href: '/student/assessments', icon: 'ClipboardList' },
  { id: 'payments', label: 'Payments', href: '/student/payments', icon: 'CreditCard' },
  { id: 'notifications', label: 'Notifications', href: '/student/notifications', icon: 'Bell' },
  { id: 'support', label: 'Support', href: '/student/support', icon: 'MessageCircle' },
  { id: 'profile', label: 'Profile', href: '/student/profile', icon: 'User' },
];

export function findActiveStudentNav(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  for (const item of STUDENT_NAV_TREE) {
    if (normalized === item.href || normalized.startsWith(item.href + '/')) {
      return item.id;
    }
  }
  if (normalized === '/student') {
    return 'dashboard';
  }
  return null;
}
