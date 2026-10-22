import { ArrowDownLeft, ArrowUpRight, Clock, IndianRupee, Wallet, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { inr } from '../kit/format.js';
import { StatCard } from '../kit/page-kit.js';
import type { CollectionTotals, WalletLedgerView } from './wallet-model.js';

interface WalletOverviewTabProps {
  ledger: WalletLedgerView;
  totals: CollectionTotals;
}

/** Overview: the wallet's balance and movements, and what students have paid. All real, none estimated. */
export function WalletOverviewTab({ ledger, totals }: WalletOverviewTabProps) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="wallet-heading" className="space-y-3">
        <h2 id="wallet-heading" className="text-sm font-semibold">Centre wallet</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Wallet Balance" value={inr(ledger.balance)} icon={Wallet} />
          <StatCard label="Total Credits" value={inr(ledger.totalCredits)} icon={ArrowDownLeft} tone="bg-success-soft text-success" />
          <StatCard label="Total Debits" value={inr(ledger.totalDebits)} icon={ArrowUpRight} tone="bg-destructive/10 text-destructive" />
          <StatCard
            label="Pending Top-ups"
            value={inr(ledger.pendingTopUps.amount)}
            icon={Clock}
            tone="bg-warning-soft text-warning-foreground"
            sub={`${ledger.pendingTopUps.count} awaiting TTII`}
          />
        </div>
      </section>
      <section aria-labelledby="collections-heading" className="space-y-3">
        <h2 id="collections-heading" className="text-sm font-semibold">Student fee collections</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Fee" value={inr(totals.fee)} icon={TrendingUp} />
          <StatCard label="Received" value={inr(totals.received)} icon={IndianRupee} tone="bg-success-soft text-success" />
          <StatCard label="Pending" value={inr(totals.pending)} icon={Clock} tone="bg-warning-soft text-warning-foreground" />
          <StatCard
            label="Overdue"
            value={inr(totals.overdue)}
            icon={AlertTriangle}
            tone="bg-destructive/10 text-destructive"
            sub={`${totals.overdueRows} student${totals.overdueRows === 1 ? '' : 's'}`}
          />
        </div>
      </section>
      <Card className="p-4 text-xs text-muted-foreground shadow-[var(--shadow-soft)]">
        Fee figures come from your students&apos; fee plans and recorded payments. Wallet figures come from approved top-ups and
        the debits TTII has recorded against your centre.
      </Card>
    </div>
  );
}
