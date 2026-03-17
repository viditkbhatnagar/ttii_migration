import { useMemo } from 'react';
import {
  BookOpen,
  FileText,
  FolderOpen,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCentreLayout } from './CentreLayoutContext.js';
import { getCentreNavForRole, findActiveCentreNavId, type CentreNavItem } from '../routing/centre-nav-tree.js';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  GraduationCap,
  BookOpen,
  Users,
  Video,
  FolderOpen,
  Wallet,
  HeadphonesIcon: Headphones,
};

interface CentreSidebarProps {
  pathname: string;
  roleId: number;
  onNavigate: (href: string) => void;
}

function SidebarItem({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: CentreNavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  const Icon = ICON_MAP[item.icon] ?? null;

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-ttii-sidebar-active/10 text-ttii-sidebar-active'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        collapsed && 'justify-center px-2',
      )}
      onClick={() => onNavigate(item.href)}
      title={collapsed ? item.label : undefined}
    >
      {Icon ? <Icon className="size-5 shrink-0" /> : null}
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </button>
  );
}

export function CentreSidebar({ pathname, roleId, onNavigate }: CentreSidebarProps) {
  const { sidebarCollapsed } = useCentreLayout();
  const navItems = useMemo(() => getCentreNavForRole(roleId), [roleId]);
  const activeItemId = findActiveCentreNavId(pathname);
  const portalLabel = roleId === 10 ? 'Associate' : 'Centre';

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar-width',
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-3 border-b border-gray-200 px-4 py-4', sidebarCollapsed && 'justify-center px-2')}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-blue-600 text-sm font-bold text-white">
          T
        </div>
        {!sidebarCollapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">TTII</p>
            <p className="truncate text-[10px] text-gray-400">{portalLabel} Portal</p>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={item.id === activeItemId}
              collapsed={sidebarCollapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
