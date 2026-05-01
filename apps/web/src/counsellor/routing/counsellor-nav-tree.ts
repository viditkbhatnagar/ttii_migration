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
  { id: 'students', label: 'Students', href: '/counsellor/students', icon: 'Users', section: 'general' },
  { id: 'targets', label: 'My Targets', href: '/counsellor/targets', icon: 'Target', section: 'general' },
  { id: 'referrals', label: 'Referrals', href: '/counsellor/referrals', icon: 'Share2', section: 'general' },
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
