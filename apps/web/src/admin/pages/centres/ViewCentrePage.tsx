import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

const TAB_LABELS = ['Overview', 'Student Details', 'Documents & Uploads'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-900">{value || '-'}</span>
    </div>
  );
}

export default function ViewCentrePage({ api, session, onNavigate }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState(0);

  const centreId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error } = useAdminPageData(
    () => api.getCentre(session.token, centreId),
    [centreId],
  );

  const centre = useMemo(() => {
    if (!data) return null;
    const record = data.centre;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  const coursePlans = useMemo(() => toRecords(data?.course_plans ?? data?.coursePlans), [data]);
  const students = useMemo(() => toRecords(data?.students), [data]);
  const documents = useMemo(() => toRecords(data?.documents), [data]);

  /* ── Course Plans columns ───────────────────────────────────────── */
  const planColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'course_title', label: 'Course', sortable: true, render: (v, row) => asString(v) || asString(row?.title) || '-' },
      {
        key: 'assigned_amount',
        label: 'Assigned Amount',
        sortable: true,
        render: (v) => (asNumber(v) ? `₹${asNumber(v).toLocaleString()}` : '-'),
      },
      { key: 'start_date', label: 'Start Date', render: (v) => formatDate(v) || '-' },
      { key: 'end_date', label: 'End Date', render: (v) => formatDate(v) || '-' },
      { key: 'status', label: 'Status', render: (v) => asString(v) || '-' },
    ],
    [],
  );

  /* ── Students columns ───────────────────────────────────────────── */
  const studentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'student_id', label: 'Student ID', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'name', label: 'Name', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'email', label: 'Email', render: (v) => asString(v) || '-' },
      { key: 'phone', label: 'Phone', render: (v) => asString(v) || '-' },
      { key: 'course_title', label: 'Course', render: (v) => asString(v) || '-' },
      { key: 'status', label: 'Status', render: (v) => asString(v) || '-' },
    ],
    [],
  );

  /* ── Documents columns ──────────────────────────────────────────── */
  const documentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'file_name', label: 'File Name', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'file_type', label: 'Type', render: (v) => asString(v) || '-' },
      { key: 'file_size', label: 'Size', render: (v) => asString(v) || '-' },
      { key: 'uploaded_at', label: 'Upload Date', render: (v) => formatDate(v) || '-' },
    ],
    [],
  );

  if (loading) return <PageLoader label="Loading centre..." />;

  if (error || !centre) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error || 'Centre not found.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Centre Details">
        <Button variant="outline" onClick={() => onNavigate(`/admin/centres/edit/${centreId}`)}>
          Edit Centre
        </Button>
        <Button variant="outline" onClick={() => onNavigate('/admin/centres/index')}>
          Back to List
        </Button>
      </AdminPageHeader>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`relative px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === idx ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(idx)}
          >
            {label}
            {activeTab === idx ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Overview ─────────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Centre ID" value={asString(centre.centre_id) || asString(centre.centre_code)} />
                  <InfoRow label="Centre Name" value={asString(centre.centre_name)} />
                  <InfoRow label="Country Code" value={asString(centre.country_code) || asString(centre.code)} />
                </div>
                <div>
                  <InfoRow label="State" value={asString(centre.state)} />
                  <InfoRow label="District" value={asString(centre.district) || asString(centre.city)} />
                  <InfoRow label="Address" value={asString(centre.address)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Contact Person" value={asString(centre.contact_person)} />
                  <InfoRow label="Designation" value={asString(centre.contact_person_designation)} />
                  <InfoRow label="Phone" value={asString(centre.phone)} />
                </div>
                <div>
                  <InfoRow label="Whatsapp" value={asString(centre.whatsapp)} />
                  <InfoRow label="Email" value={asString(centre.email)} />
                  <InfoRow label="Alternative Phone" value={asString(centre.secondary_phone)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Affiliation Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Affiliation Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Date of Registration" value={formatDate(centre.date_of_registration) || formatDate(centre.affiliation_date) || '-'} />
                  <InfoRow label="Date of Expiry" value={formatDate(centre.date_of_expiry) || '-'} />
                </div>
                <div>
                  <InfoRow
                    label="Registration Certificate"
                    value={asString(centre.registration_certificate) || 'File not uploaded'}
                  />
                  <InfoRow
                    label="Affiliation Document"
                    value={asString(centre.affiliation_document) || 'File not uploaded'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Plans Assign */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Course Plans Assign</CardTitle>
                <Button size="sm" className="bg-ttii-primary hover:bg-ttii-primary/90">
                  + Assign Course Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {coursePlans.length > 0 ? (
                <AdminDataTable columns={planColumns} rows={coursePlans} searchable exportable />
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">No course plans assigned to this centre.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab 1: Student Details ──────────────────────────────────── */}
      {activeTab === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students ({students.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {students.length > 0 ? (
              <AdminDataTable columns={studentColumns} rows={students} searchable exportable />
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No students associated with this centre.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Documents & Uploads ──────────────────────────────── */}
      {activeTab === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Documents & Uploads ({documents.length})</CardTitle>
              <Button size="sm" className="bg-ttii-primary hover:bg-ttii-primary/90">
                Upload File
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {documents.length > 0 ? (
              <AdminDataTable
                columns={documentColumns}
                rows={documents}
                actions={[
                  { label: 'View', onClick: (row) => window.open(asString(row.url) || asString(row.file_url), '_blank') },
                  { label: 'Download', onClick: (row) => window.open(asString(row.url) || asString(row.file_url), '_blank') },
                  { label: 'Delete', variant: 'destructive', onClick: () => alert('Delete document — backend wiring pending') },
                ]}
              />
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No documents uploaded.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
