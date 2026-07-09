import { COUNSELLOR_NAV_TREE } from '../../counsellor/routing/counsellor-nav-tree.js';

export interface AssociateNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: 'general' | 'tools';
}

// Associates render the EXACT counsellor sidebar (same 10 modules), with the
// hrefs rewritten from the /counsellor prefix to /associate. Derived from
// COUNSELLOR_NAV_TREE so the two stay in lock-step.
export const ASSOCIATE_NAV_TREE: readonly AssociateNavItem[] = COUNSELLOR_NAV_TREE.map((item) => ({
  id: item.id,
  label: item.label,
  href: item.href.replace('/counsellor', '/associate'),
  icon: item.icon,
  section: item.section,
}));

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
