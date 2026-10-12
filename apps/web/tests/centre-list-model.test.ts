import { describe, expect, test } from 'vitest';

import {
  EMPTY_CENTRE_FILTERS,
  EMPTY_WALLET_FILTERS,
  centreCsvRows,
  centreStatusOf,
  filterCentres,
  filterWallets,
  rupees,
  sortCentres,
  sortWallets,
  stateOptions,
  tallyFundRequests,
  toCentreRows,
  toWalletRows,
  walletCsvRows,
} from '../src/admin/pages/centres/centre-list-model';
import {
  centreCohortCsvRows,
  centreCohortTabCounts,
  filterCentreCohorts,
  sortCentreCohorts,
  toCentreCohortRows,
} from '../src/admin/pages/centres/centre-cohorts-model';
import { EMPTY_COHORT_FILTERS } from '../src/admin/pages/cohorts/cohort-list-model';

const centres = toCentreRows([
  { id: 30, centre_id: '30', centre_name: 'Hanahadhi', contact_person: 'HANA', phone: '9961819732', email: 'hana@example.com', state_id: '12', status: 1, students_count: 0, wallet_balance: '0', linked_user_id: 501, linked_user_email: 'hana@example.com' },
  { id: 28, centre_id: '28', centre_name: 'upCarrera Education', contact_person: 'Junaid KB', phone: '9526389878', email: 'ops@example.com', state: 'Kerala', status: 1, students_count: 12, wallet_balance: '75000', linked_user_id: null },
  { id: 1, centre_id: 'TTC0001', centre_name: 'TTC Bepur svk', contact_person: 'Laura Hall', phone: '9946801100', email: 'ttc@example.com', state_id: 'Karnataka', status: 0, students_count: 4, wallet_balance: '3201.5' },
  { centre_name: 'no id — dropped' },
]);

describe('centre directory rows', () => {
  test('maps the listCentres payload and drops rows without an id', () => {
    expect(centres).toHaveLength(3);
    const up = centres.find((c) => c.id === '28');
    expect(up).toMatchObject({ code: '28', name: 'upCarrera Education', walletBalance: 75000, students: 12, state: 'Kerala', status: 'active', linkedUserId: '' });
    expect(centres.find((c) => c.id === '30')?.linkedUserId).toBe('501');
  });

  test('a numeric legacy state_id is not a state name', () => {
    expect(centres.find((c) => c.id === '30')?.state).toBe('');
    expect(centres.find((c) => c.id === '1')?.state).toBe('Karnataka');
    expect(stateOptions(centres)).toEqual(['Karnataka', 'Kerala']);
  });

  test('centres.status is an Int: 0 is inactive, anything else active', () => {
    expect(centreStatusOf(0)).toBe('inactive');
    expect(centreStatusOf('0')).toBe('inactive');
    expect(centreStatusOf('Inactive')).toBe('inactive');
    expect(centreStatusOf(1)).toBe('active');
    expect(centreStatusOf(null)).toBe('active');
  });

  test('filters by code, name, contact, phone, state, status and search', () => {
    const ids = (f: Partial<typeof EMPTY_CENTRE_FILTERS>) => filterCentres(centres, { ...EMPTY_CENTRE_FILTERS, ...f }).map((c) => c.id);
    expect(ids({ code: 'ttc' })).toEqual(['1']);
    expect(ids({ name: 'carrera' })).toEqual(['28']);
    expect(ids({ contact: 'laura' })).toEqual(['1']);
    expect(ids({ phone: '99618' })).toEqual(['30']);
    expect(ids({ state: 'Kerala' })).toEqual(['28']);
    expect(ids({ status: 'inactive' })).toEqual(['1']);
    expect(ids({ status: 'active' })).toEqual(['30', '28']);
    expect(ids({ search: 'ops@' })).toEqual(['28']);
    expect(ids({})).toHaveLength(3);
  });

  test('fund requests are tallied per centre with the pending ones', () => {
    const tallies = tallyFundRequests([
      { id: 1, centre_id: 28, status: 'approved' },
      { id: 2, centre_id: 28, status: 'pending' },
      { id: 3, centre_id: 1, status: 'Pending' },
      { id: 4, status: 'pending' },
    ]);
    expect(tallies.get('28')).toEqual({ total: 2, pending: 1 });
    expect(tallies.get('1')).toEqual({ total: 1, pending: 1 });
    expect(tallies.has('30')).toBe(false);

    expect(sortCentres(centres, 'fundRequests', 'desc', tallies).map((c) => c.id)).toEqual(['28', '1', '30']);
    expect(sortCentres(centres, 'walletBalance', 'asc').map((c) => c.id)).toEqual(['30', '1', '28']);
    expect(sortCentres(centres, 'name', 'asc').map((c) => c.name)).toEqual(['Hanahadhi', 'TTC Bepur svk', 'upCarrera Education']);

    const csv = centreCsvRows(centres.filter((c) => c.id === '28'), tallies);
    expect(csv[0]).toContain('Pending Fund Requests');
    expect(csv[1]).toEqual(['28', 'upCarrera Education', 'Junaid KB', '9526389878', 'ops@example.com', 'Kerala', 'Active', 12, 2, 1, 75000]);
  });

  test('rupees uses the en-IN grouping with paise', () => {
    expect(rupees(75000)).toBe('₹75,000.00');
    expect(rupees(3201.5)).toBe('₹3,201.50');
  });
});

describe('wallet status rows', () => {
  const wallets = toWalletRows([
    { id: 30, centre_id: '30', centre_name: 'Hanahadhi', wallet_balance: '0', transaction_count: 0, phone: '9961819732', email: 'hana@example.com' },
    { id: 1, centre_id: 'TTC0001', centre_name: 'TTC Bepur svk', wallet_balance: '3201', transaction_count: 7, phone: '9946801100', email: 'ttc@example.com' },
    { id: 28, centre_id: '28', centre_name: 'upCarrera Education', wallet_balance: null, transaction_count: 2, phone: '', email: '' },
  ]);

  test('a non-numeric centre code filters client-side (the API 500s on it)', () => {
    expect(filterWallets(wallets, { ...EMPTY_WALLET_FILTERS, code: 'TTC0001' }).map((w) => w.id)).toEqual(['1']);
    expect(filterWallets(wallets, { ...EMPTY_WALLET_FILTERS, name: 'hana' }).map((w) => w.id)).toEqual(['30']);
    expect(filterWallets(wallets, { ...EMPTY_WALLET_FILTERS, search: '99468' }).map((w) => w.id)).toEqual(['1']);
  });

  test('a missing balance reads as zero and sorts numerically', () => {
    expect(wallets.find((w) => w.id === '28')?.balance).toBe(0);
    expect(sortWallets(wallets, 'transactions', 'desc').map((w) => w.id)).toEqual(['1', '28', '30']);
    expect(walletCsvRows(wallets)[2]).toEqual(['TTC0001', 'TTC Bepur svk', 3201, 7, '9946801100', 'ttc@example.com']);
  });
});

describe('centre cohorts', () => {
  const rows = toCentreCohortRows([
    { id: 94, cohort_row_id: 'C-94', cohort_id: 'SMOJUL26', title: 'SM July', start_date: '2026-07-01T00:00:00.000Z', course_id: 16, course_titles: ['Diploma'], course_ids: [16], centre_id: 28, centre_name: 'upCarrera Education', student_count: 4, live_class_count: 13, derived_status: 'active' },
    { id: 88, cohort_row_id: 'C-88', cohort_id: 'SMOJAN26', title: 'SM Jan', start_date: '2026-01-01T00:00:00.000Z', course_id: 18, course_titles: ['PG Diploma'], course_ids: [18], centre_id: null, centre_name: null, student_count: 22, live_class_count: 30, derived_status: 'completed' },
    { id: 99, cohort_row_id: 'C-99', cohort_id: 'NEXT', title: 'Next', start_date: '2026-12-01T00:00:00.000Z', centre_name: 'TTC Bepur svk', derived_status: 'upcoming' },
  ]);

  test('keeps the centre and reuses the cohort row shape', () => {
    expect(rows.map((r) => r.centre)).toEqual(['upCarrera Education', '', 'TTC Bepur svk']);
    expect(rows[0]).toMatchObject({ cohortId: 'C94', code: 'SMOJUL26', month: 'Jul 2026', students: 4, liveClasses: 13 });
  });

  test('tabs count Active / Completed / All and the search matches the centre', () => {
    expect(centreCohortTabCounts(rows, EMPTY_COHORT_FILTERS)).toEqual({ active: 1, completed: 1, all: 3 });
    expect(filterCentreCohorts(rows, EMPTY_COHORT_FILTERS).map((r) => r.id)).toEqual(['94']);
    const bySearch = filterCentreCohorts(rows, { ...EMPTY_COHORT_FILTERS, tab: 'all', search: 'bepur' });
    expect(bySearch.map((r) => r.id)).toEqual(['99']);
    expect(bySearch[0]?.centre).toBe('TTC Bepur svk');
    expect(filterCentreCohorts(rows, { ...EMPTY_COHORT_FILTERS, tab: 'all', courseId: '18' }).map((r) => r.id)).toEqual(['88']);
  });

  test('sorts by centre and by the shared cohort keys', () => {
    expect(sortCentreCohorts(rows, 'centre', 'asc').map((r) => r.id)).toEqual(['88', '99', '94']);
    expect(sortCentreCohorts(rows, 'cohortId', 'desc').map((r) => r.id)).toEqual(['99', '94', '88']);
    const csv = centreCohortCsvRows(rows.slice(0, 1));
    expect(csv[0]?.[1]).toBe('Centre');
    expect(csv[1]).toEqual(['Active', 'upCarrera Education', 'C94', 'SMOJUL26', 'Jul 2026', 'Diploma', '', '', '', 4, 13]);
  });
});
