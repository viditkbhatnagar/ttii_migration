import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

const TAB_LABELS = ['Overview', 'Academic / Professional', 'Enrolment & Payments'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-900">{value || '-'}</span>
    </div>
  );
}

export default function ViewApplicationPage({ api, session, onNavigate }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Extract ID from URL path
  const applicationId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.getApplication(session.token, applicationId),
    [applicationId],
  );

  const app = useMemo(() => {
    if (!data) return null;
    const record = data.application ?? data;
    return typeof record === 'object' && record !== null ? record as Record<string, unknown> : null;
  }, [data]);

  const payments = useMemo(() => toRecords(data?.payments), [data]);

  const handleUpdateStatus = useCallback(async (status: string) => {
    if (!applicationId) return;
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    if (!window.confirm(`Are you sure you want to ${label.toLowerCase()} this application?`)) return;
    try {
      await api.updateApplicationStatus(session.token, applicationId, status);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [api, session.token, applicationId, reload]);

  const paymentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'installment_details', label: 'Installment' },
      { key: 'amount', label: 'Amount', render: (v) => `₹${asNumber(v).toLocaleString()}` },
      { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
      { key: 'paid_date', label: 'Paid Date', render: (v) => formatDate(v) },
      { key: 'payment_mode', label: 'Mode' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v) || 'Pending'} />,
      },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading view application..." />;
  }

  if (error || !app) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error || 'Application not found.'}
        </CardContent>
      </Card>
    );
  }

  const currentStatus = asString(app.status) || 'pending';

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Application Detail">
        <Button variant="outline" onClick={() => onNavigate('/admin/applications')}>
          Back to Applications
        </Button>
      </AdminPageHeader>

      {/* Status bar with actions */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <AdminStatusBadge status={currentStatus} />
          </div>
          <div className="flex gap-2">
            {currentStatus !== 'approved' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => void handleUpdateStatus('approved')}
              >
                Approve
              </Button>
            )}
            {currentStatus !== 'rejected' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleUpdateStatus('rejected')}
              >
                Reject
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
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

      {/* Tab 1: Overview */}
      {activeTab === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 md:grid-cols-2">
              <div>
                <InfoRow label="Application ID" value={asString(app.application_id)} />
                <InfoRow label="Full Name" value={asString(app.name)} />
                <InfoRow label="Email" value={asString(app.user_email) || asString(app.email)} />
                <InfoRow label="Phone" value={asString(app.phone)} />
                <InfoRow label="Alternate Phone" value={asString(app.second_phone)} />
                <InfoRow label="Date of Birth" value={formatDate(app.date_of_birth)} />
                <InfoRow label="Gender" value={asString(app.gender)} />
              </div>
              <div>
                <InfoRow label="Address" value={asString(app.address)} />
                <InfoRow label="City / District" value={asString(app.district)} />
                <InfoRow label="State" value={asString(app.state)} />
                <InfoRow label="Nationality" value={asString(app.nationality)} />
                <InfoRow label="Course" value={asString(app.course_title)} />
                <InfoRow label="Centre" value={asString(app.centre_name)} />
                <InfoRow label="Applied Date" value={formatDate(app.created_at)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Academic / Professional */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Aadhar No." value={asString(app.aadhar_no)} />
                  <InfoRow label="Passport No." value={asString(app.passport_no)} />
                  <InfoRow label="Father's Name" value={asString(app.father_name)} />
                  <InfoRow label="Mother's Name" value={asString(app.mother_name)} />
                </div>
                <div>
                  <InfoRow label="Guardian Name" value={asString(app.guardian_name)} />
                  <InfoRow label="Emergency Contact" value={asString(app.emergency_name)} />
                  <InfoRow label="Emergency Phone" value={asString(app.emergency_phone)} />
                  <InfoRow label="Emergency Relation" value={asString(app.emergency_relation)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accessibility & Special Needs</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Learning Disabilities" value={asString(app.learning_disabilities)} />
              <InfoRow label="Accessibility Needs" value={asString(app.accessibility_needs)} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Enrolment & Payments */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrolment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Course" value={asString(app.course_title)} />
                  <InfoRow label="Batch" value={asString(app.batch_title)} />
                  <InfoRow label="Enrolment Date" value={formatDate(app.enrollment_date)} />
                </div>
                <div>
                  <InfoRow label="Enrolment Status" value={asString(app.enrollment_status)} />
                  <InfoRow label="Mode of Study" value={asString(app.mode_of_study)} />
                  <InfoRow label="Marketing Source" value={asString(app.marketing_source)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length > 0 ? (
                <AdminDataTable columns={paymentColumns} rows={payments} searchable={false} exportable={false} />
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">No payment records found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
