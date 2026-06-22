export interface CounsellorNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: 'general' | 'tools';
}

export const COUNSELLOR_NAV_TREE: readonly CounsellorNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/counsellor/dashboard', icon: 'LayoutDashboard', section: 'general' },
  { id: 'applications', label: 'Applications', href: '/counsellor/applications', icon: 'FileText', section: 'general' },
  { id: 'students', label: 'My Enrollments', href: '/counsellor/students', icon: 'GraduationCap', section: 'general' },
  { id: 'performance', label: 'Performance', href: '/counsellor/performance', icon: 'BarChart3', section: 'general' },
  { id: 'courses', label: 'Courses', href: '/counsellor/courses', icon: 'BookOpen', section: 'general' },
  { id: 'payments', label: 'Payments', href: '/counsellor/payments', icon: 'CreditCard', section: 'general' },
  { id: 'training', label: 'Training', href: '/counsellor/training', icon: 'PlayCircle', section: 'general' },
  { id: 'reports', label: 'Reports', href: '/counsellor/reports', icon: 'FileBarChart2', section: 'general' },
  { id: 'settings', label: 'Settings', href: '/counsellor/settings', icon: 'Settings', section: 'tools' },
];

export function findActiveCounsellorNav(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  for (const item of COUNSELLOR_NAV_TREE) {
    if (normalized === item.href || normalized.startsWith(item.href + '/')) {
      return item.id;
    }
  }
  if (normalized === '/counsellor' || normalized === '/counsellor/') return 'dashboard';
  return null;
}
