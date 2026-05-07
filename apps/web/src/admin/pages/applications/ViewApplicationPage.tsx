import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
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
import { useConfirm } from '@/components/confirm-dialog';
import { GeneratePaymentLinkDialog } from './GeneratePaymentLinkDialog.js';

const TAB_LABELS = ['Personal Information', 'Qualification', 'Enrolment & Fee', 'Payment History'];

// Naji 2026-05-08 — until the applicant submits the form (`form_submitted`
// onward), the View page shows only the fields actually captured at Add
// Lead. Showing empty Personal/Qualification tabs early was confusing.
// Stages where the Lead Snapshot view applies:
const LEAD_STAGES = new Set(['lead', 'payment_pending', 'paid', 'form_pending']);

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-900">{value || '-'}</span>
    </div>
  );
}

export default function ViewApplicationPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState(0);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

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
  const educationPathway = useMemo(() => toRecords(data?.education_pathway), [data]);

  const handleApprove = useCallback(async () => {
    if (!applicationId) return;
    if (!(await confirm({
      title: 'Approve this application?',
      confirmText: 'Approve',
      variant: 'default',
    }))) return;
    setSubmitting(true);
    try {
      await api.updateApplicationStatus(session.token, applicationId, 'approved');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  }, [api, session.token, applicationId, reload, confirm]);

  const handleRejectSubmit = useCallback(async () => {
    if (!applicationId) return;
    if (!rejectReason.trim()) {
      toast.error('Please enter a reason for rejection.');
      return;
    }
    setSubmitting(true);
    try {
      await api.updateApplicationStatus(session.token, applicationId, 'rejected', rejectReason.trim());
      setRejectDialogOpen(false);
      setRejectReason('');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  }, [api, session.token, applicationId, rejectReason, reload]);

  const handleDelete = useCallback(async () => {
    if (!applicationId) return;
    if (!(await confirm({
      title: 'Delete this application?',
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      await api.deleteApplication(session.token, applicationId);
      onNavigate('/admin/applications');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete application');
    }
  }, [api, session.token, applicationId, onNavigate, confirm]);

  // Naji 2026-05-07 — stage-transition handlers ported here from the
  // applications row dropdown so the stage flow lives inside the View
  // page contextually.
  const handleMarkPaid = useCallback(async () => {
    if (!applicationId) return;
    const note = window.prompt('Reference / note (e.g. Bank ref no.)') ?? '';
    setSubmitting(true);
    try {
      const res = await api.markApplicationPaid(session.token, applicationId, note);
      if ((res as { status?: number }).status === 1) {
        toast.success('Marked as paid.');
        reload();
      } else toast.error('Could not mark paid.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally { setSubmitting(false); }
  }, [api, session.token, applicationId, reload]);

  const handleSendFormLink = useCallback(async () => {
    if (!applicationId) return;
    setSubmitting(true);
    try {
      const res = await api.generateApplicationFormLink(session.token, applicationId, 7);
      const m = asString((res as { message?: unknown }).message) || '';
      if ((res as { status?: number }).status === 1) {
        toast.success(m || 'Form link emailed to student.');
        reload();
      } else toast.error(m || 'Could not generate form link.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally { setSubmitting(false); }
  }, [api, session.token, applicationId, reload]);

  const handleCounsellorApprove = useCallback(async () => {
    if (!applicationId) return;
    setSubmitting(true);
    try {
      const res = await api.counsellorApproveApplication(session.token, applicationId);
      const m = asString((res as { message?: unknown }).message) || '';
      if ((res as { status?: number }).status === 1) {
        toast.success(m || 'Approved by counsellor.');
        reload();
      } else toast.error(m || 'Could not approve.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve.');
    } finally { setSubmitting(false); }
  }, [api, session.token, applicationId, reload]);

  const handleAdminApproveAndEnrol = useCallback(async () => {
    if (!applicationId) return;
    setSubmitting(true);
    try {
      const res = await api.adminApproveApplication(session.token, applicationId);
      const m = asString((res as { message?: unknown }).message) || '';
      if ((res as { status?: number }).status === 1) {
        toast.success(m || 'Enrolled.');
        reload();
      } else toast.error(m || 'Could not enrol.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enrol.');
    } finally { setSubmitting(false); }
  }, [api, session.token, applicationId, reload]);

  // Naji 2026-05-08: Generate Payment Link now opens the rich dialog
  // (offering-derived pricing, Full Payment vs Installment Plan with
  // editable rows). The lightweight prompt-based fallback was removed.
  const handleGeneratePaymentLink = useCallback(() => {
    if (!applicationId) return;
    setPayDialogOpen(true);
  }, [applicationId]);

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
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error || 'Application not found.'}
        </CardContent>
      </Card>
    );
  }

  const currentStatus = asString(app.status) || 'pending';
  const stage = asString(app.stage) || 'lead';
  const isLeadStage = LEAD_STAGES.has(stage);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Application Detail">
        <Button variant="outline" onClick={() => onNavigate('/admin/applications')}>
          Back to Applications
        </Button>
      </AdminPageHeader>

      {/* Status + Stage panel — Naji 2026-05-07: stage-transition actions
          surface contextually here based on the current stage so the row
          dropdown can stay clean (View + Edit only). */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Stage:</span>
              <AdminStatusBadge status={asString(app.stage) || currentStatus} />
              {asString(app.reject_reason) && (
                <span className="text-sm text-red-600">Reason: {asString(app.reject_reason)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {/* Stage-contextual action row */}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Next steps</span>
            {(() => {
              const stage = asString(app.stage) || 'lead';
              const buttons: React.ReactNode[] = [];
              if (stage === 'lead') {
                buttons.push(
                  <Button key="pay" size="sm" disabled={submitting} className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => handleGeneratePaymentLink()}>
                    Generate Payment Link
                  </Button>,
                );
              }
              if (stage === 'payment_pending') {
                buttons.push(
                  <Button key="paid" size="sm" disabled={submitting} className="bg-green-600 hover:bg-green-700" onClick={() => void handleMarkPaid()}>
                    Mark Paid (Manual)
                  </Button>,
                );
              }
              if (stage === 'paid' || stage === 'form_pending') {
                buttons.push(
                  <Button key="form" size="sm" disabled={submitting} className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => void handleSendFormLink()}>
                    {stage === 'form_pending' ? 'Resend Application Form Link' : 'Send Application Form Link'}
                  </Button>,
                );
              }
              if (stage === 'form_submitted') {
                buttons.push(
                  <Button key="capp" size="sm" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" onClick={() => void handleCounsellorApprove()}>
                    Counsellor Approve
                  </Button>,
                );
              }
              if (stage === 'approval_waiting') {
                buttons.push(
                  <Button key="aapp" size="sm" disabled={submitting} className="bg-green-600 hover:bg-green-700" onClick={() => void handleAdminApproveAndEnrol()}>
                    Admin Approve &amp; Enrol
                  </Button>,
                );
              }
              if (stage !== 'rejected' && stage !== 'enrolled') {
                buttons.push(
                  <Button key="rej" size="sm" variant="destructive" disabled={submitting} onClick={() => setRejectDialogOpen(true)}>
                    Reject
                  </Button>,
                );
              }
              if (currentStatus !== 'approved' && stage === 'enrolled') {
                buttons.push(
                  <Button key="appr" size="sm" disabled={submitting} className="bg-green-600 hover:bg-green-700" onClick={() => void handleApprove()}>
                    Mark Approved
                  </Button>,
                );
              }
              if (buttons.length === 0) {
                buttons.push(
                  <span key="done" className="text-xs text-gray-500">No further stage actions available.</span>,
                );
              }
              return buttons;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Naji 2026-05-08 — minimal Lead Snapshot for early stages: show
          only the fields captured at Add Lead. Tabs + applicant-detail
          tabs come back once the form is submitted. */}
      {isLeadStage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 md:grid-cols-2">
              <div>
                <InfoRow label="Application ID" value={asString(app.application_id)} />
                <InfoRow label="Name" value={asString(app.name)} />
                <InfoRow
                  label="Email"
                  value={asString(app.user_email) || asString(app.email)}
                />
                <InfoRow
                  label="Phone"
                  value={[asString(app.country_code), asString(app.phone)].filter(Boolean).join(' ').trim() || asString(app.phone)}
                />
                <InfoRow label="Source" value={asString(app.marketing_source) || asString(app.lead_source)} />
              </div>
              <div>
                <InfoRow label="Course" value={asString(app.course_title)} />
                <InfoRow label="Course Offering" value={asString(app.offering_title)} />
                <InfoRow label="Certificate Combination" value={asString(app.combination_title)} />
                <InfoRow label="Pipeline" value={asString(app.pipeline)} />
                <InfoRow label="Pipeline User" value={asString(app.pipeline_user_name)} />
                <InfoRow label="Created" value={formatDate(app.created_at)} />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Full applicant details will appear here once the student submits the application form.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tab navigation — only after the applicant submits the form. */}
      {!isLeadStage && (
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
      )}

      {/* Tab 1: Personal Information */}
      {!isLeadStage && activeTab === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                {/* Profile photo */}
                <div className="flex shrink-0 flex-col items-center gap-2">
                  {asString(app.image) ? (
                    <img
                      src={asString(app.image)}
                      alt={asString(app.name) || 'Profile photo'}
                      className="size-32 rounded-xl border border-gray-200 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-32 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-2xl font-semibold text-gray-400">
                      {(asString(app.name) || '?').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-gray-500">Profile Photo</span>
                </div>

                <div className="grid flex-1 gap-x-8 md:grid-cols-2">
                  <div>
                    <InfoRow label="Full Name" value={asString(app.name)} />
                    <InfoRow label="Date of Birth" value={formatDate(app.date_of_birth)} />
                    <InfoRow label="Age" value={asString(app.age)} />
                    <InfoRow label="Gender" value={asString(app.gender)} />
                    <InfoRow label="Nationality" value={asString(app.nationality_name) || asString(app.nationality)} />
                    <InfoRow label="Marital Status" value={asString(app.marital_status)} />
                  </div>
                  <div>
                    <InfoRow label="Father Name" value={asString(app.father_name)} />
                    <InfoRow label="Mother Name" value={asString(app.mother_name)} />
                    <InfoRow label="Guardian Name" value={asString(app.guardian_name)} />
                    <InfoRow label="Aadhar No." value={asString(app.aadhar_no)} />
                    <InfoRow label="Passport No." value={asString(app.passport_no)} />
                  </div>
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
                  <InfoRow
                    label="Phone"
                    value={[asString(app.country_code), asString(app.phone)].filter(Boolean).join(' ').trim() || asString(app.phone)}
                  />
                  <InfoRow label="Alternate Phone" value={asString(app.second_phone)} />
                  <InfoRow label="WhatsApp" value={asString(app.whatsapp_no)} />
                </div>
                <div>
                  <InfoRow label="Country" value={asString(app.country_name) || asString(app.country) || asString(app.country_id)} />
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
      {!isLeadStage && activeTab === 1 && (
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
              <CardTitle className="text-base">Education Pathway</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {educationPathway.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      <tr>
                        <th className="px-4 py-2.5">Qualification</th>
                        <th className="px-4 py-2.5">Specialization</th>
                        <th className="px-4 py-2.5">Institution</th>
                        <th className="px-4 py-2.5">Board</th>
                        <th className="px-4 py-2.5">Year</th>
                        <th className="px-4 py-2.5">Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {educationPathway.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-900">{asString(row.qualification) || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-700">{asString(row.specialization) || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-700">{asString(row.institution) || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-700">{asString(row.board) || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-700">{asString(row.year_passed) || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-700">{asString(row.marks) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-gray-400">No education pathway entries recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Enrolment & Fee — Naji 2026-05-07: Application ID + Applied
          Date moved here from Personal Info; Centre removed; Fee Information
          moved to Payment History; Language now resolved to its title. */}
      {!isLeadStage && activeTab === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Application ID" value={asString(app.application_id)} />
                  <InfoRow label="Applied Date" value={formatDate(app.created_at)} />
                </div>
                <div>
                  <InfoRow label="Application Status" value={asString(app.status)} />
                  <InfoRow label="Stage" value={asString(app.stage)} />
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <InfoRow label="Language" value={asString(app.language_name) || asString(app.preferred_language)} />
                  <InfoRow label="Pipeline" value={asString(app.pipeline)} />
                  <InfoRow label="Pipeline User" value={asString(app.pipeline_user_name)} />
                  <InfoRow label="Lead Source" value={asString(app.marketing_source)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Payment History — Naji 2026-05-07: Fee Information moved here
          from Enrolment & Fee tab so the financial side lives in one place. */}
      {!isLeadStage && activeTab === 3 && (
        <div className="space-y-4">
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

      {/* Reject Dialog with Reason */}
      {/* Naji 2026-05-08 — rich Generate Payment Link dialog. Pulls
          pricing from the application's offering / combination so the
          breakdown is computed up-front. */}
      <GeneratePaymentLinkDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        api={api}
        authToken={session.token}
        applicationId={applicationId}
        studentName={asString(app.name) || asString(app.user_email) || 'this lead'}
        offeringId={asString(app.offering_id)}
        combinationId={asString(app.certificate_combination_id)}
        initialBaseFee={Number(app.application_final_fee ?? 0)}
        initialDiscount={Number(app.application_discount ?? 0)}
        initialGstPercent={Number(app.application_gst_percent ?? 18)}
        onSent={() => reload()}
      />

      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) { setRejectDialogOpen(false); setRejectReason(''); } }}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleRejectSubmit();
            }}
          >
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
              <Button type="button" variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={submitting || !rejectReason.trim()}
              >
                {submitting ? 'Rejecting...' : 'Reject Application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
