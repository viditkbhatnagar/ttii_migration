import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  CircleDashed,
  Download,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Send,
  Trash2,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, formatDate, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import { GeneratePaymentLinkDialog } from '../../../admin/pages/applications/GeneratePaymentLinkDialog.js';
import { CounsellorAddLeadDialog } from '../../components/CounsellorAddLeadDialog.js';
import { CounsellorRecordPaymentModal } from '../../components/CounsellorRecordPaymentModal.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

/* ─── Pipeline stages (real lowercase keys → Lovable labels + styles) ─── */

interface StageDef {
  key: string;
  label: string;
  style: string;
}

// The 7-stage pipeline matches the Lovable prototype + the real stage keys.
const STAGES: StageDef[] = [
  { key: 'lead', label: 'Lead', style: 'bg-info-soft text-info border-transparent' },
  { key: 'payment_pending', label: 'Payment Pending', style: 'bg-warning-soft text-warning-foreground border-transparent' },
  { key: 'paid', label: 'Paid', style: 'bg-success-soft text-success border-transparent' },
  { key: 'form_pending', label: 'Form Pending', style: 'bg-[oklch(0.95_0.05_310)] text-[oklch(0.45_0.2_310)] border-transparent' },
  { key: 'form_submitted', label: 'Form Submitted', style: 'bg-primary-soft text-accent-foreground border-transparent' },
  { key: 'approval_waiting', label: 'Approval Waiting', style: 'bg-[oklch(0.96_0.06_85)] text-[oklch(0.4_0.12_75)] border-transparent' },
  { key: 'rejected', label: 'Rejected', style: 'bg-destructive/10 text-destructive border-transparent' },
];

const ENROLLED_FALLBACK: StageDef = { key: 'enrolled', label: 'Enrolled', style: 'bg-success-soft text-success border-transparent' };
const STAGE_BY_KEY = new Map([...STAGES, ENROLLED_FALLBACK].map((s) => [s.key, s]));

// Stages where only the lead snapshot exists (the applicant has not yet
// submitted the form). Mirrors the admin page's LEAD_STAGES gate.
const LEAD_STAGES = new Set(['lead', 'payment_pending', 'paid', 'form_pending']);

// Approval / document verification is Admin-only — counsellors never see the
// Verify toggles, but the submitted-detail tabs surface for every post-lead
// stage. Verification section keys match the admin page.
const VERIFY_SECTION_KEYS = ['basic', 'qualification', 'documents'] as const;

type ApplicationDocument = {
  name?: string;
  label?: string;
  url?: string;
  document_type_id?: string | null;
};

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
  manual_payment?: {
    mode?: string;
    reference?: string;
    receipt_url?: string;
    note?: string;
    marked_at?: string;
  };
};

function StageBadge({ stage }: { stage: string }) {
  const def = STAGE_BY_KEY.get(stage) ?? { label: stage || '—', style: 'bg-muted text-muted-foreground border-transparent' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', def.style)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {def.label}
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
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

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

function initials(name: string): string {
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

const fmtInr = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

export default function CounsellorViewApplicationPage({ api, session, onNavigate }: CounsellorPageProps) {
  const admin = api.admin;

  // Same id derivation as the admin page — last non-empty path segment.
  const applicationId = useMemo(() => window.location.pathname.split('/').filter(Boolean).pop() ?? '', []);

  const { data, loading, error, reload } = useAdminPageData(
    () => admin.getApplication(session.token, applicationId),
    [applicationId],
  );

  const app = useMemo<Record<string, unknown> | null>(() => {
    if (!data) return null;
    const record = data.application ?? data;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  const payments = useMemo(() => toRecords(data?.payments), [data]);
  const educationPathway = useMemo(() => toRecords(data?.education_pathway), [data]);

  const documents = useMemo<ApplicationDocument[]>(() => {
    const raw = app?.documents;
    return Array.isArray(raw) ? (raw as ApplicationDocument[]) : [];
  }, [app]);

  const verified = useMemo<string[]>(() => {
    const v = (app?.verification as { verified?: unknown } | undefined)?.verified;
    return Array.isArray(v) ? v.map((k) => String(k)) : [];
  }, [app]);
  const verifiedSet = useMemo(() => new Set(verified), [verified]);
  const allVerified = useMemo(() => {
    for (const key of VERIFY_SECTION_KEYS) {
      if (!verifiedSet.has(key)) return false;
    }
    for (let i = 0; i < documents.length; i += 1) {
      if (!verifiedSet.has(`doc:${i}`)) return false;
    }
    return true;
  }, [verifiedSet, documents]);

  // ── UI state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Themed confirm modals (replace native window.confirm) + plan send-link.
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [sendingPayLink, setSendingPayLink] = useState(false);
  const [verifyBusyKey, setVerifyBusyKey] = useState<string | null>(null);

  // Mark-as-Paid dialog state.
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markPaidMode, setMarkPaidMode] = useState('cash');
  const [markPaidReference, setMarkPaidReference] = useState('');
  const [markPaidReceiptUrl, setMarkPaidReceiptUrl] = useState('');
  const [markPaidUploading, setMarkPaidUploading] = useState(false);

  // Activity timeline — real listApplicationEvents, lazy-loaded for the tab.
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  useEffect(() => {
    if (!applicationId) return;
    if (activeTab !== 'timeline' && activeTab !== 'history') return;
    let cancelled = false;
    setEventsLoading(true);
    void admin
      .listApplicationEvents(session.token, applicationId)
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [admin, session.token, applicationId, activeTab]);

  // ── Actions (all wired to the same admin API calls) ───────────────────
  const handleDelete = useCallback(() => {
    if (!applicationId) return;
    setDeleteDialogOpen(true);
  }, [applicationId]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!applicationId) return;
    setSubmitting(true);
    try {
      await admin.deleteApplication(session.token, applicationId);
      setDeleteDialogOpen(false);
      onNavigate('/counsellor/applications');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete application');
    } finally {
      setSubmitting(false);
    }
  }, [admin, session.token, applicationId, onNavigate]);

  const handleRejectSubmit = useCallback(async () => {
    if (!applicationId) return;
    if (!rejectReason.trim()) {
      toast.error('Please enter a reason for rejection.');
      return;
    }
    setSubmitting(true);
    try {
      await admin.updateApplicationStatus(session.token, applicationId, 'rejected', rejectReason.trim());
      setRejectDialogOpen(false);
      setRejectReason('');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  }, [admin, session.token, applicationId, rejectReason, reload]);

  const handleApprove = useCallback(() => {
    if (!applicationId) return;
    setApproveDialogOpen(true);
  }, [applicationId]);

  const handleApproveConfirmed = useCallback(async () => {
    if (!applicationId) return;
    setSubmitting(true);
    try {
      await admin.updateApplicationStatus(session.token, applicationId, 'approved');
      setApproveDialogOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  }, [admin, session.token, applicationId, reload]);

  const handleSubmitMarkPaid = useCallback(async () => {
    if (!applicationId) return;
    if (!markPaidReference.trim()) {
      toast.error('Reference number is required.');
      return;
    }
    if (!markPaidReceiptUrl.trim()) {
      toast.error('Receipt is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await admin.markApplicationPaid(session.token, applicationId, {
        mode: markPaidMode,
        reference: markPaidReference.trim(),
        receipt_url: markPaidReceiptUrl,
      });
      if ((res as { status?: number }).status === 1) {
        toast.success(asString((res as { message?: unknown }).message) || 'Manual payment recorded — pending finance approval.');
        setMarkPaidOpen(false);
        reload();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Could not mark paid.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setSubmitting(false);
    }
  }, [admin, session.token, applicationId, markPaidMode, markPaidReference, markPaidReceiptUrl, reload]);

  const handleReceiptUpload = useCallback(
    async (file: File) => {
      setMarkPaidUploading(true);
      try {
        const res = await admin.uploadFile(session.token, file);
        setMarkPaidReceiptUrl(res.url);
        toast.success('Receipt uploaded.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setMarkPaidUploading(false);
      }
    },
    [admin, session.token],
  );

  // Dedicated "Record Payment" modal — logs an offline payment against this
  // application via the same mark-paid endpoint the inline dialog uses. Throws
  // on failure so the modal can surface its own error toast.
  const handleRecordPayment = useCallback(
    async (input: { mode: string; reference: string; receiptUrl: string; note: string }) => {
      if (!applicationId) return;
      const res = await admin.markApplicationPaid(session.token, applicationId, {
        mode: input.mode,
        reference: input.reference,
        receipt_url: input.receiptUrl,
        note: input.note,
      });
      if ((res as { status?: number }).status === 1) {
        toast.success(asString((res as { message?: unknown }).message) || 'Payment recorded — pending finance approval.');
        reload();
      } else {
        throw new Error(asString((res as { message?: unknown }).message) || 'Could not record payment.');
      }
    },
    [admin, session.token, applicationId, reload],
  );

  const handleRecordReceiptUpload = useCallback(
    async (file: File): Promise<string> => {
      const res = await admin.uploadFile(session.token, file);
      return res.url;
    },
    [admin, session.token],
  );

  const handleSendFormLink = useCallback(async () => {
    if (!applicationId) return;
    setSubmitting(true);
    try {
      const res = await admin.generateApplicationFormLink(session.token, applicationId, 7);
      const m = asString((res as { message?: unknown }).message) || '';
      if ((res as { status?: number }).status === 1) {
        toast.success(m || 'Form link emailed to student.');
        reload();
      } else {
        toast.error(m || 'Could not generate form link.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setSubmitting(false);
    }
  }, [admin, session.token, applicationId, reload]);

  const handleToggleVerification = useCallback(
    async (key: string, nextVerified: boolean) => {
      if (!applicationId) return;
      setVerifyBusyKey(key);
      try {
        const res = await admin.setApplicationVerification(session.token, applicationId, key, nextVerified);
        if ((res as { status?: number }).status === 1) {
          reload();
        } else {
          toast.error(asString((res as { message?: unknown }).message) || 'Could not update verification.');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update verification.');
      } finally {
        setVerifyBusyKey(null);
      }
    },
    [admin, session.token, applicationId, reload],
  );

  const handleDownloadPdf = useCallback(() => {
    if (!applicationId) return;
    const url = `/api/admin/applications/${applicationId}/pdf?auth_token=${encodeURIComponent(session.token)}`;
    window.open(url, '_blank');
  }, [applicationId, session.token]);

  if (loading) {
    return <DashboardLoader label="application" tone="theme" />;
  }

  if (error || !app) {
    return (
      <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
        <p role="alert" className="py-8 text-center text-sm text-destructive">
          {error || 'Application not found.'}
        </p>
      </Card>
    );
  }

  // ── Derived view data (all real fields) ───────────────────────────────
  const stage = asString(app.stage) || 'lead';
  const isLeadStage = LEAD_STAGES.has(stage);
  const isAdmin = [1, 8, 9].includes(session.roleId);
  const submittedStages = stage === 'form_submitted' || stage === 'approval_waiting' || stage === 'rejected' || stage === 'enrolled';

  const name = asString(app.name);
  const email = asString(app.user_email) || asString(app.email);
  const phone = [asString(app.country_code), asString(app.phone)].filter(Boolean).join(' ').trim() || asString(app.phone);
  const location = asString(app.district).trim() || asString(app.state).trim();
  const applicationCode = asString(app.application_id);

  const savedPlan: SavedPlan | null = (() => {
    const raw = app.payment_plan;
    if (raw === null || raw === undefined || raw === '') return null;
    if (typeof raw === 'object') return raw as SavedPlan;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as SavedPlan;
      } catch {
        return null;
      }
    }
    return null;
  })();
  const paymentLinkUrl = asString(app.payment_link_url);

  // Send-payment-link from the first installment row (Naji 2026-06-26). Only
  // meaningful for an installment plan before the lead has paid; generates a
  // Razorpay link for the first installment. Plain fn (defined after the early
  // returns) — not a hook.
  const canSendPayLink = savedPlan?.mode === 'installment' && (stage === 'lead' || stage === 'payment_pending');
  const handleSendPayLink = async () => {
    if (!applicationId || !savedPlan) return;
    setSendingPayLink(true);
    try {
      const installments = (savedPlan.installments ?? []).map((r) => ({
        label: asString(r.label),
        amount_minor: Number(r.amountMinor ?? r.amount_minor ?? 0),
        due_date: asString(r.dueDate ?? r.due_date),
      }));
      const res = await admin.generatePaymentLink(session.token, {
        id: applicationId,
        mode: 'installment',
        total_amount_minor: Number(savedPlan.total_amount_minor ?? 0),
        registration_fee_minor: Number(savedPlan.registration_fee_minor ?? installments[0]?.amount_minor ?? 0),
        installments,
        expires_in_days: 7,
      });
      if ((res as { status?: number }).status === 1) {
        toast.success('Payment link sent.');
        reload();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Could not send payment link.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send payment link.');
    } finally {
      setSendingPayLink(false);
    }
  };
  const paymentStatus = asString(app.payment_status);
  const hasPaymentPlan = savedPlan !== null || paymentLinkUrl !== '';
  const manual = savedPlan?.manual_payment;

  // Expected amount for the Record Payment modal (display-only). Record Payment
  // is triggered on the FIRST instalment row (the amount due now), so show that
  // row's inc-GST amount — not the full plan total (Naji 2026-06-29). Falls back
  // to the plan total / final course fee for a full-payment plan or when no
  // instalment rows exist; 0 (and hidden in the modal) when nothing is known.
  const recordPaymentAmount = (() => {
    const rows = Array.isArray(savedPlan?.installments) ? savedPlan.installments : [];
    const first = rows[0];
    if (first) {
      const a = Number(first.amountMinor ?? first.amount_minor ?? 0) / 100;
      const g = Number(first.gstPercent ?? first.gst_percent ?? 0);
      if (a > 0) return a + (a * g) / 100;
    }
    const planTotalMinor = Number(savedPlan?.total_amount_minor ?? 0);
    if (planTotalMinor > 0) return planTotalMinor / 100;
    const finalFee = Number(asString(app.final_course_fee).replace(/[^0-9.]/g, ''));
    return Number.isFinite(finalFee) && finalFee > 0 ? finalFee : 0;
  })();
  const recordPaymentContext = [asString(app.course_title), asString(app.offering_title)].filter(Boolean).join(' · ');
  // Only show the Record Payment trigger before enrolment (offline capture is
  // for leads / pending payments). Exclude 'paid' — Finance has already
  // approved a payment at that stage, and re-recording would overwrite the
  // manual_payment entry and reset payment_status to pending_approval.
  const canRecordPayment = ['lead', 'payment_pending', 'form_pending'].includes(stage);

  const currentStageIdx = STAGES.findIndex((s) => s.key === stage);

  // ── Header action buttons (stage-driven, mirrors admin) ───────────────
  const headerActions: React.ReactNode[] = [];
  if (stage === 'lead') {
    headerActions.push(
      <Button key="pay" size="sm" className="gap-1.5" disabled={submitting} onClick={() => setPayDialogOpen(true)}>
        <Plus className="h-4 w-4" /> {hasPaymentPlan ? 'Edit / Resend Plan' : 'Generate Payment Plan'}
      </Button>,
    );
  }
  if (stage === 'payment_pending' || stage === 'paid' || stage === 'form_pending') {
    headerActions.push(
      <Button key="resend" variant="outline" size="sm" className="gap-1.5" disabled={submitting} onClick={() => setPayDialogOpen(true)}>
        <Wallet className="h-4 w-4" /> Edit / Resend Plan
      </Button>,
    );
  }
  // Mark Paid removed from the header (Naji 2026-06-29) — recording an offline
  // payment is done via the Record Payment button on the payment plan row.
  if (stage === 'paid' || stage === 'form_pending') {
    headerActions.push(
      <Button key="form" size="sm" className="gap-1.5" disabled={submitting} onClick={() => void handleSendFormLink()}>
        <Send className="h-4 w-4" /> {stage === 'form_pending' ? 'Resend Application Form' : 'Send Application Form'}
      </Button>,
    );
  }
  if (submittedStages) {
    headerActions.push(
      <Button key="pdf" variant="outline" size="sm" className="gap-1.5" disabled={submitting} onClick={handleDownloadPdf}>
        <Download className="h-4 w-4" /> Download Application Form
      </Button>,
    );
  }

  return (
    <main className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => onNavigate('/counsellor/applications')}
          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All Applications
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono text-xs">{applicationCode || '—'}</span>
      </div>

      {/* Header / hero card */}
      <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-[image:var(--gradient-primary)] text-lg font-semibold text-primary-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{name || '—'}</h1>
              <StageBadge stage={stage} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {applicationCode ? <span className="font-mono">{applicationCode}</span> : null}
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
              {location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {location}
                </span>
              ) : null}
            </div>
            {asString(app.reject_reason) ? (
              <p className="mt-2 text-xs font-medium text-destructive">Reason: {asString(app.reject_reason)}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                // Lead-stage records edit in the themed dialog (Naji 2026-06-24
                // — the old /leads/edit page rendered the admin-magenta design);
                // post-lead stages keep the full Edit Application page.
                if (isLeadStage) setEditLeadOpen(true);
                else onNavigate('/counsellor/applications/edit/' + applicationId);
              }}
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => void handleDelete()}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* Pipeline stepper — driven by real stage */}
        <div className="mt-7">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pipeline Progress</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, i) => {
              const done = currentStageIdx >= 0 && i < currentStageIdx;
              const active = i === currentStageIdx;
              return (
                <div key={s.key} className="flex min-w-fit flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold',
                        done && 'border-success bg-success text-success-foreground',
                        active && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary-soft',
                        !done && !active && 'border-border bg-card text-muted-foreground',
                      )}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={cn('whitespace-nowrap text-center text-[10px]', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {s.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && <div className={cn('-mt-5 h-0.5 min-w-6 flex-1', done ? 'bg-success' : 'bg-border')} />}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          {!isLeadStage && <TabsTrigger value="application">Application</TabsTrigger>}
          {!isLeadStage && <TabsTrigger value="documents">Documents</TabsTrigger>}
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="history">Stage History</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <Section title="Personal & Contact Information" icon={User}>
            <Field label="Name" value={name} />
            <Field label="Email ID" value={email} />
            <Field label="Phone" value={phone} />
            <Field label="Source" value={asString(app.marketing_source_display) || asString(app.marketing_source) || asString(app.lead_source)} />
          </Section>
          <Section title="Course Information" icon={FileText}>
            <Field label="Course" value={asString(app.course_title)} />
            <Field label="Offering" value={asString(app.offering_title)} />
            <Field label="Certificate Combination" value={asString(app.combination_title)} />
            <Field label="Pipeline" value={asString(app.pipeline)} />
            <Field label="Pipeline User" value={asString(app.pipeline_user_name)} />
            <Field label="Created" value={formatDate(app.created_at)} />
          </Section>
          {!isLeadStage ? (
            <Section title="Enrolment & Fee" icon={Wallet}>
              <Field label="Batch" value={asString(app.batch_title)} />
              <Field label="Enrolment Date" value={formatDate(app.enrollment_date)} />
              <Field label="Mode of Study" value={asString(app.mode_of_study)} />
              <Field label="Language" value={asString(app.language_name) || asString(app.preferred_language)} />
              <Field label="Course Fee" value={asString(app.course_fee) ? `₹${asString(app.course_fee)}` : ''} />
              <Field label="Discount" value={asString(app.discount) ? `${asString(app.discount)}%` : ''} />
              <Field label="GST Applicability" value={asString(app.gst_applicability)} />
              <Field label="Final Course Fee" value={asString(app.final_course_fee) ? `₹${asString(app.final_course_fee)}` : ''} />
            </Section>
          ) : null}
        </TabsContent>

        {/* ── Payment ── */}
        <TabsContent value="payment" className="mt-4 space-y-6">
          {hasPaymentPlan ? (
            <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold">Payment Plan</h3>
                </div>
                <div className="flex items-center gap-2">
                  {paymentStatus ? (
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                        paymentStatus === 'paid' && 'bg-success-soft text-success',
                        paymentStatus === 'pending_approval' && 'bg-warning-soft text-warning-foreground',
                        paymentStatus === 'payment_rejected' && 'bg-destructive/10 text-destructive',
                        !['paid', 'pending_approval', 'payment_rejected'].includes(paymentStatus) && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {paymentStatus === 'pending_approval'
                        ? 'Pending Approval'
                        : paymentStatus === 'payment_rejected'
                          ? 'Rejected'
                          : paymentStatus.replace(/_/g, ' ')}
                    </span>
                  ) : null}
                  {/* Edit removed — the header's "Edit / Resend Plan" action
                      opens the same payment dialog (redundant here, Naji
                      2026-06-28). Record Payment moved down next to Send
                      Payment Link on the first instalment row. */}
                </div>
              </div>
              {(() => {
                const rows = Array.isArray(savedPlan?.installments) ? savedPlan.installments : [];
                let excl = 0;
                let gst = 0;
                let incl = 0;
                for (const r of rows) {
                  const a = Number(r.amountMinor ?? r.amount_minor ?? 0) / 100;
                  const g = Number(r.gstPercent ?? r.gst_percent ?? 0);
                  const gAmt = a * (g / 100);
                  excl += a;
                  gst += gAmt;
                  incl += a + gAmt;
                }
                const totalDisplay = incl > 0 ? incl : savedPlan?.total_amount_minor ? Number(savedPlan.total_amount_minor) / 100 : 0;
                return (
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
                    <Field label="Mode" value={savedPlan?.mode === 'installment' ? 'Installment Plan' : 'Full Payment'} />
                    <Field label="Instalments Total" value={excl > 0 ? fmtInr(excl) : ''} />
                    <Field label="GST" value={gst > 0 ? `₹${gst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : ''} />
                    <Field label="Total Inc. GST" value={totalDisplay > 0 ? `₹${totalDisplay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : ''} />
                    {savedPlan?.registration_fee_minor ? (
                      <Field label="Registration Fee" value={fmtInr(Number(savedPlan.registration_fee_minor) / 100)} />
                    ) : null}
                    <Field label="Payment Link" value={paymentLinkUrl || 'Not sent yet (saved as draft)'} />
                  </div>
                );
              })()}

              {Array.isArray(savedPlan?.installments) && savedPlan.installments.length > 0 ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Description</th>
                        <th className="py-2 pr-3 text-right">Amount</th>
                        <th className="py-2 pr-3 text-right">GST %</th>
                        <th className="py-2 pr-3 text-right">Inc. GST</th>
                        <th className="py-2 pr-3">Due Date</th>
                        <th className="py-2 pr-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedPlan.installments.map((row, i) => {
                        const amount = Number(row.amountMinor ?? row.amount_minor ?? 0) / 100;
                        const g = Number(row.gstPercent ?? row.gst_percent ?? 0);
                        const inc = amount + (amount * g) / 100;
                        const due = asString(row.dueDate ?? row.due_date);
                        return (
                          <tr key={i} className="border-b border-border/60">
                            <td className="py-3 pr-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-3 pr-3 font-medium">{asString(row.label) || '—'}</td>
                            <td className="py-3 pr-3 text-right tabular-nums">{fmtInr(amount)}</td>
                            <td className="py-3 pr-3 text-right tabular-nums">{g}%</td>
                            <td className="py-3 pr-3 text-right font-semibold tabular-nums">
                              ₹{inc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 pr-3 text-muted-foreground">{formatDate(due) || '—'}</td>
                            <td className="py-3 pr-3 text-right">
                              {i === 0 ? (
                                <div className="flex items-center justify-end gap-2">
                                  {canRecordPayment ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 gap-1.5 border-success/40 text-success hover:bg-success-soft hover:text-success"
                                      onClick={() => setRecordPaymentOpen(true)}
                                    >
                                      <Wallet className="h-3.5 w-3.5" /> Record Payment
                                    </Button>
                                  ) : null}
                                  {canSendPayLink ? (
                                    <Button
                                      size="sm"
                                      className="h-7 gap-1.5"
                                      disabled={sendingPayLink}
                                      onClick={() => void handleSendPayLink()}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      {sendingPayLink ? 'Sending…' : (paymentLinkUrl ? 'Resend Link' : 'Send Payment Link')}
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {manual && (asString(manual.reference) || asString(manual.mode)) ? (
                <div className="mt-4 rounded-lg border border-success/30 bg-success-soft/60 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-success">
                    {paymentStatus === 'paid' ? 'Payment Received' : 'Manual Payment Recorded'}
                  </p>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <Field label="Mode" value={asString(manual.mode)} />
                    <Field label="Reference" value={asString(manual.reference)} />
                    <Field label="Recorded" value={manual.marked_at ? formatDate(manual.marked_at) : ''} />
                    {asString(manual.receipt_url) ? (
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Receipt</p>
                        <a href={asString(manual.receipt_url)} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-sm font-medium text-primary hover:underline">
                          View
                        </a>
                      </div>
                    ) : null}
                  </div>
                  {paymentStatus === 'pending_approval' ? (
                    <p className="mt-2 text-xs text-warning-foreground">Awaiting Finance approval before it reflects to the student.</p>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ) : (
            <Card className="p-10 text-center shadow-[var(--shadow-soft)] border-border/70">
              <Receipt className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No payment plan created yet.
                {stage === 'lead' ? ' Use the Generate Payment Plan button above to create one.' : ''}
              </p>
              {/* Record Payment intentionally omitted here (Naji 2026-06-30):
                  offline payment capture must go against a payment plan, so the
                  trigger only appears on the plan row once a plan exists. */}
            </Card>
          )}

          {/* Fee information + payment history (real data) */}
          {!isLeadStage ? (
            <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
                  <Receipt className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">Fee Structure</h3>
              </div>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
                <Field label="Course Fee" value={asString(app.course_fee) ? `₹${asString(app.course_fee)}` : ''} />
                <Field label="Discount" value={asString(app.discount) ? `${asString(app.discount)}%` : ''} />
                <Field label="GST Applicability" value={asString(app.gst_applicability)} />
                <Field label="Final Course Fee" value={asString(app.final_course_fee) ? `₹${asString(app.final_course_fee)}` : ''} />
              </div>
            </Card>
          ) : null}

          {payments.length > 0 ? (
            <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
              <h3 className="mb-4 text-sm font-semibold">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Installment</th>
                      <th className="py-2 pr-3 text-right">Amount</th>
                      <th className="py-2 pr-3">Due Date</th>
                      <th className="py-2 pr-3">Paid Date</th>
                      <th className="py-2 pr-3">Mode</th>
                      <th className="py-2 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="py-3 pr-3 font-medium">{asString(p.installment_details) || '—'}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">₹{asNumber(p.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{formatDate(p.due_date) || '—'}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{formatDate(p.paid_date) || '—'}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{asString(p.payment_mode) || '—'}</td>
                        <td className="py-3 pr-3">
                          <span className="text-[10px] font-semibold rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                            {asString(p.status) || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </TabsContent>

        {/* ── Application (submitted detail) ── */}
        {!isLeadStage ? (
          <TabsContent value="application" className="mt-4 space-y-6">
            <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold">Personal Information</h3>
                </div>
                {isAdmin ? (
                  <VerifyButton isVerified={verifiedSet.has('basic')} busy={verifyBusyKey === 'basic'} onToggle={(next) => void handleToggleVerification('basic', next)} />
                ) : null}
              </div>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Name" value={name} />
                <Field label="Date of Birth" value={formatDate(app.date_of_birth)} />
                <Field label="Age" value={asString(app.age)} />
                <Field label="Gender" value={asString(app.gender)} />
                <Field label="Marital Status" value={asString(app.marital_status)} />
                <Field label="Nationality" value={asString(app.nationality_name) || asString(app.nationality)} />
                <Field label="Aadhaar No" value={asString(app.aadhar_no)} />
                <Field label="Passport No" value={asString(app.passport_no)} />
                <Field label="Father's Name" value={asString(app.father_name)} />
                <Field label="Mother's Name" value={asString(app.mother_name)} />
                <Field label="Guardian's Name" value={asString(app.guardian_name)} />
              </div>
            </Card>

            <Section title="Contact Information" icon={MapPin}>
              <Field label="Email" value={email} />
              <Field label="Phone" value={phone} />
              <Field label="Alternate Phone" value={asString(app.second_phone)} />
              <Field label="WhatsApp" value={asString(app.whatsapp_no)} />
              <Field label="Country" value={asString(app.country_name) || asString(app.country) || asString(app.country_id)} />
              <Field label="State" value={asString(app.state)} />
              <Field label="District" value={asString(app.district)} />
              <Field label="Permanent Address" value={asString(app.address)} full />
              <Field label="Correspondence Address" value={asString(app.native_address)} full />
            </Section>

            <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold">Qualification & Employment</h3>
                </div>
                {isAdmin ? (
                  <VerifyButton
                    isVerified={verifiedSet.has('qualification')}
                    busy={verifyBusyKey === 'qualification'}
                    onToggle={(next) => void handleToggleVerification('qualification', next)}
                  />
                ) : null}
              </div>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Highest Qualification" value={asString(app.highest_qualification)} />
                <Field label="Specialization" value={asString(app.specialization)} />
                <Field label="School / College" value={asString(app.institution_name)} />
                <Field label="Year of Passing" value={asString(app.year_of_passing)} />
                <Field label="Employment Status" value={asString(app.employment_status)} />
                <Field label="Current Occupation" value={asString(app.current_occupation)} />
                <Field label="Experience" value={asString(app.work_experience)} />
              </div>
            </Card>

            <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">Education Pathway</h3>
              </div>
              {educationPathway.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Qualification</th>
                        <th className="py-2 pr-3">Specialization</th>
                        <th className="py-2 pr-3">Institution</th>
                        <th className="py-2 pr-3">Board</th>
                        <th className="py-2 pr-3">Year</th>
                        <th className="py-2 pr-3">Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {educationPathway.map((row, idx) => (
                        <tr key={idx} className="border-b border-border/60 last:border-0">
                          <td className="py-3 pr-3 font-medium">{asString(row.qualification) || '—'}</td>
                          <td className="py-3 pr-3 text-muted-foreground">{asString(row.specialization) || '—'}</td>
                          <td className="py-3 pr-3 text-muted-foreground">{asString(row.institution) || '—'}</td>
                          <td className="py-3 pr-3">{asString(row.board) || '—'}</td>
                          <td className="py-3 pr-3 text-muted-foreground">{asString(row.year_passed) || '—'}</td>
                          <td className="py-3 pr-3">{asString(row.marks) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No education pathway entries recorded.</p>
              )}
            </Card>
          </TabsContent>
        ) : null}

        {/* ── Documents (real, honest empty state) ── */}
        {!isLeadStage ? (
          <TabsContent value="documents" className="mt-4">
            <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Documents</h3>
                  <p className="text-xs text-muted-foreground">Uploaded paperwork &amp; verification</p>
                </div>
                {isAdmin ? (
                  <VerifyButton isVerified={verifiedSet.has('documents')} busy={verifyBusyKey === 'documents'} onToggle={(next) => void handleToggleVerification('documents', next)} />
                ) : null}
              </div>
              {documents.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {documents.map((doc, idx) => {
                    const docKey = `doc:${idx}`;
                    const label = asString(doc.label) || asString(doc.name) || `Document ${idx + 1}`;
                    const url = asString(doc.url);
                    const isVerified = verifiedSet.has(docKey);
                    return (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-accent-foreground">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{label}</p>
                          <p className="text-[11px] text-muted-foreground">{isVerified ? 'Verified' : 'Pending review'}</p>
                        </div>
                        {isVerified ? (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Verified</span>
                        ) : (
                          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">Pending</span>
                        )}
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                            View
                          </a>
                        ) : null}
                        {isAdmin ? (
                          <VerifyButton size="xs" isVerified={isVerified} busy={verifyBusyKey === docKey} onToggle={(next) => void handleToggleVerification(docKey, next)} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded.</p>
              )}
            </Card>
          </TabsContent>
        ) : null}

        {/* ── Activity Timeline (real listApplicationEvents) ── */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
            <h3 className="mb-4 text-sm font-semibold">Activity Timeline</h3>
            {eventsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading timeline…</p>
            ) : events.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ol className="relative ml-3 space-y-5 border-l border-border">
                {events.map((ev, idx) => {
                  const description = asString(ev.description) || asString(ev.event_type);
                  const eventType = asString(ev.event_type);
                  const actorName = asString(ev.actor_name);
                  const actorRole = asString(ev.actor_role_label);
                  const ts = asString(ev.created_at) ? new Date(asString(ev.created_at)).toLocaleString('en-IN') : '';
                  return (
                    <li key={idx} className="ml-6">
                      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-primary">
                        <CircleDashed className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-sm font-medium">{description}</p>
                      <p className="text-xs text-muted-foreground">
                        {ts}
                        {actorName ? ` · by ${actorName}${actorRole ? ` (${actorRole})` : ''}` : ' · System'}
                        {eventType ? ` · ${eventType}` : ''}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </TabsContent>

        {/* ── Stage History (real stage drives done/active/upcoming) ── */}
        <TabsContent value="history" className="mt-4 space-y-6">
          <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
            <h3 className="mb-4 text-sm font-semibold">Stage History</h3>
            <div className="space-y-3">
              {STAGES.map((s, i) => {
                const done = currentStageIdx >= 0 && i < currentStageIdx;
                const active = i === currentStageIdx;
                const upcoming = currentStageIdx >= 0 && i > currentStageIdx;
                return (
                  <div key={s.key} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : active ? (
                      <CircleDashed className="h-5 w-5 animate-pulse text-primary" />
                    ) : (
                      <CircleDashed className="h-5 w-5 text-muted-foreground/50" />
                    )}
                    <div className="flex-1">
                      <p className={cn('text-sm font-medium', upcoming && 'text-muted-foreground')}>{s.label}</p>
                      <p className="text-xs text-muted-foreground">{done ? 'Completed' : active ? 'Current stage' : 'Upcoming'}</p>
                    </div>
                    {done ? <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Done</span> : null}
                    {active ? <StageBadge stage={s.key} /> : null}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Approve / Reject — Admin-only, gated on full verification (mirrors admin) */}
          {!isLeadStage && isAdmin && stage !== 'rejected' && stage !== 'enrolled' ? (
            <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
              <h3 className="mb-1 text-sm font-semibold">Approval</h3>
              <p className="mb-4 text-xs text-muted-foreground">
                {allVerified ? 'All sections and documents verified.' : 'Verify all sections and documents to enable approval.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(stage === 'approval_waiting' || stage === 'form_submitted') ? (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                    disabled={submitting || !allVerified}
                    title={allVerified ? undefined : 'Verify all sections and documents to enable approval.'}
                    onClick={() => void handleApprove()}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={submitting} onClick={() => setRejectDialogOpen(true)}>
                  <Trash2 className="h-4 w-4" /> Reject
                </Button>
              </div>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Generate Payment Link dialog (reused verbatim from admin) */}
      <CounsellorAddLeadDialog
        open={editLeadOpen}
        onOpenChange={setEditLeadOpen}
        api={api}
        session={session}
        editId={applicationId}
        onCreated={() => { setEditLeadOpen(false); reload(); }}
        onEdited={() => { setEditLeadOpen(false); reload(); }}
      />

      <GeneratePaymentLinkDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        dialogClassName="counsellor-theme"
        variant="counsellor"
        api={admin}
        authToken={session.token}
        applicationId={applicationId}
        studentName={name || email || 'this lead'}
        offeringId={asString(app.offering_id)}
        combinationId={asString(app.certificate_combination_id)}
        initialBaseFee={Number(app.application_final_fee ?? 0)}
        initialDiscount={Number(app.application_discount ?? 0)}
        initialGstPercent={Number(app.application_gst_percent ?? 18)}
        initialSavedPlan={savedPlan}
        onSent={() => reload()}
      />

      {/* Dedicated Record Payment modal (offline payment capture) */}
      <CounsellorRecordPaymentModal
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        studentName={name || email || 'this lead'}
        amount={recordPaymentAmount}
        description={recordPaymentContext}
        onUploadReceipt={handleRecordReceiptUpload}
        onRecord={handleRecordPayment}
      />

      {/* Mark as Paid dialog */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent className="counsellor-theme w-[min(480px,calc(100vw-2rem))] max-w-[min(480px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cn-mp-mode">Mode</Label>
              <select
                id="cn-mp-mode"
                value={markPaidMode}
                onChange={(e) => setMarkPaidMode(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card / POS</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cn-mp-ref">Reference Number *</Label>
              <input
                id="cn-mp-ref"
                type="text"
                value={markPaidReference}
                onChange={(e) => setMarkPaidReference(e.target.value)}
                placeholder="e.g. Cheque no., Bank ref, UPI txn ID"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cn-mp-receipt">Receipt *</Label>
              {markPaidReceiptUrl ? (
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
                  <span className="truncate">Uploaded: {markPaidReceiptUrl.split('/').pop()}</span>
                  <button type="button" className="text-xs underline" onClick={() => setMarkPaidReceiptUrl('')}>
                    Replace
                  </button>
                </div>
              ) : (
                <input
                  id="cn-mp-receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleReceiptUpload(file);
                  }}
                  disabled={markPaidUploading}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-foreground"
                />
              )}
              {markPaidUploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => void handleSubmitMarkPaid()}
              disabled={submitting || !markPaidReference.trim() || markPaidUploading}
            >
              {submitting ? 'Saving…' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog with reason */}
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogOpen(false);
            setRejectReason('');
          }
        }}
      >
        <DialogContent className="counsellor-theme">
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
              <p className="text-sm text-muted-foreground">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting || !rejectReason.trim()}>
                {submitting ? 'Rejecting…' : 'Reject Application'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — themed (replaces the native window.confirm). */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { if (!o) setDeleteDialogOpen(false); }}>
        <DialogContent className="counsellor-theme w-[min(440px,calc(100vw-2rem))] max-w-[min(440px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Delete application?</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            This permanently deletes this application. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => { void handleDeleteConfirmed(); }} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve confirmation — themed. */}
      <Dialog open={approveDialogOpen} onOpenChange={(o) => { if (!o) setApproveDialogOpen(false); }}>
        <DialogContent className="counsellor-theme w-[min(440px,calc(100vw-2rem))] max-w-[min(440px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Approve application?</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Move this application to the approved stage?
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => { void handleApproveConfirmed(); }} disabled={submitting}>
              {submitting ? 'Approving…' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

/* ─── Admin-only verify toggle (counsellor-theme colours) ─── */

function VerifyButton({
  isVerified,
  busy,
  onToggle,
  size = 'sm',
}: {
  isVerified: boolean;
  busy: boolean;
  onToggle: (next: boolean) => void;
  size?: 'sm' | 'xs';
}) {
  const base = size === 'xs' ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-xs';
  if (isVerified) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => onToggle(false)}
        className={cn(base, 'border-success/40 bg-success-soft font-semibold text-success hover:bg-success-soft/70')}
      >
        Verified ✓
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      onClick={() => onToggle(true)}
      className={cn(base, 'border-warning/50 font-semibold text-warning-foreground hover:bg-warning-soft')}
    >
      {busy ? 'Saving…' : 'Verify'}
    </Button>
  );
}
