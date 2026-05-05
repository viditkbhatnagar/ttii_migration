import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

// Lead → Enrolment workflow stage labels (Naji 2026-05-05).
const STAGE_TABS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'lead', label: 'Lead' },
  { id: 'payment_pending', label: 'Payment Pending' },
  { id: 'paid', label: 'Paid' },
  { id: 'form_pending', label: 'Form Pending' },
  { id: 'form_submitted', label: 'Form Submitted' },
  { id: 'approval_waiting', label: 'Approval Waiting' },
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'rejected', label: 'Rejected' },
];

const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  STAGE_TABS.filter((t) => t.id !== 'all').map((t) => [t.id, t.label]),
);

export default function ApplicationsPage({ api, session, onNavigate }: AdminPageProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [courseId, setCourseId] = useState('');
  const [pipelineRoleId, setPipelineRoleId] = useState('');
  const [pipelineUserId, setPipelineUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, _setSearch] = useState('');
  void _setSearch;

  // Payment-link dialog state. Replaces the old chained window.prompt
  // flow with a proper modal — Naji 2026-05-05.
  const [payDialog, setPayDialog] = useState<{
    open: boolean;
    rowId: string;
    studentName: string;
    mode: 'full' | 'installment';
    totalRupees: string;
    regRupees: string;
    installments: string;
    expiresInDays: string;
  }>({
    open: false, rowId: '', studentName: '', mode: 'full',
    totalRupees: '', regRupees: '', installments: '3', expiresInDays: '7',
  });
  const [paySubmitting, setPaySubmitting] = useState(false);

  const openPayDialog = (row: Record<string, unknown>) => {
    setPayDialog({
      open: true,
      rowId: asString(row.id),
      studentName: asString(row.name) || asString(row.user_email) || 'this lead',
      mode: 'full',
      totalRupees: '',
      regRupees: '',
      installments: '3',
      expiresInDays: '7',
    });
  };

  const submitPayDialog = async () => {
    const totalRupees = Number(payDialog.totalRupees);
    if (!Number.isFinite(totalRupees) || totalRupees <= 0) {
      toast.error('Enter a valid total fee.');
      return;
    }
    const total_amount_minor = Math.round(totalRupees * 100);
    let registration_fee_minor: number | undefined;
    const installments: Array<{ label: string; amount_minor: number; due_date: string }> = [];
    if (payDialog.mode === 'installment') {
      const regRupees = Number(payDialog.regRupees);
      if (!Number.isFinite(regRupees) || regRupees <= 0) {
        toast.error('Enter a valid registration fee.');
        return;
      }
      registration_fee_minor = Math.round(regRupees * 100);
      const n = Math.max(1, Math.min(12, Number(payDialog.installments) || 3));
      const remainingRupees = totalRupees - regRupees;
      if (remainingRupees > 0) {
        const per = Math.floor(remainingRupees / n);
        const today = new Date();
        for (let i = 1; i <= n; i++) {
          const due = new Date(today.getTime());
          due.setMonth(due.getMonth() + i);
          installments.push({
            label: `Installment ${i} of ${n}`,
            amount_minor: per * 100,
            due_date: due.toISOString().slice(0, 10),
          });
        }
      }
    }
    setPaySubmitting(true);
    try {
      const res = await api.generatePaymentLink(session.token, {
        id: payDialog.rowId,
        mode: payDialog.mode,
        total_amount_minor,
        ...(registration_fee_minor !== undefined ? { registration_fee_minor } : {}),
        installments,
        expires_in_days: Number(payDialog.expiresInDays) || 7,
      });
      const m = asString((res as { message?: unknown }).message) || '';
      if ((res as { status?: number }).status === 1) {
        toast.success(m || 'Payment link sent.');
        setPayDialog((p) => ({ ...p, open: false }));
      } else {
        toast.error(m || 'Could not generate link.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Pull leads from the new pipeline endpoint AND the legacy endpoint;
  // the legacy one still drives the existing filters / counts. Lead
  // capture (Phase B) writes via /admin/leads/add but rows live in the
  // same `applications` table, so the legacy /admin/applications/list
  // already returns them — we only need the new endpoint when we want
  // stage-scoped counts in the tabs.
  const { data: leadsData, loading: leadsLoading } = useAdminPageData(
    () =>
      api.listLeads(session.token, {
        ...(activeTab !== 'all' ? { stage: activeTab } : {}),
        ...(courseId ? { course_id: courseId } : {}),
        ...(search ? { search } : {}),
      }),
    [activeTab, courseId, search],
  );

  const { data, loading, error } = useAdminPageData(
    () =>
      api.loadApplications(session.token, {
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
        ...(courseId ? { courseId } : {}),
        ...(pipelineRoleId ? { pipelineRoleId } : {}),
        ...(pipelineUserId ? { pipelineUserId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
    [fromDate, toDate, courseId, pipelineRoleId, pipelineUserId, statusFilter],
  );
  void leadsLoading;
  // Dev hint: when leadsData is non-empty we use it; falls back to
  // the legacy applications payload during the migration window.
  useEffect(() => { /* placeholder for eventual websocket refresh */ }, [leadsData]);

  // Load pipeline users for filter dropdown
  const { data: pipelineUsersData } = useAdminPageData(
    () => api.loadPipelineUsers(session.token, 9),
    [],
  );
  const pipelineUserOptions = useMemo(
    () => (Array.isArray(pipelineUsersData) ? pipelineUsersData : []).map((u) => ({ label: asString(u.name), value: asString(u.id) })),
    [pipelineUsersData],
  );

  const items = useMemo(() => (data ? data.items : []), [data]);
  const courseOptions = useMemo(() => (data?.courses ?? []).map(c => ({ label: c.title, value: c.id })), [data]);

  // Prefer the new pipeline payload when the user picks a stage tab;
  // fall back to the legacy items list when on the All tab so we still
  // surface anything the legacy filters (date / pipeline user) returned.
  const leadsItems = useMemo(() => (Array.isArray(leadsData) ? leadsData : []), [leadsData]);
  const displayedItems = useMemo(() => {
    if (activeTab === 'all') return items;
    return leadsItems;
  }, [items, leadsItems, activeTab]);

  // Stage tab counts come from the legacy items (whole list, post-filter).
  // Naji 2026-05-05: order is Active-first style — Lead first, Rejected last.
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of items) {
      const stage = asString(row.stage) || 'lead';
      counts[stage] = (counts[stage] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const tabs: AdminTab[] = useMemo(
    () =>
      STAGE_TABS.map((t) =>
        t.id === 'all'
          ? { id: t.id, label: t.label, count: items.length }
          : { id: t.id, label: t.label, count: stageCounts[t.id] ?? 0 },
      ),
    [items.length, stageCounts],
  );

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'fromDate',
        label: 'From Date',
        type: 'date',
        value: fromDate,
        onChange: setFromDate,
      },
      {
        key: 'toDate',
        label: 'To Date',
        type: 'date',
        value: toDate,
        onChange: setToDate,
      },
      {
        key: 'courseId',
        label: 'Course',
        type: 'select',
        value: courseId,
        placeholder: 'All Courses',
        options: courseOptions,
        onChange: setCourseId,
      },
      {
        key: 'pipelineRoleId',
        label: 'Pipeline',
        type: 'select',
        value: pipelineRoleId,
        placeholder: 'All Pipelines',
        options: [
          { label: 'Senders', value: 'senders' },
          { label: 'Counsellors', value: '9' },
          { label: 'Student Referral', value: 'student_referral' },
          { label: 'Associates', value: '10' },
        ],
        onChange: setPipelineRoleId,
      },
      {
        key: 'pipelineUserId',
        label: 'Pipeline User',
        type: 'select',
        value: pipelineUserId,
        placeholder: 'All Pipeline Users',
        options: pipelineUserOptions,
        onChange: setPipelineUserId,
      },
      {
        key: 'statusFilter',
        label: 'Status',
        type: 'select',
        value: statusFilter,
        placeholder: 'All Status',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [fromDate, toDate, courseId, pipelineRoleId, pipelineUserId, statusFilter, courseOptions, pipelineUserOptions],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'application_id',
        label: 'Application ID',
        sortable: true,
        render: (value) => asString(value) || '-',
      },
      {
        key: 'created_at',
        label: 'Application Date',
        sortable: true,
        render: (value) => formatDate(value),
      },
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (value, row) => (
          <button
            type="button"
            className="text-left font-medium text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('/admin/applications/view/' + asString(row._id || row.id));
            }}
          >
            {asString(value) || '-'}
          </button>
        ),
      },
      { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'phone', label: 'Phone No', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'user_email', label: 'E-mail', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'pipeline_role', label: 'Pipeline', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'pipeline_user_name', label: 'Pipeline User', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'stage',
        label: 'Stage',
        render: (_v, row) => {
          const stage = asString(row.stage) || 'lead';
          return <AdminStatusBadge status={STAGE_LABEL[stage] ?? stage} />;
        },
      },
    ],
    [onNavigate],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'View',
        onClick: (row) => onNavigate('/admin/applications/view/' + asString(row._id || row.id)),
      },
      {
        label: 'Generate Payment Link',
        onClick: (row) => openPayDialog(row),
      },
      {
        label: 'Mark Paid (Manual)',
        onClick: (row) => {
          void (async () => {
            const note = window.prompt('Reference / note (e.g. Bank ref no.)') ?? '';
            try {
              const res = await api.markApplicationPaid(session.token, asString(row.id), note);
              if ((res as { status?: number }).status === 1) toast.success('Marked as paid.');
              else toast.error('Could not mark paid.');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed.');
            }
          })();
        },
      },
      {
        label: 'Send Application Form Link',
        onClick: (row) => {
          void (async () => {
            try {
              const res = await api.generateApplicationFormLink(session.token, asString(row.id), 7);
              const m = asString((res as { message?: unknown }).message) || '';
              if ((res as { status?: number }).status === 1) {
                toast.success(m || 'Form link emailed to student.');
              } else {
                toast.error(m || 'Could not generate form link.');
              }
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed.');
            }
          })();
        },
      },
      {
        label: 'Counsellor Approve',
        onClick: (row) => {
          void (async () => {
            try {
              const res = await api.counsellorApproveApplication(session.token, asString(row.id));
              const m = asString((res as { message?: unknown }).message) || '';
              if ((res as { status?: number }).status === 1) {
                toast.success(m || 'Approved by counsellor.');
              } else {
                toast.error(m || 'Could not approve.');
              }
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to approve.');
            }
          })();
        },
      },
      {
        label: 'Admin Approve & Enrol',
        onClick: (row) => {
          void (async () => {
            try {
              const res = await api.adminApproveApplication(session.token, asString(row.id));
              const m = asString((res as { message?: unknown }).message) || '';
              if ((res as { status?: number }).status === 1) {
                toast.success(m || 'Enrolled.');
              } else {
                toast.error(m || 'Could not enrol.');
              }
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to enrol.');
            }
          })();
        },
      },
      {
        label: 'Reject',
        variant: 'destructive',
        onClick: (row) => {
          void (async () => {
            const reason = window.prompt('Reason for rejection?') ?? '';
            if (!reason.trim()) return;
            try {
              const res = await api.rejectApplication(session.token, asString(row.id), reason.trim());
              if ((res as { status?: number }).status === 1) toast.success('Rejected.');
              else toast.error('Could not reject.');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to reject.');
            }
          })();
        },
      },
    ],
    [api, session.token, onNavigate],
  );

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setCourseId('');
    setPipelineRoleId('');
    setPipelineUserId('');
    setStatusFilter('');
  };

  if (loading) {
    return <PageLoader label="Loading applications..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Applications"
        addLabel="+ Add Lead"
        onAdd={() => onNavigate('/admin/leads/add')}
      />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={handleClearFilters}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={displayedItems}
        actions={actions}
      />

      {/* Payment-link generator dialog (Naji 2026-05-05). Replaces the
          earlier window.prompt chain with a real modal. */}
      <Dialog open={payDialog.open} onOpenChange={(o) => setPayDialog((p) => ({ ...p, open: o }))}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Generate Payment Link</DialogTitle>
            <DialogDescription>
              For {payDialog.studentName}. The student will receive an email with the payment link and the plan summary.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full min-w-0 space-y-4">
            <div className="space-y-2">
              <Label>Payment mode</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${payDialog.mode === 'full' ? 'border-ttii-primary bg-ttii-primary/5 font-semibold' : 'border-slate-200'}`}
                  onClick={() => setPayDialog((p) => ({ ...p, mode: 'full' }))}
                >
                  Full Payment
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${payDialog.mode === 'installment' ? 'border-ttii-primary bg-ttii-primary/5 font-semibold' : 'border-slate-200'}`}
                  onClick={() => setPayDialog((p) => ({ ...p, mode: 'installment' }))}
                >
                  Installment Plan
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-total">Total course fee (INR)</Label>
              <Input
                id="pay-total"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 25000"
                value={payDialog.totalRupees}
                onChange={(e) => setPayDialog((p) => ({ ...p, totalRupees: e.target.value }))}
              />
            </div>

            {payDialog.mode === 'installment' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pay-reg">Registration fee due now (INR)</Label>
                  <Input
                    id="pay-reg"
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 5000"
                    value={payDialog.regRupees}
                    onChange={(e) => setPayDialog((p) => ({ ...p, regRupees: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-installments">Number of remaining installments</Label>
                  <Input
                    id="pay-installments"
                    type="number"
                    min="1"
                    max="12"
                    value={payDialog.installments}
                    onChange={(e) => setPayDialog((p) => ({ ...p, installments: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Due dates are auto-set to monthly intervals from today.
                  </p>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="pay-expires">Link expires in (days)</Label>
              <Input
                id="pay-expires"
                type="number"
                min="1"
                max="30"
                value={payDialog.expiresInDays}
                onChange={(e) => setPayDialog((p) => ({ ...p, expiresInDays: e.target.value }))}
              />
            </div>

            {payDialog.mode === 'installment' && payDialog.totalRupees && payDialog.regRupees ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-semibold">Payment link will charge ₹{Number(payDialog.regRupees || '0').toLocaleString('en-IN')} now.</p>
                <p className="mt-1 text-slate-500">
                  Remaining ₹{Math.max(0, Number(payDialog.totalRupees || '0') - Number(payDialog.regRupees || '0')).toLocaleString('en-IN')} split across {payDialog.installments || '0'} monthly installments.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog((p) => ({ ...p, open: false }))} disabled={paySubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={() => { void submitPayDialog(); }}
              disabled={paySubmitting || !payDialog.totalRupees}
            >
              {paySubmitting ? 'Generating...' : 'Generate & Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
