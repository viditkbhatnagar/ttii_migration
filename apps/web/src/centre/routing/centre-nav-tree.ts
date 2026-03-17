export interface CentreNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

export const CENTRE_NAV_TREE: readonly CentreNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/centre/dashboard', icon: 'LayoutDashboard' },
  { id: 'applications', label: 'Applications', href: '/centre/applications', icon: 'FileText' },
  { id: 'students', label: 'Students', href: '/centre/students', icon: 'GraduationCap' },
  { id: 'courses', label: 'Courses', href: '/centre/courses', icon: 'BookOpen' },
  { id: 'cohorts', label: 'Cohorts', href: '/centre/cohorts', icon: 'Users' },
  { id: 'live', label: 'Live Classes', href: '/centre/live', icon: 'Video' },
  { id: 'resources', label: 'Resources', href: '/centre/resources', icon: 'FolderOpen' },
  { id: 'wallet', label: 'Wallet', href: '/centre/wallet', icon: 'Wallet' },
  { id: 'support', label: 'Support', href: '/centre/support', icon: 'HeadphonesIcon' },
];

/** Nav item IDs visible to Associate (role_id=10) */
const ASSOCIATE_ALLOWED_IDS = new Set<string>([
  'dashboard',
  'applications',
  'students',
]);

export function getCentreNavForRole(roleId: number): readonly CentreNavItem[] {
  if (roleId !== 10) return CENTRE_NAV_TREE;
  return CENTRE_NAV_TREE.filter((item) => ASSOCIATE_ALLOWED_IDS.has(item.id));
}

export function findActiveCentreNavId(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  for (const item of CENTRE_NAV_TREE) {
    if (normalized === item.href || normalized.startsWith(item.href + '/')) {
      return item.id;
    }
  }
  return null;
}
