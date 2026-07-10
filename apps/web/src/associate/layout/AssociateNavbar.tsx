import { useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  CreditCard,
  FilePlus,
  FileText,
  LogOut,
  Mail,
  Menu,
  PhoneCall,
  Search,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCounsellorLayout, type CounsellorNotification } from '../../counsellor/layout/CounsellorLayoutContext.js';
import type { AuthSession } from '@ttii/frontend-core';
import { RoleSwitcher } from '@/components/RoleSwitcher';

interface AssociateNavbarProps {
  session: AuthSession;
  onLogout: () => void;
}

interface NotificationView {
  icon: LucideIcon;
  tone: string;
  title: string;
  detail: string;
  time: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const secs = Math.floor((Date.now() - t) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

function toView(n: CounsellorNotification): NotificationView {
  const type = `${n.type} ${n.title}`.toLowerCase();
  let icon: LucideIcon = FilePlus;
  let tone = 'bg-primary-soft text-accent-foreground';
  if (/paid|payment|fee|collect/.test(type)) {
    icon = CreditCard;
    tone = 'bg-warning-soft text-warning-foreground';
  } else if (/approv|enrol|convert/.test(type)) {
    icon = CheckCircle2;
    tone = 'bg-success-soft text-success';
  } else if (/reject|declin|cancel/.test(type)) {
    icon = XCircle;
    tone = 'bg-destructive-soft text-destructive';
  } else if (/form|document|submit/.test(type)) {
    icon = FileText;
    tone = 'bg-info-soft text-info';
  } else if (/call|follow|remind|contact/.test(type)) {
    icon = PhoneCall;
    tone = 'bg-info-soft text-info';
  }
  return { icon, tone, title: n.title, detail: n.detail, time: timeAgo(n.createdAt) };
}

// Mirrors the Lovable prototype Topbar — welcome message (left) + search,
// notifications and account (right). Kept functional: mobile menu toggle and
// the multi-role RoleSwitcher (renders only for users with more than one role).
export function AssociateNavbar({ session, onLogout }: AssociateNavbarProps) {
  const { toggleMobileSidebar, currentUser, notifications } = useCounsellorLayout();
  const [search, setSearch] = useState('');
  const [allRead, setAllRead] = useState(false);

  const displayName = currentUser?.name || 'Associate';
  const firstName = displayName.split(' ')[0] || displayName;
  const initials = currentUser?.initials ?? 'AS';
  const avatarImage = currentUser?.image ?? '';
  const email = currentUser?.email ?? '';

  const monthLabel = useMemo(() => new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }), []);
  const views = useMemo(() => notifications.map(toView), [notifications]);
  const unreadCount = allRead ? 0 : views.length;

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          className="text-muted-foreground hover:text-foreground lg:hidden"
          onClick={toggleMobileSidebar}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight lg:text-lg">Welcome back, {firstName}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Here&apos;s your admissions snapshot for {monthLabel}
          </p>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
                <Bell className="size-4" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="counsellor-theme w-80 p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                </div>
                {views.length > 0 ? (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAllRead(true)}>
                    Mark all read
                  </Button>
                ) : null}
              </div>
              {views.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
              ) : (
                <ul className="max-h-96 divide-y overflow-y-auto">
                  {views.map((n, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 ${
                        allRead ? '' : 'bg-primary-soft/30'
                      }`}
                    >
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${n.tone}`}>
                        <n.icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {n.detail ? <p className="truncate text-xs text-muted-foreground">{n.detail}</p> : null}
                        {n.time ? <p className="mt-0.5 text-[11px] text-muted-foreground">{n.time}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>

          {/* Account */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/60"
                aria-label={`Account menu for ${displayName}`}
              >
                <Avatar className="size-9">
                  {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
                  <AvatarFallback className="bg-primary-soft text-sm font-semibold text-accent-foreground">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden flex-col items-start leading-none sm:flex">
                  <span className="text-sm font-semibold text-foreground">{displayName}</span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground">Associate</span>
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="counsellor-theme w-72 p-0">
              <div className="flex items-center gap-3 border-b px-4 py-4">
                <Avatar className="size-10">
                  {avatarImage ? <AvatarImage src={avatarImage} alt="" /> : null}
                  <AvatarFallback className="bg-primary-soft text-sm font-semibold text-accent-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">Associate</p>
                </div>
              </div>
              {email ? (
                <div className="space-y-2 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-4" aria-hidden="true" />
                    <span className="truncate">{email}</span>
                  </div>
                </div>
              ) : null}
              <div className="border-t px-4 py-3">
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={onLogout}>
                  <LogOut className="size-3.5" aria-hidden="true" />
                  Logout
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
