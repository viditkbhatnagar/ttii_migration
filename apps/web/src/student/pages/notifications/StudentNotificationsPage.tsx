import { useState, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { AdminTabBar } from '../../../admin/shared/components/AdminTabBar.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

type NotificationTab = 'inbox' | 'system';

export default function StudentNotificationsPage({ api, session }: StudentPageProps) {
  const [activeTab, setActiveTab] = useState<NotificationTab>('inbox');
  const [markingId, setMarkingId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text">Notifications</h1>
          <p className="mt-1 text-sm text-student-muted">Stay updated with your latest alerts</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">
          Refresh
        </Button>
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

            return (
              <div
                key={id}
                className={`rounded-2xl border bg-white p-4 transition-all hover:shadow-md ${
                  !isRead ? 'border-l-4 border-l-student-accent border-slate-200/80' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div aria-hidden="true" className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${
                    isRead ? 'bg-slate-100' : 'bg-student-accent/10'
                  }`}>
                    <Bell className={`size-5 ${isRead ? 'text-slate-400' : 'text-student-accent'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${isRead ? 'text-slate-600' : 'font-semibold text-student-text'}`}>{title}</p>
                      {!isRead ? (
                        <span className="inline-flex items-center rounded-full bg-student-accent/10 px-2 py-0.5 text-[10px] font-semibold text-student-accent">
                          New
                        </span>
                      ) : null}
                    </div>
                    {description ? <p className="mt-1 text-sm text-student-muted">{description}</p> : null}
                    {createdAt ? <p className="mt-1.5 text-xs text-slate-400">{createdAt}</p> : null}
                  </div>
                  {!isRead && activeTab === 'inbox' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Mark "${title}" as read`}
                      className="shrink-0 max-sm:h-11 text-xs text-student-primary hover:text-student-primary/80 rounded-xl"
                      disabled={markingId === id}
                      onClick={() => void handleMarkRead(id)}
                    >
                      <CheckCheck aria-hidden="true" className="mr-1 size-3.5" />
                      {markingId === id ? 'Marking...' : 'Mark read'}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
