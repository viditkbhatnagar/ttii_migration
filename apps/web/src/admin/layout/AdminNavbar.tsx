import { useEffect, useState } from 'react';
import { Bell, Calendar, Maximize, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { AuthSession } from '@ttii/frontend-core';
import type { AdminPortalApi } from '../admin-portal-api.js';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminLayout } from './AdminLayoutContext.js';
import { RoleSwitcher } from '@/components/RoleSwitcher';

interface AdminNavbarProps {
  onNavigate: (href: string) => void;
  onLogout: () => void;
  api: AdminPortalApi;
  session: AuthSession;
}

const ROLE_LABELS: Record<number, string> = {
  1: 'Super Admin',
  2: 'Student',
  3: 'Instructor',
  4: 'Centre',
  7: 'Centre',
  8: 'Admin',
  9: 'Counsellor',
  10: 'Associate',
};

function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AD'
  );
}

export function AdminNavbar({ onNavigate, onLogout, api, session }: AdminNavbarProps) {
  const { sidebarCollapsed, toggleSidebar, toggleMobileSidebar } = useAdminLayout();
  const [profile, setProfile] = useState<{ name: string; email: string; image: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await api.loadMyProfile(session.token);
        if (!cancelled) setProfile({ name: me.name, email: me.email, image: me.image });
      } catch {
        if (!cancelled) setProfile({ name: '', email: '', image: '' });
      }
    })();
    return () => { cancelled = true; };
  }, [api, session.token]);

  const roleLabel = ROLE_LABELS[session.roleId] ?? 'User';
  const displayName = profile?.name?.trim() || 'Admin';
  const firstName = displayName.split(' ')[0] || displayName;

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
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          className="md:hidden size-11 text-white hover:bg-white/10"
          onClick={toggleMobileSidebar}
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          className="hidden md:flex text-white hover:bg-white/10"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-5" />
          )}
        </Button>

        {/* Welcome message — replaces the fake search chip per Naji 2026-04-30.
            Greets by first name when available, falls back to "Admin". */}
        <div className="hidden sm:flex flex-col leading-tight text-white">
          <span className="text-[11px] uppercase tracking-wide text-white/70">{roleLabel}</span>
          <span className="text-sm font-medium">Welcome back, {firstName}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Same-subdomain role switcher (renders only for multi-role users). */}
        <RoleSwitcher session={session} variant="dark" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle fullscreen"
          className="hidden sm:flex text-white hover:bg-white/10"
          onClick={toggleFullscreen}
        >
          <Maximize aria-hidden="true" className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open calendar"
          className="hidden sm:flex text-white hover:bg-white/10"
          onClick={() => onNavigate('/admin/global_calender/index')}
        >
          <Calendar aria-hidden="true" className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Chat support"
          className="max-sm:size-11 text-white hover:bg-white/10"
          onClick={() => onNavigate('/admin/chat_support')}
        >
          <MessageSquare aria-hidden="true" className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="View notifications"
          className="relative max-sm:size-11 text-white hover:bg-white/10"
          onClick={() => onNavigate('/admin/notification/index')}
        >
          <Bell aria-hidden="true" className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" aria-label="Account menu" className="ml-2 gap-2 text-white hover:bg-white/10">
              <Avatar className="size-8">
                {profile?.image ? <AvatarImage src={profile.image} alt={displayName} /> : null}
                <AvatarFallback className="bg-ttii-primary text-xs text-white">{initialsOf(displayName)}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col text-left leading-tight sm:flex">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-[11px] text-white/70">{roleLabel}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{displayName}</p>
              {profile?.email ? <p className="text-xs text-muted-foreground truncate">{profile.email}</p> : null}
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{roleLabel}</p>
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
