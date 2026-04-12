import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

const TAB_LABELS = ['Personal Information', 'Qualification', 'Enrolment & Fee', 'Payment History'];

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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleApprove = useCallback(async () => {
    if (!applicationId) return;
    if (!window.confirm('Are you sure you want to approve this application?')) return;
    setSubmitting(true);
    try {
      await api.updateApplicationStatus(session.token, applicationId, 'approved');
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  }, [api, session.token, applicationId, reload]);

  const handleRejectSubmit = useCallback(async () => {
    if (!applicationId) return;
    if (!rejectReason.trim()) {
      alert('Please enter a reason for rejection.');
      return;
    }
    setSubmitting(true);
    try {
      await api.updateApplicationStatus(session.token, applicationId, 'rejected', rejectReason.trim());
      setRejectDialogOpen(false);
      setRejectReason('');
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  }, [api, session.token, applicationId, rejectReason, reload]);

  const handleDelete = useCallback(async () => {
    if (!applicationId) return;
    if (!window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) return;
    try {
      await api.deleteApplication(session.token, applicationId);
      onNavigate('/admin/applications');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete application');
    }
  }, [api, session.token, applicationId, onNavigate]);

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
    return <PageLoader label="Loading application..." />;
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
            {asString(app.reject_reason) && (
              <span className="text-sm text-red-600">Reason: {asString(app.reject_reason)}</span>
            )}
          </div>
          <div className="flex gap-2">
            {currentStatus !== 'approved' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={submitting}
                onClick={() => void handleApprove()}
              >
                Approve
              </Button>
            )}
            {currentStatus !== 'rejected' && (
              <Button
                size="sm"
                variant="destructive"
                disabled={submitting}
                onClick={() => setRejectDialogOpen(true)}
              >
                Reject
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('/admin/applications/edit/' + applicationId)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
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

      {/* Tab 1: Personal Information */}
      {activeTab === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Application ID" value={asString(app.application_id)} />
                  <InfoRow label="Full Name" value={asString(app.name)} />
                  <InfoRow label="Date of Birth" value={formatDate(app.date_of_birth)} />
                  <InfoRow label="Age" value={asString(app.age)} />
                  <InfoRow label="Gender" value={asString(app.gender)} />
                  <InfoRow label="Nationality" value={asString(app.nationality)} />
                  <InfoRow label="Marital Status" value={asString(app.marital_status)} />
                </div>
                <div>
                  <InfoRow label="Father Name" value={asString(app.father_name)} />
                  <InfoRow label="Mother Name" value={asString(app.mother_name)} />
                  <InfoRow label="Guardian Name" value={asString(app.guardian_name)} />
                  <InfoRow label="Aadhar No." value={asString(app.aadhar_no)} />
                  <InfoRow label="Passport No." value={asString(app.passport_no)} />
                  <InfoRow label="Applied Date" value={formatDate(app.created_at)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Email" value={asString(app.user_email) || asString(app.email)} />
                  <InfoRow label="Phone" value={asString(app.phone)} />
                  <InfoRow label="Alternate Phone" value={asString(app.second_phone)} />
                  <InfoRow label="WhatsApp" value={asString(app.whatsapp_no)} />
                </div>
                <div>
                  <InfoRow label="Country" value={asString(app.nationality)} />
                  <InfoRow label="State" value={asString(app.state)} />
                  <InfoRow label="District" value={asString(app.district)} />
                  <InfoRow label="Permanent Address" value={asString(app.address)} />
                  <InfoRow label="Correspondence Address" value={asString(app.native_address)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Qualification */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualification Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Highest Qualification" value={asString(app.highest_qualification)} />
                  <InfoRow label="Specialization" value={asString(app.specialization)} />
                  <InfoRow label="School / College" value={asString(app.institution_name)} />
                  <InfoRow label="Year of Passing" value={asString(app.year_of_passing)} />
                </div>
                <div>
                  <InfoRow label="Employment Status" value={asString(app.employment_status)} />
                  <InfoRow label="Current Occupation" value={asString(app.current_occupation)} />
                  <InfoRow label="Experience" value={asString(app.work_experience)} />
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

      {/* Tab 3: Enrolment & Fee */}
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
                  <InfoRow label="Course Offering" value={asString(app.offering_title)} />
                  <InfoRow label="Batch" value={asString(app.batch_title)} />
                  <InfoRow label="Enrolment Date" value={formatDate(app.enrollment_date)} />
                  <InfoRow label="Mode of Study" value={asString(app.mode_of_study)} />
                </div>
                <div>
                  <InfoRow label="Language" value={asString(app.preferred_language)} />
                  <InfoRow label="Pipeline" value={asString(app.pipeline_role)} />
                  <InfoRow label="Pipeline User" value={asString(app.pipeline_user_name)} />
                  <InfoRow label="Lead Source" value={asString(app.marketing_source)} />
                  <InfoRow label="Centre" value={asString(app.centre_name)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Course Fee" value={asString(app.course_fee) ? `₹${asString(app.course_fee)}` : '-'} />
                  <InfoRow label="Discount" value={asString(app.discount) ? `${asString(app.discount)}%` : '-'} />
                </div>
                <div>
                  <InfoRow label="GST Applicability" value={asString(app.gst_applicability)} />
                  <InfoRow label="Final Course Fee" value={asString(app.final_course_fee) ? `₹${asString(app.final_course_fee)}` : '-'} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Payment History */}
      {activeTab === 3 && (
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
      )}

      {/* Reject Dialog with Reason */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) { setRejectDialogOpen(false); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Are you sure you want to reject this application? Please provide a reason below.
            </p>
            <div>
              <Label className="mb-1 text-sm">Reason for Rejection *</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={submitting || !rejectReason.trim()}
            >
              {submitting ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
