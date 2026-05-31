import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { useConfirm } from '@/components/confirm-dialog';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import type { AdminPageProps } from '../../routing/admin-routes.js';

// Finance approval queue for manual (Mark Paid) payments. Razorpay payments
// never appear here — they reflect automatically via the webhook. Approving
// flips the application to paid + notifies the student; rejecting sends it
// back. Naji UAT 2026-05-31.
export default function PaymentApprovalPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.listPaymentApprovals(session.token),
    [api, session.token],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  const handleApprove = useCallback(async (row: Record<string, unknown>) => {
    const ok = await confirm({
      title: `Approve payment for ${asString(row.name) || 'this student'}?`,
      description: 'This confirms the manual payment and reflects it to the student (marks the application paid + sends confirmation).',
      confirmText: 'Approve',
    });
    if (!ok) return;
    try {
      const res = await api.approvePayment(session.token, asString(row.id));
      const m = asString((res as { message?: unknown }).message);
      if ((res as { status?: number }).status === 1) { toast.success(m || 'Payment approved'); reload(); }
      else toast.error(m || 'Could not approve.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve.');
    }
  }, [api, session.token, confirm, reload]);

  const handleReject = useCallback(async (row: Record<string, unknown>) => {
    const reason = window.prompt(`Reject payment for ${asString(row.name) || 'this student'}? Optional reason:`);
    // prompt returns null on Cancel — treat that as "don't reject".
    if (reason === null) return;
    try {
      const res = await api.rejectPayment(session.token, asString(row.id), reason);
      const m = asString((res as { message?: unknown }).message);
      if ((res as { status?: number }).status === 1) { toast.success(m || 'Payment rejected'); reload(); }
      else toast.error(m || 'Could not reject.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject.');
    }
  }, [api, session.token, reload]);

  const columns: DataTableColumn[] = [
    { key: 'name', label: 'Student', sortable: true, render: (v) => asString(v) || '—' },
    { key: 'email', label: 'Email', render: (v) => asString(v) || '—' },
    { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '—' },
    { key: 'amount', label: 'Amount', sortable: true, render: (v) => (v == null ? '—' : `₹${asNumber(v).toLocaleString('en-IN')}`) },
    { key: 'mode', label: 'Mode', render: (v) => asString(v) || '—' },
    { key: 'reference', label: 'Reference', render: (v) => asString(v) || '—' },
    {
      key: 'receipt_url',
      label: 'Receipt',
      render: (v) => {
        const url = asString(v);
        if (!url) return <span className="text-slate-400">—</span>;
        return (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#8F2774] hover:underline">
            View <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        );
      },
    },
    { key: 'marked_at', label: 'Recorded', sortable: true, render: (v) => (asString(v) ? formatDate(v) : '—') },
  ];

  const actions: DataTableAction[] = [
    { label: 'Approve', onClick: (row) => void handleApprove(row) },
    { label: 'Reject', onClick: (row) => void handleReject(row), variant: 'destructive' },
  ];

  if (loading) return <PageLoader label="Loading payment approvals..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <ShieldCheck aria-hidden="true" className="size-5 text-[#8F2774]" />
          Payment Approval
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review manual payments before they reflect to students. Razorpay payments are approved automatically.
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700" role="alert">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No payments awaiting approval.
        </div>
      ) : (
        <AdminDataTable columns={columns} rows={rows} actions={actions} searchable />
      )}
    </div>
  );
}
