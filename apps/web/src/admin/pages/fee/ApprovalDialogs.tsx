import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dmy } from '../cohorts/list-model.js';
import { DetailGrid } from './fee-ui.js';
import { approvalAmount, istDateTime, type ApprovalRow } from './payment-model.js';

// Payment Approval dialogs in Naji's design. The details dialog is read-only;
// its Approve / Reject buttons hand back to the page's existing handlers
// (Approve still asks for confirmation). The reject dialog replaces the old
// window.prompt: the reason stays OPTIONAL and is sent exactly as typed, and
// Cancel still means "don't reject".

const DIALOG_STYLE = { width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' };
const DIALOG_CLASS = 'flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0';

export function ApprovalDetailsDialog({
  row, busy, onClose, onApprove, onReject,
}: { row: ApprovalRow | null; busy: boolean; onClose: () => void; onApprove: (r: ApprovalRow) => void; onReject: (r: ApprovalRow) => void }) {
  return (
    <Dialog open={row !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={DIALOG_STYLE} className={DIALOG_CLASS}>
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>{[row?.name, row?.course].filter(Boolean).join(' · ')}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {row ? (
            <>
              <DetailGrid
                items={[
                  ['Application ID', row.applicationCode],
                  ['Email', row.email],
                  ['Instalment', row.instalment],
                  ['Amount', approvalAmount(row.amount)],
                  ['Date of Payment', dmy(row.paidYmd)],
                  ['Mode', row.mode],
                  ['Reference', row.reference],
                  ['Recorded', istDateTime(row.markedAt)],
                ]}
              />
              {row.note ? (
                <div className="rounded-lg border border-border p-2.5 text-sm">
                  <p className="text-[11px] text-muted-foreground">Note</p>
                  <p className="whitespace-pre-wrap break-words">{row.note}</p>
                </div>
              ) : null}
              {row.receiptUrl ? (
                <a href={row.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Open receipt <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : <p className="text-sm text-muted-foreground">No receipt attached.</p>}
            </>
          ) : null}
        </div>
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" className="text-destructive" disabled={busy} onClick={() => { if (row) { onClose(); onReject(row); } }}>Reject</Button>
          <Button disabled={busy} onClick={() => { if (row) { onClose(); onApprove(row); } }}>Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectPaymentDialog({
  row, busy, onCancel, onConfirm,
}: { row: ApprovalRow | null; busy: boolean; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (row) setReason(''); }, [row]);

  return (
    <Dialog open={row !== null} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent style={DIALOG_STYLE} className={DIALOG_CLASS}>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); onConfirm(reason); }}>
          <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
            <DialogTitle>Reject payment for {row?.name || 'this student'}?</DialogTitle>
            <DialogDescription>
              {[approvalAmount(row?.amount ?? null), row?.instalment, row?.reference].filter((s) => s && s !== '—').join(' · ')}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-6 pb-4">
            <Label htmlFor="reject-reason" className="text-xs">Reason (optional)</Label>
            <Input
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Reference not found in bank statement"
              autoFocus
            />
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={busy}>{busy ? 'Rejecting…' : 'Reject Payment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
