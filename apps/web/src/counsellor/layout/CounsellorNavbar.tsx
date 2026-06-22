import { useState, useEffect } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, User, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCounsellorLayout } from './CounsellorLayoutContext.js';
import type { AuthSession } from '@ttii/frontend-core';
import { RoleSwitcher } from '@/components/RoleSwitcher';

interface CounsellorNavbarProps {
  session: AuthSession;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

export function CounsellorNavbar({ session, onNavigate, onLogout }: CounsellorNavbarProps) {
  const { sidebarCollapsed, toggleSidebar, toggleMobileSidebar, currentUser } = useCounsellorLayout();
  const now = useCurrentTime();

  const displayName = currentUser?.name || 'Counsellor';
  const firstName = displayName.split(' ')[0] || displayName;
  const initials = currentUser?.initials ?? 'CN';
  const avatarImage = currentUser?.image ?? '';

  const formattedTime =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ', ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cn-border bg-white/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          className="size-11 text-slate-500 hover:text-cn-navy md:hidden"
          onClick={toggleMobileSidebar}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          className="hidden text-cn-navy hover:bg-cn-navy/10 md:flex"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-5" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden="true" />
          )}
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 lg:text-lg">
            Welcome back, {firstName}
          </h1>
          <p className="hidden text-xs text-cn-muted-fg sm:block">Here&apos;s your admissions snapshot</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Same-subdomain role switcher (renders only for multi-role users). */}
        <RoleSwitcher session={session} variant="light" />

        <span className="mr-2 hidden text-sm text-cn-muted-fg lg:flex">{formattedTime}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label={`Account menu for ${displayName}`}
              className="ml-1 gap-2 text-slate-700 hover:bg-cn-navy/5"
            >
              <Avatar className="size-8">
                {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
                <AvatarFallback className="bg-cn-orange text-xs font-semibold text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onNavigate('/counsellor/settings')}>
              <User className="mr-2 size-4" aria-hidden="true" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('/counsellor/dashboard')}>
              <HelpCircle className="mr-2 size-4" aria-hidden="true" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-500">
              <LogOut className="mr-2 size-4" aria-hidden="true" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
