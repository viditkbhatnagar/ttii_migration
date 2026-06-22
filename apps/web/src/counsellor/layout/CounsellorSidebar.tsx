import type { ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  CreditCard,
  FileBarChart2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  PlayCircle,
  Settings,
  Share2,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useCounsellorLayout } from './CounsellorLayoutContext.js';
import { COUNSELLOR_NAV_TREE, findActiveCounsellorNav, type CounsellorNavItem } from '../routing/counsellor-nav-tree.js';
import type { AuthSession } from '@ttii/frontend-core';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  GraduationCap,
  BarChart3,
  BookOpen,
  CreditCard,
  PlayCircle,
  FileBarChart2,
  Target,
  Share2,
  Settings,
};

interface CounsellorSidebarProps {
  pathname: string;
  session: AuthSession;
  onNavigate: (href: string) => void;
  onLogout?: () => void;
}

// Lovable prototype sidebar — deep navy (#0B2758), orange (#F47C2C) active item.
function SidebarNavItem({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: CounsellorNavItem;
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

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-cn-sidebar-fg/50">{children}</p>;
}

function UserFooter({
  displayName,
  initials,
  onLogout,
  collapsed,
}: {
  displayName: string;
  initials: string;
  onLogout?: (() => void) | undefined;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          aria-label={displayName}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cn-orange text-xs font-bold text-white"
        >
          {initials}
        </div>
        {onLogout ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            className="text-cn-sidebar-fg hover:bg-white/10 hover:text-white"
            onClick={onLogout}
            title="Log out"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cn-orange text-sm font-bold text-white"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          <p className="truncate text-xs text-cn-sidebar-fg/70">Counsellor Portal</p>
        </div>
      </div>
      {onLogout ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-cn-sidebar-fg hover:bg-white/10 hover:text-white"
          onClick={onLogout}
        >
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          <span className="text-sm font-medium">Log out</span>
        </Button>
      ) : null}
    </>
  );
}

function SidebarNav({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  const activeItemId = findActiveCounsellorNav(pathname);
  const generalItems = COUNSELLOR_NAV_TREE.filter((item) => item.section === 'general');
  const toolsItems = COUNSELLOR_NAV_TREE.filter((item) => item.section === 'tools');

  return (
    <nav aria-label="Counsellor sections" className="flex flex-col gap-1">
      {!collapsed ? <SectionLabel>General</SectionLabel> : null}
      {generalItems.map((item) => (
        <SidebarNavItem
          key={item.id}
          item={item}
          isActive={item.id === activeItemId}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}

      <div aria-hidden="true" className="my-4 border-t border-cn-navy-2" />

      {!collapsed ? <SectionLabel>Tools</SectionLabel> : null}
      {toolsItems.map((item) => (
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

// Navy header with the orange app mark + TTII wordmark + tagline (Lovable look).
function SidebarLogo({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: (href: string) => void }) {
  return (
    <div className={cn('flex h-16 items-center gap-2 border-b border-cn-navy-2 px-4', collapsed && 'justify-center px-2')}>
      <button
        type="button"
        onClick={() => onNavigate('/counsellor/dashboard')}
        aria-label="Go to counsellor dashboard"
        className="flex items-center gap-2 transition-opacity hover:opacity-95"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cn-orange text-white">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        {!collapsed ? (
          <span className="text-left leading-tight">
            <span className="block text-sm font-semibold text-white">TTII</span>
            <span className="block text-[10px] text-cn-sidebar-fg/70">Empower • Educate • Evolve</span>
          </span>
        ) : null}
      </button>
    </div>
  );
}

export function CounsellorSidebar({ pathname, session: _session, onNavigate, onLogout }: CounsellorSidebarProps) {
  const { sidebarCollapsed, currentUser } = useCounsellorLayout();
  const displayName = currentUser?.name || 'Counsellor';
  const initials = currentUser?.initials ?? 'CN';

  return (
    <aside
      aria-label="Counsellor navigation"
      className={cn(
        'hidden h-screen flex-col border-r border-cn-navy-2 bg-cn-navy transition-all duration-200 md:flex',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-64',
      )}
    >
      <SidebarLogo collapsed={sidebarCollapsed} onNavigate={onNavigate} />

      <ScrollArea className="min-h-0 flex-1 px-3 py-6">
        <SidebarNav pathname={pathname} collapsed={sidebarCollapsed} onNavigate={onNavigate} />
      </ScrollArea>

      <div className="border-t border-cn-navy-2 p-4">
        <UserFooter displayName={displayName} initials={initials} onLogout={onLogout} collapsed={sidebarCollapsed} />
      </div>
    </aside>
  );
}

export function CounsellorSidebarMobile({ pathname, session: _session, onNavigate, onLogout }: CounsellorSidebarProps) {
  const { currentUser } = useCounsellorLayout();
  const displayName = currentUser?.name || 'Counsellor';
  const initials = currentUser?.initials ?? 'CN';

  return (
    <div className="flex h-full flex-col bg-cn-navy">
      <SidebarLogo collapsed={false} onNavigate={onNavigate} />

      <ScrollArea className="min-h-0 flex-1 px-3 py-6">
        <SidebarNav pathname={pathname} collapsed={false} onNavigate={onNavigate} />
      </ScrollArea>

      <div className="border-t border-cn-navy-2 p-4">
        <UserFooter displayName={displayName} initials={initials} onLogout={onLogout} collapsed={false} />
      </div>
    </div>
  );
}
