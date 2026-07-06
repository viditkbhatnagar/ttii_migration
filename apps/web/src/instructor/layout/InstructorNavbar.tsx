import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, User, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInstructorLayout } from './InstructorLayoutContext.js';
import type { AuthSession } from '@ttii/frontend-core';
import { RoleSwitcher } from '@/components/RoleSwitcher';

// Naji UAT 2026-05-22 — top bar now mirrors the Lovable mockup:
// sidebar toggle (left), a pill-shaped search input (center, fills
// available width), notification bell, and the user avatar (right).
// The dashboard greeting + subtitle live inside the page itself, not
// the header, so the header stays consistent across pages.

interface InstructorNavbarProps {
  session: AuthSession;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function InstructorNavbar({ session, onNavigate, onLogout }: InstructorNavbarProps) {
  const { sidebarCollapsed, toggleSidebar, toggleMobileSidebar, currentUser } = useInstructorLayout();

  const displayName = currentUser?.name || 'Instructor';
  const initials = currentUser?.initials ?? 'IN';
  const avatarImage = currentUser?.image ?? '';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation menu"
        className="md:hidden size-10 text-slate-500 hover:text-slate-900"
        onClick={toggleMobileSidebar}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!sidebarCollapsed}
        className="hidden md:flex text-slate-500 hover:text-slate-900"
        onClick={toggleSidebar}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="size-5" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="size-5" aria-hidden="true" />
        )}
      </Button>

      {/* Naji 2026-07-06 Lovable refresh — TTII logo on mobile (desktop shows
          the brand in the sidebar). */}
      <img
        src="/logos/ttii-full-color.svg"
        alt="Teachers' Training Institute of India"
        className="h-8 w-auto object-contain md:hidden"
      />

      <div className="flex-1 mx-auto max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search cohorts, learners, classes"
            placeholder="Search cohorts, learners, classes..."
            className="w-full rounded-full border border-slate-200 bg-slate-50 px-10 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:bg-white"
          />
        </div>
      </div>

      {/* Same-subdomain role switcher (renders only for multi-role users). */}
      <RoleSwitcher session={session} variant="light" />

      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="relative text-slate-500 hover:text-slate-900"
      >
        <Bell className="size-5" aria-hidden="true" />
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 rounded-full bg-violet-500 ring-2 ring-white" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            aria-label={`Account menu for ${displayName}`}
            className="gap-0 px-0 hover:bg-transparent"
          >
            <Avatar className="size-9 ring-2 ring-violet-100">
              {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
              <AvatarFallback className="bg-violet-600 text-xs text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="faculty-portal w-48">
          <DropdownMenuItem onClick={() => onNavigate('/instructor/settings')}>
            <User className="mr-2 size-4" aria-hidden="true" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNavigate('/instructor/dashboard')}>
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
    </header>
  );
}
