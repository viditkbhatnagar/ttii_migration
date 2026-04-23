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
    <nav aria-label="Breadcrumb" className="px-4 py-3 md:px-6 overflow-x-auto">
      <ol className="flex items-center gap-1.5 text-sm text-gray-500">
        <li className="flex items-center">
          <button
            type="button"
            className="flex items-center gap-1 hover:text-gray-700"
            onClick={() => onNavigate('/admin/dashboard/index')}
          >
            <Home aria-hidden="true" className="size-3.5" />
            <span>Dashboard</span>
          </button>
        </li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb} className="flex items-center gap-1.5">
              <ChevronRight aria-hidden="true" className="size-3.5 text-gray-400" />
              <span
                aria-current={isLast ? 'page' : undefined}
                className={isLast ? 'font-medium text-gray-900' : ''}
              >
                {crumb}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
