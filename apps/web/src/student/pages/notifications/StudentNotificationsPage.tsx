import { useState, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { AdminTabBar } from '../../../admin/shared/components/AdminTabBar.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

type NotificationTab = 'inbox' | 'system';

type Severity = 'success' | 'warning' | 'info' | 'primary';

interface SeverityStyle {
  /** Lucide glyph rendered inside the circular icon tile. */
  readonly icon: LucideIcon;
  /** Soft tinted background + glyph colour for the circular tile. */
  readonly tile: string;
  /** Pill badge styling shown on the right of the row. */
  readonly badge: string;
  /** Human label shown inside the severity badge. */
  readonly label: string;
}

// Faithful EduPulse §12 palette — Success / Warning / Info / Primary.
const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
  success: {
    icon: CheckCircle2,
    tile: 'bg-emerald-50 text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    label: 'Success',
  },
  warning: {
    icon: AlertTriangle,
    tile: 'bg-amber-50 text-amber-600',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    label: 'Warning',
  },
  info: {
    icon: Info,
    tile: 'bg-sky-50 text-sky-600',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    label: 'Info',
  },
  primary: {
    icon: Megaphone,
    tile: 'bg-student-primary-light text-student-primary',
    badge: 'bg-student-primary-light text-student-primary ring-student-primary/20',
    label: 'Primary',
  },
};

// The notification feed (notification.title / description only) carries no
// type/category column, so we surface a single honest neutral severity per row
// rather than fabricating categories. If the API ever adds a `type`/`severity`
// field, this maps it onto the EduPulse palette automatically.
function resolveSeverity(raw: string): Severity {
  const key = raw.trim().toLowerCase();
  if (key === 'success' || key === 'warning' || key === 'info' || key === 'primary') {
    return key;
  }
  if (key === 'error' || key === 'danger' || key === 'alert') {
    return 'warning';
  }
  if (key === 'announcement' || key === 'promo') {
    return 'primary';
  }
  return 'info';
}

export default function StudentNotificationsPage({ api, session }: StudentPageProps) {
  const [activeTab, setActiveTab] = useState<NotificationTab>('inbox');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadNotifications(session.token),
    [api, session.token],
  );

  const handleMarkRead = useCallback(async (notificationId: string) => {
    setMarkingId(notificationId);
    try {
      await api.markNotificationAsRead(session.token, notificationId);
      reload();
    } finally {
      setMarkingId(null);
    }
  }, [api, session.token, reload]);

  const handleMarkAllRead = useCallback(async () => {
    const unread = (data?.notifications ?? []).filter((n) => asNumber(n.is_read) !== 1);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => api.markNotificationAsRead(session.token, asString(n.id))));
      reload();
    } finally {
      setMarkingAll(false);
    }
  }, [api, session.token, reload, data]);

  const tabs = [
    { id: 'inbox' as const, label: 'Inbox', count: data?.notifications.length ?? 0 },
    { id: 'system' as const, label: 'System Notifications', count: data?.notificationList.length ?? 0 },
  ];

  if (loading) {
    return <PageLoader label="Loading student notifications..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Notifications</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const notifications = activeTab === 'inbox' ? data?.notifications ?? [] : data?.notificationList ?? [];
  const inboxUnreadCount = (data?.notifications ?? []).filter((n) => asNumber(n.is_read) !== 1).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text">Notifications</h1>
          <p className="mt-1 text-sm text-student-muted">
            {inboxUnreadCount > 0
              ? `${inboxUnreadCount} unread · stay updated with your latest alerts`
              : 'Stay updated with your latest alerts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inboxUnreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleMarkAllRead()}
              disabled={markingAll}
              className="rounded-xl"
            >
              <CheckCheck aria-hidden="true" className="mr-1.5 size-4" />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">
            Refresh
          </Button>
        </div>
      </div>

      <AdminTabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as NotificationTab)}
      />

      {notifications.length === 0 ? (
        <div role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Bell aria-hidden="true" className="mx-auto size-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No notifications</h3>
          <p className="text-sm text-student-muted mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const id = asString(notification.id);
            const title = asString(notification.title) || 'Notification';
            const description = asString(notification.description) || asString(notification.message);
            const createdAt = asString(notification.created_at);
            const isRead = asNumber(notification.is_read) === 1;

            const severity = resolveSeverity(asString(notification.type) || asString(notification.severity));
            const style = SEVERITY_STYLES[severity];
            const SeverityIcon = style.icon;

            return (
              <div
                key={id}
                className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                  !isRead ? 'border-l-4 border-l-student-accent' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    aria-hidden="true"
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${style.tile}`}
                  >
                    <SeverityIcon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm ${isRead ? 'text-slate-600' : 'font-semibold text-student-text'}`}>
                        {title}
                      </p>
                      {!isRead ? (
                        <span
                          aria-label="Unread"
                          className="inline-block size-2 shrink-0 rounded-full bg-student-accent"
                        />
                      ) : null}
                      <span
                        className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>
                    {description ? <p className="mt-1 text-sm text-student-muted">{description}</p> : null}
                    {createdAt ? <p className="mt-1.5 text-xs text-slate-400">{createdAt}</p> : null}
                    {!isRead && activeTab === 'inbox' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Mark "${title}" as read`}
                        className="mt-2 h-auto px-0 text-xs text-student-primary hover:bg-transparent hover:text-student-primary/80 max-sm:min-h-11"
                        disabled={markingId === id}
                        onClick={() => void handleMarkRead(id)}
                      >
                        <CheckCheck aria-hidden="true" className="mr-1 size-3.5" />
                        {markingId === id ? 'Marking...' : 'Mark read'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
