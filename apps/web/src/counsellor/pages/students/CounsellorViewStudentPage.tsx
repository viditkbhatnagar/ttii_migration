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

  const { data, loading, error } = useAdminPageData(
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
    return <DashboardLoader label="student" />;
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
            {studentPaymentSchedule.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No payment records found.</p>
            ) : (
              <div className="space-y-2.5">
                {studentPaymentSchedule.map((p, idx) => {
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

      {/* Real action — Add Enrolment (role-9 permitted). Routes to the
          counsellor edit/enrolment flow on the existing admin page, kept
          here so the action surfaces on the redesigned student detail. */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onNavigate(`/counsellor/students/view/${studentId}?tab=enrollments`)}
        >
          <Plus className="h-4 w-4" /> Manage Enrolments
        </Button>
      </div>
    </main>
  );
}
