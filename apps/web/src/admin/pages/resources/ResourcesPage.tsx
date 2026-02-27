import { useMemo } from 'react';
import { Folder } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ResourcesPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadResources(session.token),
    [session.token],
  );

  const folders = useMemo(
    () => (data ? toRecords(data.folders) : []),
    [data],
  );

  const files = useMemo(
    () => (data ? toRecords(data.files) : []),
    [data],
  );

  const fileColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'File Name', sortable: true },
      { key: 'type', label: 'Type' },
      { key: 'size', label: 'Size' },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
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
      <AdminPageHeader title="Resources" addLabel="+ Add Folder" onAdd={() => {}} />

      {folders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {folders.map((folder, idx) => (
            <Card
              key={idx}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <CardContent className="flex items-center gap-3 py-4">
                <Folder className="size-8 text-ttii-primary" />
                <span className="text-sm font-medium text-gray-800">
                  {asString(folder.name) || asString(folder.title) || `Folder ${idx + 1}`}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <AdminDataTable columns={fileColumns} rows={files} />
      )}

      {folders.length === 0 && files.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-400">
            No resources found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
