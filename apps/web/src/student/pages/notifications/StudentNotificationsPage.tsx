import { useState, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
    { id: 'inbox' as const, label: 'Inbox', count: data?.notifications.length },
    { id: 'system' as const, label: 'System Notifications', count: data?.notificationList.length },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const notifications = activeTab === 'inbox' ? data?.notifications ?? [] : data?.notificationList ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <Button variant="outline" size="sm" onClick={reload}>
          Refresh
        </Button>
      </div>

      <AdminTabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as NotificationTab)}
      />

      {notifications.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bell className="size-10 text-gray-300" />
            <p className="text-sm text-gray-500">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const id = asString(notification.id);
            const title = asString(notification.title) || 'Notification';
            const description = asString(notification.description) || asString(notification.message);
            const createdAt = asString(notification.created_at);
            const isRead = asNumber(notification.is_read) === 1;

            return (
              <Card
                key={id}
                className={`bg-white transition-colors ${!isRead ? 'border-l-4 border-l-ttii-primary' : ''}`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ${isRead ? 'bg-gray-100' : 'bg-ttii-primary/10'}`}>
                    <Bell className={`size-4 ${isRead ? 'text-gray-400' : 'text-ttii-primary'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${isRead ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>{title}</p>
                      {!isRead ? <Badge variant="secondary" className="text-[10px]">New</Badge> : null}
                    </div>
                    {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
                    {createdAt ? <p className="mt-1.5 text-xs text-gray-400">{createdAt}</p> : null}
                  </div>
                  {!isRead && activeTab === 'inbox' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs text-ttii-primary hover:text-ttii-primary/80"
                      disabled={markingId === id}
                      onClick={() => void handleMarkRead(id)}
                    >
                      <CheckCheck className="mr-1 size-3.5" />
                      {markingId === id ? 'Marking...' : 'Mark read'}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
