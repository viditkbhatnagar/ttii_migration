import { useEffect, useMemo, type ReactNode } from 'react';
import {
  Award,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  Handshake,
  Headphones,
  HeartHandshake,
  IndianRupee,
  LayoutDashboard,
  Library,
  Megaphone,
  PlayCircle,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminLayout } from './AdminLayoutContext.js';
import { findActiveNavIds, getNavTreeForRole, isNavGroup, type AdminNavEntry, type AdminNavGroup, type AdminNavItem } from '../routing/admin-nav-tree.js';

// Naji's AdminSidebar (2026-10-12): a white card rail, brand tile + collapse
// toggle on top, rounded-xl items with a soft primary active state, and a
// group's children indented on a hairline. Our menu, hrefs, order and
// role-based filtering are unchanged (admin-nav-tree.ts). Collapsed it is an
// icon rail with tooltips; clicking a group there opens the rail on that group.

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  IndianRupee,
  UserCheck,
  Shield,
  ShieldCheck,
  HeartHandshake,
  Handshake,
  Headphones,
  FileText,
  FolderOpen,
  Library,
  Bot,
  CalendarDays,
  Megaphone,
  ClipboardCheck,
  PlayCircle,
  Settings,
  Award,
};

/** Icon names the menu can draw; a nav-tree icon outside this list renders blank (tested). */
export const NAV_ICON_NAMES: readonly string[] = Object.keys(ICON_MAP);

interface AdminSidebarProps {
  pathname: string;
  roleId: number;
  onNavigate: (href: string) => void;
}

/** In the collapsed rail the label lives in a tooltip. */
function RailTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>{label}</TooltipContent>
    </Tooltip>
  );
}

function MenuIcon({ name, active }: { name: string | undefined; active: boolean }) {
  const Icon = name ? ICON_MAP[name] : undefined;
  if (!Icon) return null;
  return (
    <Icon
      aria-hidden="true"
      className={cn('size-[18px] shrink-0 transition-colors', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
      strokeWidth={active ? 2.25 : 1.75}
    />
  );
}

const itemClass = (active: boolean, collapsed: boolean) => cn(
  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
  active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  collapsed && 'justify-center px-2',
);

function SidebarItem({ item, icon, isActive, collapsed, onNavigate }: {
  item: AdminNavItem;
  icon: string;
  isActive: boolean;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <RailTooltip label={item.label} collapsed={collapsed}>
      <button
        type="button"
        aria-current={isActive ? 'page' : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={itemClass(isActive, collapsed)}
        onClick={() => onNavigate(item.href)}
      >
        <MenuIcon name={icon} active={isActive} />
        {!collapsed ? <span className="min-w-0 flex-1 truncate text-left">{item.label}</span> : null}
      </button>
    </RailTooltip>
  );
}

function SidebarGroup({ group, activeItemId, collapsed, expanded, onToggle, onNavigate }: {
  group: AdminNavGroup;
  activeItemId: string | null;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => void;
}) {
  const hasActiveChild = group.children.some((child) => child.id === activeItemId);
  const open = expanded && !collapsed;
  // The group lights up while one of its pages is open but its list is hidden
  // (closed, or the rail is collapsed) so the admin can still see where they are.
  const highlight = hasActiveChild && !open;

  return (
    <li>
      <RailTooltip label={group.label} collapsed={collapsed}>
        <button
          type="button"
          aria-expanded={!collapsed ? expanded : undefined}
          aria-label={collapsed ? group.label : undefined}
          className={cn(itemClass(highlight, collapsed), hasActiveChild && open && 'font-medium text-foreground')}
          onClick={onToggle}
        >
          <MenuIcon name={group.icon} active={hasActiveChild} />
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
              <ChevronRight aria-hidden="true" className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')} />
            </>
          ) : null}
        </button>
      </RailTooltip>
      {open ? (
        <ul className="ml-5 mt-1 space-y-0.5 border-l border-border pl-4">
          {group.children.map((child) => {
            const active = child.id === activeItemId;
            return (
              <li key={child.id}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block w-full rounded-lg px-3 py-1.5 text-left text-[13px] leading-snug transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                    active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                  onClick={() => onNavigate(child.href)}
                >
                  {child.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function BrandBlock({ collapsed, onToggleCollapse, onClose }: {
  collapsed: boolean;
  onToggleCollapse?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 border-b border-border transition-all',
        collapsed ? 'flex-col items-center justify-center gap-2 px-3 py-4' : 'items-center justify-between gap-2 px-5 py-5',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
          <img src="/logos/ttii-icon-white.svg" alt="TTII" className="size-6 object-contain" />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">TTII LMS</p>
            <p className="truncate text-[11px] text-muted-foreground">Admin portal</p>
          </div>
        ) : null}
      </div>
      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          {collapsed ? <ChevronRight aria-hidden="true" className="size-4" /> : <ChevronLeft aria-hidden="true" className="size-4" />}
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function SidebarContent({ pathname, roleId, collapsed, onNavigate, onToggleCollapse, onClose }: {
  pathname: string;
  roleId: number;
  collapsed: boolean;
  onNavigate: (href: string) => void;
  onToggleCollapse?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
}) {
  const { expandedGroups, toggleGroup, expandGroup } = useAdminLayout();
  const navTree = useMemo(() => getNavTreeForRole(roleId), [roleId]);
  const { groupId: activeGroupId, itemId: activeItemId } = findActiveNavIds(pathname);

  useEffect(() => {
    if (activeGroupId) {
      expandGroup(activeGroupId);
    }
  }, [activeGroupId, expandGroup]);

  const onGroupClick = (groupId: string) => {
    // Collapsed rail: open it on this group rather than toggling an invisible list.
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
      expandGroup(groupId);
      return;
    }
    toggleGroup(groupId);
  };

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col bg-card">
        <BrandBlock collapsed={collapsed} onToggleCollapse={onToggleCollapse} onClose={onClose} />
        <nav aria-label="Admin sections" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <ul className="space-y-0.5">
            {navTree.map((entry: AdminNavEntry) =>
              isNavGroup(entry) ? (
                <SidebarGroup
                  key={entry.id}
                  group={entry}
                  activeItemId={activeItemId}
                  collapsed={collapsed}
                  expanded={expandedGroups.has(entry.id)}
                  onToggle={() => onGroupClick(entry.id)}
                  onNavigate={onNavigate}
                />
              ) : (
                <li key={entry.id}>
                  <SidebarItem
                    item={entry}
                    icon={entry.icon}
                    isActive={entry.id === activeItemId}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              ),
            )}
          </ul>
        </nav>
      </div>
    </TooltipProvider>
  );
}

/** Desktop sidebar — hidden below lg, where the Sheet takes over. */
export function AdminSidebar({ pathname, roleId, onNavigate }: AdminSidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useAdminLayout();

  return (
    <aside
      aria-label="Admin navigation"
      className={cn(
        'hidden h-screen shrink-0 border-r border-border transition-[width] duration-300 ease-in-out lg:block',
        sidebarCollapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <SidebarContent
        pathname={pathname}
        roleId={roleId}
        collapsed={sidebarCollapsed}
        onNavigate={onNavigate}
        onToggleCollapse={toggleSidebar}
      />
    </aside>
  );
}

/** Mobile sidebar content — rendered inside a Sheet */
export function AdminSidebarMobile({ pathname, roleId, onNavigate }: AdminSidebarProps) {
  const { closeMobileSidebar } = useAdminLayout();
  return (
    <SidebarContent
      pathname={pathname}
      roleId={roleId}
      collapsed={false}
      onNavigate={onNavigate}
      onClose={closeMobileSidebar}
    />
  );
}
