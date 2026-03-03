import {
  Bell,
  BookOpen,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  User,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudentLayout } from './StudentLayoutContext.js';
import { STUDENT_NAV_TREE, findActiveStudentNav, type StudentNavItem } from '../routing/student-nav-tree.js';
import type { AuthSession } from '@ttii/frontend-core';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CreditCard,
  Bell,
  MessageCircle,
  User,
};

interface StudentSidebarProps {
  pathname: string;
  session: AuthSession;
  onNavigate: (href: string) => void;
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
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-white/20 text-white font-semibold'
          : 'text-white/70 hover:bg-white/10 hover:text-white',
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || 'ST';
}

export function StudentSidebar({ pathname, session, onNavigate }: StudentSidebarProps) {
  const { sidebarCollapsed } = useStudentLayout();
  const activeItemId = findActiveStudentNav(pathname);

  const studentName = (session as Record<string, unknown>).name as string | undefined;
  const displayName = studentName || 'Student';

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-ttii-primary transition-all duration-200',
        sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar-width',
      )}
    >
      {/* Brand / Student info */}
      <div className={cn('flex items-center gap-3 border-b border-white/15 px-4 py-4', sidebarCollapsed && 'justify-center px-2')}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
          {getInitials(displayName)}
        </div>
        {!sidebarCollapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-[10px] text-white/60">Student Portal</p>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {STUDENT_NAV_TREE.map((item) => (
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

      {/* Footer brand */}
      {!sidebarCollapsed ? (
        <div className="border-t border-white/15 px-4 py-3">
          <p className="text-[10px] text-white/40 text-center">TTII - Empower &middot; Educate &middot; Evolve</p>
        </div>
      ) : null}
    </aside>
  );
}
