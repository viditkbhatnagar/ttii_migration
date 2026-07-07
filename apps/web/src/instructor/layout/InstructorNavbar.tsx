import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

      {/* Naji 2026-07-07 — Lovable top bar: search + bell + profile all pushed
          to the right. */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search — Lovable pill (fixed width, right-aligned, desktop only). */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search cohorts, learners, classes"
            placeholder="Search cohorts, learners, classes…"
            className="h-9 w-72 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          />
        </div>

        {/* Same-subdomain role switcher (renders only for multi-role users). */}
        <RoleSwitcher session={session} variant="light" />

        {/* Notifications — a dropdown so the bell is not a dead click. No
            notifications backend yet, so it shows an empty state. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative rounded-full text-slate-500 hover:text-slate-900"
            >
              <Bell className="size-5" aria-hidden="true" />
              <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 rounded-full bg-violet-500 ring-2 ring-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="faculty-portal w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile — flat initials circle (matches the Lovable), dropdown with
            name/email + logout. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account menu for ${displayName}`}
              className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {avatarImage ? (
                <img src={avatarImage} alt="" className="size-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="faculty-portal w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">{displayName}</span>
                {currentUser?.email ? (
                  <span className="text-xs font-normal text-slate-500">{currentUser.email}</span>
                ) : null}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate('/instructor/settings')}>
              <User className="mr-2 size-4" aria-hidden="true" />
              Profile
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
