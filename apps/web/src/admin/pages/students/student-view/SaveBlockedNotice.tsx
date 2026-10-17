import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { asString } from '../../../shared/utils/admin-data-utils.js';

// Why Save is refused, shown directly above a dialog's Save / Cancel buttons
// (TTII 2026-10-17: the plan dialog's reason sat at the top, scrolled out of
// view, so a blocked save looked like a broken button). When the reason is an
// open payment link on the enrolment's application, it offers to cancel it.

export function SaveBlockedNotice({
  reason, linkOpen, enrolId, api, token, onLinkCancelled,
}: {
  reason: string;
  /** The block is a payment link that can still be paid. */
  linkOpen: boolean;
  /** The enrolment whose application holds the link; null hides the cancel button. */
  enrolId: string | null;
  api: AdminPortalApi;
  token: string;
  onLinkCancelled: () => void;
}) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const cancelLink = async () => {
    if (!enrolId) return;
    const ok = await confirm({
      title: 'Cancel the payment link?',
      description: 'The student will no longer be able to pay through it. Razorpay is checked first: a link that has already been paid is not cancelled, and its payment is recorded automatically.',
      confirmText: 'Cancel the link',
      cancelText: 'Keep it',
      variant: 'destructive',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await api.cancelEnrolmentPaymentLink(token, enrolId);
      const message = asString((res as { message?: unknown }).message);
      toast.success(message && message !== 'success' ? message : 'Payment link cancelled.');
      onLinkCancelled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel the payment link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex min-w-0 gap-2">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>{reason}</span>
      </p>
      {linkOpen && enrolId ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-rose-300 bg-white text-rose-800 hover:bg-rose-100"
          disabled={busy}
          onClick={() => { void cancelLink(); }}
        >
          {busy ? 'Cancelling…' : 'Cancel the payment link'}
        </Button>
      ) : null}
    </div>
  );
}
