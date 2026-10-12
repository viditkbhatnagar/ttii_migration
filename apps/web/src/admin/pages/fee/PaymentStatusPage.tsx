import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle, Pill, type Tone } from '../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import { dmy, pageSlice } from '../cohorts/list-model.js';
import { FEE_PAGE_SIZE, inr2, rowNo, type SortDir } from './fee-model.js';
import {
  ENROLMENT_STATUS_OPTIONS, PAYMENT_TABS, filterPayments, paymentColumns, paymentCsvRows, paymentRowAction,
  sortPayments, toPaymentRows,
  type PaymentBucket, type PaymentColumn, type PaymentRow, type PaymentSortKey, type PaymentTab,
} from './payment-model.js';
import { PaymentActionDialog, type PaymentAction } from './PaymentActionDialog.js';
import { SummaryCard } from './fee-ui.js';

// Fee Information → Payment Status, rebuilt after Naji's PaymentStatusModule
// (TTII 2026-10-12). LAYOUT ONLY. Same endpoint and server-side filters
// (course, name / student ID search, payment status, due-date range), same
// server buckets and card totals, same per-tab columns and row actions
// (Mark Paid; Remind on All; View Application for application-plan rows),
// same Mark-Paid / Reminder calls. Opens on Overdue (Naji UAT 2026-05-14).

const BUCKETS: Array<{ id: PaymentBucket; label: string; tone: Tone }> = [
  { id: 'overdue', label: 'Overdue', tone: 'rose' },
  { id: 'due', label: 'Due', tone: 'amber' },
  { id: 'upcoming', label: 'Upcoming', tone: 'blue' },
  { id: 'paid', label: 'Paid', tone: 'emerald' },
];
const STATUS_TONE: Record<string, Tone> = { overdue: 'rose', due: 'amber', upcoming: 'blue', paid: 'emerald' };
const ENROLMENT_TONE: Record<string, Tone> = {
  Active: 'emerald', 'On Hold': 'amber', Completed: 'blue', Graduated: 'blue', Dropout: 'rose', Application: 'primary',
};
const COLUMN_LABEL: Record<PaymentColumn, string> = {
  enrolmentStatus: 'Enrolment Status', studentId: 'Student ID', name: 'Name', course: 'Course', details: 'Installment Details',
  amount: 'Amount', dueDate: 'Due Date', paidDate: 'Paid Date', mode: 'Mode', status: 'Payment Status', to: 'To', action: 'Action',
};
const SEARCH_DEBOUNCE_MS = 300;
const thisYear = new Date().getFullYear();

export default function PaymentStatusPage({ api, session, onNavigate }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [enrolmentStatusFilter, setEnrolmentStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchText, setSearchText] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<PaymentTab>('overdue');
  const [sortKey, setSortKey] = useState<PaymentSortKey>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<Array<{ value: string; label: string }>>([]);
  const [action, setAction] = useState<PaymentAction | null>(null);

  useEffect(() => {
    api.loadCourses(session.token)
      .then((list) => setCourses(list.map((c) => ({ label: asString(c.title), value: asString(c.id) }))))
      .catch(() => { /* the Course filter falls back to an empty list */ });
  }, [api, session.token]);

  // The name search is server-side (as before); debounce it so each keystroke
  // does not refetch.
  useEffect(() => {
    const t = setTimeout(() => { setSearchText(searchInput.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadPaymentStatus(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(searchText ? { search: searchText } : {}),
      ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
      ...(dueDateFrom ? { dueDateFrom } : {}),
      ...(dueDateTo ? { dueDateTo } : {}),
    }),
    [courseFilter, searchText, paymentStatusFilter, dueDateFrom, dueDateTo],
  );

  const counts = data?.counts ?? {};
  const rows = useMemo(() => toPaymentRows(data?.installments ?? []), [data]);
  const filtered = useMemo(
    () => sortPayments(filterPayments(rows, activeTab, enrolmentStatusFilter), sortKey, sortDir),
    [rows, activeTab, enrolmentStatusFilter, sortKey, sortDir],
  );
  const { current, pages, page: shownPage } = pageSlice(filtered, page, FEE_PAGE_SIZE);
  useEffect(() => { if (page !== shownPage) setPage(shownPage); }, [page, shownPage]);
  const columns = paymentColumns(activeTab);

  const withPageReset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };
  const reset = () => {
    setCourseFilter(''); setSearchInput(''); setSearchText(''); setPaymentStatusFilter('');
    setEnrolmentStatusFilter(''); setDueDateFrom(''); setDueDateTo(''); setPage(1);
  };
  const onSort = (k: PaymentSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const tabCount = (tab: PaymentTab) => (tab === 'all' ? rows.length : asNumber(counts[tab]));

  if (loading && !data) return <PageLoader label="Loading payment status..." />;
  if (error && !data) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const cell = (col: PaymentColumn, r: PaymentRow) => {
    switch (col) {
      case 'enrolmentStatus':
        return r.enrolmentStatus ? <Pill tone={ENROLMENT_TONE[r.enrolmentStatus] ?? 'slate'}>{r.enrolmentStatus}</Pill> : <span className="text-muted-foreground">—</span>;
      case 'studentId': return <span className="whitespace-nowrap font-mono text-xs text-primary">{r.studentId || '-'}</span>;
      case 'name': return <span className="text-sm font-medium">{r.name || '-'}</span>;
      case 'course': return <span className="text-sm">{r.course || '-'}</span>;
      case 'details': return <span className="text-sm">{r.details}</span>;
      case 'amount': return <span className="whitespace-nowrap text-sm tabular-nums">{inr2(r.amount)}</span>;
      case 'dueDate': return <span className="whitespace-nowrap text-sm">{dmy(r.dueYmd)}</span>;
      case 'paidDate': return <span className="whitespace-nowrap text-sm">{dmy(r.paidYmd) || '-'}</span>;
      case 'mode': return <span className="text-sm">{r.mode || '-'}</span>;
      case 'to': return <span className="text-sm">{r.to || '-'}</span>;
      case 'status': return <Pill tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status}</Pill>;
      case 'action': return <RowAction row={r} tab={activeTab} busy={loading} onAction={setAction} onNavigate={onNavigate} />;
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Payment Status"
        subtitle={`${filtered.length} of ${rows.length} payments`}
        actions={(
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={filtered.length === 0}
            onClick={() => downloadCsv('payment_status.csv', toCsv(paymentCsvRows(filtered)))}
          >
            <Download aria-hidden="true" className="size-4" /> Export
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BUCKETS.map((b) => {
          const n = asNumber(counts[b.id]);
          return (
            <SummaryCard
              key={b.id}
              label={b.label}
              value={inr2(counts[`${b.id}_amount`])}
              caption={`${n} payment${n === 1 ? '' : 's'}`}
              tone={b.tone}
              active={activeTab === b.id}
              onClick={() => withPageReset(setActiveTab)(b.id)}
            />
          );
        })}
      </div>

      <div role="group" aria-label="Payment status" className="flex flex-wrap gap-2">
        {PAYMENT_TABS.map((t) => (
          <PillTab key={t.id} active={activeTab === t.id} label={t.label} count={tabCount(t.id)} onClick={() => withPageReset(setActiveTab)(t.id)} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_150px_150px_200px]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search payments" placeholder="Search by name or student ID…" className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <DmyDateInput value={dueDateFrom} onChange={withPageReset(setDueDateFrom)} placeholder="Due from dd/mm/yyyy" minYear={thisYear - 6} maxYear={thisYear + 3} />
          <DmyDateInput value={dueDateTo} onChange={withPageReset(setDueDateTo)} placeholder="Due to dd/mm/yyyy" minYear={thisYear - 6} maxYear={thisYear + 3} />
          <FilterSelect label="Course" value={courseFilter} onChange={withPageReset(setCourseFilter)} allLabel="All Courses" options={courses} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[200px_200px_1fr]">
          <FilterSelect
            label="Payment Status"
            value={paymentStatusFilter}
            onChange={withPageReset(setPaymentStatusFilter)}
            allLabel="All Payment Status"
            options={BUCKETS.map((b) => ({ value: b.id, label: b.label }))}
          />
          <FilterSelect
            label="Enrolment Status"
            value={enrolmentStatusFilter}
            onChange={withPageReset(setEnrolmentStatusFilter)}
            allLabel="All Enrolments"
            options={ENROLMENT_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
          </div>
        </div>
      </Card>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={rows.length === 0 ? 'No payments found.' : 'No payments match your filters.'}
            action={<Button variant="outline" size="sm" onClick={reset}>Reset filters</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table aria-busy={loading}>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  {columns.map((c) => (c === 'action'
                    ? <TableHead key={c} className="text-right text-xs">{COLUMN_LABEL[c]}</TableHead>
                    : <SortHead key={c} label={COLUMN_LABEL[c]} k={c} sortKey={sortKey} dir={sortDir} onSort={onSort} />))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{rowNo(shownPage, FEE_PAGE_SIZE, i)}</TableCell>
                    {columns.map((c) => <TableCell key={c} className={c === 'action' ? 'text-right' : undefined}>{cell(c, r)}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={shownPage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>

      <PaymentActionDialog action={action} api={api} token={session.token} onClose={() => setAction(null)} onDone={reload} />
    </div>
  );
}

/** busy: a refetch is running — Mark Paid / Remind wait for fresh rows. */
function RowAction({
  row, tab, busy, onAction, onNavigate,
}: { row: PaymentRow; tab: PaymentTab; busy: boolean; onAction: (a: PaymentAction) => void; onNavigate: (path: string) => void }) {
  const kind = paymentRowAction(row, tab);
  if (kind === 'none') return null;
  if (kind === 'view_application') {
    return <Button variant="outline" size="sm" onClick={() => onNavigate(`/admin/applications/view/${row.applicationId ?? ''}`)}>View Application</Button>;
  }
  return (
    <div className="inline-flex gap-1">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction({ type: 'mark_paid', row })}>Mark Paid</Button>
      {kind === 'mark_paid_and_remind' ? (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => onAction({ type: 'reminder', row })}>Remind</Button>
      ) : null}
    </div>
  );
}
