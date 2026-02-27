import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

export default function ChatSupportPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadChatSupport(session.token),
    [],
  );

  const allChats = useMemo(() => toRecords(data), [data]);

  const totalMessages = useMemo(
    () => allChats.reduce((sum, row) => sum + asNumber(row.message_count), 0),
    [allChats],
  );

  const recentCount = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return allChats.filter((row) => asString(row.last_message_at) >= weekAgo).length;
  }, [allChats]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'user_name', label: 'User', sortable: true },
      { key: 'user_email', label: 'Email' },
      { key: 'message_count', label: 'Messages', sortable: true },
      { key: 'first_message_at', label: 'First Message', render: (v) => formatDate(v) },
      { key: 'last_message_at', label: 'Last Message', sortable: true, render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Chat Support" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Conversations', value: allChats.length },
          { label: 'Total Messages', value: totalMessages },
          { label: 'Active (7 days)', value: recentCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allChats} />
    </div>
  );
}
