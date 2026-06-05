import { useState, useEffect, useCallback } from 'react';
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, User, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudentLayout } from './StudentLayoutContext.js';
import { asString, asNumber } from '../../admin/shared/utils/admin-data-utils.js';
import { cleanNotificationText } from '../shared/notification-text.js';
import type { StudentPortalApi } from '../student-portal-api.js';
import type { AuthSession } from '@ttii/frontend-core';

interface StudentNavbarProps {
  api: StudentPortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

interface NotifItem {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
}

function formatNotifTime(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Notification bell — opens a self-contained dropdown of recent notifications
// (Naji 2026-06-05: dropdown only, no page navigation). Loads on first open and
// marks items read inline.
function NotificationBell({ api, token }: { api: StudentPortalApi; token: string }) {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await api.loadNotifications(token);
      setItems(
        (snap.notifications ?? []).slice(0, 8).map((n) => ({
          id: asString(n.id),
          title: cleanNotificationText(asString(n.title)) || 'Notification',
          description: cleanNotificationText(asString(n.description) || asString(n.message)),
          time: formatNotifTime(asString(n.created_at)),
          isRead: asNumber(n.is_read) === 1,
        })),
      );
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [api, token]);

  const unreadCount = items.filter((i) => !i.isRead).length;

  const markRead = async (id: string) => {
    setMarkingId(id);
    try {
      await api.markNotificationAsRead(token, id);
      setItems((cur) => cur.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
    } catch {
      /* ignore */
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => { if (open && !loaded) void load(); }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="View notifications"
          className="relative max-sm:size-11 text-slate-500 hover:text-student-primary hover:bg-student-primary/10"
        >
          <Bell className="size-4" aria-hidden="true" />
          {!loaded || unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-student-accent" aria-hidden="true" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <p className="text-sm font-semibold text-student-text">Notifications</p>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-student-primary/10 px-2 py-0.5 text-[11px] font-semibold text-student-primary">
              {unreadCount} new
            </span>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-student-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-student-muted">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                disabled={markingId === n.id}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!n.isRead) void markRead(n.id);
                }}
                className={`flex items-start gap-3 px-4 py-2.5 ${n.isRead ? '' : 'bg-student-primary/5'}`}
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-student-accent'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.isRead ? 'text-student-text' : 'font-semibold text-student-text'}`}>
                    {n.title}
                  </span>
                  {n.description ? (
                    <span className="mt-0.5 block line-clamp-2 text-xs text-student-muted">{n.description}</span>
                  ) : null}
                  {n.time ? <span className="mt-0.5 block text-[11px] text-slate-400">{n.time}</span> : null}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

export function StudentNavbar({ api, session, onNavigate, onLogout }: StudentNavbarProps) {
  const { sidebarCollapsed, toggleSidebar, toggleMobileSidebar, currentUser } = useStudentLayout();
  const now = useCurrentTime();

  const displayName = currentUser?.name || 'Student';
  const initials = currentUser?.initials ?? 'ST';
  const avatarImage = currentUser?.image ?? '';

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
          aria-label="Open navigation menu"
          className="md:hidden size-11 text-slate-500 hover:text-student-primary"
          onClick={toggleMobileSidebar}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          className="hidden md:flex text-student-primary hover:bg-student-primary/10"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-5" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Time display */}
        <span className="hidden sm:flex text-sm text-slate-500 mr-2">
          {formattedTime}
        </span>

        {/* Notification bell — dropdown only (Naji 2026-06-05) */}
        <NotificationBell api={api} token={session.token} />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label={`Account menu for ${displayName}`}
              className="ml-1 gap-2 text-student-text hover:bg-student-primary/10"
            >
              <Avatar className="size-8">
                {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
                <AvatarFallback className="bg-gradient-to-br from-student-accent to-student-accent/70 text-xs text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onNavigate('/student/settings')}>
              <User className="mr-2 size-4" aria-hidden="true" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('/student/help')}>
              <HelpCircle className="mr-2 size-4" aria-hidden="true" />
              Support
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
