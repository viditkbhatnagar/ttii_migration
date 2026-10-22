import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '../../shared/components/ui-kit.js';
import { dmy, type SortDir } from '../cohorts/list-model.js';
import { SortHead } from '../students/list-chrome.js';
import { rupees } from './centre-list-model.js';
import {
  titleCase,
  type FundRequestRow,
  type WalletSortKey,
  type WalletTxnRow,
} from './centre-payments-model.js';

// The top-up approve / reject confirmation (Wallet & Payment → Top-up
// Requests, ex Centre Payments) and the wallet-transaction ledger table, kept
// for the centre profile's Wallet tab now that the global ledger page is gone.

export interface FundDecision {
  row: FundRequestRow;
  action: 'approve' | 'reject';
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

/** Approve / reject confirmation for a top-up (fund) request; the confirm button is locked while the request runs. */
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
            <DialogTitle>{approve ? 'Approve Top-up Request' : 'Reject Top-up Request'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {decision?.action} the top-up request
              {decision ? ` of ${amountLabel}` : ''}
              {decision ? ` from ${decision.row.centre}` : ''}?
              {approve ? ' The amount is credited to the centre wallet.' : ''} This action cannot be undone.
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
