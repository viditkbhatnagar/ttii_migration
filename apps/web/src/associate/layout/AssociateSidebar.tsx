import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileBarChart2,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  PlayCircle,
  Settings,
  Share2,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAssociateLayout } from './AssociateLayoutContext.js';
import { ASSOCIATE_NAV_TREE, findActiveAssociateNav, type AssociateNavItem } from '../routing/associate-nav-tree.js';
import type { AuthSession } from '@ttii/frontend-core';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  GraduationCap,
  BarChart3,
  BookOpen,
  CreditCard,
  PlayCircle,
  FolderOpen,
  FileBarChart2,
  Target,
  Share2,
  Settings,
};

interface AssociateSidebarProps {
  pathname: string;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

// Lovable prototype sidebar — deep navy (#0B2758), orange (#F47C2C) active item.
function SidebarNavItem({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: AssociateNavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  const Icon = ICON_MAP[item.icon];

  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-cn-orange text-white shadow-sm'
          : 'text-cn-sidebar-fg hover:bg-cn-navy-2 hover:text-white',
        collapsed && 'justify-center px-2',
      )}
      onClick={() => onNavigate(item.href)}
      title={collapsed ? item.label : undefined}
    >
      {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </button>
  );
}

// Flat list — matches the counsellor prototype exactly (no General/Tools sections).
function SidebarNav({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  const activeItemId = findActiveAssociateNav(pathname);
  return (
    <nav aria-label="Associate sections" className="flex flex-col gap-1">
      {ASSOCIATE_NAV_TREE.map((item) => (
        <SidebarNavItem
          key={item.id}
          item={item}
          isActive={item.id === activeItemId}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

// Navy header with the orange app mark + TTII wordmark + tagline + collapse chevron.
function SidebarLogo({
  collapsed,
  onNavigate,
  onToggle,
}: {
  collapsed: boolean;
  onNavigate: (href: string) => void;
  onToggle?: () => void;
}) {
  return (
    <div className={cn('flex h-16 items-center gap-2 border-b border-cn-navy-2 px-4', collapsed && 'justify-center px-2')}>
      <button
        type="button"
        onClick={() => onNavigate('/associate/dashboard')}
        aria-label="Go to associate dashboard"
        className="flex items-center gap-2 transition-opacity hover:opacity-95"
      >
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cn-orange">
          <img src="/logos/ttii-icon-white.svg" alt="TTII" className="size-6" />
        </span>
        {!collapsed ? (
          <span className="text-left leading-tight">
            <span className="block text-sm font-semibold text-white">TTII</span>
            <span className="block text-[10px] text-cn-sidebar-fg/70">Empower • Educate • Evolve</span>
          </span>
        ) : null}
      </button>
      {!collapsed && onToggle ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Collapse sidebar"
          className="ml-auto h-7 w-7 shrink-0 text-cn-sidebar-fg hover:bg-cn-navy-2 hover:text-white"
          onClick={onToggle}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

// Footer — orange "Monthly Goal" progress card (real target achievement %).
function MonthlyGoalFooter({ collapsed, pct, onToggle }: { collapsed: boolean; pct: number; onToggle?: () => void }) {
  if (collapsed) {
    return onToggle ? (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Expand sidebar"
        title="Expand sidebar"
        className="h-9 w-full text-cn-sidebar-fg hover:bg-cn-navy-2 hover:text-white"
        onClick={onToggle}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    ) : null;
  }

  const safe = Math.min(100, Math.max(0, Math.round(pct)));
  return (
    <div className="rounded-lg bg-cn-orange p-3 text-white">
      <p className="text-xs font-medium opacity-90">Monthly Goal</p>
      <p className="text-lg font-bold">{safe}% Complete</p>
      <div className="mt-2 h-1.5 rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export function AssociateSidebar({ pathname, session: _session, onNavigate }: AssociateSidebarProps) {
  const { sidebarCollapsed, toggleSidebar, monthlyGoalPct } = useAssociateLayout();

  return (
    <aside
      aria-label="Associate navigation"
      className={cn(
        'hidden h-screen flex-col border-r border-cn-navy-2 bg-cn-navy transition-all duration-300 lg:flex',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-64',
      )}
    >
      <SidebarLogo collapsed={sidebarCollapsed} onNavigate={onNavigate} onToggle={toggleSidebar} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          <SidebarNav pathname={pathname} collapsed={sidebarCollapsed} onNavigate={onNavigate} />
        </div>
      </ScrollArea>

      <div className={cn('border-t border-cn-navy-2', sidebarCollapsed ? 'p-2' : 'p-4')}>
        <MonthlyGoalFooter collapsed={sidebarCollapsed} pct={monthlyGoalPct ?? 0} onToggle={toggleSidebar} />
      </div>
    </aside>
  );
}

export function AssociateSidebarMobile({ pathname, session: _session, onNavigate }: AssociateSidebarProps) {
  const { monthlyGoalPct } = useAssociateLayout();

  return (
    <div className="flex h-full flex-col bg-cn-navy">
      <SidebarLogo collapsed={false} onNavigate={onNavigate} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          <SidebarNav pathname={pathname} collapsed={false} onNavigate={onNavigate} />
        </div>
      </ScrollArea>

      <div className="border-t border-cn-navy-2 p-4">
        <MonthlyGoalFooter collapsed={false} pct={monthlyGoalPct ?? 0} />
      </div>
    </div>
  );
}
