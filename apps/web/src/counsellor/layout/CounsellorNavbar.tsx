import { useState } from 'react';
import { Bell, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

// Mirrors the Lovable prototype Topbar — welcome message (left) + search,
// notifications and account (right). Kept functional: mobile menu + sidebar
// collapse toggles, and the multi-role RoleSwitcher (renders only when the
// signed-in user has more than one role on this subdomain).
export function CounsellorNavbar({ session, onNavigate, onLogout }: CounsellorNavbarProps) {
  const { sidebarCollapsed, toggleSidebar, toggleMobileSidebar, currentUser } = useCounsellorLayout();
  const [search, setSearch] = useState('');

  const displayName = currentUser?.name || 'Counsellor';
  const firstName = displayName.split(' ')[0] || displayName;
  const initials = currentUser?.initials ?? 'CN';
  const avatarImage = currentUser?.image ?? '';

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          className="text-muted-foreground hover:text-foreground md:hidden"
          onClick={toggleMobileSidebar}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          className="hidden text-muted-foreground hover:text-foreground md:flex"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight lg:text-lg">Welcome back, {firstName}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">Here&apos;s your admissions snapshot</p>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicants, courses…"
              className="w-64 bg-background pl-9"
              aria-label="Search"
            />
          </div>

          {/* Multi-role switcher (only renders for multi-role users) */}
          <RoleSwitcher session={session} variant="light" />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Notifications">
                <Bell className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-xs text-muted-foreground">Updates on your applications and payments</p>
              </div>
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Account */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/60"
                aria-label={`Account menu for ${displayName}`}
              >
                <Avatar className="size-9">
                  {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
                  <AvatarFallback className="bg-primary-soft text-sm font-semibold text-accent-foreground">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden flex-col items-start leading-tight sm:flex">
                  <span className="text-sm font-semibold text-foreground">{displayName}</span>
                  <span className="text-[11px] text-muted-foreground">Counsellor</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate('/counsellor/settings')}>
                <User className="mr-2 size-4" aria-hidden="true" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate('/counsellor/dashboard')}>
                <LayoutDashboard className="mr-2 size-4" aria-hidden="true" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive">
                <LogOut className="mr-2 size-4" aria-hidden="true" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
