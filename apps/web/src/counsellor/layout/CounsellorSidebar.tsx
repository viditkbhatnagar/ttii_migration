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
        // Match the admin sidebar theme: light surface, dark text, blue active.
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </p>
  );
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
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ttii-sidebar-active text-white font-bold text-xs"
        >
          {initials}
        </div>
        {onLogout ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            className="text-gray-500 hover:bg-red-50 hover:text-red-600"
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
      <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-gray-50">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ttii-sidebar-active text-white font-bold text-sm"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
          <p className="text-xs text-gray-500 truncate">Counsellor Portal</p>
        </div>
      </div>
      {onLogout ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600 hover:bg-red-50 hover:text-red-600"
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

      <div aria-hidden="true" className="my-4 border-t border-gray-200" />

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

function SidebarLogo({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: (href: string) => void }) {
  return (
    <div className={cn('flex h-20 items-center border-b border-gray-200 bg-white px-4', collapsed && 'justify-center px-2')}>
      <button
        type="button"
        onClick={() => onNavigate('/counsellor/dashboard')}
        aria-label="Go to counsellor dashboard"
        className="flex items-center hover:opacity-95 transition-opacity"
      >
        {collapsed ? (
          <img src="/logos/ttii-icon-color.svg" alt="TTII" className="h-9 w-auto" />
        ) : (
          <img
            src="/logos/ttii-full-color.svg"
            alt="Teachers' Training Institute of India"
            className="h-10 w-auto max-w-full"
          />
        )}
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
        'hidden md:flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-64',
      )}
    >
      <SidebarLogo collapsed={sidebarCollapsed} onNavigate={onNavigate} />

      <ScrollArea className="flex-1 min-h-0 py-6 px-3">
        <SidebarNav pathname={pathname} collapsed={sidebarCollapsed} onNavigate={onNavigate} />
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
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
    <div className="flex h-full flex-col bg-white">
      <SidebarLogo collapsed={false} onNavigate={onNavigate} />

      <ScrollArea className="flex-1 min-h-0 py-6 px-3">
        <SidebarNav pathname={pathname} collapsed={false} onNavigate={onNavigate} />
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
        <UserFooter displayName={displayName} initials={initials} onLogout={onLogout} collapsed={false} />
      </div>
    </div>
  );
}
