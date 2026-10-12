import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { GeneratePaymentLinkDialog } from './GeneratePaymentLinkDialog.js';
import {
  allVerified as computeAllVerified,
  isLeadStage,
  parseSavedPlan,
  readDocuments,
  readVerified,
  stageActions,
  stageSteps,
  toEvents,
} from './application-profile-model.js';
import { ActivityTimeline, StageHistory } from './profile/ActivityTabs.js';
import { MarkPaidDialog, ReassignDialog, RejectDialog } from './profile/ProfileDialogs.js';
import { ProfileHeader } from './profile/ProfileHeader.js';
import { ApplicationTab, DocumentsTab, OverviewTab } from './profile/ProfileSections.js';
import { PaymentTab } from './profile/PaymentTab.js';

// Learner Management → Applications → profile (TTII 2026-10-12), rebuilt after
// Naji's ApplicationProfile: a header card with the stage's next steps and the
// pipeline progress, then Overview / Payment / Application / Documents /
// Activity Timeline / Stage History tabs. Every stage action, the verification
// gate, the payment-plan dialog, Mark as Paid, Reject, Reopen, Reassign, the
// application PDF and Delete are the ones the old View page had, on the same
// endpoints.

type ProfileTab = 'overview' | 'payment' | 'application' | 'documents' | 'timeline' | 'history';

function statusOf(res: unknown): { ok: boolean; message: string } {
  const r = (res ?? {}) as { status?: unknown; message?: unknown };
  return { ok: r.status === 1 || asString(r.status) === '1', message: asString(r.message) };
}

export default function ViewApplicationPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [busy, setBusy] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [verifyBusyKey, setVerifyBusyKey] = useState<string | null>(null);

  const applicationId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error, reload } = useAdminPageData(() => api.getApplication(session.token, applicationId), [applicationId]);
  // Lead History events drive the Activity Timeline, the Stage History dates
  // and the progress bar of a rejected application.
  const { data: rawEvents, loading: eventsLoading, reload: reloadEvents } = useAdminPageData(
    () => (applicationId ? api.listApplicationEvents(session.token, applicationId) : Promise.resolve([])),
    [applicationId],
  );
  const refresh = useCallback(() => { reload(); reloadEvents(); }, [reload, reloadEvents]);

  const app = useMemo(() => {
    if (!data) return null;
    const record = data.application ?? data;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);
  const events = useMemo(() => toEvents(Array.isArray(rawEvents) ? rawEvents : []), [rawEvents]);
  const documents = useMemo(() => (app ? readDocuments(app) : []), [app]);
  const verified = useMemo(() => (app ? readVerified(app) : new Set<string>()), [app]);

  // A stage action that posts {id} and reloads; toasts the server's message.
  const runAction = useCallback(async (call: () => Promise<unknown>, okText: string, failText: string) => {
    setBusy(true);
    try {
      const { ok, message } = statusOf(await call());
      if (ok) { toast.success(message || okText); refresh(); } else toast.error(message || failText);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : failText);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const toggleVerification = useCallback(async (key: string, next: boolean) => {
    setVerifyBusyKey(key);
    try {
      const { ok, message } = statusOf(await api.setApplicationVerification(session.token, applicationId, key, next));
      if (ok) refresh(); else toast.error(message || 'Could not update verification.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update verification.');
    } finally {
      setVerifyBusyKey(null);
    }
  }, [api, session.token, applicationId, refresh]);

  if (loading && !data) return <PageLoader label="Loading application..." />;
  if (error || !app) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error || 'Application not found.'}
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => onNavigate('/admin/applications')}>Back to Applications</Button>
            {error ? <Button variant="outline" onClick={reload}>Retry</Button> : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stage = asString(app.stage) || 'lead';
  const status = asString(app.status) || 'pending';
  const leadStage = isLeadStage(stage);
  // Naji UAT 2026-05-31 — approve / reject / verify are Admin actions (1, 8, 9).
  const isAdmin = [1, 8, 9].includes(session.roleId);
  // Reassigning a lead's owner is Super Admin / Admin only (matches the backend gate).
  const canReassign = session.roleId === 1 || session.roleId === 8;
  const savedPlan = parseSavedPlan(app.payment_plan);
  const paymentStatus = asString(app.payment_status);
  const hasPlan = savedPlan !== null || asString(app.payment_link_url) !== '';
  const actions = stageActions(stage, status, { isAdmin });
  const canEditPlan = actions.includes('generate_plan') || actions.includes('resend_plan');
  const gateOpen = computeAllVerified(verified, documents.length);
  const steps = stageSteps(stage, events);
  const verifyProps = { isAdmin, verified, busyKey: verifyBusyKey, onToggle: (k: string, n: boolean) => void toggleVerification(k, n) };
  // Lead stages show only what Add Lead captured; the submitted form adds two tabs.
  const activeTab: ProfileTab = leadStage && (tab === 'application' || tab === 'documents') ? 'overview' : tab;

  const handlers = {
    onBack: () => onNavigate('/admin/applications'),
    onPlan: () => setPlanOpen(true),
    onMarkPaid: () => setMarkPaidOpen(true),
    onSendFormLink: () => void runAction(() => api.generateApplicationFormLink(session.token, applicationId, 7), 'Form link emailed to student.', 'Could not generate form link.'),
    onAdminApprove: () => void runAction(() => api.adminApproveApplication(session.token, applicationId), 'Enrolled.', 'Could not enrol.'),
    onReject: () => setRejectOpen(true),
    onMarkApproved: async () => {
      if (!(await confirm({ title: 'Approve this application?', confirmText: 'Approve', variant: 'default' }))) return;
      void runAction(() => api.updateApplicationStatus(session.token, applicationId, 'approved'), 'Application approved.', 'Failed to update status');
    },
    // Streams GET /admin/applications/:id/pdf (available once the form is submitted).
    onDownloadPdf: () => window.open(`/api/admin/applications/${applicationId}/pdf?auth_token=${encodeURIComponent(session.token)}`, '_blank'),
    // Naji 2026-07-29 — reopen restores the stage the application was rejected from.
    onReopen: () => void runAction(() => api.reopenApplication(session.token, applicationId), 'Application reopened.', 'Failed to reopen application'),
    onReassign: () => setReassignOpen(true),
    // Naji 2026-05-08 — at lead stages Edit opens the minimal Add Lead form in edit mode.
    onEdit: () => onNavigate((leadStage ? '/admin/leads/edit/' : '/admin/applications/edit/') + applicationId),
    onDelete: async () => {
      if (!(await confirm({ title: 'Delete this application?', description: 'This action cannot be undone.', confirmText: 'Delete', variant: 'destructive' }))) return;
      try {
        const { ok, message } = statusOf(await api.deleteApplication(session.token, applicationId));
        if (!ok) { toast.error(message || 'Failed to delete application'); return; }
        toast.success(message || 'Application deleted.');
        onNavigate('/admin/applications');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete application');
      }
    },
  };

  return (
    <div className="space-y-6">
      <ProfileHeader
        app={app}
        stage={stage}
        steps={steps}
        actions={actions}
        busy={busy}
        hasPlan={hasPlan}
        allVerified={gateOpen}
        canReassign={canReassign}
        handlers={handlers}
      />

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as ProfileTab)}>
        <TabsList className="h-auto flex-wrap bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          {!leadStage ? <TabsTrigger value="application">Application</TabsTrigger> : null}
          {!leadStage ? <TabsTrigger value="documents">Documents</TabsTrigger> : null}
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="history">Stage History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab app={app} leadStage={leadStage} />
        </TabsContent>
        <TabsContent value="payment" className="mt-4">
          <PaymentTab app={app} payments={data?.payments} plan={savedPlan} leadStage={leadStage} canEditPlan={canEditPlan} onEditPlan={() => setPlanOpen(true)} />
        </TabsContent>
        {!leadStage ? (
          <TabsContent value="application" className="mt-4">
            <ApplicationTab app={app} educationPathway={data?.education_pathway} verify={verifyProps} />
          </TabsContent>
        ) : null}
        {!leadStage ? (
          <TabsContent value="documents" className="mt-4">
            <DocumentsTab documents={documents} verify={verifyProps} />
          </TabsContent>
        ) : null}
        <TabsContent value="timeline" className="mt-4">
          <ActivityTimeline events={events} loading={eventsLoading} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <StageHistory steps={steps} />
        </TabsContent>
      </Tabs>

      {/* Naji 2026-05-08 — offering-priced Full / Installment plan; reopens with the saved plan. */}
      <GeneratePaymentLinkDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        api={api}
        authToken={session.token}
        applicationId={applicationId}
        studentName={asString(app.name) || asString(app.user_email) || 'this lead'}
        offeringId={asString(app.offering_id)}
        combinationId={asString(app.certificate_combination_id)}
        initialBaseFee={Number(app.application_final_fee ?? 0)}
        initialDiscount={Number(app.application_discount ?? 0)}
        initialGstPercent={Number(app.application_gst_percent ?? 18)}
        initialSavedPlan={savedPlan}
        paymentStatus={paymentStatus}
        onSent={refresh}
      />
      <MarkPaidDialog open={markPaidOpen} onOpenChange={setMarkPaidOpen} api={api} token={session.token} applicationId={applicationId} onDone={refresh} />
      <RejectDialog open={rejectOpen} onOpenChange={setRejectOpen} api={api} token={session.token} applicationId={applicationId} onDone={refresh} />
      <ReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        api={api}
        token={session.token}
        applicationId={applicationId}
        onDone={refresh}
        currentPipeline={asString(app.pipeline)}
        currentUserId={asString(app.pipeline_user)}
        currentUserName={asString(app.pipeline_user_name)}
      />
    </div>
  );
}
