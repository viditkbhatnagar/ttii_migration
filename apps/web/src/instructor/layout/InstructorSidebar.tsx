import {
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useInstructorLayout } from './InstructorLayoutContext.js';
import { INSTRUCTOR_NAV_TREE, findActiveInstructorNav, type InstructorNavItem } from '../routing/instructor-nav-tree.js';
import type { AuthSession } from '@ttii/frontend-core';

// Naji UAT 2026-05-22 — sidebar restyled to match the ttiifaculty.lovable.app
// mockup: white background, solid purple pill for the active nav item,
// EduPulse Faculty Portal branding, and a Dr. Menon / Senior Faculty
// styled user badge at the bottom.

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Video,
  ClipboardCheck,
  Settings,
};

interface InstructorSidebarProps {
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
  item: InstructorNavItem;
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
        'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 text-left',
        isActive
          ? 'bg-violet-600 text-white shadow-md shadow-violet-200/60'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        collapsed && 'justify-center px-2',
      )}
      onClick={() => onNavigate(item.href)}
      title={collapsed ? item.label : undefined}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0',
            isActive ? 'text-white' : 'text-slate-500',
          )}
        />
      ) : null}
      {!collapsed ? (
        <span className={cn('truncate', isActive ? 'font-semibold' : '')}>{item.label}</span>
      ) : null}
    </button>
  );
}

function BrandHeader({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go to faculty dashboard"
      className={cn(
        'flex w-full items-center gap-2.5 px-4 py-5 hover:opacity-90 transition-opacity',
        collapsed && 'justify-center px-2',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      {!collapsed ? (
        <div className="min-w-0 text-left">
          <p className="text-sm font-bold text-slate-900">EduPulse</p>
          <p className="text-[11px] font-medium text-slate-500">Faculty Portal</p>
        </div>
      ) : null}
    </button>
  );
}

function UserBadge({
  initials,
  name,
  collapsed,
  onLogout,
}: {
  initials: string;
  name: string;
  collapsed: boolean;
  onLogout: (() => void) | undefined;
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 p-3 border-t border-slate-100">
        <div className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">
          {initials}
        </div>
        {onLogout ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            className="text-slate-500 hover:bg-red-50 hover:text-red-600"
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
    <div className="p-3 border-t border-slate-100">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-sm"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          {/* Naji UAT 2026-05-22 — "Senior Faculty" label matches the Lovable
              mockup. Kept fixed for now since we don't track seniority on users. */}
          <p className="text-[11px] text-slate-500 truncate">Senior Faculty</p>
        </div>
        {onLogout ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            className="shrink-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
            onClick={onLogout}
          >
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function InstructorSidebar({ pathname, session: _session, onNavigate, onLogout }: InstructorSidebarProps) {
  const { sidebarCollapsed, currentUser } = useInstructorLayout();
  const activeItemId = findActiveInstructorNav(pathname);

  const displayName = currentUser?.name || 'Instructor';
  const initials = currentUser?.initials ?? 'IN';

  const navItems = INSTRUCTOR_NAV_TREE;

  return (
    <aside
      aria-label="Instructor navigation"
      className={cn(
        'hidden md:flex h-screen flex-col bg-white border-r border-slate-200 transition-all duration-300',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-64',
      )}
    >
      <BrandHeader collapsed={sidebarCollapsed} onClick={() => onNavigate('/instructor/dashboard')} />

      <ScrollArea className="flex-1 min-h-0 px-3 pb-3">
        <nav aria-label="Instructor sections" className="flex flex-col gap-1">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              isActive={item.id === activeItemId}
              collapsed={sidebarCollapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </ScrollArea>

      <UserBadge initials={initials} name={displayName} collapsed={sidebarCollapsed} onLogout={onLogout} />
    </aside>
  );
}

/** Mobile sidebar content — rendered inside a Sheet */
export function InstructorSidebarMobile({ pathname, session: _session, onNavigate, onLogout }: InstructorSidebarProps) {
  const { currentUser } = useInstructorLayout();
  const activeItemId = findActiveInstructorNav(pathname);
  const displayName = currentUser?.name || 'Instructor';
  const initials = currentUser?.initials ?? 'IN';
  const navItems = INSTRUCTOR_NAV_TREE;

  return (
    <aside aria-label="Instructor navigation" className="flex h-full flex-col bg-white">
      <BrandHeader collapsed={false} onClick={() => onNavigate('/instructor/dashboard')} />
      <ScrollArea className="flex-1 min-h-0 px-3 pb-3">
        <nav aria-label="Instructor sections" className="flex flex-col gap-1">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              isActive={item.id === activeItemId}
              collapsed={false}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </ScrollArea>
      <UserBadge initials={initials} name={displayName} collapsed={false} onLogout={onLogout} />
    </aside>
  );
}
