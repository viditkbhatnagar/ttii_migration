import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { toCentreDashboard } from '../src/admin/pages/centres/centre-dashboard-model';
import { EnrollmentsCard, RevenueTrendCard } from '../src/admin/pages/centres/centre-dashboard-charts';
import { ActionCard, ActivityCard, KpiRow, LowWalletsCard, PipelineCard, RenewalsCard } from '../src/admin/pages/centres/centre-dashboard-sections';
import { TopCentresCard } from '../src/admin/pages/centres/centre-dashboard-top-centres';
import { LedgerTable } from '../src/admin/pages/wallet/ledger-table';
import { WalletTabBar } from '../src/admin/pages/wallet/wallet-tabbar';
import { AFFILIATION_COLUMNS, AFFILIATION_SPEC, topUpColumns, TOPUP_SPEC } from '../src/admin/pages/wallet/wallet-columns';
import { AFFILIATION_STATUSES, TOPUP_STATUSES, toAffiliationFees, toTopUpRows } from '../src/admin/pages/wallet/wallet-payment-model';

/** Server-rendered HTML without React's text-node separators. */
const render = (node: React.ReactElement): string => renderToString(node).replace(/<!-- -->/g, '');
const go = () => undefined;

// Centres v2 (Naji 2026-10-22): the Centre Dashboard cards and the Wallet &
// Payment ledgers render their real-data labels (server-side, like the other
// render tests — no effects, so the charts mount as empty containers).

const data = toCentreDashboard({
  period: 'year',
  window: { fromYmd: '2026-01-01', toYmd: '2026-10-22' },
  centres: [{ id: 1, code: 'TTC0001', name: 'TTC Bepur svk' }],
  kpis: {
    totalCentres: 3, activeCentres: 2, inactiveCentres: 1, enrollments: 1234, inProgress: 3, awaitingApproval: 2,
    collected: 70000, collectedTopUps: 30000, collectedAffiliation: 40000, walletTotal: 78201, pendingTopUps: 1,
  },
  pipeline: [{ stage: 'lead', count: 2 }, { stage: 'approval_waiting', count: 1 }, { stage: 'enrolled', count: 1 }],
  actions: { awaitingApproval: 2, pendingTopUps: 1, expiringSoon: 1, expired: 1 },
  trend: [{ month: '2026-10', label: 'Oct', topUps: 5000, affiliation: 10000 }],
  rows: [
    { id: 1, code: 'TTC0001', name: 'TTC Bepur svk', state: 'Kerala', status: 'active', enrollments: 3, applications: 3, approved: 1, conversion: 33, revenue: 6000, wallet: 3201, affiliationExpiry: '2026-12-15', daysLeft: 54, affiliation: 'due_soon' },
  ],
  renewals: [{ id: 30, name: 'Hanahadhi', expiry: '2026-08-31', daysLeft: -52 }],
  lowWallets: [{ id: 30, name: 'Hanahadhi', balance: 0 }],
  activity: [{ id: 'fr-2', kind: 'topup_requested', at: '2026-10-21T20:00:00.000Z', who: 'TTC Bepur svk', ref: 'FR-2', amount: 100, note: '' }],
  affiliationReady: true,
});

describe('Centre Dashboard cards', () => {
  test('KPIs carry the prototype labels with real sub-lines', () => {
    const html = render(<KpiRow data={data} onNavigate={go} />);
    for (const label of ['Total Centres', 'Total Enrollments', 'Applications in progress', 'Awaiting TTII Approval', 'Collected from Centres', 'Total Wallet Balance']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('2 active · 1 inactive');
    expect(html).toContain('1,234');
    expect(html).toContain('₹70,000');
    expect(html).toContain('Wallet top-ups + affiliation fees · this year');
    expect(html).toContain('All time · across selected centres');
    expect(html).toContain('All time · needs your decision');
    expect(html).toContain('Lead to Approval Waiting · this year');
    expect(html).toContain('1 pending top-ups');
  });

  test('pipeline, actions, renewals, low wallets and activity', () => {
    const html = render(
      <>
        <PipelineCard data={data} onNavigate={go} />
        <ActionCard data={data} onNavigate={go} />
        <RenewalsCard data={data} onNavigate={go} />
        <LowWalletsCard data={data} onNavigate={go} />
        <ActivityCard data={data} />
      </>,
    );
    expect(html).toContain('Application pipeline');
    expect(html).toContain('Approval Waiting');
    expect(html).toContain('2 · 50%');
    expect(html).toContain('wallet top-up requests pending');
    expect(html).toContain('affiliations already expired');
    expect(html).toContain('52d overdue');
    expect(html).toContain('31 Aug 2026');
    expect(html).toContain('Low wallet balances (under ₹5,000)');
    expect(html).toContain('₹0');
    expect(html).toContain('Top-up of ₹100 requested');
    expect(html).toContain('(FR-2)');
  });

  test('charts and the Top centres table', () => {
    const html = render(
      <>
        <RevenueTrendCard trend={data.trend} />
        <EnrollmentsCard rows={data.rows} />
        <TopCentresCard rows={data.rows} onNavigate={go} />
      </>,
    );
    expect(html).toContain('Payments received from centres (₹)');
    expect(html).toContain('Oct: ₹5,000 wallet top-ups, ₹10,000 affiliation fees.');
    expect(html).toContain('Enrollments by centre');
    expect(html).toContain('Search centre, code, state');
    for (const label of ['Centre', 'State', 'Enrollments', 'Applications', 'Approved', 'Conversion', 'Revenue', 'Wallet', 'Affiliation']) {
      expect(html).toContain(`>${label} <`);
    }
    expect(html).toContain('33%');
    expect(html).toContain('Due Soon');
  });

  test('an empty trend says so instead of drawing flat lines', () => {
    const html = render(<RevenueTrendCard trend={[{ month: '2026-10', label: 'Oct', topUps: 0, affiliation: 0 }]} />);
    expect(html).toContain('No wallet top-ups or affiliation fees received in the last six months.');
  });
});

describe('Wallet & Payment ledgers', () => {
  test('Top-up Requests: columns, pills, Approve / Reject only on pending rows', () => {
    const rows = toTopUpRows([
      { id: 7, centre_name: 'upCarrera Education', transaction_receipt: 'NEFT-1', amount: '25000', date: '2026-01-19', status: 'approved' },
      { id: 9, centre_name: 'TTC Bepur svk', amount: '100', date: '2025-12-05', status: 'pending', attachment_file: 'https://cdn.example.com/r.jpg' },
    ]);
    const html = render(
      <LedgerTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={topUpColumns(go)}
        statuses={TOPUP_STATUSES}
        spec={TOPUP_SPEC}
        defaultSort={{ key: 'date', dir: 'desc' }}
        action={{ label: 'Action', render: (r) => (r.status === 'pending' ? <button type="button">Approve</button> : '—') }}
        searchLabel="Search top-up requests"
        emptyTitle="No top-up requests yet."
      />,
    );
    for (const label of ['Request No', 'Centre', 'Amount', 'Txn / Ref No', 'Requested On', 'Status', 'Action']) expect(html).toContain(label);
    expect(html).not.toContain('Mode');
    expect(html).toContain('FR-7');
    expect(html).toContain('₹25,000.00');
    expect(html).toContain('19 Jan 2026');
    expect(html.match(/>Approve</g)).toHaveLength(1);
    expect(html.replace(/<[^>]+>/g, '')).toContain('Showing 2 of 2 entries');
  });

  test('Affiliation Fee Records: empty tab message', () => {
    const fees = toAffiliationFees({ ready: false, message: 'Affiliation records are not set up yet.', rows: [] });
    const html = render(
      <LedgerTable
        rows={fees.rows}
        rowKey={(r) => r.id}
        columns={AFFILIATION_COLUMNS}
        statuses={AFFILIATION_STATUSES}
        spec={AFFILIATION_SPEC}
        defaultSort={{ key: 'recordNo', dir: 'asc' }}
        searchLabel="Search affiliation fee records"
        emptyTitle="Affiliation records are not set up yet."
      />,
    );
    for (const label of ['Record No', 'Period', 'Due Date (agreement start)', 'Paid On', 'All Centres', 'All Periods']) expect(html).toContain(label);
    expect(html).toContain('Affiliation records are not set up yet.');
  });
});

describe('Wallet & Payment tabs', () => {
  test('a tablist with one tab in the Tab order, each controlling its panel; unloaded counts are hidden', () => {
    const html = render(<WalletTabBar tab="wallets" counts={{ topups: 5, wallets: 3, affiliation: 0 }} onSelect={go} />);
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toContain('id="wallet-tab-wallets"');
    expect(html).toContain('aria-controls="wallet-panel-wallets"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
    expect(html).toMatch(/aria-selected="true"[^>]*tabindex="0"[^>]*>Centre Wallets/);
    const text = html.replace(/<[^>]+>/g, '|');
    expect(text).toContain('Application Payments|'); // no count until it loads
    expect(text).not.toMatch(/Application Payments\|+\d/);
  });
});
