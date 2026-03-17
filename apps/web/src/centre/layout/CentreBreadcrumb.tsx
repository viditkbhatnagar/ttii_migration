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
    <div className="flex items-center gap-1.5 px-6 py-3 text-sm text-gray-500">
      <button
        type="button"
        className="flex items-center gap-1 hover:text-gray-700"
        onClick={() => onNavigate('/centre/dashboard')}
      >
        <Home className="size-3.5" />
        <span>Dashboard</span>
      </button>
      {crumb && crumb !== 'Dashboard' ? (
        <span className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5 text-gray-400" />
          <span className="font-medium text-gray-900">{crumb}</span>
        </span>
      ) : null}
    </div>
  );
}
