import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudentLayout } from './StudentLayoutContext.js';
import {
  STUDENT_NAV_TREE,
  STUDENT_NAV_SECTIONS,
  findActiveStudentNav,
  type StudentNavItem,
} from '../routing/student-nav-tree.js';
import type { AuthSession } from '@ttii/frontend-core';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  Radio,
  ClipboardList,
  FileText,
  GraduationCap,
  CreditCard,
  CalendarDays,
  Award,
  Settings,
  HelpCircle,
};

interface StudentSidebarProps {
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
  item: StudentNavItem;
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
        'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group text-left',
        isActive
          ? 'bg-student-primary text-white shadow-sm'
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
            'size-5 shrink-0 transition-colors duration-200',
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600',
          )}
        />
      ) : null}
      {!collapsed ? (
        <span className={cn('truncate', isActive ? 'font-semibold' : '')}>{item.label}</span>
      ) : null}
    </button>
  );
}

/** The three nav groups (Learning / Account / System) — shared by desktop + mobile. */
function SidebarNavGroups({
  activeItemId,
  collapsed,
  onNavigate,
}: {
  activeItemId: string | null;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <nav aria-label="Student sections" className="flex flex-col gap-1">
      {STUDENT_NAV_SECTIONS.map((section, idx) => {
        const items = STUDENT_NAV_TREE.filter((item) => item.section === section.key);
        if (items.length === 0) return null;
        return (
          <div key={section.key} className="flex flex-col gap-1">
            {idx > 0 ? <div aria-hidden="true" className="my-5 border-t border-slate-200" /> : null}
            {!collapsed ? (
              <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {section.label}
              </p>
            ) : null}
            {items.map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                isActive={item.id === activeItemId}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

export function StudentSidebar({
  pathname,
  session: _session,
  onNavigate,
  onLogout,
}: StudentSidebarProps) {
  const { sidebarCollapsed } = useStudentLayout();
  const activeItemId = findActiveStudentNav(pathname);

  return (
    <aside
      aria-label="Student navigation"
      className={cn(
        'hidden md:flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-64',
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        'flex h-20 items-center border-b border-slate-200 bg-white px-4',
        sidebarCollapsed && 'justify-center px-2',
      )}>
        <button
          type="button"
          onClick={() => onNavigate('/student/dashboard')}
          aria-label="Go to student dashboard"
          className="flex items-center hover:opacity-95 transition-opacity"
        >
          {sidebarCollapsed ? (
            <img
              src="/logos/ttii-icon-color.svg"
              alt="TTII"
              className="h-9 w-auto"
            />
          ) : (
            <img
              src="/logos/ttii-full-color.svg"
              alt="Teachers' Training Institute of India"
              className="h-10 w-auto max-w-full"
            />
          )}
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 py-6 px-3">
        <SidebarNavGroups
          activeItemId={activeItemId}
          collapsed={sidebarCollapsed}
          onNavigate={onNavigate}
        />
      </ScrollArea>

      {/* Logout */}
      {onLogout ? (
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            title={sidebarCollapsed ? 'Log out' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600',
              sidebarCollapsed && 'justify-center px-2',
            )}
          >
            <LogOut aria-hidden="true" className="size-5 shrink-0" />
            {!sidebarCollapsed ? <span>Log out</span> : null}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

/** Mobile sidebar content — rendered inside a Sheet */
export function StudentSidebarMobile({
  pathname,
  session: _session,
  onNavigate,
  onLogout,
}: StudentSidebarProps) {
  const activeItemId = findActiveStudentNav(pathname);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-slate-200 bg-white px-4">
        <button
          type="button"
          onClick={() => onNavigate('/student/dashboard')}
          aria-label="Go to student dashboard"
          className="flex items-center hover:opacity-95 transition-opacity"
        >
          <img
            src="/logos/ttii-full-color.svg"
            alt="Teachers' Training Institute of India"
            className="h-10 w-auto max-w-full"
          />
        </button>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 min-h-0 py-6 px-3">
        <SidebarNavGroups activeItemId={activeItemId} collapsed={false} onNavigate={onNavigate} />
      </ScrollArea>

      {/* Logout */}
      {onLogout ? (
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut aria-hidden="true" className="size-5 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
