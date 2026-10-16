import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Activity, ArrowLeft, Award, BarChart3, BookOpen, CreditCard, FileText, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { GeneratePaymentLinkDialog } from '../applications/GeneratePaymentLinkDialog.js';
import { AddEnrolmentDialog } from './student-view/AddEnrolmentDialog.js';
import { EditEnrolmentDialog } from './student-view/EditEnrolmentDialog.js';
import { EnrolmentFeePlanDialog, type EnrolmentFeePlanTarget } from './student-view/EnrolmentFeePlanDialog.js';
import { scopeToCourse, usesOwnFeePlan } from './student-view/enrolment-fee-plan-model.js';
import { DocumentsTab } from './student-view/DocumentsTab.js';
import {
  ApplicationDetails, AssignmentTable, CohortCards, ExaminationTable, LearningProgress, LiveClassAttendance, QuizHistory,
} from './student-view/EnrollmentSections.js';
import { EnrollmentsTab } from './student-view/EnrollmentsTab.js';
import { ActivityTab, CertificationTab, CommunicationTab, PerformanceTab } from './student-view/InsightTabs.js';
import { InstallmentDialog, type InstallmentTarget } from './student-view/InstallmentDialog.js';
import { CourseFeeTab, EnrollmentPaymentsPanel, type PaymentData, type SavedPlan } from './student-view/PaymentPanels.js';
import { ProfileTab } from './student-view/ProfileTab.js';
import { StudentHeroCard } from './student-view/StudentHeroCard.js';
import {
  accountStatusLabel, courseStatusLabel, scopePaymentSchedule, serverResult,
} from './student-view/student-view-model.js';
import { ProfileTabs, type TabItem } from './student-view/student-view-ui.js';

// Admin → Students → View, rebuilt in Naji's design (TTII 2026-10-12):
// StudentCard hero, underline profile tabs, ProfileInfoCard sections and the
// EnrollmentLayout rail. This file only loads data and owns the tab / dialog
// state; each tab is its own component under ./student-view/.
//
// Kept exactly: the two reads (/admin/students/view + /analytics), which
// endpoint every tab reads, every payment / plan / instalment action, Add / Edit
// Enrolment, document upload, the ?tab=enrollments&enrol_id= deep link, and
// counsellors (role 9) being view-only + Add Enrolment (Naji 2026-06-15).

const MAIN_TABS: TabItem[] = [
  { id: 'profile', label: 'Student Profile', icon: User },
  { id: 'enrollments', label: 'Enrollments', icon: BookOpen },
  { id: 'fee', label: 'Course Fee', icon: CreditCard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'performance', label: 'Performance Analytics', icon: BarChart3 },
  { id: 'certification', label: 'Certification', icon: Award },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null);

export default function ViewStudentPage({ api, session, onNavigate }: AdminPageProps) {
  const canEditStudent = session.roleId !== 9;
  const confirm = useConfirm();
  const [tab, setTab] = useState('profile');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [subTab, setSubTab] = useState('application');
  const [addEnrolOpen, setAddEnrolOpen] = useState(false);
  const [editEnrolRow, setEditEnrolRow] = useState<Record<string, unknown> | null>(null);
  const [instTarget, setInstTarget] = useState<InstallmentTarget | null>(null);
  const [payPlanOpen, setPayPlanOpen] = useState(false);
  const [feePlanTarget, setFeePlanTarget] = useState<EnrolmentFeePlanTarget | null>(null);
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);

  const studentId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error, reload } = useAdminPageData(() => api.getStudentDetail(session.token, studentId), [studentId]);
  const { data: analytics, reload: reloadAnalytics } = useAdminPageData(() => api.getStudentAnalytics(session.token, studentId), [studentId]);

  const student = useMemo(() => obj(data?.student), [data]);
  const enrolments = useMemo(() => toRecords(data?.enrolments), [data]);
  const accountStatus = useMemo(() => accountStatusLabel(student), [student]);
  const courseStatus = useMemo(() => courseStatusLabel(enrolments), [enrolments]);

  const payment: PaymentData = useMemo(() => {
    const plan = data?.applicationPaymentPlan && typeof data.applicationPaymentPlan === 'object' ? (data.applicationPaymentPlan as SavedPlan) : null;
    const linkUrl = asString(data?.paymentLinkUrl);
    return {
      studentFees: toRecords(data?.studentFees),
      applicationFee: obj(data?.applicationFee),
      applicationInstallments: toRecords(data?.applicationInstallments),
      applicationPaymentPlan: plan,
      paymentLinkUrl: linkUrl,
      paymentLinkExpiresAt: data?.paymentLinkExpiresAt,
      paymentStatus: asString(data?.paymentStatus),
      hasPaymentPlan: plan !== null || linkUrl !== '',
      scopedSchedule: scopePaymentSchedule(toRecords(data?.studentPaymentSchedule), enrolments),
    };
  }, [data, enrolments]);

  // Naji UAT 2026-05-13 — auto-select the first enrolment when the tab opens.
  useEffect(() => {
    if (tab === 'enrollments' && selectedIdx === null && enrolments.length > 0) {
      setSelectedIdx(0);
      setSubTab('application');
    }
  }, [tab, selectedIdx, enrolments.length]);

  // Naji UAT 2026-05-22 — deep link ?tab=enrollments&enrol_id=<id> (Student
  // Eligibility). Runs once after enrolments load.
  useEffect(() => {
    if (deepLinkApplied || enrolments.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    const enrolId = params.get('enrol_id');
    if (t === 'enrollments' || t === 'enrollment') {
      setTab('enrollments');
      if (enrolId) {
        const idx = enrolments.findIndex((e) => asString(e.id) === enrolId);
        if (idx >= 0) { setSelectedIdx(idx); setSubTab('application'); }
      }
    }
    setDeepLinkApplied(true);
  }, [enrolments, deepLinkApplied]);

  // Naji 2026-07-06 — delete a wrong instalment row (soft-delete server-side).
  const deleteInstalment = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id);
    if (!id) { toast.error('Installment id missing'); return; }
    const label = asString(row.installment_details) || 'this installment';
    if (!(await confirm({
      title: `Delete "${label}"?`,
      description: 'This removes it from the payment schedule.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.deleteInstallment(session.token, id);
      if ((res as { status?: number }).status === 1) {
        toast.success('Installment deleted');
        reload();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Delete failed');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }, [api, session.token, confirm, reload]);

  const toggleLogin = useCallback(async () => {
    if (!student) return;
    const disabled = Boolean(student.disabled_at);
    const name = asString(student.name) || 'this student';
    if (!disabled && !(await confirm({
      title: `Disable ${name}?`,
      description: 'They will be blocked from logging in until you re-enable them.',
      confirmText: 'Disable',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.toggleUserStatus(session.token, studentId, disabled);
      const { ok, message } = serverResult(res, disabled ? 'Student enabled.' : 'Student disabled.', 'Toggle failed');
      if (!ok) { toast.error(message); return; }
      toast.success(disabled ? 'Student enabled.' : 'Student disabled.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toggle failed');
    }
  }, [api, session.token, studentId, student, confirm, reload]);

  if (loading) return <PageLoader label="Loading student details..." />;
  if (error || !student) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error || 'Student not found.'}
          <div className="mt-4"><Button variant="outline" onClick={() => onNavigate('/admin/students')}>Back to Students</Button></div>
        </CardContent>
      </Card>
    );
  }

  const selected = selectedIdx !== null ? enrolments[selectedIdx] ?? null : null;
  const applicationId = asString(student.application_id);
  const editProfile = () => onNavigate(`/admin/students/edit/${studentId}`);

  const renderSubTab = () => {
    if (!selected) return null;
    switch (subTab) {
      case 'application': return <ApplicationDetails student={student} />;
      case 'learning':
        return (
          <LearningProgress
            videoProgress={toRecords(data?.videoProgress)}
            materialProgress={toRecords(data?.materialProgress)}
            assignmentSubmissions={toRecords(data?.assignmentSubmissions)}
            onViewReport={() => setSubTab('assignment')}
          />
        );
      case 'quiz': return <QuizHistory rows={toRecords(data?.quizAttempts)} />;
      case 'live': return <LiveClassAttendance rows={toRecords(data?.liveClassAttendance)} />;
      case 'cohort': return <CohortCards enrolment={selected} />;
      case 'assignment': return <AssignmentTable rows={toRecords(data?.assignmentSubmissions)} />;
      case 'exam': return <ExaminationTable rows={toRecords(data?.examAttempts)} />;
      case 'payments': {
        // TTII 2026-10-16 — the sub-tab shows THIS enrolment's fee rows. An
        // enrolment on its own plan (decided by the server: everything except
        // the linked application's course while that plan has a schedule)
        // gets the per-enrolment plan; the original course keeps the
        // application-wide one.
        const courseId = asNumber(selected.course_id);
        const scoped: PaymentData = {
          ...payment,
          studentFees: scopeToCourse(payment.studentFees, courseId),
          scopedSchedule: scopeToCourse(payment.scopedSchedule, courseId),
        };
        const hasOwnPlan = scoped.scopedSchedule.length > 0;
        return (
          <EnrollmentPaymentsPanel
            p={scoped}
            canEdit={canEditStudent}
            applicationId={applicationId}
            onOpenPlan={() => setPayPlanOpen(true)}
            enrolmentPlan={usesOwnFeePlan(selected)
              ? {
                  hasPlan: hasOwnPlan,
                  onOpen: () => setFeePlanTarget({ enrolId: asString(selected.id), courseTitle: asString(selected.course_title), hasPlan: hasOwnPlan }),
                }
              : null}
            onAddInstalment={() => setInstTarget({ mode: 'add', userId: asString(selected.user_id), courseId: asString(selected.course_id) })}
            onEditInstalment={(row) => setInstTarget({ mode: 'edit', row })}
            onDeleteInstalment={(row) => { void deleteInstalment(row); }}
          />
        );
      }
      default: return null;
    }
  };

  const analyticsRec = analytics ?? null;
  const requiredDocuments = toRecords(analyticsRec?.requiredDocuments);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Student profile</h1>
          <p className="text-xs text-muted-foreground">Drill down into an individual learner.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNavigate('/admin/students')}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to Students
        </Button>
      </div>

      <StudentHeroCard
        student={student}
        accountStatus={accountStatus}
        courseStatus={courseStatus}
        enrolments={enrolments}
        canEdit={canEditStudent}
        onEdit={editProfile}
        onToggleLogin={() => { void toggleLogin(); }}
      />

      <ProfileTabs tabs={MAIN_TABS} active={tab} onChange={(id) => { setTab(id); setSelectedIdx(null); }} label="Student sections" />

      {tab === 'profile' ? (
        <ProfileTab
          student={student}
          accountStatus={accountStatus}
          courseStatus={courseStatus}
          enrolmentCount={enrolments.length}
          profileCompletion={asNumber(data?.profileCompletion)}
          educationPathway={toRecords(data?.educationPathway)}
        />
      ) : null}

      {tab === 'enrollments' ? (
        <EnrollmentsTab
          enrolments={enrolments}
          selectedIdx={selectedIdx}
          onSelect={(idx) => { setSelectedIdx(idx); setSubTab('application'); }}
          subTab={subTab}
          onSubTab={setSubTab}
          onBack={() => setTab('profile')}
          onAdd={() => setAddEnrolOpen(true)}
          onEdit={setEditEnrolRow}
          canEdit={canEditStudent}
        >
          {renderSubTab()}
        </EnrollmentsTab>
      ) : null}

      {tab === 'fee' ? (
        <CourseFeeTab p={payment} canEdit={canEditStudent} applicationId={applicationId} onOpenPlan={() => setPayPlanOpen(true)} />
      ) : null}

      {tab === 'documents' ? (
        <DocumentsTab
          api={api}
          token={session.token}
          studentId={studentId}
          documents={toRecords(analyticsRec?.documents)}
          pendingRequired={requiredDocuments.filter((r) => !r.fulfilled)}
          applicationDocuments={toRecords(data?.applicationDocuments)}
          onUploaded={reloadAnalytics}
        />
      ) : null}

      {tab === 'performance' ? <PerformanceTab performance={obj(analyticsRec?.performance)} /> : null}
      {tab === 'certification' ? <CertificationTab /> : null}
      {tab === 'communication' ? (
        <CommunicationTab
          api={api}
          token={session.token}
          phone={asString(student.phone)}
          notifications={toRecords(obj(analyticsRec?.communication)?.notifications)}
        />
      ) : null}
      {tab === 'activity' ? <ActivityTab rows={toRecords(analyticsRec?.activity)} /> : null}

      {/* Generate / Edit Payment Plan — Naji 2026-07-05. Reuses the lead dialog
          against the enrolled student's retained application row; the backend
          preserves the enrolled stage so this never un-enrols them. */}
      <GeneratePaymentLinkDialog
        open={payPlanOpen}
        onOpenChange={setPayPlanOpen}
        api={api}
        authToken={session.token}
        applicationId={applicationId}
        studentName={asString(student.name) || 'this student'}
        offeringId={asString(student.offering_id)}
        combinationId={asString(student.certificate_combination_id)}
        initialBaseFee={asNumber(payment.studentFees[0]?.base_fee)}
        initialDiscount={asNumber(payment.studentFees[0]?.discount)}
        initialGstPercent={asNumber(payment.studentFees[0]?.gst_percent)}
        initialSavedPlan={payment.applicationPaymentPlan}
        paymentStatus={payment.paymentStatus}
        onSent={() => reload()}
      />

      <EnrolmentFeePlanDialog
        target={feePlanTarget}
        studentName={asString(student.name) || 'this student'}
        onClose={() => setFeePlanTarget(null)}
        onSaved={reload}
        api={api}
        token={session.token}
      />

      <InstallmentDialog target={instTarget} onClose={() => setInstTarget(null)} onSaved={reload} api={api} token={session.token} />

      <AddEnrolmentDialog open={addEnrolOpen} onClose={() => setAddEnrolOpen(false)} onCreated={reload} api={api} token={session.token} studentId={studentId} />

      <EditEnrolmentDialog
        row={editEnrolRow}
        leadSource={asString(student.lead_source)}
        onClose={() => setEditEnrolRow(null)}
        onSaved={reload}
        api={api}
        token={session.token}
      />
    </div>
  );
}
