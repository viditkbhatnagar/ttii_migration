export type StudentNavSectionKey = 'learning' | 'account' | 'system';

export interface StudentNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: StudentNavSectionKey;
}

export interface StudentNavSection {
  key: StudentNavSectionKey;
  label: string;
}

// Sidebar groups — Naji 2026-06-05 (audio): three categories, Learning /
// Account / System (replacing the old General / Tools split).
export const STUDENT_NAV_SECTIONS: readonly StudentNavSection[] = [
  { key: 'learning', label: 'Learning' },
  { key: 'account', label: 'Account' },
  { key: 'system', label: 'System' },
];

export const STUDENT_NAV_TREE: readonly StudentNavItem[] = [
  // Learning — everything tied to coursework and progress
  { id: 'dashboard', label: 'Dashboard', href: '/student/dashboard', icon: 'LayoutDashboard', section: 'learning' },
  { id: 'courses', label: 'Courses', href: '/student/courses', icon: 'BookOpen', section: 'learning' },
  { id: 'live-classes', label: 'Live Classes', href: '/student/live-classes', icon: 'Radio', section: 'learning' },
  { id: 'assignments', label: 'Assignments', href: '/student/assignments', icon: 'ClipboardList', section: 'learning' },
  { id: 'exams', label: 'Exams', href: '/student/exams', icon: 'FileText', section: 'learning' },
  { id: 'grades', label: 'Grades', href: '/student/grades', icon: 'GraduationCap', section: 'learning' },
  { id: 'calendar', label: 'Calendar', href: '/student/calendar', icon: 'CalendarDays', section: 'learning' },
  { id: 'certificates', label: 'Certificates', href: '/student/certificates', icon: 'Award', section: 'learning' },
  // Account — the student's money and personal settings
  { id: 'payments', label: 'Payments', href: '/student/payments', icon: 'CreditCard', section: 'account' },
  { id: 'settings', label: 'Settings', href: '/student/settings', icon: 'Settings', section: 'account' },
  // System — support / meta
  { id: 'help', label: 'Help Center', href: '/student/help', icon: 'HelpCircle', section: 'system' },
  // Notifications: accessible from the header bell; no sidebar entry.
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
  if (normalized.startsWith('/student/live')) return 'live-classes';
  if (normalized.startsWith('/student/assessments')) return 'assignments';
  if (normalized.startsWith('/student/profile')) return 'settings';
  if (normalized.startsWith('/student/support')) return 'help';
  return null;
}
