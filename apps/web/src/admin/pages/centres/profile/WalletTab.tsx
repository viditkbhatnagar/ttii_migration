import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Info, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '../../../shared/components/ui-kit.js';
import { nextSort, type SortDir } from '../../cohorts/list-model.js';
import { PillTab, SortHead } from '../../students/list-chrome.js';
import {
  buildLedger, filterLedger, fmtDay, inr2, ledgerTone, sortLedger, walletTotals,
  type FundRequest, type LedgerCategory, type LedgerSortKey, type WalletTxn,
} from '../centre-profile-model.js';
import { SearchBox } from '../centre-ui.js';
import { MiniStat, TAB_CARD, TabEmpty } from './profile-ui.js';

// Wallet: wallet_transactions and centre_fund_requests together. Current
// Balance is centres.wallet_balance. A running balance is shown only when the
// ledger replays to that balance; otherwise it reads "—" with a note.

export function WalletTab({ balance, transactions, fundRequests }: { balance: number; transactions: WalletTxn[]; fundRequests: FundRequest[] }) {
  const [category, setCategory] = useState<'all' | LedgerCategory>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: LedgerSortKey; dir: SortDir }>({ key: 'date', dir: 'asc' });
  const ledger = useMemo(() => buildLedger(transactions, fundRequests, balance), [transactions, fundRequests, balance]);
  const totals = useMemo(() => walletTotals(transactions), [transactions]);
  const rows = useMemo(() => sortLedger(filterLedger(ledger.rows, category, search), sort.key, sort.dir), [ledger, category, search, sort]);
  const onSort = (k: LedgerSortKey) => setSort((s) => nextSort(s, k));
  const count = (c: 'all' | LedgerCategory) => (c === 'all' ? ledger.rows.length : ledger.rows.filter((r) => r.category === c).length);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat icon={Wallet} label="Current Balance" value={inr2(balance)} />
        <MiniStat icon={ArrowUp} label="Total Credits" value={inr2(totals.credits)} />
        <MiniStat icon={ArrowDown} label="Total Debits" value={inr2(totals.debits)} />
      </div>
      <Card className={TAB_CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'Wallet Transaction', 'Fund Request'] as const).map((c) => (
              <PillTab
                key={c}
                active={category === c}
                label={c === 'all' ? 'All' : c === 'Wallet Transaction' ? 'Wallet Transactions' : 'Fund Requests'}
                count={count(c)}
                onClick={() => setCategory(c)}
              />
            ))}
          </div>
          <SearchBox value={search} onChange={setSearch} placeholder="Search wallet & fund requests…" />
        </div>
        {!ledger.reconciled && transactions.length > 0 ? (
          <p className="flex items-start gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Running balances are not shown: these transactions do not add up to the current balance (part of it was set outside the wallet ledger).
          </p>
        ) : null}
        {rows.length === 0 ? (
          <TabEmpty icon={Wallet} text="No records found." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortHead label="Ref No" k="ref" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Category" k="category" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Type" k="type" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Amount" k="amount" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                  <SortHead label="Balance" k="balance" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                  <SortHead label="Date" k="date" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Description" k="description" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{r.ref}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.category}</TableCell>
                    <TableCell><Pill tone={ledgerTone(r.type)} className="px-2 py-0.5 text-[11px]">{r.type}</Pill></TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{inr2(r.amount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{r.balance === null ? '—' : inr2(r.balance)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDay(r.date)}</TableCell>
                    <TableCell><Pill tone={ledgerTone(r.status)} className="px-2 py-0.5 text-[11px]">{r.status}</Pill></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.description || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
