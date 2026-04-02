import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

const TAB_LABELS = ['Overview', 'Enrolment & Payments', 'LMS Progress'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-900">{value || '-'}</span>
    </div>
  );
}

export default function ViewStudentPage({ api, session, onNavigate }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState(0);

  const studentId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error } = useAdminPageData(
    () => api.getStudentDetail(session.token, studentId),
    [studentId],
  );

  const student = useMemo(() => {
    if (!data) return null;
    const record = data.student;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  const enrolments = useMemo(() => toRecords(data?.enrolments), [data]);
  const payments = useMemo(() => toRecords(data?.payments), [data]);
  const studentFees = useMemo(() => toRecords(data?.studentFees), [data]);
  const videoProgress = useMemo(() => toRecords(data?.videoProgress), [data]);
  const materialProgress = useMemo(() => toRecords(data?.materialProgress), [data]);
  const assignmentSubmissions = useMemo(() => toRecords(data?.assignmentSubmissions), [data]);
  const profileCompletion = useMemo(() => asNumber(data?.profileCompletion), [data]);

  const firstEnrolment = enrolments.length > 0 ? enrolments[0] : null;

  const paymentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'payment_date', label: 'Date', render: (v) => formatDate(v) },
      { key: 'amount_paid', label: 'Amount', render: (v) => `₹${asNumber(v).toLocaleString()}` },
      { key: 'razorpay_payment_id', label: 'Payment ID' },
      { key: 'code', label: 'Receipt' },
    ],
    [],
  );

  const assignmentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'assignment_id', label: 'Assignment ID' },
      { key: 'marks', label: 'Score' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'created_at', label: 'Submitted', render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading view student..." />;
  }

  if (error || !student) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error || 'Student not found.'}
        </CardContent>
      </Card>
    );
  }

  const profilePicture = asString(student.profile_picture);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Student Details">
        <Button variant="outline" onClick={() => onNavigate('/admin/students')}>
          ← Back to Students
        </Button>
      </AdminPageHeader>

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
            <CardTitle className="text-base">Student Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              {/* Profile picture */}
              <div className="flex-shrink-0">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={asString(student.name)}
                    className="h-28 w-28 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-2xl font-semibold text-gray-400">
                    {asString(student.name).charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>

              {/* Info rows */}
              <div className="flex-1 grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Student ID" value={asString(student.student_id)} />
                  <InfoRow label="Name" value={asString(student.name)} />
                  <InfoRow label="Email" value={asString(student.user_email)} />
                  <InfoRow label="Phone" value={asString(student.phone)} />
                </div>
                <div>
                  <InfoRow label="Username" value={asString(student.username)} />
                  <InfoRow label="Date of Birth" value={formatDate(student.date_of_birth) || '-'} />
                  <InfoRow label="Gender" value={asString(student.gender) || '-'} />
                  <InfoRow label="Address" value={asString(student.address) || '-'} />
                  <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
                    <span className="text-sm font-medium text-gray-500">Status</span>
                    <span className="col-span-2">
                      <AdminStatusBadge status={asString(student.status) || 'active'} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile completion bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-gray-600">Profile Completion</span>
                <span className="font-semibold text-gray-900">{profileCompletion}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-200">
                <div
                  className="h-2.5 rounded-full bg-ttii-primary transition-all"
                  style={{ width: `${Math.min(profileCompletion, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Enrolment & Payments */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrolment Details</CardTitle>
            </CardHeader>
            <CardContent>
              {firstEnrolment ? (
                <div className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <InfoRow label="Course" value={asString(firstEnrolment.course_title)} />
                    <InfoRow label="Batch" value={asString(firstEnrolment.batch_title)} />
                    <InfoRow label="Enrollment ID" value={asString(firstEnrolment.enrollment_id || firstEnrolment.id)} />
                  </div>
                  <div>
                    <InfoRow label="Enrollment Date" value={formatDate(firstEnrolment.enrollment_date || firstEnrolment.created_at)} />
                    <InfoRow label="Status" value={asString(firstEnrolment.status)} />
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-400">No enrolment records found.</p>
              )}
            </CardContent>
          </Card>

          {/* Fee summary */}
          {studentFees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fee Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-8 md:grid-cols-2">
                  {studentFees.map((fee, idx) => (
                    <div key={idx}>
                      <InfoRow label="Total Fee" value={`₹${asNumber(fee.total_fee).toLocaleString()}`} />
                      <InfoRow label="Amount Paid" value={`₹${asNumber(fee.amount_paid).toLocaleString()}`} />
                      <InfoRow label="Balance" value={`₹${asNumber(fee.balance).toLocaleString()}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

      {/* Tab 3: LMS Progress */}
      {activeTab === 2 && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="py-5 text-center">
                <p className="text-2xl font-bold text-ttii-primary">{videoProgress.length}</p>
                <p className="mt-1 text-sm text-gray-500">Videos Watched</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <p className="text-2xl font-bold text-ttii-primary">{materialProgress.length}</p>
                <p className="mt-1 text-sm text-gray-500">Materials Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <p className="text-2xl font-bold text-ttii-primary">{assignmentSubmissions.length}</p>
                <p className="mt-1 text-sm text-gray-500">Assignments Submitted</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment Submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {assignmentSubmissions.length > 0 ? (
                <AdminDataTable columns={assignmentColumns} rows={assignmentSubmissions} searchable={false} exportable={false} />
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">No assignment submissions found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
