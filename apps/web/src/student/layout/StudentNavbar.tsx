import { Bell, Menu } from 'lucide-react';
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

export function StudentNavbar({ session, onNavigate, onLogout }: StudentNavbarProps) {
  const { toggleSidebar } = useStudentLayout();

  const studentName = (session as Record<string, unknown>).name as string | undefined;
  const displayName = studentName || 'Student';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || 'ST';

  return (
    <header className="flex h-navbar-height items-center justify-between border-b border-gray-200 bg-ttii-navbar px-4">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={toggleSidebar}
        >
          <Menu className="size-5" />
        </Button>
        <span className="hidden text-sm font-medium text-white/80 sm:inline">Student Portal</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:bg-white/10"
          onClick={() => onNavigate('/student/notifications')}
        >
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-2 gap-2 text-white hover:bg-white/10">
              <Avatar className="size-8">
                <AvatarFallback className="bg-ttii-primary text-xs text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">Welcome, {displayName}!</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate('/student/profile')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
