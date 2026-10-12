import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '../../shared/components/ui-kit.js';
import { dmy, type SortDir } from '../cohorts/list-model.js';
import { SortHead } from '../students/list-chrome.js';
import { rupees } from './centre-list-model.js';
import {
  FUND_STATUS_TONE,
  titleCase,
  type FundRequestRow,
  type FundSortKey,
  type WalletSortKey,
  type WalletTxnRow,
} from './centre-payments-model.js';

// The two tables and the approve / reject confirmation of Centre Payments.

export interface FundDecision {
  row: FundRequestRow;
  action: 'approve' | 'reject';
}

export function FundRequestTable({
  rows, offset, sort, onSort, busy, onDecide,
}: {
  rows: FundRequestRow[];
  offset: number;
  sort: { key: FundSortKey; dir: SortDir };
  onSort: (k: FundSortKey) => void;
  busy: boolean;
  onDecide: (row: FundRequestRow, action: FundDecision['action']) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="w-10 text-xs">#</TableHead>
          <SortHead label="Centre" k="centre" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <SortHead label="User" k="user" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <SortHead label="Transaction No" k="txnNo" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <SortHead label="Amount" k="amount" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
          <SortHead label="Date" k="date" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <TableHead className="text-xs">Attachment</TableHead>
          <TableHead className="text-xs">Description</TableHead>
          <TableHead className="text-right text-xs print:hidden">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.id} className="hover:bg-muted/30">
            <TableCell className="text-xs text-muted-foreground">{offset + i + 1}</TableCell>
            <TableCell className="text-sm">{r.centre || '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{r.user || '—'}</TableCell>
            <TableCell className="font-mono text-xs">{r.txnNo}</TableCell>
            <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{rupees(r.amount)}</TableCell>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dmy(r.ymd) || '—'}</TableCell>
            <TableCell><Pill tone={FUND_STATUS_TONE[r.status] ?? 'slate'}>{titleCase(r.status) || '—'}</Pill></TableCell>
            <TableCell>
              {r.attachment ? (
                <a href={r.attachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Download aria-hidden="true" className="size-3" /> View
                </a>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground" title={r.description}>{r.description || '—'}</TableCell>
            <TableCell className="text-right print:hidden">
              {r.status === 'pending' ? (
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    className="h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => onDecide(r, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => onDecide(r, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function WalletTxnTable({
  rows, offset, sort, onSort,
}: {
  rows: WalletTxnRow[];
  offset: number;
  sort: { key: WalletSortKey; dir: SortDir };
  onSort: (k: WalletSortKey) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="w-10 text-xs">#</TableHead>
          <SortHead label="Centre" k="centre" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <SortHead label="Transaction No" k="txnNo" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <SortHead label="Type" k="type" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <SortHead label="Amount" k="amount" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
          <SortHead label="Date" k="date" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
          <TableHead className="text-xs">Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => {
          const credit = r.type === 'credit';
          const debit = r.type === 'debit';
          return (
            <TableRow key={r.id} className="hover:bg-muted/30">
              <TableCell className="text-xs text-muted-foreground">{offset + i + 1}</TableCell>
              <TableCell className="text-sm">{r.centre || '—'}</TableCell>
              <TableCell className="font-mono text-xs">#{r.id}</TableCell>
              <TableCell><Pill tone={credit ? 'emerald' : debit ? 'rose' : 'slate'}>{titleCase(r.type) || '—'}</Pill></TableCell>
              <TableCell className={`whitespace-nowrap text-right text-sm tabular-nums ${credit ? 'text-emerald-700' : debit ? 'text-destructive' : ''}`}>
                {credit ? '+' : debit ? '-' : ''}{rupees(r.amount)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dmy(r.ymd) || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.remarks || '—'}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** The old page's confirmation, word for word; the confirm button is locked while the request runs. */
export function FundDecisionDialog({
  decision, processing, amountLabel, onCancel, onConfirm,
}: {
  decision: FundDecision | null;
  processing: boolean;
  amountLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const approve = decision?.action === 'approve';
  return (
    <Dialog open={decision !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <form onSubmit={(e) => { e.preventDefault(); onConfirm(); }}>
          <DialogHeader>
            <DialogTitle>{approve ? 'Approve Fund Request' : 'Reject Fund Request'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {decision?.action} the fund request
              {decision ? ` of ${amountLabel}` : ''}
              {decision ? ` from ${decision.row.centre}` : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>Cancel</Button>
            <Button type="submit" variant={approve ? 'default' : 'destructive'} disabled={processing}>
              {processing ? 'Processing...' : approve ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
