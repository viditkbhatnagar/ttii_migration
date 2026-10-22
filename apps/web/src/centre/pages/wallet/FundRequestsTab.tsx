import { Paperclip, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fmtDay, inr } from '../kit/format.js';
import { PaginationBar } from '../kit/page-kit.js';
import { usePagination } from '../kit/use-pagination.js';
import { FUND_STATUS_STYLE, fundStatusLabel, type FundRequestRow } from './wallet-model.js';

interface FundRequestsTabProps {
  requests: FundRequestRow[];
  onNew: () => void;
}

export function FundRequestsTab({ requests, onNew }: FundRequestsTabProps) {
  const pg = usePagination(requests, 10);
  return (
    <Card className="gap-0 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="font-semibold">Fund Requests</p>
        <Button size="sm" className="gap-1.5" onClick={onNew}><Plus className="h-4 w-4" />New Request</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Request No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Proof</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pg.current.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.reqNo}</TableCell>
              <TableCell className="text-xs">{fmtDay(r.ymd)}</TableCell>
              <TableCell className="font-mono text-xs">{r.reference || '—'}</TableCell>
              <TableCell className="max-w-64 text-xs text-muted-foreground">{r.description || '—'}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{inr(r.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('rounded-full', FUND_STATUS_STYLE[r.status] ?? FUND_STATUS_STYLE.pending)}>
                  {fundStatusLabel(r.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {r.attachment ? (
                  <a href={r.attachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Paperclip className="h-3 w-3" /> View
                  </a>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No fund requests yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PaginationBar page={pg.page} totalPages={pg.totalPages} showing={pg.current.length} total={pg.total} onPage={pg.setPage} unit="requests" />
    </Card>
  );
}
