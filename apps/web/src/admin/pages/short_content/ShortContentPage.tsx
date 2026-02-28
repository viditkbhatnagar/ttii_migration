import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function ShortContentPage({ api, session }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('videos');

  const { data, loading, error } = useAdminPageData(
    () => api.loadShortContent(session.token),
    [],
  );

  const snapshot = useMemo(() => {
    const record = data as Record<string, unknown> | undefined;
    return {
      videos: toRecords(record?.short_videos),
      stories: toRecords(record?.stories),
    };
  }, [data]);

  const videoColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'category', label: 'Category' },
      { key: 'duration', label: 'Duration' },
      { key: 'views', label: 'Views', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
    ],
    [],
  );

  const storyColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'author', label: 'Author' },
      { key: 'views', label: 'Views', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
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
      <AdminPageHeader title="Short Content" addLabel="+ Add Content" onAdd={() => {}} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Videos', value: snapshot.videos.length },
          { label: 'Total Stories', value: snapshot.stories.length },
          { label: 'Total Views (Videos)', value: snapshot.videos.reduce((s, r) => s + asNumber(r.views), 0) },
          { label: 'Total Views (Stories)', value: snapshot.stories.reduce((s, r) => s + asNumber(r.views), 0) },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="videos">Short Videos</TabsTrigger>
          <TabsTrigger value="stories">Stories</TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          <AdminDataTable columns={videoColumns} rows={snapshot.videos} />
        </TabsContent>

        <TabsContent value="stories">
          <AdminDataTable columns={storyColumns} rows={snapshot.stories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
