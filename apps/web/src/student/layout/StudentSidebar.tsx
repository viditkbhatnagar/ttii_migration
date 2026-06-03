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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStudentLayout } from './StudentLayoutContext.js';
import { STUDENT_NAV_TREE, findActiveStudentNav, type StudentNavItem } from '../routing/student-nav-tree.js';
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
          ? 'bg-white/10 text-white shadow-lg'
          : 'text-white/60 hover:bg-white/5 hover:text-white',
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
            isActive
              ? 'text-student-accent'
              : 'text-white/50 group-hover:text-white/80',
          )}
        />
      ) : null}
      {!collapsed ? (
        <>
          <span className={cn('truncate', isActive ? 'font-semibold' : '')}>{item.label}</span>
          {isActive ? (
            <span aria-hidden="true" className="ml-auto size-1.5 shrink-0 rounded-full bg-student-accent" />
          ) : null}
        </>
      ) : null}
    </button>
  );
}

export function StudentSidebar({ pathname, session: _session, onNavigate, onLogout }: StudentSidebarProps) {
  const { sidebarCollapsed, currentUser } = useStudentLayout();
  const activeItemId = findActiveStudentNav(pathname);

  const displayName = currentUser?.name || 'Student';
  const initials = currentUser?.initials ?? 'ST';
  const avatarImage = currentUser?.image ?? '';

  const generalItems = STUDENT_NAV_TREE.filter((item) => item.section === 'general');
  const toolsItems = STUDENT_NAV_TREE.filter((item) => item.section === 'tools');

  return (
    <aside
      aria-label="Student navigation"
      className={cn(
        'hidden md:flex h-screen flex-col bg-gradient-to-b from-student-sidebar-from to-student-sidebar-to shadow-2xl transition-all duration-300',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-64',
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        'flex h-20 items-center border-b border-white/10 bg-white px-4',
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
        <nav aria-label="Student sections" className="flex flex-col gap-1">
          {/* General Section */}
          {!sidebarCollapsed ? (
            <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
              General
            </p>
          ) : null}
          {generalItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              isActive={item.id === activeItemId}
              collapsed={sidebarCollapsed}
              onNavigate={onNavigate}
            />
          ))}

          {/* Divider */}
          <div aria-hidden="true" className="my-5 border-t border-white/10" />

          {/* Tools Section */}
          {!sidebarCollapsed ? (
            <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
              Tools
            </p>
          ) : null}
          {toolsItems.map((item) => (
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

      {/* User Profile Card */}
      <div className="p-4 border-t border-white/10">
        {!sidebarCollapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-white/5">
              <Avatar className="size-10 shrink-0 shadow-lg">
                {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
                <AvatarFallback className="bg-gradient-to-br from-student-accent to-student-accent-light text-white font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-white/50 truncate">Student Portal</p>
              </div>
            </div>
            {onLogout ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/50 hover:bg-red-500/20 hover:text-red-400"
                onClick={onLogout}
              >
                <LogOut className="mr-2 size-4" aria-hidden="true" />
                <span className="text-sm font-medium">Log out</span>
              </Button>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="size-9 shrink-0 shadow-lg" aria-label={displayName}>
              {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
              <AvatarFallback className="bg-gradient-to-br from-student-accent to-student-accent-light text-white font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            {onLogout ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Log out"
                className="text-white/50 hover:bg-red-500/20 hover:text-red-400"
                onClick={onLogout}
                title="Log out"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

/** Mobile sidebar content — rendered inside a Sheet */
export function StudentSidebarMobile({ pathname, session: _session, onNavigate, onLogout }: StudentSidebarProps) {
  const { currentUser } = useStudentLayout();
  const activeItemId = findActiveStudentNav(pathname);
  const displayName = currentUser?.name || 'Student';
  const initials = currentUser?.initials ?? 'ST';
  const avatarImage = currentUser?.image ?? '';

  const generalItems = STUDENT_NAV_TREE.filter((item) => item.section === 'general');
  const toolsItems = STUDENT_NAV_TREE.filter((item) => item.section === 'tools');

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-student-sidebar-from to-student-sidebar-to">
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-white/10 bg-white px-4">
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
        <nav aria-label="Student sections" className="flex flex-col gap-1">
          <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
            General
          </p>
          {generalItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              isActive={item.id === activeItemId}
              collapsed={false}
              onNavigate={onNavigate}
            />
          ))}

          <div aria-hidden="true" className="my-5 border-t border-white/10" />

          <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
            Tools
          </p>
          {toolsItems.map((item) => (
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

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-white/5">
          <Avatar className="size-10 shrink-0 shadow-lg">
            {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
            <AvatarFallback className="bg-gradient-to-br from-student-accent to-student-accent-light text-white font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs text-white/50 truncate">Student Portal</p>
          </div>
        </div>
        {onLogout ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/50 hover:bg-red-500/20 hover:text-red-400"
            onClick={onLogout}
          >
            <LogOut className="mr-2 size-4" aria-hidden="true" />
            <span className="text-sm font-medium">Log out</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
