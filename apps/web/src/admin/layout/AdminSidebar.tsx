import { useEffect } from 'react';
import {
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  Handshake,
  HeartHandshake,
  IndianRupee,
  LayoutDashboard,
  Megaphone,
  Settings,
  Shield,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminLayout } from './AdminLayoutContext.js';
import { ADMIN_NAV_TREE, findActiveNavIds, isNavGroup, type AdminNavEntry, type AdminNavGroup, type AdminNavItem } from '../routing/admin-nav-tree.js';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  IndianRupee,
  UserCheck,
  Shield,
  HeartHandshake,
  Handshake,
  FileText,
  FolderOpen,
  Bot,
  CalendarDays,
  Megaphone,
  ClipboardCheck,
  Settings,
};

interface AdminSidebarProps {
  pathname: string;
  onNavigate: (href: string) => void;
}

function SidebarItem({
  item,
  isActive,
  collapsed,
  icon: iconName,
  onNavigate,
}: {
  item: AdminNavItem;
  isActive: boolean;
  collapsed: boolean;
  icon?: string;
  onNavigate: (href: string) => void;
}) {
  const Icon = iconName ? ICON_MAP[iconName] : null;

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

function SidebarGroup({
  group,
  activeItemId,
  collapsed,
  expanded,
  onToggle,
  onNavigate,
}: {
  group: AdminNavGroup;
  activeItemId: string | null;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => void;
}) {
  const Icon = ICON_MAP[group.icon];
  const hasActiveChild = group.children.some((child) => child.id === activeItemId);

  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          hasActiveChild
            ? 'text-ttii-sidebar-active'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          collapsed && 'justify-center px-2',
        )}
        onClick={onToggle}
        title={collapsed ? group.label : undefined}
      >
        {Icon ? <Icon className="size-5 shrink-0" /> : null}
        {!collapsed ? (
          <>
            <span className="flex-1 truncate text-left">{group.label}</span>
            {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          </>
        ) : null}
      </button>
      {!collapsed && expanded ? (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
          {group.children.map((child) => (
            <button
              key={child.id}
              type="button"
              className={cn(
                'flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors',
                child.id === activeItemId
                  ? 'font-medium text-ttii-sidebar-active'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
              )}
              onClick={() => onNavigate(child.href)}
            >
              <span className="mr-2 text-gray-400">–</span>
              <span className="truncate">{child.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSidebar({ pathname, onNavigate }: AdminSidebarProps) {
  const { sidebarCollapsed, expandedGroups, toggleGroup, expandGroup } = useAdminLayout();
  const { groupId: activeGroupId, itemId: activeItemId } = findActiveNavIds(pathname);

  useEffect(() => {
    if (activeGroupId) {
      expandGroup(activeGroupId);
    }
  }, [activeGroupId, expandGroup]);

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
            <p className="truncate text-[10px] text-gray-400">Empower · Educate · Evolve</p>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {ADMIN_NAV_TREE.map((entry: AdminNavEntry) =>
            isNavGroup(entry) ? (
              <SidebarGroup
                key={entry.id}
                group={entry}
                activeItemId={activeItemId}
                collapsed={sidebarCollapsed}
                expanded={expandedGroups.has(entry.id)}
                onToggle={() => toggleGroup(entry.id)}
                onNavigate={onNavigate}
              />
            ) : (
              <SidebarItem
                key={entry.id}
                item={entry}
                isActive={entry.id === activeItemId}
                collapsed={sidebarCollapsed}
                icon={entry.icon}
                onNavigate={onNavigate}
              />
            ),
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
