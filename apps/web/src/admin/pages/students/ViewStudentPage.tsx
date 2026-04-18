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

const MAIN_TABS = ['Student Profile', 'Enrollments'];
const ENROLLMENT_SUB_TABS = ['Learning Progress', 'Quiz', 'Live Class', 'Assignment', 'Examination', 'Payments'];

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
  const [selectedEnrollmentIdx, setSelectedEnrollmentIdx] = useState<number | null>(null);
  const [enrollmentSubTab, setEnrollmentSubTab] = useState(0);

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

  // Selected enrollment for drill-down
  const selectedEnrollment = selectedEnrollmentIdx !== null ? enrolments[selectedEnrollmentIdx] : null;

  // Enrollment table columns
  const enrollmentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'enrollment_id', label: 'Enrollment ID', render: (v, row) => asString(v) || asString(row.id) || '-' },
      { key: 'enrollment_date', label: 'Date of Enrollment', render: (v, row) => formatDate(v || row.created_at) },
      { key: 'course_title', label: 'Course Name', render: (v) => asString(v) || '-' },
      { key: 'offering_title', label: 'Course Offering', render: (v) => asString(v) || '-' },
      {
        key: 'course_fee',
        label: 'Course Fee',
        render: (v) => {
          const fee = asNumber(v);
          return fee ? `₹${fee.toLocaleString()}` : '-';
        },
      },
      {
        key: 'progress',
        label: 'Progress',
        render: (v) => {
          const pct = asNumber(v);
          return (
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-ttii-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <span className="text-xs text-gray-500">{pct}%</span>
            </div>
          );
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (v, row) => <AdminStatusBadge status={asString(v) || asString(row.enrollment_status) || 'Active'} />,
      },
    ],
    [],
  );

  const enrollmentActions = useMemo(
    () => [
      {
        label: 'View',
        onClick: (_row: Record<string, unknown>, index: number) => {
          setSelectedEnrollmentIdx(index);
          setEnrollmentSubTab(0);
        },
      },
    ],
    [],
  );

  // Payment columns for enrollment drill-down
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
    return <PageLoader label="Loading student details..." />;
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

      {/* Main tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {MAIN_TABS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === idx ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setActiveTab(idx); setSelectedEnrollmentIdx(null); }}
          >
            {label}
            {activeTab === idx ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab 1: Student Profile */}
      {activeTab === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
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

                <div className="flex-1 grid gap-x-8 md:grid-cols-2">
                  <div>
                    <InfoRow label="Student ID" value={asString(student.student_id)} />
                    <InfoRow label="Name" value={asString(student.name)} />
                    <InfoRow label="Email" value={asString(student.user_email)} />
                    <InfoRow label="Phone" value={asString(student.phone)} />
                    <InfoRow label="Date of Birth" value={formatDate(student.date_of_birth) || '-'} />
                  </div>
                  <div>
                    <InfoRow label="Gender" value={asString(student.gender) || '-'} />
                    <InfoRow label="Username" value={asString(student.username)} />
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

          {/* Qualification section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Highest Qualification" value={asString(student.highest_qualification)} />
                  <InfoRow label="Specialization" value={asString(student.specialization)} />
                  <InfoRow label="School / College" value={asString(student.institution_name)} />
                </div>
                <div>
                  <InfoRow label="Year of Passing" value={asString(student.year_of_passing)} />
                  <InfoRow label="Current Occupation" value={asString(student.current_occupation)} />
                  <InfoRow label="Experience" value={asString(student.work_experience)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QA Correction2 round: additional sections (placeholder stubs) */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">All student-uploaded documents (Aadhaar, Passport, Certificates, Photos) in one place.</p>
                <p className="mt-2 text-xs text-gray-400 italic">Coming soon.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Learner-specific analytics: completion rate, quiz scores, attendance trends.</p>
                <p className="mt-2 text-xs text-gray-400 italic">Coming soon.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Certification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">All institution-issued certificates for this learner in one view.</p>
                <p className="mt-2 text-xs text-gray-400 italic">Coming soon.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Email, WhatsApp and in-app notifications history with this learner.</p>
                <p className="mt-2 text-xs text-gray-400 italic">Coming soon.</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Last login, device used, time spent on platform, session breakdown.</p>
                <p className="mt-2 text-xs text-gray-400 italic">Coming soon.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Enrollments */}
      {activeTab === 1 && (
        <div className="space-y-4">
          {selectedEnrollment === null ? (
            /* Enrollment List */
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Enrollments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {enrolments.length > 0 ? (
                  <AdminDataTable
                    columns={enrollmentColumns}
                    rows={enrolments}
                    actions={enrollmentActions}
                    searchable={false}
                    exportable={false}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-gray-400">No enrollment records found.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Enrollment Detail Drill-down */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedEnrollmentIdx(null)}>
                  ← Back to Enrollments
                </Button>
                <span className="text-sm font-medium text-gray-600">
                  Enrollment: {asString(selectedEnrollment?.enrollment_id) || asString(selectedEnrollment?.id)} — {asString(selectedEnrollment?.course_title)}
                </span>
              </div>

              {/* Sub-tab navigation */}
              <div className="flex flex-wrap gap-1 border-b border-gray-200">
                {ENROLLMENT_SUB_TABS.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                      enrollmentSubTab === idx ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setEnrollmentSubTab(idx)}
                  >
                    {label}
                    {enrollmentSubTab === idx ? (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Sub-tab: Learning Progress */}
              {enrollmentSubTab === 0 && (
                <div className="space-y-4">
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
                  {videoProgress.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Subject Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {videoProgress.map((vp, idx) => {
                            const title = asString(vp.subject_title) || asString(vp.lesson_title) || `Lesson ${idx + 1}`;
                            const pct = asNumber(vp.progress) || asNumber(vp.completion_percentage) || 0;
                            return (
                              <div key={idx}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-700">{title}</span>
                                  <span className="text-gray-500">{pct}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-200">
                                  <div className="h-2 rounded-full bg-ttii-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Sub-tab: Quiz */}
              {enrollmentSubTab === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quiz History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="py-4 text-center text-sm text-gray-400">No quiz records available for this enrollment.</p>
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Live Class */}
              {enrollmentSubTab === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Live Class Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="py-4 text-center text-sm text-gray-400">No live class records available for this enrollment.</p>
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Assignment */}
              {enrollmentSubTab === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assignments</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {assignmentSubmissions.length > 0 ? (
                      <AdminDataTable columns={assignmentColumns} rows={assignmentSubmissions} searchable={false} exportable={false} />
                    ) : (
                      <p className="py-6 text-center text-sm text-gray-400">No assignment submissions found.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Examination */}
              {enrollmentSubTab === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Examination</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="py-4 text-center text-sm text-gray-400">No examination records available for this enrollment.</p>
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Payments */}
              {enrollmentSubTab === 5 && (
                <div className="space-y-4">
                  {studentFees.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Fee Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-x-8 md:grid-cols-3">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
