import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { MetricCard } from '@ttii/ui';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';

const MAIN_TABS = [
  'Student Profile',
  'Enrollments',
  'Course Fee',
  'Documents',
  'Performance Analytics',
  'Certification',
  'Communication',
  'Activity Log',
];
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
  const [editOpen, setEditOpen] = useState(false);

  const studentId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.getStudentDetail(session.token, studentId),
    [studentId],
  );

  const { data: analyticsData } = useAdminPageData(
    () => api.getStudentAnalytics(session.token, studentId),
    [studentId],
  );

  const documents = useMemo(() => toRecords(analyticsData?.documents), [analyticsData]);
  const performance = useMemo(() => {
    const p = analyticsData?.performance;
    return typeof p === 'object' && p !== null ? (p as Record<string, unknown>) : null;
  }, [analyticsData]);
  const communicationData = useMemo(() => {
    const c = analyticsData?.communication;
    return typeof c === 'object' && c !== null ? (c as Record<string, unknown>) : null;
  }, [analyticsData]);
  const notifications = useMemo(() => toRecords(communicationData?.notifications), [communicationData]);
  const activityRows = useMemo(() => toRecords(analyticsData?.activity), [analyticsData]);

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
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
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
        <Button onClick={() => setEditOpen(true)} className="bg-ttii-primary hover:bg-ttii-primary/90">
          Edit Student
        </Button>
      </AdminPageHeader>

      <EditStudentDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
        api={api}
        token={session.token}
        studentId={studentId}
        onSaved={() => { setEditOpen(false); reload(); }}
      />

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

        </div>
      )}

      {/* Tab 3: Course Fee — fees + payments aggregated */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Total Fee (All Courses)"
              value={`₹${studentFees.reduce((sum, f) => sum + asNumber(f.total_fee), 0).toLocaleString('en-IN')}`}
              detail={`${studentFees.length} enrolment${studentFees.length === 1 ? '' : 's'}`}
              tone="info"
            />
            <MetricCard
              label="Paid"
              value={`₹${payments.reduce((sum, p) => sum + asNumber(p.amount_paid), 0).toLocaleString('en-IN')}`}
              detail={`${payments.length} payment${payments.length === 1 ? '' : 's'}`}
              tone="success"
            />
            <MetricCard
              label="Pending"
              value={`₹${Math.max(0, studentFees.reduce((sum, f) => sum + asNumber(f.total_fee), 0) - payments.reduce((sum, p) => sum + asNumber(p.amount_paid), 0)).toLocaleString('en-IN')}`}
              detail="Across all enrolments"
              tone={studentFees.length > 0 ? 'warning' : 'neutral'}
            />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Per-Enrolment Fees</CardTitle></CardHeader>
            <CardContent className="p-0">
              {studentFees.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">No fee records yet.</p>
              ) : (
                <AdminDataTable
                  columns={[
                    { key: 'enrollment_id', label: 'Enrolment No' },
                    { key: 'course_title', label: 'Course' },
                    { key: 'offering_title', label: 'Offering', render: (v) => asString(v) || '-' },
                    { key: 'total_fee', label: 'Course Fee', render: (v) => `₹${asNumber(v).toLocaleString('en-IN')}` },
                    { key: 'paid_amount', label: 'Paid', render: (v) => `₹${asNumber(v).toLocaleString('en-IN')}` },
                    { key: 'pending_amount', label: 'Pending', render: (v) => `₹${asNumber(v).toLocaleString('en-IN')}` },
                  ]}
                  rows={studentFees}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Documents */}
      {activeTab === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
          <CardContent className="p-0">
            {documents.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No documents uploaded.</p>
            ) : (
              <AdminDataTable
                columns={[
                  { key: 'label', label: 'Label', render: (v) => asString(v) || '-' },
                  {
                    key: 'file',
                    label: 'File',
                    render: (v) => {
                      const url = asString(v);
                      if (!url) return '-';
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      );
                    },
                  },
                  { key: 'uploaded_at', label: 'Uploaded', render: (v) => formatDate(v) },
                ]}
                rows={documents}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Performance Analytics */}
      {activeTab === 4 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Performance Analytics</CardTitle></CardHeader>
          <CardContent>
            {performance === null ? (
              <p className="text-sm text-gray-500">No performance data yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Quiz Avg Score"
                  value={String(Number(performance.quiz_avg_score ?? 0).toFixed(1))}
                  detail={`${asNumber(performance.quiz_attempts)} attempts`}
                  tone="info"
                />
                <MetricCard
                  label="Assignment Avg"
                  value={String(Number(performance.assignment_avg_score ?? 0).toFixed(1))}
                  detail={`${asNumber(performance.assignment_submissions)} submitted`}
                  tone="success"
                />
                <MetricCard
                  label="Video Completion"
                  value={`${asNumber(performance.video_completion_pct)}%`}
                  detail={`${asNumber(performance.videos_watched)}/${asNumber(performance.total_videos)}`}
                  tone={asNumber(performance.video_completion_pct) >= 50 ? 'success' : 'warning'}
                />
                <MetricCard
                  label="Practice Avg"
                  value={String(Number(performance.practice_avg_score ?? 0).toFixed(1))}
                  detail={`${asNumber(performance.practice_attempts)} attempts`}
                  tone="neutral"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Certification */}
      {activeTab === 5 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Certification</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No certificates issued yet. Will appear here once the certificates table is wired in.</p>
          </CardContent>
        </Card>
      )}

      {/* Tab 7: Communication — Email + WhatsApp + In-app Notifications */}
      {activeTab === 6 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Communication</CardTitle></CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500">No in-app notifications yet.</p>
            ) : (
              <ul className="space-y-2 border-l border-gray-200 pl-4">
                {notifications.slice(0, 50).map((n, idx) => (
                  <li key={idx} className="relative">
                    <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-blue-500" />
                    <div className="text-sm font-medium text-gray-900">{asString(n.title)}</div>
                    <div className="text-xs text-gray-500">{asString(n.description)}</div>
                    <div className="mt-0.5 text-[11px] text-gray-400">{formatDate(n.sent_at)}</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-gray-400 italic">Email and WhatsApp logs not yet available — will be wired once provider integrations land.</p>
          </CardContent>
        </Card>
      )}

      {/* Tab 8: Activity Log */}
      {activeTab === 7 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
          <CardContent>
            {activityRows.length === 0 ? (
              <p className="text-sm text-gray-500">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-2 border-l border-gray-200 pl-4">
                {activityRows.slice(0, 100).map((a, idx) => {
                  const event = asString(a.event);
                  const success = Boolean(a.success);
                  const variant: 'default' | 'secondary' | 'destructive' =
                    event.includes('FAIL') || event.includes('REJECT') ? 'destructive' : success ? 'default' : 'secondary';
                  const ua = asString(a.user_agent);
                  return (
                    <li key={idx} className="relative">
                      <span className={`absolute -left-[17px] top-1.5 h-2 w-2 rounded-full ${success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex items-center gap-2">
                        <Badge variant={variant} className="text-[10px] uppercase">{event}</Badge>
                        <span className="text-xs text-gray-500">{asString(a.ip_address) || '—'}</span>
                      </div>
                      {ua ? (
                        <div className="text-[11px] text-gray-400 truncate max-w-[600px]">{ua}</div>
                      ) : null}
                      <div className="text-[11px] text-gray-400">{formatDate(a.created_at)}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
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

const editSelectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

function EditStudentDialog({
  open, onClose, student, api, token, studentId, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  student: Record<string, unknown> | null;
  api: AdminPortalApi;
  token: string;
  studentId: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !student) return;
    const dob = student.date_of_birth;
    setForm({
      name: asString(student.name),
      user_email: asString(student.user_email),
      phone: asString(student.phone),
      country_code: asString(student.country_code),
      alternate_phone: asString(student.second_phone) || asString(student.alternate_phone),
      whatsapp_no: asString(student.whatsapp_no),
      date_of_birth: dob ? new Date(dob as string).toISOString().split('T')[0] ?? '' : '',
      gender: asString(student.gender),
      nationality: asString(student.nationality),
      marital_status: asString(student.marital_status),
      father_name: asString(student.father_name),
      mother_name: asString(student.mother_name),
      guardian_name: asString(student.guardian_name),
      aadhar_no: asString(student.aadhar_no),
      passport_no: asString(student.passport_no),
      country: asString(student.country),
      state: asString(student.state),
      city: asString(student.city),
      address: asString(student.address),
      native_address: asString(student.native_address),
      status: asString(student.status) || '1',
      highest_qualification: asString(student.highest_qualification),
      institution_name: asString(student.institution_name) || asString(student.previous_school),
      year_of_passing: asString(student.year_of_passing),
      percentage_or_grade: asString(student.percentage_or_grade),
      employment_status: asString(student.employment_status),
      current_occupation: asString(student.current_occupation),
      experience_years: asString(student.work_experience) || asString(student.experience_years),
    });
    setPhoto(asString(student.profile_picture) || asString(student.image));
  }, [open, student]);

  const setField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateStudentFull(token, studentId, { ...form, profile_picture: photo });
      toast.success('Student updated.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }} className="w-full min-w-0">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="w-full min-w-0 max-h-[70vh] overflow-y-auto space-y-4 py-2">
            <div>
              <Label className="mb-1 text-xs">Profile Photo</Label>
              <PhotoUpload
                value={photo}
                onChange={setPhoto}
                onUpload={async (file) => {
                  const r = await api.uploadFile(token, file);
                  return r.url;
                }}
                fallbackInitials={(form.name || '?').slice(0, 2).toUpperCase()}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" value={form.name ?? ''} onChange={(v) => setField('name', v)} />
              <Field label="Email" value={form.user_email ?? ''} onChange={(v) => setField('user_email', v)} />
              <Field label="Phone" value={form.phone ?? ''} onChange={(v) => setField('phone', v)} />
              <Field label="Alternate Phone" value={form.alternate_phone ?? ''} onChange={(v) => setField('alternate_phone', v)} />
              <Field label="WhatsApp" value={form.whatsapp_no ?? ''} onChange={(v) => setField('whatsapp_no', v)} />
              <Field label="Date of Birth" type="date" value={form.date_of_birth ?? ''} onChange={(v) => setField('date_of_birth', v)} />
              <div>
                <Label className="mb-1 text-xs">Gender</Label>
                <select className={editSelectClass} value={form.gender ?? ''} onChange={(e) => setField('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label className="mb-1 text-xs">Marital Status</Label>
                <select className={editSelectClass} value={form.marital_status ?? ''} onChange={(e) => setField('marital_status', e.target.value)}>
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <Field label="Nationality" value={form.nationality ?? ''} onChange={(v) => setField('nationality', v)} />
              <Field label="Aadhar No" value={form.aadhar_no ?? ''} onChange={(v) => setField('aadhar_no', v)} />
              <Field label="Passport No" value={form.passport_no ?? ''} onChange={(v) => setField('passport_no', v)} />
              <Field label="Father Name" value={form.father_name ?? ''} onChange={(v) => setField('father_name', v)} />
              <Field label="Mother Name" value={form.mother_name ?? ''} onChange={(v) => setField('mother_name', v)} />
              <Field label="Guardian Name" value={form.guardian_name ?? ''} onChange={(v) => setField('guardian_name', v)} />
              <Field label="Country" value={form.country ?? ''} onChange={(v) => setField('country', v)} />
              <Field label="State" value={form.state ?? ''} onChange={(v) => setField('state', v)} />
              <Field label="City / District" value={form.city ?? ''} onChange={(v) => setField('city', v)} />
              <div>
                <Label className="mb-1 text-xs">Status</Label>
                <select className={editSelectClass} value={form.status ?? '1'} onChange={(e) => setField('status', e.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                  <option value="2">Graduated</option>
                  <option value="3">Dropped</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="mb-1 text-xs">Permanent Address</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                value={form.address ?? ''}
                onChange={(e) => setField('address', e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1 text-xs">Correspondence Address</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                value={form.native_address ?? ''}
                onChange={(e) => setField('native_address', e.target.value)}
              />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-700">Qualification & Employment</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-xs">Highest Qualification</Label>
                  <select
                    className={editSelectClass}
                    value={form.highest_qualification ?? ''}
                    onChange={(e) => setField('highest_qualification', e.target.value)}
                  >
                    <option value="">Select</option>
                    {[
                      'Secondary School', 'Higher Secondary', 'Diploma', "Bachelor's Degree",
                      'Postgraduate Diploma', "Master's Degree", 'M.Phil.', 'Ph.D.',
                      'Professional Certification', 'Other',
                    ].map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <Field label="School / College" value={form.institution_name ?? ''} onChange={(v) => setField('institution_name', v)} />
                <Field label="Year of Passing" value={form.year_of_passing ?? ''} onChange={(v) => setField('year_of_passing', v)} />
                <Field label="Percentage / Grade" value={form.percentage_or_grade ?? ''} onChange={(v) => setField('percentage_or_grade', v)} />
                <div>
                  <Label className="mb-1 text-xs">Current Employment Status</Label>
                  <select
                    className={editSelectClass}
                    value={form.employment_status ?? ''}
                    onChange={(e) => setField('employment_status', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Employed">Employed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Student">Student</option>
                    <option value="Homemaker">Homemaker</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <Field label="Current Occupation" value={form.current_occupation ?? ''} onChange={(v) => setField('current_occupation', v)} />
                <div>
                  <Label className="mb-1 text-xs">Experience</Label>
                  <select
                    className={editSelectClass}
                    value={form.experience_years ?? ''}
                    onChange={(e) => setField('experience_years', e.target.value)}
                  >
                    <option value="">Select</option>
                    {['Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'].map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-ttii-primary hover:bg-ttii-primary/90">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      <Input type={type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
