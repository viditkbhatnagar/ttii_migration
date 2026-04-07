import { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString, asNumber, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';

type TabId = 'unread' | 'read' | 'all';

export default function NotificationsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadNotifications(session.token),
    [session.token],
  );

  const [activeTab, setActiveTab] = useState<TabId>('unread');

  const allNotifications = useMemo(() => toRecords(data), [data]);

  const readNotifications = useMemo(
    () => allNotifications.filter((n) => asNumber(n.is_read) === 1),
    [allNotifications],
  );

  const unreadNotifications = useMemo(
    () => allNotifications.filter((n) => asNumber(n.is_read) !== 1),
    [allNotifications],
  );

  const tabs: AdminTab[] = useMemo(
    () => [
      { id: 'unread', label: 'Unread', count: unreadNotifications.length },
      { id: 'read', label: 'Read', count: readNotifications.length },
      { id: 'all', label: 'All', count: allNotifications.length },
    ],
    [unreadNotifications.length, readNotifications.length, allNotifications.length],
  );

  const visibleNotifications = useMemo(() => {
    if (activeTab === 'unread') return unreadNotifications;
    if (activeTab === 'read') return readNotifications;
    return allNotifications;
  }, [activeTab, unreadNotifications, readNotifications, allNotifications]);

  const handleClearAll = () => {
    if (!window.confirm('Clear all notifications? This cannot be undone.')) return;
    alert('Clear All — backend wiring pending.');
  };

  if (loading) return <PageLoader label="Loading notifications..." />;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Notifications" />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      <Card>
        <CardContent className="p-0">
          {visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-gray-400">
              <Bell className="size-10" />
              <p className="text-sm">
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visibleNotifications.map((n) => {
                const id = asString(n.id) || asString(n._id);
                return (
                  <li key={id} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Bell className="size-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900">
                        {asString(n.title) || asString(n.description) || asString(n.message)}
                      </p>
                      {asString(n.description) && asString(n.title) ? (
                        <p className="mt-0.5 text-xs text-gray-500">{asString(n.description)}</p>
                      ) : null}
                      {asString(n.created_at) ? (
                        <p className="mt-1 text-[11px] text-gray-400">{formatDate(n.created_at)}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex items-center justify-end border-t border-gray-100 p-3">
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
