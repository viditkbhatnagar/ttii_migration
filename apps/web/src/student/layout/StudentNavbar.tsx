import { useState, useEffect } from 'react';
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, User, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudentLayout } from './StudentLayoutContext.js';
import type { AuthSession } from '@ttii/frontend-core';

interface StudentNavbarProps {
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

export function StudentNavbar({ session, onNavigate, onLogout }: StudentNavbarProps) {
  const { sidebarCollapsed, toggleSidebar, toggleMobileSidebar } = useStudentLayout();
  const now = useCurrentTime();

  const displayName = 'Student';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || 'ST';

  const formattedTime = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ', ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 backdrop-blur-md">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-slate-500 hover:text-student-primary"
          onClick={toggleMobileSidebar}
        >
          <Menu className="size-5" />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex text-student-primary hover:bg-student-primary/10"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Time display */}
        <span className="hidden sm:flex text-sm text-slate-500 mr-2">
          {formattedTime}
        </span>

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500 hover:text-student-primary hover:bg-student-primary/10"
          onClick={() => onNavigate('/student/notifications')}
        >
          <Bell className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-student-accent" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 gap-2 text-student-text hover:bg-student-primary/10">
              <Avatar className="size-8">
                <AvatarFallback className="bg-gradient-to-br from-[#FF7F11] to-[#ff9a44] text-xs text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onNavigate('/student/settings')}>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('/student/help')}>
              <HelpCircle className="mr-2 size-4" />
              Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-500">
              <LogOut className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
