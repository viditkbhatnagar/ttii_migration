import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { MetricCard } from '@ttii/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  User as UserIcon, BookOpen, Wallet, FileText as FileTextIcon, BarChart3, Award,
  MessageSquare, Activity, Phone as PhoneIcon, Mail as MailIcon, IdCard,
  GraduationCap, MapPin, Briefcase, TrendingUp, TrendingDown, PlayCircle,
  CheckCircle2, ClipboardList,
} from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { CallButton } from '../../shared/components/CallButton.js';
import { CallHistoryPanel } from '../../shared/components/CallHistoryPanel.js';

// Naji UAT 2026-05-13 — Student Profile page modelled on the
// regal-folio-kit reference. Each main tab now carries an icon for
// quicker scanning + an underline indicator on the active tab.
const MAIN_TABS: { label: string; icon: typeof UserIcon }[] = [
  { label: 'Student Profile', icon: UserIcon },
  { label: 'Enrollments', icon: BookOpen },
  { label: 'Course Fee', icon: Wallet },
  { label: 'Documents', icon: FileTextIcon },
  { label: 'Performance Analytics', icon: BarChart3 },
  { label: 'Certification', icon: Award },
  { label: 'Communication', icon: MessageSquare },
  { label: 'Activity Log', icon: Activity },
];
// Naji 2026-05-12 — Application Details is now a tab inside the drill-down
// (it was a card at the top). Tab indices: 0 Application Details,
// 1 Learning Progress, 2 Quiz, 3 Live Class, 4 Assignment, 5 Examination,
// 6 Payments.
// Naji UAT 2026-05-15 — Cohort sub-tab inserted between Live Class and
// Assignment so the cohort context for an enrolment is one click away
// from Live Class (the cohort is the parent of the live-class schedule).
const ENROLLMENT_SUB_TABS = ['Application Details', 'Learning Progress', 'Quiz', 'Live Class', 'Cohort', 'Assignment', 'Examination', 'Payments'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-900">{value || '-'}</span>
    </div>
  );
}

// Reference site uses a coloured icon tile + title + one-line subtitle as
// each section's header. Reusable wrapper so every section gets the same
// treatment.
function SectionHeader({ icon: Icon, title, subtitle, tone = 'primary' }: {
  icon: typeof UserIcon;
  title: string;
  subtitle?: string;
  tone?: 'primary' | 'sky' | 'amber' | 'emerald' | 'rose' | 'violet';
}) {
  const TONES: Record<string, string> = {
    primary: 'bg-ttii-primary/10 text-ttii-primary',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
  };
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

// Compact info chip used in the hero card (Student ID / Email / Phone /
// Enrollments). Renders as a small bordered card with icon + label + value.
function InfoChip({ icon: Icon, label, value }: {
  icon: typeof UserIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ttii-primary/10 text-ttii-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="truncate text-sm font-medium text-gray-900">{value || '-'}</p>
      </div>
    </div>
  );
}

export default function ViewStudentPage({ api, session, onNavigate }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedEnrollmentIdx, setSelectedEnrollmentIdx] = useState<number | null>(null);
  const [enrollmentSubTab, setEnrollmentSubTab] = useState(0);
  // Naji 2026-05-12 — Subject Progress accordion: only one node (subject
  // (Subject Progress accordion state retired 2026-05-14 — replaced
  // with the flat row layout from the regal-folio-kit reference.)

  // Edit Enrolment dialog state (Naji UAT 2026-05-12)
  const [editEnrolOpen, setEditEnrolOpen] = useState(false);
  const [editEnrolRow, setEditEnrolRow] = useState<Record<string, unknown> | null>(null);
  const [enrolForm, setEnrolForm] = useState({
    enrollment_id: '',
    enrollment_status: '',
    mode_of_study: '',
    preferred_language: '',
    offering_id: '',
    combination_id: '',
    pipeline: '',
    pipeline_user: '',
    lead_source: '',
  });
  const [enrolSubmitting, setEnrolSubmitting] = useState(false);
  const [offeringOptions, setOfferingOptions] = useState<{ label: string; value: string }[]>([]);
  const [combinationOptions, setCombinationOptions] = useState<{ label: string; value: string }[]>([]);
  const [languageOptions, setLanguageOptions] = useState<{ label: string; value: string }[]>([]);
  const [pipelineUserOptions, setPipelineUserOptions] = useState<{ label: string; value: string }[]>([]);

  // Add Enrolment dialog state — Naji UAT 2026-05-14.
  const [addEnrolOpen, setAddEnrolOpen] = useState(false);
  const [addEnrolForm, setAddEnrolForm] = useState({
    course_id: '',
    offering_id: '',
    combination_id: '',
    mode_of_study: 'Online',
    preferred_language: '',
    pipeline: '',
    pipeline_user: '',
    lead_source: '',
    registration_fee: '',
    discount: '',
    gst_percent: '18',
    final_course_fee: '',
    payment_mode: 'link' as 'link' | 'manual' | 'draft',
  });
  const [addEnrolCourses, setAddEnrolCourses] = useState<{ label: string; value: string }[]>([]);
  const [addEnrolOfferings, setAddEnrolOfferings] = useState<{ label: string; value: string }[]>([]);
  const [addEnrolCombinations, setAddEnrolCombinations] = useState<{ label: string; value: string }[]>([]);
  const [addEnrolLanguages, setAddEnrolLanguages] = useState<{ label: string; value: string }[]>([]);
  const [addEnrolPipelineUsers, setAddEnrolPipelineUsers] = useState<{ label: string; value: string }[]>([]);
  const [addEnrolSubmitting, setAddEnrolSubmitting] = useState(false);

  // Edit Installment dialog (Naji UAT 2026-05-13)
  const [editInstOpen, setEditInstOpen] = useState(false);
  const [editInstRow, setEditInstRow] = useState<Record<string, unknown> | null>(null);
  const [instForm, setInstForm] = useState({
    installment_details: '',
    amount: '',
    due_date: '',
    paid_date: '',
    payment_mode: '',
    status: '',
  });
  const [instSubmitting, setInstSubmitting] = useState(false);

  const studentId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.getStudentDetail(session.token, studentId),
    [studentId],
  );

  const { data: analyticsData, reload: reloadAnalytics } = useAdminPageData(
    () => api.getStudentAnalytics(session.token, studentId),
    [studentId],
  );

  // Naji UAT 2026-05-14 — Documents tab Replace + Upload-Pending dialog.
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const openDocumentUpload = (label: string) => {
    setUploadLabel(label);
    setUploadDialogOpen(true);
  };
  const closeUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadLabel('');
    setUploadBusy(false);
  };
  const handleDocumentFile = async (file: File) => {
    if (!uploadLabel.trim()) {
      toast.error('Label is required.');
      return;
    }
    setUploadBusy(true);
    try {
      const uploaded = await api.uploadFile(session.token, file);
      const res = await api.upsertStudentDocument(session.token, {
        studentId,
        label: uploadLabel.trim(),
        file: uploaded.url,
      });
      const msg = typeof res.message === 'string' ? res.message : 'Saved.';
      if (res.status === 1) {
        toast.success(msg);
        closeUploadDialog();
        reloadAnalytics();
      } else {
        toast.error(msg);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadBusy(false);
    }
  };

  const documents = useMemo(() => toRecords(analyticsData?.documents), [analyticsData]);
  // Naji UAT 2026-05-14 — Documents tab now surfaces pending required-
  // document slots derived from course_required_documents on the
  // student's enrolled courses, plus a Replace action on existing rows.
  const requiredDocuments = useMemo(() => toRecords(analyticsData?.requiredDocuments), [analyticsData]);
  const pendingRequiredDocs = useMemo(
    () => requiredDocuments.filter((r) => !r.fulfilled),
    [requiredDocuments],
  );
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
  // Naji 2026-05-11 — enrollment drill-down sub-tabs wired to real tables.
  const quizAttempts = useMemo(() => toRecords(data?.quizAttempts), [data]);
  const examAttempts = useMemo(() => toRecords(data?.examAttempts), [data]);
  const liveClassAttendance = useMemo(() => toRecords(data?.liveClassAttendance), [data]);
  const profileCompletion = useMemo(() => asNumber(data?.profileCompletion), [data]);
  const educationPathway = useMemo(() => toRecords(data?.educationPathway), [data]);
  const applicationFee = useMemo(() => {
    const f = data?.applicationFee;
    return typeof f === 'object' && f !== null ? (f as Record<string, unknown>) : null;
  }, [data]);
  const applicationInstallments = useMemo(() => toRecords(data?.applicationInstallments), [data]);
  const applicationDocuments = useMemo(() => toRecords(data?.applicationDocuments), [data]);

  // Naji 2026-05-11 — Payment Plan card + proper Payment History table
  // were missing from the Student View even though the data was already
  // captured during the Lead → Enrolment workflow. Mirror what
  // ViewApplicationPage renders so the Student View shows the same.
  type SavedPlan = {
    mode?: string;
    total_amount_minor?: number;
    registration_fee_minor?: number | null;
    installments?: Array<{
      label?: string;
      amountMinor?: number;
      amount_minor?: number;
      dueDate?: string;
      due_date?: string;
      gstPercent?: number;
      gst_percent?: number;
    }>;
  };
  const applicationPaymentPlan = useMemo<SavedPlan | null>(() => {
    const raw = data?.applicationPaymentPlan;
    if (!raw || typeof raw !== 'object') return null;
    return raw as SavedPlan;
  }, [data]);
  const paymentLinkUrl = useMemo(() => asString(data?.paymentLinkUrl), [data]);
  const paymentStatus = useMemo(() => asString(data?.paymentStatus), [data]);
  const studentPaymentSchedule = useMemo(() => toRecords(data?.studentPaymentSchedule), [data]);
  const hasPaymentPlan = applicationPaymentPlan !== null || paymentLinkUrl !== '';

  // Same column shape as ViewApplicationPage so Naji sees the same table
  // for "Payment History" on both views.
  const paymentScheduleColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'installment_details', label: 'Installment' },
      { key: 'amount', label: 'Amount', render: (v) => `₹${asNumber(v).toLocaleString('en-IN')}` },
      { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
      { key: 'paid_date', label: 'Paid Date', render: (v) => formatDate(v) },
      { key: 'payment_mode', label: 'Mode', render: (v) => asString(v) || '-' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v) || 'Pending'} />,
      },
    ],
    [],
  );

  // Naji UAT 2026-05-13 — admin can edit any installment row directly.
  const openEditInstallment = (row: Record<string, unknown>) => {
    const toIsoDate = (v: unknown): string => {
      const s = asString(v);
      if (!s) return '';
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    };
    setEditInstRow(row);
    setInstForm({
      installment_details: asString(row.installment_details),
      amount: asString(row.amount),
      due_date: toIsoDate(row.due_date),
      paid_date: toIsoDate(row.paid_date),
      payment_mode: asString(row.payment_mode),
      status: asString(row.status),
    });
    setEditInstOpen(true);
  };
  const closeEditInstallment = () => {
    setEditInstOpen(false);
    setEditInstRow(null);
  };
  const submitEditInstallment = async () => {
    if (!editInstRow) return;
    const id = asString(editInstRow.id);
    if (!id) { toast.error('Installment id missing'); return; }
    setInstSubmitting(true);
    try {
      const res = await api.updateInstallment(session.token, id, instForm);
      if ((res as { status?: number }).status === 1) {
        toast.success('Installment updated');
        closeEditInstallment();
        reload();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Update failed');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setInstSubmitting(false);
    }
  };
  const paymentScheduleActions: DataTableAction[] = useMemo(
    () => [{ label: 'Edit', onClick: (row: Record<string, unknown>) => openEditInstallment(row) }],
    [],
  );

  // Selected enrollment for drill-down
  const selectedEnrollment = selectedEnrollmentIdx !== null ? enrolments[selectedEnrollmentIdx] : null;

  // Edit Enrolment trigger — surfaces from the course header card on
  // the right pane of the Enrolments tab. Naji UAT 2026-05-14 — the
  // older flat table was retired with the left-rail redesign, so the
  // legacy enrollmentColumns + enrollmentActions blocks were dropped.
  const openEditEnrol = (row: Record<string, unknown>) => {
    setEditEnrolRow(row);
    setEnrolForm({
      enrollment_id: asString(row.enrollment_id),
      enrollment_status: asString(row.enrollment_status) || asString(row.status) || 'Active',
      mode_of_study: asString(row.mode_of_study),
      preferred_language: asString(row.preferred_language),
      offering_id: '',
      combination_id: '',
      pipeline: asString(row.pipeline),
      pipeline_user: asString(row.pipeline_user),
      lead_source: asString(student?.lead_source),
    });
    setEditEnrolOpen(true);
  };

  // Load dropdown sources once the dialog opens.
  useEffect(() => {
    if (!editEnrolOpen || !editEnrolRow) return;
    const courseId = asString(editEnrolRow.course_id);
    const filters = courseId ? { course_id: courseId } : undefined;
    void Promise.all([
      api.listOfferings(session.token, filters),
      api.loadCertificateCombinations(session.token, filters),
      api.loadLanguages(session.token),
    ]).then(([offerings, combinations, languages]) => {
      // Naji UAT 2026-05-13 — sort offerings chronologically. The title
      // ends with a "Month Year" (e.g. "Diploma ... - May 2026"); parse
      // that into a Date for stable ordering, with a fallback to start_date
      // / enrollment_start when present in the API payload.
      const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const sortKey = (o: Record<string, unknown>): number => {
        const explicit = asString(o.start_date) || asString(o.enrollment_start);
        if (explicit) { const t = new Date(explicit).getTime(); if (Number.isFinite(t)) return t; }
        const tail = (asString(o.title) || asString(o.offering_code) || '').split('-').pop()?.trim().toLowerCase() ?? '';
        const monthIdx = MONTHS.findIndex((m) => tail.includes(m));
        const yr = tail.match(/(\d{4})/)?.[1];
        if (monthIdx >= 0 && yr) return new Date(Number(yr), monthIdx, 1).getTime();
        return Number.MAX_SAFE_INTEGER; // unknown dates sort to the end
      };
      const offeringsSorted = [...offerings].sort((a, b) => sortKey(a) - sortKey(b));
      setOfferingOptions(offeringsSorted.map((o) => ({
        label: asString(o.title) || asString(o.offering_code) || `Offering ${asString(o.id)}`,
        value: asString(o.id),
      })));
      setCombinationOptions(combinations.map((c) => ({
        label: asString(c.combination_code) || asString(c.title) || `Combination ${asString(c.id)}`,
        value: asString(c.id),
      })));
      setLanguageOptions(languages.map((l) => ({
        label: asString(l.title) || asString(l.name) || `Language ${asString(l.id)}`,
        value: asString(l.id),
      })));
      // Prefill offering + combination from the current enrolment row if
      // the backend already enriched them.
      const offTitle = asString(editEnrolRow.offering_title);
      if (offTitle) {
        const match = offerings.find((o) => asString(o.title) === offTitle || asString(o.offering_code) === offTitle);
        if (match) setEnrolForm((f) => ({ ...f, offering_id: asString(match.id) }));
      }
      const comboCode = asString(editEnrolRow.certificate_combination_code);
      if (comboCode) {
        const match = combinations.find((c) => asString(c.combination_code) === comboCode);
        if (match) setEnrolForm((f) => ({ ...f, combination_id: asString(match.id) }));
      }
    });
  }, [editEnrolOpen, editEnrolRow, api, session.token]);

  // Naji UAT 2026-05-13 — auto-select the first enrolment when the
  // Enrollments tab opens so the right pane never sits empty.
  useEffect(() => {
    if (activeTab === 1 && selectedEnrollmentIdx === null && enrolments.length > 0) {
      setSelectedEnrollmentIdx(0);
      setEnrollmentSubTab(0);
    }
  }, [activeTab, selectedEnrollmentIdx, enrolments.length]);

  // Naji UAT 2026-05-22 — deep-link support. Pages like Student Eligibility
  // navigate here with ?tab=enrollments&enrol_id=<id> to focus the right
  // enrolment directly. Runs once after enrolments load.
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  useEffect(() => {
    if (deepLinkApplied || enrolments.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const enrolIdParam = params.get('enrol_id');
    if (tab === 'enrollments' || tab === 'enrollment') {
      setActiveTab(1);
      if (enrolIdParam) {
        const idx = enrolments.findIndex((e) => asString(e.id) === enrolIdParam);
        if (idx >= 0) {
          setSelectedEnrollmentIdx(idx);
          setEnrollmentSubTab(0);
        }
      }
    }
    setDeepLinkApplied(true);
  }, [enrolments, deepLinkApplied]);

  // Pipeline → Pipeline User cascade. Centre lists centres; Admin pulls
  // both Super Admin (role 1) and Admin (role 8) users. Counsellor and
  // Associate are scoped to their single role.
  useEffect(() => {
    if (!editEnrolOpen) return;
    const p = enrolForm.pipeline;
    if (!p) {
      setPipelineUserOptions([]);
      return;
    }
    if (p === 'Centre') {
      void api.loadCentres(session.token).then((rows) => {
        setPipelineUserOptions(rows.map((r) => ({
          label: asString(r.name) || asString(r.title) || `Centre ${asString(r.id)}`,
          value: asString(r.id),
        })));
      });
      return;
    }
    const roleIds = p === 'Admin' ? [1, 8] : p === 'Counsellor' ? [9] : p === 'Associate' ? [10] : [];
    if (roleIds.length === 0) {
      setPipelineUserOptions([]);
      return;
    }
    void Promise.all(roleIds.map((rid) => api.loadPipelineUsers(session.token, rid)))
      .then((results) => {
        const merged = results.flat();
        const seen = new Set<string>();
        const opts: { label: string; value: string }[] = [];
        for (const r of merged) {
          const id = asString(r.id);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          opts.push({
            label: asString(r.name) || asString(r.user_email) || `User ${id}`,
            value: id,
          });
        }
        setPipelineUserOptions(opts);
      });
  }, [editEnrolOpen, enrolForm.pipeline, api, session.token]);

  const closeEditEnrol = () => {
    setEditEnrolOpen(false);
    setEditEnrolRow(null);
    setOfferingOptions([]);
    setCombinationOptions([]);
    setLanguageOptions([]);
    setPipelineUserOptions([]);
  };

  const submitEditEnrol = async () => {
    if (!editEnrolRow) return;
    const enrolId = asString(editEnrolRow.id);
    if (!enrolId) {
      toast.error('Enrolment id missing');
      return;
    }
    setEnrolSubmitting(true);
    try {
      const res = await api.updateEnrolment(session.token, enrolId, enrolForm);
      if ((res as { status?: number }).status === 1) {
        toast.success('Enrolment updated');
        closeEditEnrol();
        reload();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Update failed');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEnrolSubmitting(false);
    }
  };

  // Add Enrolment dialog — Naji UAT 2026-05-14.
  // When the dialog opens, fetch the dropdown sources (courses, languages)
  // and cascade offerings + combinations whenever course changes.
  useEffect(() => {
    if (!addEnrolOpen) return;
    void api.loadCourses(session.token).then((rows) => {
      setAddEnrolCourses(rows.map((r) => ({
        label: asString(r.title) || asString(r.course_title) || `Course ${asString(r.id)}`,
        value: asString(r.id),
      })));
    });
    void api.loadLanguages(session.token).then((rows) => {
      setAddEnrolLanguages(rows.map((r) => ({
        label: asString(r.title) || asString(r.name) || `Language ${asString(r.id)}`,
        value: asString(r.id),
      })));
    });
  }, [addEnrolOpen, api, session.token]);

  useEffect(() => {
    if (!addEnrolOpen || !addEnrolForm.course_id) {
      setAddEnrolOfferings([]);
      setAddEnrolCombinations([]);
      return;
    }
    void Promise.all([
      api.listOfferings(session.token, { course_id: addEnrolForm.course_id }),
      api.loadCertificateCombinations(session.token, { course_id: addEnrolForm.course_id }),
    ]).then(([offerings, combinations]) => {
      setAddEnrolOfferings(offerings.map((o) => ({
        label: asString(o.title) || asString(o.offering_code) || `Offering ${asString(o.id)}`,
        value: asString(o.id),
      })));
      setAddEnrolCombinations(combinations.map((c) => ({
        label: asString(c.combination_code) || asString(c.title) || `Combination ${asString(c.id)}`,
        value: asString(c.id),
      })));
    });
  }, [addEnrolOpen, addEnrolForm.course_id, api, session.token]);

  useEffect(() => {
    if (!addEnrolOpen) return;
    const p = addEnrolForm.pipeline;
    if (!p) { setAddEnrolPipelineUsers([]); return; }
    if (p === 'Centre') {
      void api.loadCentres(session.token).then((rows) => {
        setAddEnrolPipelineUsers(rows.map((r) => ({
          label: asString(r.name) || asString(r.title) || `Centre ${asString(r.id)}`,
          value: asString(r.id),
        })));
      });
      return;
    }
    const roleIds = p === 'Admin' ? [1, 8] : p === 'Counsellor' ? [9] : p === 'Associate' ? [10] : [];
    if (roleIds.length === 0) { setAddEnrolPipelineUsers([]); return; }
    void Promise.all(roleIds.map((rid) => api.loadPipelineUsers(session.token, rid))).then((results) => {
      const merged = results.flat();
      const seen = new Set<string>();
      const opts: { label: string; value: string }[] = [];
      for (const r of merged) {
        const id = asString(r.id);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        opts.push({ label: asString(r.name) || asString(r.user_email) || `User ${id}`, value: id });
      }
      setAddEnrolPipelineUsers(opts);
    });
  }, [addEnrolOpen, addEnrolForm.pipeline, api, session.token]);

  const closeAddEnrol = (): void => {
    setAddEnrolOpen(false);
    setAddEnrolForm({
      course_id: '', offering_id: '', combination_id: '',
      mode_of_study: 'Online', preferred_language: '',
      pipeline: '', pipeline_user: '', lead_source: '',
      registration_fee: '', discount: '', gst_percent: '18',
      final_course_fee: '', payment_mode: 'link',
    });
  };

  const submitAddEnrol = async (): Promise<void> => {
    if (!addEnrolForm.course_id) { toast.error('Course is required.'); return; }
    if (!addEnrolForm.final_course_fee) { toast.error('Final Course Fee is required.'); return; }
    setAddEnrolSubmitting(true);
    try {
      const res = await api.addAdditionalEnrolment(session.token, studentId, addEnrolForm);
      if ((res as { status?: number }).status === 1) {
        const data = (res as { data?: { pending_admin_approval?: boolean; payment_link_url?: string | null } }).data ?? {};
        const msg = data.pending_admin_approval
          ? 'Enrolment request submitted for admin approval.'
          : 'Additional enrolment created.';
        toast.success(msg + (data.payment_link_url ? ' Payment link sent.' : ''));
        closeAddEnrol();
        reload();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Failed to create enrolment.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create enrolment.');
    } finally {
      setAddEnrolSubmitting(false);
    }
  };

  // Naji 2026-05-12 — Assignment table now shows the assignment metadata
  // (subject + title + total marks + due date) alongside submission detail
  // (submitted at + marks received + feedback). Backend enriches each
  // submission with assignment + course title.
  const assignmentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'subject_title', label: 'Subject', render: (v) => asString(v) || '-' },
      { key: 'assignment_title', label: 'Title', render: (v, row) => asString(v) || asString(row.assignment_id) || '-' },
      { key: 'total_marks', label: 'Total Marks', render: (v) => asString(v) || '-' },
      { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
      { key: 'created_at', label: 'Submitted', render: (v) => formatDate(v) },
      { key: 'marks', label: 'Marks Received', render: (v) => asString(v) || '-' },
      { key: 'remarks', label: 'Feedback', render: (v) => asString(v) || '-' },
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
        <Button onClick={() => onNavigate(`/admin/students/edit/${studentId}`)} className="bg-ttii-primary hover:bg-ttii-primary/90">
          Edit Student
        </Button>
      </AdminPageHeader>

      {/* Hero identity card — Naji UAT 2026-05-13 redesign modelled on
          the regal-folio-kit reference. Avatar + name + status pill +
          (when present) primary course pill, secondary line with key
          facts, then a 4-chip row (Student ID / Email / Phone /
          Enrollments). Message / Edit Profile actions live top-right. */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={asString(student.name)}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gradient-to-br from-ttii-primary/15 to-ttii-secondary/15 text-2xl font-semibold text-ttii-primary">
                  {asString(student.name).charAt(0).toUpperCase() || '?'}
                </div>
              )}
              {asString(student.status_label).toLowerCase() === 'active' || asString(student.status) === '1' ? (
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" aria-label="Active" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-semibold text-gray-900">{asString(student.name) || 'Unnamed Student'}</h2>
                <AdminStatusBadge status={asString(student.status_label) || asString(student.status) || 'active'} />
                {enrolments[0]?.course_title ? (
                  <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                    {asString(enrolments[0].course_title)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {[
                  asString(student.highest_qualification),
                  asString(student.country_name) || asString(student.country),
                  student.created_at ? `Joined ${formatDate(student.created_at)}` : '',
                ].filter(Boolean).join(' · ') || 'Drill down into an individual learner.'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CallButton phone={asString(student.phone)} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const email = asString(student.user_email);
                  if (email) window.location.href = `mailto:${email}`;
                }}
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Message
              </Button>
              <Button
                size="sm"
                onClick={() => onNavigate(`/admin/students/edit/${studentId}`)}
                className="bg-ttii-primary hover:bg-ttii-primary/90"
              >
                Edit profile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoChip icon={IdCard} label="Student ID" value={asString(student.student_id)} />
            <InfoChip icon={MailIcon} label="Email" value={asString(student.user_email)} />
            <InfoChip icon={PhoneIcon} label="Phone" value={asString(student.phone)} />
            <InfoChip icon={BookOpen} label="Enrollments" value={`${enrolments.length} ${enrolments.length === 1 ? 'course' : 'courses'}`} />
          </div>
        </CardContent>
      </Card>

      {/* Main tab navigation — icon + label, underline indicator. */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {MAIN_TABS.map(({ label, icon: Icon }, idx) => (
          <button
            key={label}
            type="button"
            className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === idx ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setActiveTab(idx); setSelectedEnrollmentIdx(null); }}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {activeTab === idx ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab 1: Student Profile — Naji 2026-05-11 reorganised into 4
          named sections matching the Application View shape: Personal
          Information, Contact Information, Qualification, Education
          Pathway. Application Details + Emergency cards retained below. */}
      {activeTab === 0 && (
        <div className="space-y-4">
          {/* 1. Personal Information */}
          <Card>
            <CardHeader>
              <SectionHeader icon={UserIcon} title="Personal Information" subtitle="Identity, contact and demographic details" tone="primary" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Student ID" value={asString(student.student_id)} />
                  <InfoRow label="Name" value={asString(student.name)} />
                  {asString(student.username) && asString(student.username).toLowerCase() !== asString(student.user_email).toLowerCase() ? (
                    <InfoRow label="Login Username" value={asString(student.username)} />
                  ) : null}
                  <InfoRow label="Date of Birth" value={formatDate(student.date_of_birth) || '-'} />
                  <InfoRow label="Age" value={asString(student.age) || '-'} />
                  <InfoRow label="Gender" value={asString(student.gender) || '-'} />
                  <InfoRow label="Marital Status" value={asString(student.marital_status) || '-'} />
                  <InfoRow label="Nationality" value={asString(student.nationality_name) || asString(student.nationality) || '-'} />
                </div>
                <div>
                  <InfoRow label="Aadhaar No" value={asString(student.aadhar_no) || '-'} />
                  <InfoRow label="Passport No" value={asString(student.passport_no) || '-'} />
                  <InfoRow label="Father's Name" value={asString(student.father_name) || '-'} />
                  <InfoRow label="Mother's Name" value={asString(student.mother_name) || '-'} />
                  <InfoRow label="Guardian's Name" value={asString(student.guardian_name) || '-'} />
                  <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
                    <span className="text-sm font-medium text-gray-500">Status</span>
                    <span className="col-span-2">
                      <AdminStatusBadge status={asString(student.status_label) || asString(student.status) || 'active'} />
                    </span>
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

          {/* 2. Contact Information */}
          <Card>
            <CardHeader>
              <SectionHeader icon={MapPin} title="Contact Information" subtitle="Phone, address and location" tone="sky" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Email" value={asString(student.user_email)} />
                  <InfoRow label="Phone" value={asString(student.phone)} />
                  <InfoRow label="Alternate Phone" value={asString(student.second_phone) || asString(student.alternate_phone) || '-'} />
                  <InfoRow label="WhatsApp" value={asString(student.whatsapp_no) || '-'} />
                </div>
                <div>
                  <InfoRow label="Country" value={asString(student.country_name) || asString(student.country) || '-'} />
                  <InfoRow label="State" value={asString(student.state) || '-'} />
                  <InfoRow label="City / District" value={asString(student.city) || '-'} />
                  <InfoRow label="Permanent Address" value={asString(student.address) || '-'} />
                  <InfoRow label="Native Address" value={asString(student.native_address) || '-'} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Qualification */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Briefcase} title="Qualification & Employment" subtitle="Highest qualification, school, current role" tone="amber" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow label="Highest Qualification" value={asString(student.highest_qualification)} />
                  <InfoRow label="Specialization" value={asString(student.specialization)} />
                  <InfoRow label="School / College" value={asString(student.institution_name)} />
                  <InfoRow label="Year of Passing" value={asString(student.year_of_passing)} />
                </div>
                <div>
                  <InfoRow label="Percentage / Grade" value={asString(student.percentage_or_grade)} />
                  <InfoRow label="Employment Status" value={asString(student.employment_status)} />
                  <InfoRow label="Current Occupation" value={asString(student.current_occupation)} />
                  <InfoRow label="Experience" value={asString(student.work_experience)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Education Pathway */}
          <Card>
            <CardHeader>
              <SectionHeader icon={GraduationCap} title="Education Pathway" subtitle="History of qualifications, institutions and marks" tone="emerald" />
            </CardHeader>
            <CardContent className="p-0">
              {educationPathway.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Qualification</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Specialization</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Institution</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Board</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Year</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Marks</th>
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

          {applicationFee && (
            <Card>
              <CardHeader><CardTitle className="text-base">Application Fee Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <InfoRow label="Registration Fee" value={asString(applicationFee.registration_fee) ? `₹${asString(applicationFee.registration_fee)}` : '-'} />
                    <InfoRow label="Discount" value={asString(applicationFee.discount) ? `${asString(applicationFee.discount)}${applicationFee.discount_type === 'flat' ? ' (flat)' : ' %'}` : '-'} />
                  </div>
                  <div>
                    <InfoRow label="GST %" value={asString(applicationFee.gst_percent) || '-'} />
                    <InfoRow label="Final Course Fee" value={asString(applicationFee.final_fee) ? `₹${asNumber(applicationFee.final_fee).toLocaleString('en-IN')}` : '-'} />
                  </div>
                </div>
                {applicationInstallments.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Instalment Plan (captured at application)</p>
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Due Date</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Amount</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">GST</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applicationInstallments.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-3 py-1.5">{idx + 1}</td>
                              <td className="px-3 py-1.5">{asString(row.description) || '-'}</td>
                              <td className="px-3 py-1.5">{asString(row.due_date) || '-'}</td>
                              <td className="px-3 py-1.5">{asString(row.amount) || '-'}</td>
                              <td className="px-3 py-1.5">{asString(row.gst) || '-'}</td>
                              <td className="px-3 py-1.5 font-medium">{asString(row.total) || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Naji 2026-05-11 — Payment Plan card. Mirrors what
              ViewApplicationPage shows so the Student View carries the
              same payment-plan summary the counsellor saved during the
              Lead → Enrolment workflow. */}
          {hasPaymentPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Payment Plan</span>
                  {paymentStatus ? (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-800">
                      {paymentStatus}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <InfoRow
                      label="Mode"
                      value={applicationPaymentPlan?.mode === 'installment' ? 'Installment Plan' : 'Full Payment'}
                    />
                    <InfoRow
                      label="Total"
                      value={
                        applicationPaymentPlan?.total_amount_minor
                          ? `₹${(Number(applicationPaymentPlan.total_amount_minor) / 100).toLocaleString('en-IN')}`
                          : '-'
                      }
                    />
                  </div>
                  <div>
                    {paymentLinkUrl ? (
                      <>
                        <InfoRow label="Payment Link" value={paymentLinkUrl} />
                        <InfoRow label="Expires" value={formatDate(data?.paymentLinkExpiresAt)} />
                      </>
                    ) : (
                      <InfoRow label="Payment Link" value="Not sent yet (saved as draft)" />
                    )}
                  </div>
                </div>
                {applicationPaymentPlan?.installments && applicationPaymentPlan.installments.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Installments</p>
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Label</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Due Date</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">GST %</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applicationPaymentPlan.installments.map((row, idx) => {
                            const minor = row.amountMinor ?? row.amount_minor ?? 0;
                            const due = row.dueDate ?? row.due_date ?? '';
                            const gst = row.gstPercent ?? row.gst_percent ?? '';
                            return (
                              <tr key={idx} className="border-t">
                                <td className="px-3 py-1.5">{idx + 1}</td>
                                <td className="px-3 py-1.5">{asString(row.label) || '-'}</td>
                                <td className="px-3 py-1.5">{due ? formatDate(due) : '-'}</td>
                                <td className="px-3 py-1.5">{gst !== '' ? `${gst}%` : '-'}</td>
                                <td className="px-3 py-1.5 font-medium">{`₹${(Number(minor) / 100).toLocaleString('en-IN')}`}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Naji 2026-05-11 — Payment History table. Same columns as the
              Application View's Payment History tab. Sourced from the
              `student_payments` installment table (not `payment_info`,
              which is razorpay-only). */}
          <Card>
            <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
            <CardContent className="p-0">
              {studentPaymentSchedule.length > 0 ? (
                <AdminDataTable
                  columns={paymentScheduleColumns}
                  rows={studentPaymentSchedule}
                  searchable={false}
                  exportable={false}
                />
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">No payment records found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Documents */}
      {activeTab === 3 && (
        <div className="space-y-4">
          {applicationDocuments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Application Documents</CardTitle></CardHeader>
              <CardContent className="p-0">
                <AdminDataTable
                  columns={[
                    { key: 'name', label: 'Name', render: (v) => asString(v) || '-' },
                    {
                      key: 'url', label: 'File',
                      render: (v) => {
                        const url = asString(v);
                        if (!url) return '-';
                        return <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View</a>;
                      },
                    },
                    { key: 'document_type_id', label: 'Slot', render: (v) => asString(v) || '-' },
                  ]}
                  rows={applicationDocuments}
                />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Student Documents</CardTitle></CardHeader>
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
                  actions={[
                    {
                      label: 'Replace',
                      onClick: (row) => openDocumentUpload(asString(row.label)),
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          {pendingRequiredDocs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Documents</CardTitle>
                <p className="text-xs text-slate-500">
                  Required by the student's enrolled courses but not yet uploaded.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <AdminDataTable
                  columns={[
                    { key: 'label', label: 'Required Document', render: (v) => asString(v) || '-' },
                    { key: 'course_title', label: 'For Course', render: (v) => asString(v) || '-' },
                    {
                      key: 'is_mandatory',
                      label: 'Mandatory',
                      render: (v) => (v ? <Badge variant="destructive">Required</Badge> : <Badge variant="secondary">Optional</Badge>),
                    },
                  ]}
                  rows={pendingRequiredDocs}
                  actions={[
                    {
                      label: 'Upload',
                      onClick: (row) => openDocumentUpload(asString(row.label)),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          ) : null}

          {/* Replace / Upload modal — single label-driven upsert. */}
          <Dialog open={uploadDialogOpen} onOpenChange={(o) => { if (!o) closeUploadDialog(); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {documents.some((d) => asString(d.label).toLowerCase() === uploadLabel.toLowerCase())
                    ? `Replace "${uploadLabel}"`
                    : `Upload "${uploadLabel}"`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Label</Label>
                  <Input value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">File</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={uploadBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleDocumentFile(f);
                    }}
                  />
                  <p className="text-xs text-slate-500">PDF, JPG, or PNG. Max 10 MB.</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeUploadDialog} disabled={uploadBusy}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Tab 7: Communication — Call History + In-app Notifications */}
      {activeTab === 6 && (
        <div className="space-y-4">
          <CallHistoryPanel api={api} authToken={session.token} phone={asString(student.phone)} />
          <Card>
            <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
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
        </div>
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
                {activityRows.slice(0, 200).map((a, idx) => {
                  const event = asString(a.event);
                  const description = asString(a.description);
                  const success = Boolean(a.success);
                  const variant: 'default' | 'secondary' | 'destructive' =
                    event.includes('FAIL') || event.includes('REJECT') || event.includes('DENIED') ? 'destructive' : success ? 'default' : 'secondary';
                  const ua = asString(a.user_agent);
                  const ip = asString(a.ip_address);
                  return (
                    <li key={idx} className="relative">
                      <span className={`absolute -left-[17px] top-1.5 h-2 w-2 rounded-full ${success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={variant} className="text-[10px] uppercase">{event}</Badge>
                        {description ? (
                          <span className="text-sm text-gray-700 first-letter:uppercase">{description}</span>
                        ) : null}
                        {ip ? <span className="text-xs text-gray-500">{ip}</span> : null}
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

      {/* Tab 2: Enrollments — Naji UAT 2026-05-13 redesign modelled on
          the regal-folio-kit reference: a left rail of enrolment cards
          (one per course) and a right pane showing the selected
          enrolment's drill-down. Auto-selects the first enrolment when
          the tab opens. The legacy table view is kept as a fallback
          when the rail is collapsed (xl: layout). */}
      {activeTab === 1 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr]">
          {/* Left rail: enrolled courses */}
          <Card className="self-start">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Enrolled courses</CardTitle>
                <span className="text-xs text-gray-500">{enrolments.length} total</span>
              </div>
              <Button
                size="sm"
                className="mt-2 w-full bg-ttii-primary hover:bg-ttii-primary/90"
                onClick={() => setAddEnrolOpen(true)}
              >
                + Add Enrolment
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {enrolments.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No enrolments.</p>
              ) : (
                enrolments.map((e, idx) => {
                  const isSelected = selectedEnrollmentIdx === idx;
                  const pct = Math.max(0, Math.min(100, asNumber(e.progress)));
                  const courseTitle = asString(e.course_title) || `Enrolment ${asString(e.id)}`;
                  return (
                    <button
                      key={asString(e.id) || idx}
                      type="button"
                      onClick={() => { setSelectedEnrollmentIdx(idx); setEnrollmentSubTab(0); }}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? 'border-ttii-primary bg-ttii-primary/5 ring-2 ring-ttii-primary/20'
                          : 'border-gray-200 hover:border-ttii-primary/40 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-ttii-primary/15 text-ttii-primary' : 'bg-gray-100 text-gray-600'}`}>
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Naji UAT 2026-05-15 — single-line truncate
                              was chopping "Diploma in Montessori Teac…";
                              allow up to two lines before truncating. */}
                          <p className="line-clamp-2 break-words text-sm font-medium leading-snug text-gray-900">{courseTitle}</p>
                          <p className="truncate text-[11px] text-gray-500">{asString(e.enrollment_id) || `ID ${asString(e.id)}`}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <AdminStatusBadge status={asString(e.status) || asString(e.enrollment_status) || 'Active'} />
                        <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full ${isSelected ? 'bg-ttii-primary' : 'bg-gray-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Right pane: drill-down for the selected enrolment */}
          <div className="space-y-4">
            {selectedEnrollment === null ? (
              <Card>
                <CardContent className="py-16 text-center text-sm text-gray-400">
                  Pick a course on the left to see its details.
                </CardContent>
              </Card>
            ) : (
            <>
              {/* Course header card — modelled on the regal-folio-kit
                  reference: uppercase breadcrumb, course title, secondary
                  line (offering / combination / cohort code), and two
                  small pills on the right (status + current sub-tab). */}
              <Card>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-6">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Enrollment · {asString(selectedEnrollment?.enrollment_id) || asString(selectedEnrollment?.id)}
                    </p>
                    <h3 className="mt-1 truncate text-xl font-semibold text-gray-900">
                      {asString(selectedEnrollment?.course_title) || 'Enrolment'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {[
                        asString(selectedEnrollment?.offering_title),
                        asString(selectedEnrollment?.certificate_combination_code),
                        asString(selectedEnrollment?.cohort_title) || asString(selectedEnrollment?.batch_title),
                      ].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                      {(() => {
                        const pct = asNumber(selectedEnrollment?.progress);
                        if (pct >= 100) return 'Completed';
                        if (pct > 0) return 'In progress';
                        return 'Not started';
                      })()}
                    </span>
                    <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                      {ENROLLMENT_SUB_TABS[enrollmentSubTab]}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (selectedEnrollment) openEditEnrol(selectedEnrollment); }}
                    >
                      Edit enrolment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sub-tab navigation — Naji UAT 2026-05-14 — dropped
                  the redundant "Close Drill-down + Enrollment …" row;
                  the left rail handles course selection and the course
                  header card directly above already shows the same info. */}
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

              {/* Sub-tab: Application Details — Naji 2026-05-12 promoted to a
                  tab alongside the other enrollment-context tabs. */}
              {enrollmentSubTab === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Application Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-x-8 md:grid-cols-2">
                      <div>
                        <InfoRow label="Application ID" value={asString(student.application_id)} />
                        <InfoRow label="Application Date" value={formatDate(student.application_date) || '-'} />
                        <InfoRow label="Application Status" value={asString(student.application_status)} />
                        <InfoRow label="Mode of Study" value={asString(student.mode_of_study)} />
                        <InfoRow label="Preferred Language" value={asString(student.language_name) || asString(student.preferred_language)} />
                      </div>
                      <div>
                        <InfoRow label="Pipeline" value={asString(student.pipeline)} />
                        <InfoRow label="Pipeline User" value={asString(student.pipeline_user_name) || asString(student.pipeline_user)} />
                        <InfoRow label="Lead Source" value={asString(student.lead_source)} />
                        <InfoRow label="Referred By (Student)" value={asString(student.reference_student_id)} />
                        <InfoRow label="Certificate Combination" value={asString(student.certificate_combination_code) || asString(student.certificate_combination_id)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Learning Progress — Naji UAT 2026-05-13 redesign
                  with icon-led metric cards + 7-day trend deltas, plus
                  status pills (On track / Ahead / Behind) on each
                  Subject Progress row. */}
              {enrollmentSubTab === 1 && (
                <div className="space-y-4">
                  {(() => {
                    // 7-day delta for each metric. videoProgress carries a
                    // created_at timestamp per lesson_file; materials use
                    // the same field; assignments use created_at on the
                    // submission row.
                    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000;
                    const recent = (rows: Record<string, unknown>[], since: number) =>
                      rows.filter((r) => {
                        const t = new Date(asString(r.created_at) || asString(r.updated_at)).getTime();
                        return Number.isFinite(t) && t >= since;
                      }).length;
                    const videosThisWeek = recent(videoProgress, sevenDaysAgo);
                    const materialsThisWeek = recent(materialProgress, sevenDaysAgo);
                    const assignmentsToday = recent(assignmentSubmissions, oneDayAgo);
                    const cards = [
                      {
                        label: 'Videos Watched',
                        value: videoProgress.length,
                        delta: videosThisWeek,
                        deltaLabel: 'this week',
                        icon: PlayCircle,
                        tone: 'violet' as const,
                      },
                      {
                        label: 'Materials Completed',
                        value: materialProgress.length,
                        delta: materialsThisWeek,
                        deltaLabel: 'this week',
                        icon: CheckCircle2,
                        tone: 'emerald' as const,
                      },
                      {
                        label: 'Assignments Submitted',
                        value: assignmentSubmissions.length,
                        delta: assignmentsToday,
                        deltaLabel: 'today',
                        icon: ClipboardList,
                        tone: 'sky' as const,
                      },
                    ];
                    const TONE: Record<string, string> = {
                      violet: 'bg-violet-100 text-violet-700',
                      emerald: 'bg-emerald-100 text-emerald-700',
                      sky: 'bg-sky-100 text-sky-700',
                    };
                    return (
                      <div className="grid gap-4 sm:grid-cols-3">
                        {cards.map((c) => (
                          <Card key={c.label}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TONE[c.tone]}`}>
                                  <c.icon className="h-5 w-5" />
                                </div>
                                {c.delta > 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                    <TrendingUp className="h-3 w-3" />+{c.delta} {c.deltaLabel}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                                    <TrendingDown className="h-3 w-3" />0 {c.deltaLabel}
                                  </span>
                                )}
                              </div>
                              <p className="mt-5 text-3xl font-bold text-gray-900">{c.value}</p>
                              <p className="mt-1 text-sm text-gray-500">{c.label}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })()}
                  {videoProgress.length > 0 && (
                    <Card>
                      <CardContent className="p-6">
                        {/* Header row: title + subtitle on the left,
                            View report link on the right — matching the
                            regal-folio-kit reference. */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Subject progress</h3>
                            <p className="text-sm text-gray-500">Lesson completion across enrolled subjects</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEnrollmentSubTab(5)}
                            className="text-sm font-medium text-ttii-primary hover:text-ttii-primary/80"
                          >
                            View report →
                          </button>
                        </div>
                        {/* Flat per-subject list. Naji UAT 2026-05-14 —
                            replaced the previous accordion with the
                            cleaner per-subject row from the reference. */}
                        {(() => {
                          type SubjectBucket = {
                            id: string;
                            title: string;
                            order: number;
                            lessonIds: Set<string>;
                            files: Record<string, unknown>[];
                          };
                          const subjects = new Map<string, SubjectBucket>();
                          for (const vp of videoProgress) {
                            const sid = asString(vp.subject_id) || 'none';
                            const stitle = asString(vp.subject_title) || 'Other';
                            const order = asNumber(vp.subject_order);
                            if (!subjects.has(sid)) {
                              subjects.set(sid, { id: sid, title: stitle, order, lessonIds: new Set(), files: [] });
                            }
                            const subj = subjects.get(sid);
                            if (!subj) continue;
                            const lid = asString(vp.lesson_id) || `lf-${asString(vp.lesson_file_id)}`;
                            subj.lessonIds.add(lid);
                            subj.files.push(vp);
                          }
                          const orderedSubjects = [...subjects.values()].sort((a, b) => {
                            if (a.id === 'none') return 1;
                            if (b.id === 'none') return -1;
                            return a.order - b.order;
                          });
                          const TARGET_PCT = 60;
                          return (
                            <div className="mt-6 space-y-5">
                              {orderedSubjects.map((subject) => {
                                const totalFiles = subject.files.length;
                                const completedFiles = subject.files.filter((f) => asNumber(f.status) === 1).length;
                                const subjectPct = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
                                const totalLessons = subject.lessonIds.size;
                                const completedLessons = (() => {
                                  // Count a lesson as completed when every
                                  // file under it is marked complete.
                                  const byLesson = new Map<string, { total: number; done: number }>();
                                  for (const f of subject.files) {
                                    const lid = asString(f.lesson_id) || `lf-${asString(f.lesson_file_id)}`;
                                    const cur = byLesson.get(lid) ?? { total: 0, done: 0 };
                                    cur.total += 1;
                                    if (asNumber(f.status) === 1) cur.done += 1;
                                    byLesson.set(lid, cur);
                                  }
                                  let done = 0;
                                  for (const v of byLesson.values()) if (v.total > 0 && v.done === v.total) done += 1;
                                  return done;
                                })();
                                const paceStatus = subjectPct >= TARGET_PCT + 15
                                  ? { label: 'Ahead', klass: 'bg-emerald-100 text-emerald-700' }
                                  : subjectPct >= TARGET_PCT
                                    ? { label: 'On track', klass: 'bg-sky-100 text-sky-700' }
                                    : { label: 'Behind', klass: 'bg-amber-100 text-amber-700' };
                                return (
                                  <div key={subject.id}>
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                      <div className="min-w-0">
                                        <h4 className="truncate text-base font-semibold text-gray-900">{subject.title}</h4>
                                        <p className="text-xs text-gray-500">{completedLessons} / {totalLessons} lessons</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paceStatus.klass}`}>
                                          {paceStatus.label}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900">{subjectPct}%</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                      <div
                                        className="h-2 rounded-full bg-ttii-primary transition-all"
                                        style={{ width: `${Math.min(subjectPct, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Sub-tab: Quiz — Naji 2026-05-11 wired to practice_attempt */}
              {enrollmentSubTab === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quiz History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {quizAttempts.length > 0 ? (
                      <AdminDataTable
                        columns={[
                          { key: 'lesson_label', label: 'Lesson', render: (v) => asString(v) || '-' },
                          { key: 'lesson_file_id', label: 'Quiz File ID', render: (v) => asString(v) || '-' },
                          { key: 'score', label: 'Score', render: (v) => asString(v) || '-' },
                          { key: 'correct', label: 'Correct', render: (v) => asString(v) || '-' },
                          { key: 'incorrect', label: 'Incorrect', render: (v) => asString(v) || '-' },
                          { key: 'skip', label: 'Skipped', render: (v) => asString(v) || '-' },
                          {
                            key: 'completed',
                            label: 'Status',
                            render: (v) => <AdminStatusBadge status={v ? 'Completed' : 'In Progress'} />,
                          },
                          { key: 'created_at', label: 'Attempted', render: (v) => formatDate(v) },
                        ]}
                        rows={quizAttempts}
                        searchable={false}
                        exportable={false}
                      />
                    ) : (
                      <p className="py-6 text-center text-sm text-gray-400">No quiz attempts found.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Live Class — Naji 2026-05-11 wired to live_class_attendance */}
              {enrollmentSubTab === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Live Class Attendance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {liveClassAttendance.length > 0 ? (
                      <AdminDataTable
                        columns={[
                          { key: 'live_class_title', label: 'Session', render: (v) => asString(v) || '-' },
                          { key: 'live_class_date', label: 'Date', render: (v) => formatDate(v) },
                          { key: 'platform', label: 'Platform', render: (v) => asString(v) || '-' },
                          {
                            key: 'total_seconds',
                            label: 'Duration',
                            render: (v) => {
                              const secs = asNumber(v);
                              if (!secs) return '-';
                              const mins = Math.round(secs / 60);
                              return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
                            },
                          },
                          {
                            key: 'percent_attended',
                            label: 'Attendance',
                            render: (v) => {
                              const pct = asNumber(v);
                              return pct ? `${pct}%` : '-';
                            },
                          },
                          { key: 'first_joined_at', label: 'Joined', render: (v) => formatDate(v) },
                        ]}
                        rows={liveClassAttendance}
                        searchable={false}
                        exportable={false}
                      />
                    ) : (
                      <p className="py-6 text-center text-sm text-gray-400">No live class attendance recorded.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Cohort — Naji UAT 2026-05-15. Lists every cohort
                  this student is in for the selected enrolment's course,
                  with subject, cohort code, start/end dates, instructor
                  card, and In Progress / Completed / Upcoming status. */}
              {enrollmentSubTab === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cohorts</CardTitle>
                    <p className="text-xs text-slate-500">
                      Subjects this student is grouped into for {asString(selectedEnrollment?.course_title) || 'this course'}.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const cohorts = toRecords(selectedEnrollment?.cohorts);
                      if (cohorts.length === 0) {
                        return (
                          <p className="py-6 text-center text-sm text-gray-400">
                            Not assigned to any cohort for this course yet.
                          </p>
                        );
                      }
                      return (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {cohorts.map((c, idx) => {
                            const code = asString(c.cohort_code) || `C${asString(c.id)}`;
                            const subject = asString(c.subject_title) || asString(c.title) || 'Subject TBD';
                            const start = formatDate(c.start_date);
                            const end = formatDate(c.end_date);
                            const status = asString(c.status) || 'Active';
                            const instructorName = asString(c.instructor_name);
                            const instructorPhoto = asString(c.instructor_photo);
                            const initials = (instructorName || 'I')
                              .split(' ')
                              .map((p) => p[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();
                            return (
                              <div
                                key={asString(c.id) + idx}
                                className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-ttii-primary/40 hover:shadow-sm"
                              >
                                <div className="mb-3 flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                      {code}
                                    </p>
                                    <p className="line-clamp-2 break-words text-sm font-semibold text-gray-900">
                                      {subject}
                                    </p>
                                  </div>
                                  <AdminStatusBadge status={status} />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Start</p>
                                    <p>{start || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400">End</p>
                                    <p>{end || '-'}</p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ttii-primary/10 text-[10px] font-semibold text-ttii-primary">
                                    {instructorPhoto ? (
                                      <img src={instructorPhoto} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <span>{initials}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-gray-900">
                                      {instructorName || 'Instructor not assigned'}
                                    </p>
                                    <p className="text-[10px] text-gray-500">Instructor</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Assignment */}
              {enrollmentSubTab === 5 && (
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

              {/* Sub-tab: Examination — Naji 2026-05-11 wired to exam_attempt */}
              {enrollmentSubTab === 6 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Examination</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {examAttempts.length > 0 ? (
                      <AdminDataTable
                        columns={[
                          { key: 'exam_code', label: 'Exam Code', render: (v) => asString(v) || '-' },
                          { key: 'exam_title', label: 'Exam', render: (v) => asString(v) || '-' },
                          { key: 'attempt_count', label: 'Attempt', render: (v) => asString(v) || '-' },
                          {
                            key: 'score',
                            label: 'Score',
                            render: (v, row) => {
                              const score = asNumber(v);
                              const max = asNumber(row.max_marks);
                              if (!score && !max) return '-';
                              return max ? `${score} / ${max}` : String(score);
                            },
                          },
                          { key: 'correct', label: 'Correct', render: (v) => asString(v) || '-' },
                          { key: 'incorrect', label: 'Incorrect', render: (v) => asString(v) || '-' },
                          {
                            key: 'submit_status',
                            label: 'Status',
                            render: (v) => <AdminStatusBadge status={v ? 'Submitted' : 'In Progress'} />,
                          },
                          { key: 'end_time', label: 'Submitted', render: (v) => formatDate(v) },
                        ]}
                        rows={examAttempts}
                        searchable={false}
                        exportable={false}
                      />
                    ) : (
                      <p className="py-6 text-center text-sm text-gray-400">No examination attempts found.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sub-tab: Payments — Naji UAT 2026-05-13. Full Fee Summary
                  card (offering + combination + base/discount/course-fee
                  /GST/inc-GST + paid/balance) sourced from
                  offering_certificate_packages on the backend. Payment
                  History rows are editable via the new
                  /admin/student-payments/update endpoint. */}
              {enrollmentSubTab === 7 && (
                <div className="space-y-4">
                  {studentFees.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Fee Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {studentFees.map((fee, idx) => {
                          const baseFee = asNumber(fee.base_fee);
                          const discount = asNumber(fee.discount);
                          const courseFee = asNumber(fee.course_fee);
                          const gstPercent = asNumber(fee.gst_percent);
                          const gstAmount = asNumber(fee.gst_amount);
                          const courseFeeIncGst = asNumber(fee.course_fee_inc_gst) || asNumber(fee.total_fee);
                          const paid = asNumber(fee.paid_amount);
                          const balance = asNumber(fee.pending_amount);
                          const rupees = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
                          return (
                            <div key={idx} className="grid gap-x-8 md:grid-cols-2">
                              <div>
                                <InfoRow label="Course Offering" value={asString(fee.offering_title) || '-'} />
                                <InfoRow label="Certificate Combination" value={asString(fee.combination_title) || '-'} />
                                <InfoRow label="Base Fee" value={rupees(baseFee)} />
                                <InfoRow label="Discount" value={discount > 0 ? `- ${rupees(discount)}` : rupees(0)} />
                                <InfoRow label="Course Fee" value={rupees(courseFee)} />
                              </div>
                              <div>
                                <InfoRow label={`GST (${gstPercent || 0}%)`} value={gstAmount > 0 ? `+ ${rupees(gstAmount)}` : rupees(0)} />
                                <InfoRow label="Course Fee Inc GST" value={rupees(courseFeeIncGst)} />
                                <InfoRow label="Fee Paid" value={rupees(paid)} />
                                <InfoRow label="Balance" value={rupees(balance)} />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Payment History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {studentPaymentSchedule.length > 0 ? (
                        <AdminDataTable
                          columns={paymentScheduleColumns}
                          rows={studentPaymentSchedule}
                          actions={paymentScheduleActions}
                          searchable={false}
                          exportable={false}
                        />
                      ) : (
                        <p className="py-6 text-center text-sm text-gray-400">No payment records found.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      )}

      {/* Edit Installment Dialog — Naji UAT 2026-05-13 */}
      <Dialog open={editInstOpen} onOpenChange={(open) => { if (!open) closeEditInstallment(); }}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))] overflow-hidden">
          <form
            className="w-full min-w-0"
            onSubmit={(e) => { e.preventDefault(); void submitEditInstallment(); }}
          >
            <DialogHeader>
              <DialogTitle>Edit Installment</DialogTitle>
            </DialogHeader>
            <div className="w-full min-w-0 space-y-4 py-2">
              <div>
                <Label className="mb-1 text-sm">Installment</Label>
                <Input
                  value={instForm.installment_details}
                  onChange={(e) => setInstForm((f) => ({ ...f, installment_details: e.target.value }))}
                  placeholder="e.g. Installment 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-sm">Amount (INR)</Label>
                  <Input
                    type="number"
                    value={instForm.amount}
                    onChange={(e) => setInstForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 4000"
                  />
                </div>
                <div>
                  <Label className="mb-1 text-sm">Mode</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={instForm.payment_mode}
                    onChange={(e) => setInstForm((f) => ({ ...f, payment_mode: e.target.value }))}
                  >
                    <option value="">- Select -</option>
                    <option value="Online">Online</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Razorpay">Razorpay</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-sm">Due Date</Label>
                  <Input
                    type="date"
                    value={instForm.due_date}
                    onChange={(e) => setInstForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 text-sm">Paid Date</Label>
                  <Input
                    type="date"
                    value={instForm.paid_date}
                    onChange={(e) => setInstForm((f) => ({ ...f, paid_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 text-sm">Status</Label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={instForm.status}
                  onChange={(e) => setInstForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="">- Select -</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Waived">Waived</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditInstallment} disabled={instSubmitting}>Cancel</Button>
              <Button type="submit" disabled={instSubmitting}>{instSubmitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Enrolment Dialog — Naji UAT 2026-05-14 */}
      <Dialog open={addEnrolOpen} onOpenChange={(open) => { if (!open) closeAddEnrol(); }}>
        <DialogContent className="w-[min(620px,calc(100vw-2rem))] max-w-[min(620px,calc(100vw-2rem))] overflow-hidden">
          <form
            className="w-full min-w-0"
            onSubmit={(e) => { e.preventDefault(); void submitAddEnrol(); }}
          >
            <DialogHeader>
              <DialogTitle>Add Enrolment</DialogTitle>
            </DialogHeader>
            <div className="w-full min-w-0 max-h-[70vh] overflow-y-auto space-y-4 py-2">
              <p className="text-xs text-gray-500">
                Add another course enrolment for this student. Personal information stays as-is — only the course, fee and payment method are needed.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="mb-1 text-sm">Course *</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={addEnrolForm.course_id}
                    onChange={(e) => setAddEnrolForm((f) => ({ ...f, course_id: e.target.value, offering_id: '', combination_id: '' }))}
                  >
                    <option value="">- Select -</option>
                    {addEnrolCourses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 text-sm">Course Offering</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={addEnrolForm.offering_id}
                      onChange={(e) => setAddEnrolForm((f) => ({ ...f, offering_id: e.target.value }))}
                      disabled={!addEnrolForm.course_id}
                    >
                      <option value="">- Select -</option>
                      {addEnrolOfferings.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 text-sm">Certificate Combination</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={addEnrolForm.combination_id}
                      onChange={(e) => setAddEnrolForm((f) => ({ ...f, combination_id: e.target.value }))}
                      disabled={!addEnrolForm.course_id}
                    >
                      <option value="">- Select -</option>
                      {addEnrolCombinations.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 text-sm">Mode of Study</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={addEnrolForm.mode_of_study}
                      onChange={(e) => setAddEnrolForm((f) => ({ ...f, mode_of_study: e.target.value }))}
                    >
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 text-sm">Preferred Language</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={addEnrolForm.preferred_language}
                      onChange={(e) => setAddEnrolForm((f) => ({ ...f, preferred_language: e.target.value }))}
                    >
                      <option value="">- Select -</option>
                      {addEnrolLanguages.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 text-sm">Pipeline</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={addEnrolForm.pipeline}
                      onChange={(e) => setAddEnrolForm((f) => ({ ...f, pipeline: e.target.value, pipeline_user: '' }))}
                    >
                      <option value="">- Select -</option>
                      <option value="Admin">Admin</option>
                      <option value="Counsellor">Counsellor</option>
                      <option value="Associate">Associate</option>
                      <option value="Centre">Centre</option>
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 text-sm">Pipeline User</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={addEnrolForm.pipeline_user}
                      onChange={(e) => setAddEnrolForm((f) => ({ ...f, pipeline_user: e.target.value }))}
                      disabled={!addEnrolForm.pipeline}
                    >
                      <option value="">{addEnrolForm.pipeline ? '- Select -' : 'Pick pipeline first'}</option>
                      {addEnrolPipelineUsers.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="mb-1 text-sm">Lead Source</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={addEnrolForm.lead_source}
                    onChange={(e) => setAddEnrolForm((f) => ({ ...f, lead_source: e.target.value }))}
                  >
                    <option value="">- Select -</option>
                    {['Facebook', 'WhatsApp', 'Email', 'Website', 'Walk-in', 'Call-in', 'Reference'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-md border border-gray-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Fee breakdown</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 text-xs">Registration Fee</Label>
                      <Input value={addEnrolForm.registration_fee} onChange={(e) => setAddEnrolForm((f) => ({ ...f, registration_fee: e.target.value }))} placeholder="e.g. 2000" type="number" />
                    </div>
                    <div>
                      <Label className="mb-1 text-xs">Discount</Label>
                      <Input value={addEnrolForm.discount} onChange={(e) => setAddEnrolForm((f) => ({ ...f, discount: e.target.value }))} placeholder="e.g. 10" type="number" />
                    </div>
                    <div>
                      <Label className="mb-1 text-xs">GST %</Label>
                      <Input value={addEnrolForm.gst_percent} onChange={(e) => setAddEnrolForm((f) => ({ ...f, gst_percent: e.target.value }))} placeholder="e.g. 18" type="number" />
                    </div>
                    <div>
                      <Label className="mb-1 text-xs">Final Course Fee *</Label>
                      <Input value={addEnrolForm.final_course_fee} onChange={(e) => setAddEnrolForm((f) => ({ ...f, final_course_fee: e.target.value }))} placeholder="e.g. 25000" type="number" />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="mb-1 text-sm">Payment</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={addEnrolForm.payment_mode}
                    onChange={(e) => setAddEnrolForm((f) => ({ ...f, payment_mode: e.target.value as 'link' | 'manual' | 'draft' }))}
                  >
                    <option value="link">Generate Payment Link (Razorpay)</option>
                    <option value="manual">Mark Paid Manually</option>
                    <option value="draft">Save without payment</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAddEnrol} disabled={addEnrolSubmitting}>Cancel</Button>
              <Button type="submit" disabled={addEnrolSubmitting}>{addEnrolSubmitting ? 'Saving...' : 'Add Enrolment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Enrolment Dialog — Naji UAT 2026-05-12 */}
      <Dialog open={editEnrolOpen} onOpenChange={(open) => { if (!open) closeEditEnrol(); }}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))] overflow-hidden">
          <form
            className="w-full min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              void submitEditEnrol();
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Enrolment</DialogTitle>
            </DialogHeader>
            <div className="w-full min-w-0 space-y-4 py-2">
              <div>
                <Label className="mb-1 text-sm">Enrollment ID</Label>
                <Input
                  value={enrolForm.enrollment_id}
                  onChange={(e) => setEnrolForm((f) => ({ ...f, enrollment_id: e.target.value }))}
                  placeholder="e.g. TIDMTT26040115"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-sm">Status</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={enrolForm.enrollment_status}
                    onChange={(e) => setEnrolForm((f) => ({ ...f, enrollment_status: e.target.value }))}
                  >
                    <option value="">- Select -</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Dropout">Dropout</option>
                    <option value="Completed">Completed</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1 text-sm">Mode of Study</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={enrolForm.mode_of_study}
                    onChange={(e) => setEnrolForm((f) => ({ ...f, mode_of_study: e.target.value }))}
                  >
                    <option value="">- Select -</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="mb-1 text-sm">Course Offering</Label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={enrolForm.offering_id}
                  onChange={(e) => setEnrolForm((f) => ({ ...f, offering_id: e.target.value }))}
                >
                  <option value="">- Select -</option>
                  {offeringOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 text-sm">Certificate Combination</Label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={enrolForm.combination_id}
                  onChange={(e) => setEnrolForm((f) => ({ ...f, combination_id: e.target.value }))}
                >
                  <option value="">- Select -</option>
                  {combinationOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 text-sm">Preferred Language</Label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={enrolForm.preferred_language}
                  onChange={(e) => setEnrolForm((f) => ({ ...f, preferred_language: e.target.value }))}
                >
                  <option value="">- Select -</option>
                  {languageOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-sm">Pipeline</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={enrolForm.pipeline}
                    onChange={(e) => setEnrolForm((f) => ({ ...f, pipeline: e.target.value, pipeline_user: '' }))}
                  >
                    <option value="">- Select -</option>
                    <option value="Admin">Admin</option>
                    <option value="Counsellor">Counsellor</option>
                    <option value="Associate">Associate</option>
                    <option value="Centre">Centre</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1 text-sm">Pipeline User</Label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={enrolForm.pipeline_user}
                    onChange={(e) => setEnrolForm((f) => ({ ...f, pipeline_user: e.target.value }))}
                    disabled={!enrolForm.pipeline}
                  >
                    <option value="">{enrolForm.pipeline ? '- Select -' : 'Pick pipeline first'}</option>
                    {pipelineUserOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="mb-1 text-sm">Lead Source</Label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={enrolForm.lead_source}
                  onChange={(e) => setEnrolForm((f) => ({ ...f, lead_source: e.target.value }))}
                >
                  <option value="">- Select -</option>
                  {['Facebook', 'WhatsApp', 'Email', 'Website', 'Walk-in', 'Call-in', 'Reference'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditEnrol} disabled={enrolSubmitting}>Cancel</Button>
              <Button type="submit" disabled={enrolSubmitting}>{enrolSubmitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
