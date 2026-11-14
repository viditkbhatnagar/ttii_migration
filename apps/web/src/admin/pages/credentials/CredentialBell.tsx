import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { dmyAny, type NoticeRow } from './credential-delivery-model.js';

// The navbar bell for users holding credentials.access: Credential admin /
// Management notices with an unread badge; clicking one marks it read and opens
// Delivery Tracking. Anyone else (the feed answers 403) keeps the plain bell
// that opens the Notifications page.

const BELL_CLASS = 'relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';
const POLL_MS = 120_000;

export function CredentialBell({ api, token, onNavigate }: { api: AdminPortalApi; token: string; onNavigate: (href: string) => void }) {
  const [feed, setFeed] = useState<{ rows: NoticeRow[]; unread: number } | null>(null);

  const denied = useRef(false);
  const load = useCallback(async () => {
    if (denied.current) return;
    try {
      const data = await api.credNotifications(token);
      setFeed({ rows: data.rows ?? [], unread: data.unread ?? 0 });
    } catch {
      // No credentials.access (or the feature is not set up): stop asking.
      denied.current = true;
      setFeed(null);
    }
  }, [api, token]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!feed) {
    return (
      <button type="button" aria-label="Notifications" title="Notifications" onClick={() => onNavigate('/admin/notification/index')} className={BELL_CLASS}>
        <Bell aria-hidden="true" className="size-4" />
      </button>
    );
  }
  const open = async (n: NoticeRow): Promise<void> => {
    if (!n.read) await api.credMarkNoticesRead(token, [n.id]).catch(() => undefined);
    void load();
    onNavigate('/admin/credentials/delivery');
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Notifications${feed.unread ? `, ${feed.unread} unread` : ''}`} className={BELL_CLASS}>
          <Bell aria-hidden="true" className="size-4" />
          {feed.unread > 0 ? <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">{feed.unread > 99 ? '99+' : feed.unread}</span> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)]">
        <DropdownMenuLabel className="flex items-center justify-between">
          Credential notices
          {feed.unread > 0 ? <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void api.credMarkNoticesRead(token, 'all').then(load)}>Mark all read</button> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {feed.rows.length === 0 ? <p className="px-3 py-6 text-center text-xs text-muted-foreground">No credential notices.</p> : feed.rows.slice(0, 20).map((n) => (
            <DropdownMenuItem key={n.id} onClick={() => void open(n)} className="flex flex-col items-start gap-0.5">
              <span className={cn('text-sm', n.read ? 'text-muted-foreground' : 'font-semibold')}>{n.title}</span>
              {n.body ? <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span> : null}
              <span className="text-[10px] text-muted-foreground">{dmyAny(n.at)}</span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onNavigate('/admin/notification/index')}>All notifications</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
