import { ChevronRight, Home } from 'lucide-react';
import { CENTRE_NAV_TREE } from '../routing/centre-nav-tree.js';

interface CentreBreadcrumbProps {
  pathname: string;
  onNavigate: (href: string) => void;
}

function resolveBreadcrumb(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  for (const item of CENTRE_NAV_TREE) {
    if (normalized === item.href || normalized.startsWith(item.href + '/')) {
      return item.label;
    }
  }
  return null;
}

export function CentreBreadcrumb({ pathname, onNavigate }: CentreBreadcrumbProps) {
  const crumb = resolveBreadcrumb(pathname);

  return (
    <nav aria-label="Breadcrumb" className="px-4 py-3 md:px-6 overflow-x-auto">
      <ol className="flex items-center gap-1.5 text-sm text-gray-500">
        <li className="flex items-center">
          <button
            type="button"
            className="flex items-center gap-1 hover:text-gray-700"
            onClick={() => onNavigate('/centre/dashboard')}
          >
            <Home aria-hidden="true" className="size-3.5" />
            <span>Dashboard</span>
          </button>
        </li>
        {crumb && crumb !== 'Dashboard' ? (
          <li className="flex items-center gap-1.5">
            <ChevronRight aria-hidden="true" className="size-3.5 text-gray-400" />
            <span aria-current="page" className="font-medium text-gray-900">{crumb}</span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
