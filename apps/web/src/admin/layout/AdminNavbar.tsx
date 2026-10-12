import { useEffect, useState, type ReactNode } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  KeyRound,
  LogOut,
  Maximize,
  Menu,
  MessageSquare,
  Settings,
  User,
} from 'lucide-react';
import type { AuthSession } from '@ttii/frontend-core';
import type { AdminPortalApi } from '../admin-portal-api.js';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { useAdminLayout } from './AdminLayoutContext.js';
import { AdminGlobalSearch } from './AdminGlobalSearch.js';
import { ChangePasswordDialog, MyProfileDialog } from './AdminAccountDialogs.js';
import { initialsOf, roleLabelOf } from './account-model.js';

// Naji's admin Navbar (2026-10-12): a light, blurred bar with the global search
// on the left and icon buttons + the profile menu on the right. Our own
// shortcuts (role switcher, fullscreen, calendar, chat support) keep their
// place in his icon style; the bell still opens the Notifications page (there
// is no admin notification inbox to drop down).

const SETTINGS_HREF = '/admin/settings/system_settings';

interface AdminNavbarProps {
  onNavigate: (href: string) => void;
  onLogout: () => void;
  api: AdminPortalApi;
  session: AuthSession;
}

interface Profile { name: string; email: string; image: string }

function NavIconButton({ label, onClick, className, children }: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function useMyProfile(api: AdminPortalApi, token: string): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await api.loadMyProfile(token);
        if (!cancelled) setProfile({ name: me.name, email: me.email, image: me.image });
      } catch {
        // The navbar must render without it; fall back to a generic name.
        if (!cancelled) setProfile({ name: '', email: '', image: '' });
      }
    })();
    return () => { cancelled = true; };
  }, [api, token]);
  return profile;
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen();
  }
}

export function AdminNavbar({ onNavigate, onLogout, api, session }: AdminNavbarProps) {
  const { toggleMobileSidebar } = useAdminLayout();
  const profile = useMyProfile(api, session.token);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const roleLabel = roleLabelOf(session.roleId);
  const displayName = profile?.name?.trim() || 'Admin';
  const initials = initialsOf(displayName);

  return (
    <TooltipProvider delayDuration={200}>
      <header className="sticky top-0 z-30 w-full shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="flex h-16 w-full min-w-0 items-center justify-between gap-2 px-2 sm:gap-4 sm:px-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={toggleMobileSidebar}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition hover:bg-secondary lg:hidden"
            >
              <Menu aria-hidden="true" className="size-4" />
            </button>
            <AdminGlobalSearch api={api} token={session.token} roleId={session.roleId} onNavigate={onNavigate} />
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {/* Same-subdomain role switcher (renders only for multi-role users). */}
            <RoleSwitcher session={session} variant="light" />
            <NavIconButton label="Toggle fullscreen" onClick={toggleFullscreen} className="hidden sm:inline-flex">
              <Maximize aria-hidden="true" className="size-4" />
            </NavIconButton>
            <NavIconButton label="Calendar" onClick={() => onNavigate('/admin/global_calender/index')} className="hidden sm:inline-flex">
              <CalendarDays aria-hidden="true" className="size-4" />
            </NavIconButton>
            <NavIconButton label="Chat support" onClick={() => onNavigate('/admin/chat_support')}>
              <MessageSquare aria-hidden="true" className="size-4" />
            </NavIconButton>
            <NavIconButton label="Notifications" onClick={() => onNavigate('/admin/notification/index')}>
              <Bell aria-hidden="true" className="size-4" />
            </NavIconButton>
            <NavIconButton label="Settings" onClick={() => onNavigate(SETTINGS_HREF)} className="hidden sm:inline-flex">
              <Settings aria-hidden="true" className="size-4" />
            </NavIconButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="ml-1 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card p-1 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:pr-3"
                >
                  <Avatar className="size-7 rounded-lg">
                    {profile?.image ? <AvatarImage src={profile.image} alt="" className="rounded-lg object-cover" /> : null}
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden min-w-0 text-left leading-tight sm:block">
                    <span className="block max-w-[10rem] truncate text-xs font-semibold text-foreground">{displayName}</span>
                    <span className="block text-[10px] text-muted-foreground">{roleLabel}</span>
                  </span>
                  <ChevronDown aria-hidden="true" className="hidden size-3.5 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  {profile?.email ? <p className="truncate text-[11px] font-normal text-muted-foreground">{profile.email}</p> : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User aria-hidden="true" className="mr-2 size-4" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                  <KeyRound aria-hidden="true" className="mr-2 size-4" /> Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate(SETTINGS_HREF)}>
                  <Settings aria-hidden="true" className="mr-2 size-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                  <LogOut aria-hidden="true" className="mr-2 size-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <MyProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          profile={{ name: profile?.name?.trim() ?? '', email: profile?.email ?? '', image: profile?.image ?? '', roleLabel, initials }}
          onChangePassword={() => { setProfileOpen(false); setPasswordOpen(true); }}
        />
        <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} api={api} token={session.token} />
      </header>
    </TooltipProvider>
  );
}
