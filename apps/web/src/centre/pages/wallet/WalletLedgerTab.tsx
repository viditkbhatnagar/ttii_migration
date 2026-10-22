import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fmtDay, inr } from '../kit/format.js';
import { PaginationBar, PillTabs } from '../kit/page-kit.js';
import { usePagination } from '../kit/use-pagination.js';
import { filterLedger, type LedgerFilter, type WalletLedgerView } from './wallet-model.js';

const FILTERS: ReadonlyArray<{ value: LedgerFilter; label: string }> = [
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
  { value: 'all', label: 'All' },
];

/** A note shown wherever running balances would appear but the ledger does not add up to the balance on record. */
export function ReconcileNote({ ledger }: { ledger: WalletLedgerView }) {
  if (ledger.reconciled) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Running balances are not shown: the credits and debits recorded here net to {inr(ledger.net)}, but the wallet balance on
        record is {inr(ledger.balance)}. TTII can explain the difference.
      </span>
    </p>
  );
}

export function WalletLedgerTab({ ledger }: { ledger: WalletLedgerView }) {
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const entries = useMemo(() => filterLedger(ledger.entries, filter), [ledger.entries, filter]);
  const pg = usePagination(entries, 10, filter);

  return (
    <Card className="gap-0 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <p className="mr-auto font-semibold">Wallet Ledger</p>
        <PillTabs label="Show" value={filter} onChange={setFilter} options={FILTERS} />
      </div>
      {!ledger.reconciled && <div className="border-b border-border p-4"><ReconcileNote ledger={ledger} /></div>}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Txn No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pg.current.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-xs">{t.txnNo}</TableCell>
              <TableCell className="text-xs">{fmtDay(t.ymd)}</TableCell>
              <TableCell className="max-w-96 text-sm">
                <span className="inline-flex items-center gap-2">
                  {t.type === 'debit'
                    ? <ArrowUpRight className="h-4 w-4 shrink-0 text-destructive" aria-label="Debit" />
                    : <ArrowDownLeft className="h-4 w-4 shrink-0 text-success" aria-label={t.type === 'credit' ? 'Credit' : 'Other'} />}
                  {t.description || (t.type === 'debit' ? 'Debit' : t.type === 'credit' ? 'Credit' : 'Wallet entry')}
                </span>
              </TableCell>
              <TableCell className={cn('text-right font-medium tabular-nums', t.type === 'debit' ? 'text-destructive' : t.type === 'credit' ? 'text-success' : 'text-muted-foreground')}>
                {t.type === 'debit' ? '−' : t.type === 'credit' ? '+' : ''}{inr(t.amount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{t.balance === null ? '—' : inr(t.balance)}</TableCell>
            </TableRow>
          ))}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                {ledger.entries.length === 0 ? 'No wallet transactions yet.' : 'No ledger entries for this filter.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PaginationBar page={pg.page} totalPages={pg.totalPages} showing={pg.current.length} total={pg.total} onPage={pg.setPage} unit="entries" />
    </Card>
  );
}
