import { useEffect, useMemo, useState } from 'react';
import { Search, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { ExportButtons } from '../cohorts/list-ui.js';
import { ListPager, SortHead } from '../students/list-chrome.js';
import {
  EMPTY_WALLET_FILTERS,
  filterWallets,
  rupees,
  sortWallets,
  toWalletRows,
  walletCsvRows,
  type WalletFilters,
  type WalletSortKey,
} from '../centres/centre-list-model.js';

// Wallet Status (TTII 2026-10-12), rebuilt after Naji's WalletStatusModule:
// Centre ID / Centre Name filter card, export + search toolbar, sortable paged
// table. Read-only, as before. Filters run on the loaded rows: the API's
// centre_id filter compares the code to the Int primary key and 500s.

const PAGE_SIZE = 8;
const FIELD_LABEL = 'text-[11px] font-medium text-muted-foreground';

export default function WalletStatusPage({ api, session }: AdminPageProps) {
  const [filters, setFilters] = useState<WalletFilters>(EMPTY_WALLET_FILTERS);
  const [sort, setSort] = useState<{ key: WalletSortKey; dir: SortDir }>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toWalletRows(await api.loadAdminWalletStatus(session.token)),
    [],
    'admin:wallet:status',
  );
  const rows = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => sortWallets(filterWallets(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const total = useMemo(() => filtered.reduce((sum, w) => sum + w.balance, 0), [filtered]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const set = (patch: Partial<WalletFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_WALLET_FILTERS); setPage(1); };
  const onSort = (k: WalletSortKey) => setSort((s) => nextSort(s, k));

  if (loading) return <PageLoader label="Loading wallet status..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Wallet Status"
        subtitle={`Centre wallet balances and transaction counts · ${filtered.length} centres · ${rupees(total)} held`}
      />

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className={FIELD_LABEL}>Centre ID</span>
            <Input placeholder="Search by centre ID" value={filters.code} onChange={(e) => set({ code: e.target.value })} className="mt-1" />
          </label>
          <label className="block">
            <span className={FIELD_LABEL}>Centre Name</span>
            <Input placeholder="Search by centre name" value={filters.name} onChange={(e) => set({ name: e.target.value })} className="mt-1" />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="ghost" onClick={reset}>Clear</Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <ExportButtons onCsv={() => downloadCsv('wallet-status.csv', toCsv(walletCsvRows(filtered)))} disabled={filtered.length === 0} />
          <div className="relative w-full md:w-64">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search wallets" placeholder="Search…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
        </div>

        {current.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={rows.length === 0 ? 'No centre wallets yet.' : 'No wallets match your filters.'}
            action={rows.length === 0 ? undefined : <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Centre ID" k="code" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Centre Name" k="name" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Wallet Balance" k="balance" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="Transactions" k="transactions" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((w, i) => (
                <TableRow key={w.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{w.code || '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{w.name || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{rupees(w.balance)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{w.transactions}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{w.phone || '—'}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground" title={w.email || undefined}>{w.email || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <ListPager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>
    </div>
  );
}
