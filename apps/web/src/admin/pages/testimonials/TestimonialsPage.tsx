import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function TestimonialsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadTestimonials(session.token),
    [],
  );

  const allTestimonials = useMemo(() => toRecords(data), [data]);

  const avgRating = useMemo(() => {
    if (allTestimonials.length === 0) return 0;
    const sum = allTestimonials.reduce((s, r) => s + asNumber(r.rating), 0);
    return Math.round((sum / allTestimonials.length) * 10) / 10;
  }, [allTestimonials]);

  const activeCount = useMemo(
    () => allTestimonials.filter((r) => asString(r.status).toLowerCase() === 'active').length,
    [allTestimonials],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'designation', label: 'Designation' },
      { key: 'course_title', label: 'Course' },
      {
        key: 'rating',
        label: 'Rating',
        sortable: true,
        render: (v) => {
          const n = asNumber(v);
          return `${n}/5`;
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'created_at', label: 'Date', render: (v) => formatDate(v) },
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
      <AdminPageHeader title="Testimonials" addLabel="+ Add Testimonial" onAdd={() => {}} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Testimonials', value: allTestimonials.length },
          { label: 'Avg Rating', value: avgRating },
          { label: 'Active', value: activeCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allTestimonials} />
    </div>
  );
}
