import { ChevronDown, LogOut, Moon, Plus, Sun, User } from 'lucide-react';
import type { AuthSession } from '@ttii/frontend-core';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CentrePortalApi } from '../centre-portal-api.js';
import { getCentreNavForRole } from '../routing/centre-nav-tree.js';
import { CentreGlobalSearch } from './CentreGlobalSearch.js';
import { useCentreLayout } from './CentreLayoutContext.js';
import { CentreSupportChat } from './CentreSupportChat.js';
import { initialsOf, welcomeName } from './centre-shell-model.js';

// Naji's Topbar.tsx: "Welcome, {contact person}" + centre line, search, New
// Application, the support chat panel, the light / dark switch and the
// account menu (Profile, Log out). His notifications bell is left out: no
// notification source exists for centre logins (nothing would be real).

/** One line to switch the dark theme off for the whole centre portal. */
export const CENTRE_DARK_MODE_ENABLED = true;

export const NEW_APPLICATION_HREF = '/centre/applications?new=1';

interface Props {
  api: CentrePortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function CentreTopbar({ api, session, onNavigate, onLogout }: Props) {
  const { shell, theme, toggleTheme } = useCentreLayout();
  const name = welcomeName(shell, '');
  const nav = getCentreNavForRole(session.roleId);
  const canApply = nav.some((i) => i.id === 'applications');
  const canProfile = nav.some((i) => i.id === 'profile');
  const subline = shell.centre ? [shell.centre.name, shell.centre.code].filter(Boolean).join(' · ') : '';
  const roleLine = shell.centre?.designation || (session.roleId === 10 ? 'Associate' : 'Centre login');

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4 lg:px-8">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight lg:text-lg">{name ? `Welcome, ${name}` : 'Welcome'}</p>
          {subline ? <p className="hidden truncate text-xs text-muted-foreground sm:block">{subline}</p> : null}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <CentreGlobalSearch api={api} session={session} onNavigate={onNavigate} />
          {canApply ? (
            <Button className="shrink-0 gap-1.5 max-sm:size-9 max-sm:px-0" onClick={() => onNavigate(NEW_APPLICATION_HREF)} aria-label="New Application">
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">New Application</span>
            </Button>
          ) : null}
          <CentreSupportChat api={api} session={session} />
          {CENTRE_DARK_MODE_ENABLED ? (
            <Button
              variant="outline"
              size="icon"
              className="hidden shrink-0 sm:inline-flex"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="flex items-center gap-2.5 rounded-lg border border-transparent px-1.5 py-1 text-left transition-colors hover:border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary-soft font-semibold text-accent-foreground">{initialsOf(name)}</AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 flex-col leading-tight md:flex">
                  <span className="max-w-40 truncate text-sm font-semibold text-foreground">{name || 'Centre'}</span>
                  <span className="max-w-40 truncate text-xs text-muted-foreground">{roleLine}</span>
                </span>
                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{shell.centre?.name || 'Centre Portal'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canProfile ? (
                <DropdownMenuItem onSelect={() => onNavigate('/centre/profile')}>
                  <User aria-hidden="true" className="h-4 w-4" /> Profile
                </DropdownMenuItem>
              ) : null}
              {CENTRE_DARK_MODE_ENABLED ? (
                <DropdownMenuItem className="sm:hidden" onSelect={toggleTheme}>
                  {theme === 'dark' ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
                  {theme === 'dark' ? 'Light theme' : 'Dark theme'}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onLogout}>
                <LogOut aria-hidden="true" className="h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
