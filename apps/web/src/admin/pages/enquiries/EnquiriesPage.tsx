import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function EnquiriesPage({ api, session }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('general');

  const { data, loading, error } = useAdminPageData(
    () => api.loadEnquiries(session.token),
    [],
  );

  const snapshot = useMemo(() => {
    const record = data as Record<string, unknown> | undefined;
    return {
      enquiries: toRecords(record?.enquiries),
      courseEnquiries: toRecords(record?.course_enquiries),
      contactForms: toRecords(record?.contact_forms),
    };
  }, [data]);

  const generalColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'message', label: 'Message', render: (v) => {
        const text = asString(v);
        return text.length > 80 ? text.slice(0, 80) + '...' : text || '-';
      }},
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'created_at', label: 'Date', render: (v) => formatDate(v) },
    ],
    [],
  );

  const courseColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'course_title', label: 'Course' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'created_at', label: 'Date', render: (v) => formatDate(v) },
    ],
    [],
  );

  const contactColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'subject', label: 'Subject' },
      { key: 'message', label: 'Message', render: (v) => {
        const text = asString(v);
        return text.length > 80 ? text.slice(0, 80) + '...' : text || '-';
      }},
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
      <AdminPageHeader title="Enquiries" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'General Enquiries', value: snapshot.enquiries.length },
          { label: 'Course Enquiries', value: snapshot.courseEnquiries.length },
          { label: 'Contact Submissions', value: snapshot.contactForms.length },
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
          <TabsTrigger value="general">General Enquiries</TabsTrigger>
          <TabsTrigger value="course">Course Enquiries</TabsTrigger>
          <TabsTrigger value="contact">Contact Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <AdminDataTable columns={generalColumns} rows={snapshot.enquiries} />
        </TabsContent>

        <TabsContent value="course">
          <AdminDataTable columns={courseColumns} rows={snapshot.courseEnquiries} />
        </TabsContent>

        <TabsContent value="contact">
          <AdminDataTable columns={contactColumns} rows={snapshot.contactForms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
