import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { StageBadge } from '../../components/CounsellorWidgets.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

/* ─── Small presentational helpers (counsellor theme) ───────── */

type Tone = 'primary' | 'success' | 'info' | 'warning';

const TONE_TILE: Record<Tone, string> = {
  primary: 'bg-primary-soft text-accent-foreground',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning-foreground',
};

function MiniStat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: Tone }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-md', TONE_TILE[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-border/70 p-6 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

function ProgressBlock({ label, pct, tone, sub }: { label: string; pct: number; tone: 'primary' | 'success'; sub?: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-base font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', tone === 'success' ? 'bg-success' : 'bg-primary')}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      {sub ? <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function FinanceTile({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <Card className="border-border/70 p-5 shadow-[var(--shadow-soft)]">
      <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg', TONE_TILE[tone])}>
        <IndianRupee className="h-4 w-4" />
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}

const rupee = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '—'
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function CounsellorViewStudentPage({ api, session, onNavigate }: CounsellorPageProps) {
  const adminApi = api.admin;

  const studentId = useMemo(() => window.location.pathname.split('/').filter(Boolean).pop() ?? '', []);

  const { data, loading, error, reload } = useAdminPageData(
    () => adminApi.getStudentDetail(session.token, studentId),
    [studentId],
  );
  const { data: analyticsData } = useAdminPageData(
    () => adminApi.getStudentAnalytics(session.token, studentId),
    [studentId],
  );

  const student = useMemo(() => {
    const record = data?.student;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  const enrolments = useMemo(() => toRecords(data?.enrolments), [data]);
  const payments = useMemo(() => toRecords(data?.payments), [data]);
  const studentFees = useMemo(() => toRecords(data?.studentFees), [data]);
  const studentPaymentSchedule = useMemo(() => toRecords(data?.studentPaymentSchedule), [data]);
  // Naji 2026-07-06 — same fee-sync scoping as admin ViewStudentPage: the fee
  // tiles above are course-scoped, but the raw schedule mixes rows from other
  // courses, so scope the visible Payment History to the enrolled course(s).
  // Falls back to all rows when no enrolment course_id is known.
  const enrolledCourseIds = useMemo(() => {
    const s = new Set<number>();
    for (const e of enrolments) {
      const c = asNumber(e.course_id);
      if (c) s.add(c);
    }
    return s;
  }, [enrolments]);
  const scopedPaymentSchedule = useMemo(
    () =>
      enrolledCourseIds.size === 0
        ? studentPaymentSchedule
        : studentPaymentSchedule.filter((r) => enrolledCourseIds.has(asNumber(r.course_id))),
    [studentPaymentSchedule, enrolledCourseIds],
  );
  const applicationDocuments = useMemo(() => toRecords(data?.applicationDocuments), [data]);
  const assignmentSubmissions = useMemo(() => toRecords(data?.assignmentSubmissions), [data]);
  const documents = useMemo(() => toRecords(analyticsData?.documents), [analyticsData]);

  // Real activity timeline — application_events for this student's application.
  const applicationId = useMemo(() => asString(student?.application_id), [student]);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  useEffect(() => {
    if (!applicationId) {
      setEvents([]);
      return;
    }
    let active = true;
    setEventsLoading(true);
    adminApi
      .listApplicationEvents(session.token, applicationId)
      .then((rows) => {
        if (active) setEvents(rows);
      })
      .catch(() => {
        if (active) setEvents([]);
      })
      .finally(() => {
        if (active) setEventsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applicationId, adminApi, session.token]);

  // Real action — Send / Download Application Form link.
  const [formLinkBusy, setFormLinkBusy] = useState(false);
  const handleApplicationFormLink = async (): Promise<void> => {
    if (!applicationId) {
      toast.error('No application linked to this student.');
      return;
    }
    setFormLinkBusy(true);
    try {
      const res = await adminApi.generateApplicationFormLink(session.token, applicationId);
      const url = asString((res as { data?: { url?: unknown } }).data?.url) || asString((res as { url?: unknown }).url);
      if ((res as { status?: number }).status === 1 || url) {
        if (url) {
          await navigator.clipboard?.writeText(url).catch(() => undefined);
          toast.success('Application form link generated and copied to clipboard.');
        } else {
          toast.success('Application form link generated.');
        }
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Could not generate form link.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate form link.');
    } finally {
      setFormLinkBusy(false);
    }
  };

  // Add Enrolment dialog — Naji issues F + G (2026-06-30). Ports the
  // admin ViewStudentPage "Add Enrolment" flow into the counsellor portal
  // so the action surfaces (and works) from the top action bar. Reaches the
  // admin API via `api.admin`. The backend blocks only when the student is
  // already enrolled in the SAME course; a different course is allowed.
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

  // Load courses + languages when the dialog opens.
  useEffect(() => {
    if (!addEnrolOpen) return;
    void adminApi.loadCourses(session.token).then((rows) => {
      setAddEnrolCourses(
        rows.map((r) => ({
          label: asString(r.title) || asString(r.course_title) || `Course ${asString(r.id)}`,
          value: asString(r.id),
        })),
      );
    });
    void adminApi.loadLanguages(session.token).then((rows) => {
      setAddEnrolLanguages(
        rows.map((r) => ({
          label: asString(r.title) || asString(r.name) || `Language ${asString(r.id)}`,
          value: asString(r.id),
        })),
      );
    });
  }, [addEnrolOpen, adminApi, session.token]);

  // Cascade offerings + combinations whenever the chosen course changes.
  useEffect(() => {
    if (!addEnrolOpen || !addEnrolForm.course_id) {
      setAddEnrolOfferings([]);
      setAddEnrolCombinations([]);
      return;
    }
    void Promise.all([
      adminApi.listOfferings(session.token, { course_id: addEnrolForm.course_id }),
      adminApi.loadCertificateCombinations(session.token, { course_id: addEnrolForm.course_id }),
    ]).then(([offerings, combinations]) => {
      setAddEnrolOfferings(
        offerings.map((o) => ({
          label: asString(o.title) || asString(o.offering_code) || `Offering ${asString(o.id)}`,
          value: asString(o.id),
        })),
      );
      setAddEnrolCombinations(
        combinations.map((c) => ({
          label: asString(c.combination_code) || asString(c.title) || `Combination ${asString(c.id)}`,
          value: asString(c.id),
        })),
      );
    });
  }, [addEnrolOpen, addEnrolForm.course_id, adminApi, session.token]);

  // Pipeline → Pipeline User cascade.
  useEffect(() => {
    if (!addEnrolOpen) return;
    const p = addEnrolForm.pipeline;
    if (!p) {
      setAddEnrolPipelineUsers([]);
      return;
    }
    if (p === 'Centre') {
      void adminApi.loadCentres(session.token).then((rows) => {
        setAddEnrolPipelineUsers(
          rows.map((r) => ({
            label: asString(r.name) || asString(r.title) || `Centre ${asString(r.id)}`,
            value: asString(r.id),
          })),
        );
      });
      return;
    }
    const roleIds = p === 'Admin' ? [1, 8] : p === 'Counsellor' ? [9] : p === 'Associate' ? [10] : [];
    if (roleIds.length === 0) {
      setAddEnrolPipelineUsers([]);
      return;
    }
    void Promise.all(roleIds.map((rid) => adminApi.loadPipelineUsers(session.token, rid))).then((results) => {
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
  }, [addEnrolOpen, addEnrolForm.pipeline, adminApi, session.token]);

  const closeAddEnrol = (): void => {
    setAddEnrolOpen(false);
    setAddEnrolForm({
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
      payment_mode: 'link',
    });
  };

  const submitAddEnrol = async (): Promise<void> => {
    if (!addEnrolForm.course_id) {
      toast.error('Course is required.');
      return;
    }
    if (!addEnrolForm.final_course_fee) {
      toast.error('Final Course Fee is required.');
      return;
    }
    setAddEnrolSubmitting(true);
    try {
      const res = await adminApi.addAdditionalEnrolment(session.token, studentId, addEnrolForm);
      if ((res as { status?: number }).status === 1) {
        const resData = (res as { data?: { pending_admin_approval?: boolean; payment_link_url?: string | null } }).data ?? {};
        const msg = resData.pending_admin_approval
          ? 'Enrolment request submitted for admin approval.'
          : 'Additional enrolment created.';
        toast.success(msg + (resData.payment_link_url ? ' Payment link sent.' : ''));
        closeAddEnrol();
        reload();
      } else {
        // Backend is authoritative on same-course duplicates — surface its message.
        toast.error(asString((res as { message?: unknown }).message) || 'Failed to create enrolment.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create enrolment.');
    } finally {
      setAddEnrolSubmitting(false);
    }
  };

  // Derived finance figures — all real.
  const totalFee = useMemo(() => studentFees.reduce((sum, f) => sum + asNumber(f.total_fee), 0), [studentFees]);
  const paidFee = useMemo(() => payments.reduce((sum, p) => sum + asNumber(p.amount_paid), 0), [payments]);
  const pendingFee = Math.max(0, totalFee - paidFee);
  const feePct = totalFee > 0 ? Math.round((paidFee / totalFee) * 100) : 0;

  // Average course progress across enrolments (real `progress` field).
  const courseProgress = useMemo(() => {
    if (enrolments.length === 0) return 0;
    const sum = enrolments.reduce((acc, e) => acc + Math.min(100, Math.max(0, asNumber(e.progress))), 0);
    return Math.round(sum / enrolments.length);
  }, [enrolments]);

  if (loading) {
    return <DashboardLoader label="student" tone="theme" />;
  }

  if (error || !student) {
    return (
      <Card className="border-border/70 p-5 shadow-[var(--shadow-soft)]">
        <p role="alert" className="py-8 text-center text-sm text-destructive">
          {error || 'Student not found.'}
        </p>
      </Card>
    );
  }

  const name = asString(student.name) || 'Unnamed Student';
  const studentCode = asString(student.student_id);
  const phone = asString(student.phone);
  const email = asString(student.user_email);
  const city = asString(student.city) || asString(student.state);
  const primaryStage =
    asString(enrolments[0]?.status) || asString(enrolments[0]?.enrollment_status) || asString(student.application_status) || 'enrolled';
  const primaryCourse = asString(enrolments[0]?.course_title);
  // No attendance-percentage source on this page's API — honest neutral state.
  const attendanceValue = '—';

  return (
    <main className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => onNavigate('/counsellor/students')}
          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> My Students
        </button>
        {studentCode ? (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-xs">{studentCode}</span>
          </>
        ) : null}
      </div>

      {/* Hero card */}
      <Card className="relative overflow-hidden border-border/70 p-6 shadow-[var(--shadow-soft)]">
        <div className="absolute inset-x-0 top-0 h-24 bg-[image:var(--gradient-primary)] opacity-10" />
        <div className="relative flex flex-wrap items-start gap-5">
          <Avatar className="h-20 w-20 ring-4 ring-background">
            <AvatarFallback className="bg-[image:var(--gradient-primary)] text-xl font-semibold text-primary-foreground">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{name}</h1>
              <StageBadge stage={primaryStage.toLowerCase()} />
              {primaryCourse ? (
                <Badge variant="outline" className="border-primary/30 bg-primary-soft text-accent-foreground">
                  {primaryCourse}
                </Badge>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {studentCode ? <span className="font-mono">{studentCode}</span> : null}
              {phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {phone}
                </span>
              ) : null}
              {email ? (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {email}
                </span>
              ) : null}
              {city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {city}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={formLinkBusy || !applicationId}
              onClick={() => void handleApplicationFormLink()}
            >
              <Download className="h-4 w-4" /> {formLinkBusy ? 'Generating…' : 'Application Form Link'}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAddEnrolOpen(true)}>
              <Plus className="h-4 w-4" /> Manage Enrolments
            </Button>
          </div>
        </div>

        {/* Mini stats — all real except attendance (honest dash). */}
        <div className="relative mt-6 grid gap-4 sm:grid-cols-4">
          <MiniStat icon={GraduationCap} label="Course Progress" value={`${courseProgress}%`} tone="primary" />
          <MiniStat icon={CheckCircle2} label="Attendance" value={attendanceValue} tone="success" />
          <MiniStat icon={IndianRupee} label="Fee Paid" value={rupee(paidFee)} tone="info" />
          <MiniStat icon={Wallet} label="Pending" value={rupee(pendingFee)} tone="warning" />
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview — real student detail */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <Section title="Student Details" icon={User}>
            <Field label="Full Name" value={name} />
            <Field label="Date of Birth" value={formatDate(student.date_of_birth)} />
            <Field label="Gender" value={asString(student.gender)} />
            <Field label="Nationality" value={asString(student.nationality_name) || asString(student.nationality)} />
          </Section>
          <Section title="Contact Information" icon={Phone}>
            <Field label="Phone" value={phone} />
            <Field label="Alternate Phone" value={asString(student.second_phone) || asString(student.alternate_phone)} />
            <Field label="Email" value={email} />
            <Field label="WhatsApp" value={asString(student.whatsapp_no)} />
            <Field label="State" value={asString(student.state)} />
            <Field label="City / District" value={asString(student.city)} />
          </Section>
          <Section title="Enrollment Information" icon={ClipboardList}>
            <Field label="Student ID" value={studentCode} />
            <Field label="Course" value={primaryCourse} />
            <Field label="Offering" value={asString(enrolments[0]?.offering_title)} />
            <Field label="Mode of Study" value={asString(student.mode_of_study)} />
            <Field label="Joined" value={formatDate(student.created_at)} />
            <Field label="Owner" value={asString(student.pipeline_user_name) || asString(student.pipeline_user)} />
          </Section>
        </TabsContent>

        {/* Academics — real per-enrolment progress + real assignment submissions */}
        <TabsContent value="academics" className="mt-4 space-y-6">
          <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Course Progress</h3>
                <p className="text-xs text-muted-foreground">
                  {enrolments.length} {enrolments.length === 1 ? 'enrolment' : 'enrolments'}
                </p>
              </div>
            </div>
            {enrolments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No enrolments yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {enrolments.map((e, idx) => {
                  const pct = Math.min(100, Math.max(0, asNumber(e.progress)));
                  return (
                    <ProgressBlock
                      key={asString(e.id) || idx}
                      label={asString(e.course_title) || `Enrolment ${asString(e.id)}`}
                      pct={pct}
                      tone="primary"
                      sub={asString(e.enrollment_id) || asString(e.offering_title)}
                    />
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 text-sm font-semibold">Assignments</h3>
            {assignmentSubmissions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No assignment submissions recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {assignmentSubmissions.map((a, idx) => {
                  const marks = asString(a.marks);
                  const total = asString(a.total_marks);
                  const submitted = Boolean(a.created_at);
                  return (
                    <div key={idx} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-md',
                          submitted ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {asString(a.assignment_title) || asString(a.subject_title) || 'Assignment'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.due_date ? `Due ${formatDate(a.due_date)}` : asString(a.subject_title)}
                        </p>
                      </div>
                      <span className="text-xs font-medium tabular-nums">
                        {marks ? `${marks}${total ? `/${total}` : ''}` : '—'}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent',
                          submitted ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {submitted ? 'Submitted' : 'Pending'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Finance — real fees + payment schedule */}
        <TabsContent value="finance" className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FinanceTile label="Total Fee" value={rupee(totalFee)} tone="primary" />
            <FinanceTile label="Paid" value={rupee(paidFee)} tone="success" />
            <FinanceTile label="Pending" value={rupee(pendingFee)} tone={pendingFee > 0 ? 'warning' : 'success'} />
          </div>

          <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Fee Progress</h3>
              <span className="text-xs font-semibold">{feePct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[image:var(--gradient-success)]" style={{ width: `${feePct}%` }} />
            </div>
          </Card>

          {studentFees.length > 0 ? (
            <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
              <h3 className="mb-4 text-sm font-semibold">Per-Enrolment Fees</h3>
              <div className="space-y-2.5">
                {studentFees.map((f, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{asString(f.course_title) || 'Course'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {asString(f.offering_title) || asString(f.enrollment_id) || '—'}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold">{rupee(asNumber(f.total_fee))}</p>
                      <p className="text-muted-foreground">
                        {rupee(asNumber(f.paid_amount))} paid · {rupee(asNumber(f.pending_amount))} due
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 text-sm font-semibold">Payment History</h3>
            {scopedPaymentSchedule.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No payment records found.</p>
            ) : (
              <div className="space-y-2.5">
                {scopedPaymentSchedule.map((p, idx) => {
                  const status = asString(p.status) || 'Pending';
                  const isPaid = status.toLowerCase() === 'paid';
                  return (
                    <div key={idx} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-md',
                          isPaid ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning-foreground',
                        )}
                      >
                        <IndianRupee className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{asString(p.installment_details) || 'Installment'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {asString(p.payment_mode) || '—'}
                          {p.due_date ? ` · due ${formatDate(p.due_date)}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{rupee(asNumber(p.amount))}</p>
                        {p.paid_date ? <p className="text-[11px] text-muted-foreground">{formatDate(p.paid_date)}</p> : null}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent',
                          isPaid ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning-foreground',
                        )}
                      >
                        {status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Documents — real application + student documents */}
        <TabsContent value="documents" className="mt-4 space-y-6">
          <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Documents</h3>
                <p className="text-xs text-muted-foreground">Uploaded paperwork from the application and profile</p>
              </div>
            </div>
            {(() => {
              const docs: { name: string; url: string }[] = [
                ...applicationDocuments.map((d) => ({
                  name: asString(d.name) || `Document ${asString(d.document_type_id)}`,
                  url: asString(d.url),
                })),
                ...documents.map((d) => ({ name: asString(d.label) || 'Document', url: asString(d.file) })),
              ].filter((d) => d.name);
              if (docs.length === 0) {
                return <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>;
              }
              return (
                <div className="grid gap-3 sm:grid-cols-2">
                  {docs.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-accent-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.url ? 'Uploaded' : 'No file'}</p>
                      </div>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </TabsContent>

        {/* Timeline — real application_events */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 text-sm font-semibold">Activity Timeline</h3>
            {eventsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading activity…</p>
            ) : events.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {applicationId ? 'No activity recorded yet.' : 'No application linked to this student.'}
              </p>
            ) : (
              <ol className="relative ml-3 space-y-5 border-l border-border">
                {events.map((t, i) => {
                  const title = asString(t.title) || asString(t.event) || asString(t.type) || 'Activity';
                  const kind = asString(t.kind) || asString(t.category) || asString(t.actor_role);
                  const when = formatDate(t.created_at) || asString(t.created_at);
                  return (
                    <li key={i} className="ml-6">
                      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-primary">
                        <Activity className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{title}</p>
                        {kind ? (
                          <Badge variant="outline" className="border-transparent bg-muted/60 py-0 text-[10px] text-muted-foreground">
                            {kind}
                          </Badge>
                        ) : null}
                      </div>
                      {asString(t.description) ? (
                        <p className="text-xs text-muted-foreground first-letter:uppercase">{asString(t.description)}</p>
                      ) : null}
                      {when ? <p className="text-xs text-muted-foreground">{when}</p> : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Enrolment dialog — Naji issues F + G (2026-06-30). Native
          <select> elements (no Radix theme-escape concern); DialogContent
          carries `counsellor-theme` so the portaled modal keeps the navy/
          orange palette instead of admin magenta. */}
      <Dialog open={addEnrolOpen} onOpenChange={(open) => { if (!open) closeAddEnrol(); }}>
        {/* Width via inline style — a max-w-[…] className loses to the base
            sm:max-w-lg (renders 512px); set width/maxWidth inline instead. */}
        <DialogContent
          className="counsellor-theme overflow-hidden"
          style={{ width: 'min(620px, calc(100vw - 2rem))', maxWidth: 'min(620px, calc(100vw - 2rem))' }}
        >
          <form
            className="w-full min-w-0"
            onSubmit={(e) => { e.preventDefault(); void submitAddEnrol(); }}
          >
            <DialogHeader>
              <DialogTitle>Add Enrolment</DialogTitle>
            </DialogHeader>
            <div className="w-full min-w-0 max-h-[70vh] space-y-4 overflow-y-auto py-2">
              <p className="text-xs text-muted-foreground">
                Add another course enrolment for this student. Personal information stays as-is — only the course, fee and payment method are needed.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="mb-1 text-sm">Course *</Label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={addEnrolForm.lead_source}
                    onChange={(e) => setAddEnrolForm((f) => ({ ...f, lead_source: e.target.value }))}
                  >
                    <option value="">- Select -</option>
                    {/* 'Reference'/'Network' omitted — this quick add-enrolment
                        dialog has no referrer picker, so those would lose their
                        linkage. Set them from the full Add-Lead form instead. */}
                    {['Facebook', 'WhatsApp', 'Email', 'Website', 'Walk-in', 'Call-in'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fee breakdown</p>
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
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
    </main>
  );
}
