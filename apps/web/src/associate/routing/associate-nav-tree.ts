export interface AssociateNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

// Associates keep their current four surfaces (mirrors the Centre portal's
// ASSOCIATE_ALLOWED_IDS): Dashboard, Applications, Students, Training.
export const ASSOCIATE_NAV_TREE: readonly AssociateNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/associate/dashboard', icon: 'LayoutDashboard' },
  { id: 'applications', label: 'Applications', href: '/associate/applications', icon: 'FileText' },
  { id: 'students', label: 'Students', href: '/associate/students', icon: 'GraduationCap' },
  { id: 'training', label: 'Training', href: '/associate/training', icon: 'PlayCircle' },
];

export function findActiveAssociateNav(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  for (const item of ASSOCIATE_NAV_TREE) {
    if (normalized === item.href || normalized.startsWith(item.href + '/')) {
      return item.id;
    }
  }
  if (normalized === '/associate' || normalized === '/associate/') return 'dashboard';
  return null;
}
