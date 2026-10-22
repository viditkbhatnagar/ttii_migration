import { ArrowLeft, Mail, Phone, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fmtDay, initials, inr } from '../kit/format.js';
import { StatCard } from '../kit/page-kit.js';
import {
  COLLECTION_STATUS_LABEL, COLLECTION_STATUS_STYLE, INSTALMENT_LABEL, INSTALMENT_STYLE, collectionRef, paidPct, paymentHistory,
  type CollectionDetail,
} from './wallet-model.js';

interface CollectionDetailViewProps {
  detail: CollectionDetail;
  onBack: () => void;
}

/** One student's fee plan: totals, instalment rows and the payments received (the design's payments.$id page). */
export function CollectionDetailView({ detail, onBack }: CollectionDetailViewProps) {
  const { row } = detail;
  const pct = paidPct(row.fee, row.paid);
  const history = paymentHistory(detail.instalments);
  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}><ArrowLeft className="h-4 w-4" /> All collections</Button>
      <Card className="p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base font-semibold text-primary">{initials(row.studentName)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{row.studentName || '—'}</h2>
              <Badge variant="outline" className={cn('rounded-full', COLLECTION_STATUS_STYLE[row.status])}>{COLLECTION_STATUS_LABEL[row.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{collectionRef(row)} · {row.course || '—'}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {detail.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {detail.email}</span>}
              {detail.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {detail.phone}</span>}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Fee" value={inr(row.fee)} icon={Receipt} />
          <StatCard label="Paid" value={inr(row.paid)} icon={Receipt} tone="bg-success-soft text-success" />
          <StatCard label="Pending" value={inr(row.balance)} icon={Receipt} tone="bg-warning-soft text-warning-foreground" />
          <StatCard label="Next Due" value={fmtDay(row.nextDueYmd)} icon={Receipt} />
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Fee Collected</span>
            <span className="font-medium">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Fee collected">
            <div className="h-full bg-success" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-5 py-3">
          <p className="text-sm font-semibold">Fee Structure</p>
          <p className="text-xs text-muted-foreground">Instalment-wise breakdown</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>#</TableHead><TableHead>Instalment</TableHead><TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.instalments.map((i, idx) => (
              <TableRow key={i.id || idx}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{i.label}</TableCell>
                <TableCell className="text-sm">{fmtDay(i.dueYmd)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{inr(i.amount)}</TableCell>
                <TableCell><Badge variant="outline" className={cn('rounded-full', INSTALMENT_STYLE[i.status])}>{INSTALMENT_LABEL[i.status]}</Badge></TableCell>
              </TableRow>
            ))}
            {detail.instalments.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No instalment plan has been set for this student yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="gap-0 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-5 py-3">
          <p className="text-sm font-semibold">Payment History</p>
          <p className="text-xs text-muted-foreground">Payments recorded against this fee plan</p>
        </div>
        {history.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No payments recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Date</TableHead><TableHead>Instalment</TableHead><TableHead>Mode</TableHead><TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead><span className="sr-only">Receipt</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((i, idx) => (
                <TableRow key={i.id || idx}>
                  <TableCell className="text-sm">{fmtDay(i.paidYmd)}</TableCell>
                  <TableCell>{i.label}</TableCell>
                  <TableCell>{i.mode ? <Badge variant="outline" className="rounded-full">{i.mode}</Badge> : '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.reference || '—'}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-success">{inr(i.amount)}</TableCell>
                  <TableCell>
                    {i.receiptUrl && <a href={i.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Receipt</a>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
