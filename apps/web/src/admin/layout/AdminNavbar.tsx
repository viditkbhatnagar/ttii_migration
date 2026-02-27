import { Bell, Calendar, Maximize, Menu, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminLayout } from './AdminLayoutContext.js';

interface AdminNavbarProps {
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function AdminNavbar({ onNavigate, onLogout }: AdminNavbarProps) {
  const { toggleSidebar } = useAdminLayout();

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

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
        <div className="hidden items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 sm:flex">
          <Search className="size-4 text-white/70" />
          <span className="text-sm text-white/70">Search...</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={toggleFullscreen}
        >
          <Maximize className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => onNavigate('/admin/global_calender/index')}
        >
          <Calendar className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => onNavigate('/admin/chat_support')}
        >
          <MessageSquare className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:bg-white/10"
          onClick={() => onNavigate('/admin/notification/index')}
        >
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-2 gap-2 text-white hover:bg-white/10">
              <Avatar className="size-8">
                <AvatarFallback className="bg-ttii-primary text-xs text-white">AD</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">Admin</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">Welcome Admin!</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate('/app/profile/index/1')}>
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
