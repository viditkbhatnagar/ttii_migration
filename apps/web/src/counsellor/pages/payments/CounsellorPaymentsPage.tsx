import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Download,
  Eye,
  ExternalLink,
  IndianRupee,
  MoreHorizontal,
  Search,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { asRecord, KpiCard } from '../../components/CounsellorWidgets.js';

type PaymentState = 'paid' | 'pending' | 'no_link';

const statusList: ('All' | PaymentState)[] = ['All', 'paid', 'pending', 'no_link'];

const STATE_LABELS: Record<PaymentState | 'All', string> = {
  All: 'All',
  paid: 'Paid',
  pending: 'Pending',
  no_link: 'No link',
};

const STATE_STYLES: Record<PaymentState, string> = {
  paid: 'bg-success-soft text-success border-transparent',
  pending: 'bg-warning-soft text-warning-foreground border-transparent',
  no_link: 'bg-muted text-muted-foreground border-transparent',
};

const dueRanges = ['Any', 'Overdue', 'Next 7 days', 'Next 30 days'] as const;
type DueRange = (typeof dueRanges)[number];

const MS_PER_DAY = 86400000;

/**
 * Age (in days) of a payment row relative to now, derived from the real
 * `createdAt` date we have (no installment/due-date data exists). Positive =
 * created in the past. Returns null when there is no usable date.
 */
function daysSinceCreated(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatRowDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface PaymentRow {
  id: string;
  applicationId: string;
  name: string;
  course: string;
  fee: number;
  state: PaymentState;
  paymentLink: string;
  paidAt: string;
  createdAt: string;
}

function toState(v: unknown): PaymentState {
  const s = asString(v);
  if (s === 'paid' || s === 'pending' || s === 'no_link') return s;
  return 'no_link';
}

export default function CounsellorPaymentsPage({ api, session, onNavigate }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCounsellorPayments(session.token),
    [api, session.token],
  );

  const summary = useMemo(() => asRecord(asRecord(data).summary), [data]);

  const rows = useMemo<PaymentRow[]>(
    () =>
      toRecords(asRecord(data).rows).map((r) => ({
        id: asString(r.id),
        applicationId: asString(r.applicationId),
        name: asString(r.name),
        course: asString(r.course),
        fee: asNumber(r.fee),
        state: toState(r.state),
        paymentLink: asString(r.paymentLink),
        paidAt: asString(r.paidAt),
        createdAt: asString(r.createdAt),
      })),
    [data],
  );

  const courses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.course).filter(Boolean))),
    [rows],
  );

  const [status, setStatus] = useState<'All' | PaymentState>('All');
  const [course, setCourse] = useState('All');
  const [due, setDue] = useState<DueRange>('Any');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (status !== 'All' && p.state !== status) return false;
      if (course !== 'All' && p.course !== course) return false;
      if (q && !`${p.name} ${p.applicationId} ${p.course}`.toLowerCase().includes(q)) {
        return false;
      }
      if (due !== 'Any') {
        // We have no due-date column; honest mapping uses the real createdAt age
        // of fees that are still unpaid (pending / no link).
        if (p.state === 'paid') return false;
        const age = daysSinceCreated(p.createdAt);
        if (age === null) return false;
        if (due === 'Overdue' && !(age > 30)) return false;
        if (due === 'Next 7 days' && !(age >= 0 && age <= 7)) return false;
        if (due === 'Next 30 days' && !(age >= 0 && age <= 30)) return false;
      }
      return true;
    });
  }, [rows, status, course, due, search]);

  const collectedAmount = asNumber(summary.collectedAmount);
  const pendingAmount = asNumber(summary.pendingAmount);
  const paidCount = asNumber(summary.paidCount);
  const pendingCount = asNumber(summary.pendingCount);
  const total = asNumber(summary.total);
  const grandTotal = collectedAmount + pendingAmount;

  if (loading) {
    return <DashboardLoader label="payments" />;
  }

  if (error) {
    return (
      <main className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Payment Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Monitor collections and pending fees across your applications.
          </p>
        </div>
        <Card className="p-10 text-center shadow-[var(--shadow-soft)]">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        </Card>
      </main>
    );
  }

  function exportCsv(): void {
    const header = ['Application ID', 'Applicant', 'Course', 'Fee', 'Status', 'Date'];
    const lines = filtered.map((p) =>
      [
        p.applicationId,
        p.name,
        p.course,
        String(p.fee),
        STATE_LABELS[p.state],
        formatRowDate(p.createdAt),
      ]
        .map((c) => `"${c.replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Payment Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Monitor collections and pending fees across your applications.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Collection"
          value={formatINR(collectedAmount)}
          icon={Wallet}
          tone="success"
          progress={grandTotal > 0 ? Math.round((collectedAmount / grandTotal) * 100) : 0}
          sub={`${paidCount.toLocaleString('en-IN')} applications paid`}
        />
        <KpiCard
          label="Pending Collection"
          value={formatINR(pendingAmount)}
          icon={IndianRupee}
          tone="warning"
          progress={grandTotal > 0 ? Math.round((pendingAmount / grandTotal) * 100) : 0}
          sub={`${pendingCount.toLocaleString('en-IN')} awaiting payment`}
        />
        <KpiCard
          label="Paid Applications"
          value={paidCount.toLocaleString('en-IN')}
          icon={CreditCard}
          tone="info"
          progress={total > 0 ? Math.round((paidCount / total) * 100) : 0}
          sub="Fees received"
        />
        <KpiCard
          label="Pending Applications"
          value={pendingCount.toLocaleString('en-IN')}
          icon={AlertTriangle}
          tone="primary"
          progress={total > 0 ? Math.round((pendingCount / total) * 100) : 0}
          sub={`${total.toLocaleString('en-IN')} in your pipeline`}
        />
      </div>

      <Card className="p-4 shadow-[var(--shadow-soft)] lg:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by applicant, application ID or course..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Select value={status} onValueChange={(v) => setStatus(v as 'All' | PaymentState)}>
              <SelectTrigger className="md:w-36" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="counsellor-theme">
                {statusList.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className="md:w-44" aria-label="Filter by course">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent className="counsellor-theme">
                <SelectItem value="All">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={due} onValueChange={(v) => setDue(v as DueRange)}>
              <SelectTrigger className="md:w-40" aria-label="Filter by due date">
                <CalendarDays className="mr-1 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Due date" />
              </SelectTrigger>
              <SelectContent className="counsellor-theme">
                {dueRanges.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="text-sm font-semibold">All Payments</p>
            <p className="text-xs text-muted-foreground">{filtered.length} records</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Applicant</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Total Fee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary-soft text-xs font-semibold text-accent-foreground">
                        {initials(p.name) || '—'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight group-hover:text-accent-foreground">
                        {p.name || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.applicationId || '—'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{p.course || '—'}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatINR(p.fee)}
                </TableCell>
                <TableCell className="text-sm">{formatRowDate(p.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('rounded-full', STATE_STYLES[p.state])}>
                    {STATE_LABELS[p.state]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="counsellor-theme">
                      <DropdownMenuItem
                        onClick={() =>
                          onNavigate(`/counsellor/applications/view/${encodeURIComponent(p.id)}`)
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!p.paymentLink}
                        onClick={() => {
                          if (p.paymentLink) {
                            window.open(p.paymentLink, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" /> Open payment link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No payments match the filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </main>
  );
}
