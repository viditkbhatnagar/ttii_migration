import { ChevronRight, Home } from 'lucide-react';
import { ADMIN_NAV_TREE, isNavGroup } from '../routing/admin-nav-tree.js';

interface AdminBreadcrumbProps {
  pathname: string;
  onNavigate: (href: string) => void;
}

function resolveBreadcrumb(pathname: string): string[] {
  const normalized = pathname.replace(/\/$/, '');

  for (const entry of ADMIN_NAV_TREE) {
    if (isNavGroup(entry)) {
      for (const child of entry.children) {
        if (normalized === child.href || normalized.startsWith(child.href + '/')) {
          return [entry.label, child.label];
        }
      }
    } else if (normalized === entry.href || normalized.startsWith(entry.href + '/')) {
      return [entry.label];
    }
  }

  return [];
}

export function AdminBreadcrumb({ pathname, onNavigate }: AdminBreadcrumbProps) {
  const crumbs = resolveBreadcrumb(pathname);

  return (
    <div className="flex items-center gap-1.5 px-6 py-3 text-sm text-gray-500">
      <button
        type="button"
        className="flex items-center gap-1 hover:text-gray-700"
        onClick={() => onNavigate('/admin/dashboard/index')}
      >
        <Home className="size-3.5" />
        <span>Dashboard</span>
      </button>
      {crumbs.map((crumb, index) => (
        <span key={crumb} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5 text-gray-400" />
          <span className={index === crumbs.length - 1 ? 'font-medium text-gray-900' : ''}>{crumb}</span>
        </span>
      ))}
    </div>
  );
}
