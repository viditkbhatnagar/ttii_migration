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
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
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
      {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : null}
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </button>
  );
}

function SidebarContent({
  pathname,
  roleId,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  roleId: number;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  const navItems = useMemo(() => getCentreNavForRole(roleId), [roleId]);
  const activeItemId = findActiveCentreNavId(pathname);
  const portalLabel = roleId === 10 ? 'Associate' : 'Centre';

  return (
    <>
      {/* Brand */}
      <div className={cn('flex flex-col items-start gap-1 border-b border-gray-200 px-4 py-3', collapsed && 'items-center px-2')}>
        {collapsed ? (
          <img
            src="/logos/ttii-icon-color.svg"
            alt="TTII"
            className="h-8 w-auto"
          />
        ) : (
          <>
            <img
              src="/logos/ttii-full-color.svg"
              alt="Teachers' Training Institute of India"
              className="h-9 w-auto max-w-full"
            />
            <p className="text-[10px] font-medium text-gray-400 ml-0.5">{portalLabel} Portal</p>
          </>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 px-2 py-3">
        <nav aria-label={`${portalLabel} sections`} className="space-y-1">
          {navItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={item.id === activeItemId}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </ScrollArea>
    </>
  );
}

/** Desktop sidebar — hidden on mobile */
export function CentreSidebar({ pathname, roleId, onNavigate }: CentreSidebarProps) {
  const { sidebarCollapsed } = useCentreLayout();

  return (
    <aside
      aria-label="Centre navigation"
      className={cn(
        'hidden md:flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar-width',
      )}
    >
      <SidebarContent pathname={pathname} roleId={roleId} collapsed={sidebarCollapsed} onNavigate={onNavigate} />
    </aside>
  );
}

/** Mobile sidebar content — rendered inside a Sheet */
export function CentreSidebarMobile({ pathname, roleId, onNavigate }: CentreSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-white">
      <SidebarContent pathname={pathname} roleId={roleId} collapsed={false} onNavigate={onNavigate} />
    </div>
  );
}
