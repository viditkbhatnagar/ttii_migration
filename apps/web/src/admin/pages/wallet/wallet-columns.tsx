import { Paperclip } from 'lucide-react';
import { Pill } from '../../shared/components/ui-kit.js';
import { dayMonthYear } from '../cohorts/list-model.js';
import { rupees } from '../centres/centre-list-model.js';
import type { LedgerColumn } from './ledger-table.js';
import {
  requestNo, statusTone, topUpStatus,
  type AffiliationFeeRow, type AppPaymentRow, type CentreWalletRow, type LedgerSpec, type TopUpRow,
} from './wallet-payment-model.js';

// Column and filter set-up of the four Wallet & Payment tabs.

export const dash = (v: string): string => v || '—';
export const date = (ymd: string): string => dayMonthYear(ymd) || '—';
const status = (s: string) => <Pill tone={statusTone(s)}>{s || '—'}</Pill>;

// ─── Top-up Requests ────────────────────────────────────────────────────────

export const TOPUP_SPEC: LedgerSpec<TopUpRow> = {
  statusOf: topUpStatus,
  searchFields: (r) => [requestNo(r.id), r.centre, r.receipt, r.user, r.description, r.amount],
  filters: [{ key: 'centre', label: 'Centres', valueOf: (r) => r.centre }],
};

export function topUpColumns(onOpen: (row: TopUpRow) => void): Array<LedgerColumn<TopUpRow>> {
  return [
    {
      key: 'ref',
      label: 'Request No',
      sortValue: (r) => Number(r.id) || 0,
      render: (r) => (
        <button
          type="button"
          onClick={() => onOpen(r)}
          className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          title="View request details"
        >
          {requestNo(r.id)}
          {r.attachment ? <Paperclip aria-label="Has attachment" className="size-3" /> : null}
        </button>
      ),
    },
    { key: 'centre', label: 'Centre', sortValue: (r) => r.centre, render: (r) => dash(r.centre) },
    { key: 'amount', label: 'Amount', align: 'right', sortValue: (r) => r.amount, render: (r) => rupees(r.amount) },
    { key: 'txn', label: 'Txn / Ref No', sortValue: (r) => r.receipt, render: (r) => <span className="font-mono text-xs">{dash(r.receipt)}</span> },
    { key: 'date', label: 'Requested On', sortValue: (r) => `${r.ymd}#${r.id.padStart(10, '0')}`, render: (r) => date(r.ymd) },
    { key: 'status', label: 'Status', sortValue: topUpStatus, render: (r) => status(topUpStatus(r)) },
  ];
}

// ─── Centre Wallets ─────────────────────────────────────────────────────────

export const WALLET_SPEC: LedgerSpec<CentreWalletRow> = {
  statusOf: (r) => r.status,
  searchFields: (r) => [r.code, r.name, r.phone, r.email, r.balance, r.status],
  filters: [{ key: 'centre', label: 'Centres', valueOf: (r) => r.name }],
};

export const WALLET_COLUMNS: Array<LedgerColumn<CentreWalletRow>> = [
  { key: 'code', label: 'Centre ID', sortValue: (r) => r.code, render: (r) => <span className="font-mono text-xs">{dash(r.code)}</span> },
  { key: 'name', label: 'Centre Name', sortValue: (r) => r.name, render: (r) => <span className="font-medium">{dash(r.name)}</span> },
  { key: 'balance', label: 'Wallet Balance', align: 'right', sortValue: (r) => r.balance, render: (r) => rupees(r.balance) },
  { key: 'transactions', label: 'Transactions', align: 'right', sortValue: (r) => r.transactions, render: (r) => r.transactions },
  { key: 'phone', label: 'Phone', sortValue: (r) => r.phone, render: (r) => <span className="text-muted-foreground">{dash(r.phone)}</span> },
  {
    key: 'email', label: 'Email', sortValue: (r) => r.email, cellClassName: 'max-w-[240px] truncate',
    render: (r) => <span className="text-muted-foreground" title={r.email || undefined}>{dash(r.email)}</span>,
  },
  { key: 'status', label: 'Status', sortValue: (r) => r.status, render: (r) => status(r.status) },
];

// ─── Application Payments ───────────────────────────────────────────────────

export const APP_PAYMENT_SPEC: LedgerSpec<AppPaymentRow> = {
  statusOf: (r) => r.status,
  searchFields: (r) => [r.applicationId, r.student, r.studentCode, r.centre, r.course, r.status],
  filters: [
    { key: 'centre', label: 'Centres', valueOf: (r) => r.centre },
    { key: 'course', label: 'Courses', valueOf: (r) => r.course },
  ],
};

export const APP_PAYMENT_COLUMNS: Array<LedgerColumn<AppPaymentRow>> = [
  { key: 'applicationId', label: 'Application ID', sortValue: (r) => r.applicationId, render: (r) => <span className="font-mono text-xs">{dash(r.applicationId)}</span> },
  {
    key: 'student', label: 'Student', sortValue: (r) => r.student,
    render: (r) => (
      <span className="block">
        <span className="block font-medium">{dash(r.student)}</span>
        {r.studentCode ? <span className="block text-[11px] text-muted-foreground">{r.studentCode}</span> : null}
      </span>
    ),
  },
  { key: 'centre', label: 'Centre', sortValue: (r) => r.centre, render: (r) => dash(r.centre) },
  { key: 'course', label: 'Course', sortValue: (r) => r.course, cellClassName: 'max-w-[220px] truncate', render: (r) => <span title={r.course || undefined}>{dash(r.course)}</span> },
  { key: 'fee', label: 'Fee', align: 'right', sortValue: (r) => r.fee, render: (r) => rupees(r.fee) },
  { key: 'paid', label: 'Paid', align: 'right', sortValue: (r) => r.paid, render: (r) => rupees(r.paid) },
  { key: 'balance', label: 'Balance', align: 'right', sortValue: (r) => r.balance, render: (r) => rupees(r.balance) },
  { key: 'date', label: 'Date', sortValue: (r) => `${r.ymd}#${r.key}`, render: (r) => date(r.ymd) },
  { key: 'status', label: 'Status', sortValue: (r) => r.status, render: (r) => status(r.status) },
];

// ─── Affiliation Fee Records ────────────────────────────────────────────────

export const AFFILIATION_SPEC: LedgerSpec<AffiliationFeeRow> = {
  statusOf: (r) => r.status,
  searchFields: (r) => [r.recordNo, r.centre, r.period, r.amount, r.status],
  filters: [
    { key: 'centre', label: 'Centres', valueOf: (r) => r.centre },
    { key: 'period', label: 'Periods', valueOf: (r) => r.period },
  ],
};

export const AFFILIATION_COLUMNS: Array<LedgerColumn<AffiliationFeeRow>> = [
  { key: 'recordNo', label: 'Record No', sortValue: (r) => r.recordNo, render: (r) => <span className="font-mono text-xs">{dash(r.recordNo)}</span> },
  {
    key: 'centre', label: 'Centre', sortValue: (r) => r.centre,
    render: (r) => (
      <span className="inline-flex items-center gap-2">
        {dash(r.centre)}
        {r.onboarding ? <Pill tone="blue" className="px-2 text-[10px]">Onboarding</Pill> : null}
      </span>
    ),
  },
  { key: 'period', label: 'Period', sortValue: (r) => r.period, render: (r) => dash(r.period) },
  { key: 'amount', label: 'Amount', align: 'right', sortValue: (r) => r.amount, render: (r) => rupees(r.amount) },
  { key: 'dueDate', label: 'Due Date (agreement start)', sortValue: (r) => r.dueYmd, render: (r) => date(r.dueYmd) },
  { key: 'paidOn', label: 'Paid On', sortValue: (r) => r.paidYmd, render: (r) => date(r.paidYmd) },
  { key: 'status', label: 'Status', sortValue: (r) => r.status, render: (r) => status(r.status) },
];
