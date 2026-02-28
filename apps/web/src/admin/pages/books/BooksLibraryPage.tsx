import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function BooksLibraryPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadBooks(session.token),
    [],
  );

  const allBooks = useMemo(() => toRecords(data), [data]);

  const publishedCount = useMemo(
    () => allBooks.filter((r) => asString(r.status).toLowerCase() === 'published').length,
    [allBooks],
  );

  const totalChapters = useMemo(
    () => allBooks.reduce((sum, r) => sum + asNumber(r.chapters_count), 0),
    [allBooks],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'author', label: 'Author', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'chapters_count', label: 'Chapters', sortable: true },
      {
        key: 'cover_image',
        label: 'Cover',
        render: (v) => {
          const url = asString(v);
          return url ? (
            <img src={url} alt="Cover" className="h-10 w-8 rounded object-cover" />
          ) : (
            <span className="text-xs text-gray-400">No image</span>
          );
        },
      },
      { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
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
      <AdminPageHeader title="Books Library" addLabel="+ Add Book" onAdd={() => {}} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Books', value: allBooks.length },
          { label: 'Published', value: publishedCount },
          { label: 'Total Chapters', value: totalChapters },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allBooks} />
    </div>
  );
}
