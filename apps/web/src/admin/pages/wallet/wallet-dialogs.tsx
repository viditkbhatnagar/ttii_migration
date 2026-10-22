import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pill } from '../../shared/components/ui-kit.js';
import { rupees } from '../centres/centre-list-model.js';
import { dash, date } from './wallet-columns.js';
import { requestNo, statusTone, topUpStatus, type TopUpRow } from './wallet-payment-model.js';

// Top-up request actions: Approve / Reject on pending rows (claim-first
// endpoints; the confirmation is FundDecisionDialog) and the request detail
// dialog — the requester, description and attachment the old Centre Payments
// table showed as columns.

const status = (s: string) => <Pill tone={statusTone(s)}>{s || '—'}</Pill>;

export function TopUpActions({ row, busy, onDecide }: {
  row: TopUpRow; busy: boolean; onDecide: (row: TopUpRow, action: 'approve' | 'reject') => void;
}) {
  if (row.status !== 'pending') return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button size="sm" variant="outline" disabled={busy} className="h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => onDecide(row, 'approve')}>
        Approve
      </Button>
      <Button size="sm" variant="outline" disabled={busy} className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onDecide(row, 'reject')}>
        Reject
      </Button>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 py-2 last:border-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] break-words text-right text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function TopUpDetailsDialog({ row, busy, onClose, onDecide }: {
  row: TopUpRow | null; busy: boolean; onClose: () => void; onDecide: (row: TopUpRow, action: 'approve' | 'reject') => void;
}) {
  return (
    <Dialog open={row !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top-up Request {row ? requestNo(row.id) : ''}</DialogTitle>
          <DialogDescription>{row ? `${dash(row.centre)} · ${rupees(row.amount)}` : ''}</DialogDescription>
        </DialogHeader>
        {row ? (
          <dl>
            <Detail label="Centre">{dash(row.centre)}</Detail>
            <Detail label="Requested by">{dash(row.user)}</Detail>
            <Detail label="Amount">{rupees(row.amount)}</Detail>
            <Detail label="Txn / Ref No"><span className="font-mono text-xs">{dash(row.receipt)}</span></Detail>
            <Detail label="Requested On">{date(row.ymd)}</Detail>
            <Detail label="Status">{status(topUpStatus(row))}</Detail>
            <Detail label="Description">{dash(row.description)}</Detail>
            <Detail label="Attachment">
              {row.attachment ? (
                <a href={row.attachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Paperclip aria-hidden="true" className="size-3.5" /> View attachment
                </a>
              ) : '—'}
            </Detail>
          </dl>
        ) : null}
        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          {row?.status === 'pending' ? (
            <>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => onDecide(row, 'reject')}>Reject</Button>
              <Button type="button" disabled={busy} onClick={() => onDecide(row, 'approve')}>Approve</Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

