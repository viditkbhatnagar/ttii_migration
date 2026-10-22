import { describe, expect, test } from 'vitest';

import {
  DEFAULT_DIRECTORY_VIEW, EMPTY_DIRECTORY_FILTERS, activeFilterCount, countryOptions, daysUntil, directoryCsvRows, directoryKpis,
  expiryInfo, expiryYmd, filterDirectory, sortDirectory, stateOptions, toDirectoryRows, viewStateFromQuery, viewStateToQuery,
} from '../src/admin/pages/centres/centre-directory-model';

// Centre Directory (Naji 2026-10-22). "Today" is an IST calendar date.
const TODAY = '2026-10-22';

const rows = toDirectoryRows([
  {
    id: 28, centre_id: '28', centre_name: 'upCarrera Education', country_id: '1', country_name: '', state_id: 'Kerala', state_name: 'Kerala',
    district_id: 'Kozhikode', district_name: 'Kozhikode', contact_person: 'Junaid KB', phone: '9526389878', email: 'ops@upcarrera.in',
    students_count: 12, wallet_balance: '75000', date_of_expiry: '2026-12-31', status: 1, linked_user_id: 501, linked_user_email: 'ops@upcarrera.in',
  },
  {
    id: 30, centre_id: 'TTC0031', centre_name: 'Hanahadhi', country_name: 'India', state_name: 'Kerala', district_name: 'Malappuram',
    contact_person: 'Hana', phone: '99618 19732', email: 'hana@example.com', students_count: 0, wallet_balance: '0', date_of_expiry: '2026-10-01', status: 1,
  },
  {
    id: 1, centre_id: 'TTC0001', centre_name: 'TTC Bepur svk', country_name: 'India', state_name: 'Karnataka', district_name: 'Udupi',
    contact_person: 'Laura Hall', phone: '9946801100', email: 'ttc@example.com', students_count: 4, wallet_balance: '3201.5', date_of_expiry: '', status: 0,
  },
  { id: 2, centre_id: '2', centre_name: 'Dubai Hub', country_name: 'United Arab Emirates', state_name: 'Dubai', district_name: 'Deira', status: 1, date_of_expiry: '22/10/2026' },
  { centre_name: 'no id — dropped' },
]);

describe('directory rows', () => {
  test('maps listCentres, drops rows without an id and treats numeric location ids as no name', () => {
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ code: '28', country: '', state: 'Kerala', district: 'Kozhikode', walletBalance: 75000, students: 12, linkedUserId: '501', expiry: '2026-12-31' });
    expect(rows.find((r) => r.id === '1')?.status).toBe('inactive');
    expect(rows.find((r) => r.id === '2')?.expiry).toBe('2026-10-22');
  });

  test('reads legacy expiry spellings and rejects impossible dates', () => {
    expect(expiryYmd('31-12-2026')).toBe('2026-12-31');
    expect(expiryYmd('2026-02-30')).toBe('');
    expect(expiryYmd(null)).toBe('');
  });
});

describe('affiliation expiry chip', () => {
  test('expired before today, amber within 90 days, none past that or without a date', () => {
    expect(daysUntil('2026-10-21', TODAY)).toBe(-1);
    expect(expiryInfo('2026-10-21', TODAY)).toMatchObject({ tone: 'expired', chip: 'Expired', label: '21 Oct 2026' });
    expect(expiryInfo('2026-10-22', TODAY)).toMatchObject({ tone: 'soon', chip: '0d' });
    expect(expiryInfo('2027-01-20', TODAY)).toMatchObject({ tone: 'soon', chip: '90d' });
    expect(expiryInfo('2027-01-21', TODAY)).toMatchObject({ tone: 'ok', chip: '' });
    expect(expiryInfo('', TODAY)).toEqual({ tone: 'none', days: null, label: '—', chip: '' });
  });
});

describe('KPIs and filters', () => {
  test('counts active, inactive and expired (by IST today)', () => {
    expect(directoryKpis(rows, TODAY)).toEqual({ active: 3, inactive: 1, expired: 1 });
  });

  test('status, expired-only, country, state and search filter the rows', () => {
    const ids = (f: Partial<typeof EMPTY_DIRECTORY_FILTERS>) => filterDirectory(rows, { ...EMPTY_DIRECTORY_FILTERS, ...f }, TODAY).map((r) => r.id);
    expect(ids({ status: 'inactive' })).toEqual(['1']);
    expect(ids({ expiredOnly: true })).toEqual(['30']);
    expect(ids({ country: 'India' })).toEqual(['30', '1']);
    expect(ids({ state: 'Kerala' })).toEqual(['28', '30']);
    expect(ids({ search: 'kozhikode' })).toEqual(['28']);
    expect(ids({ search: 'ttc00' })).toEqual(['30', '1']);
    expect(ids({ search: '99468' })).toEqual(['1']);
    expect(activeFilterCount({ ...EMPTY_DIRECTORY_FILTERS, search: ' x ', state: 'Kerala', expiredOnly: true })).toBe(3);
  });

  test('country options come from the centres; a chosen country lists its known states', () => {
    expect(countryOptions(rows)).toEqual(['India', 'United Arab Emirates']);
    expect(stateOptions(rows, '')).toEqual(['Dubai', 'Karnataka', 'Kerala']);
    expect(stateOptions(rows, 'United Arab Emirates')).toEqual(['Abu Dhabi', 'Ajman', 'Dubai', 'Ras Al Khaimah', 'Sharjah']);
    expect(stateOptions(rows, 'India')).toContain('Tamil Nadu');
  });
});

describe('sorting', () => {
  test('every column sorts; an empty expiry sorts last ascending', () => {
    expect(sortDirectory(rows, 'expiry', 'asc').map((r) => r.id)).toEqual(['30', '2', '28', '1']);
    expect(sortDirectory(rows, 'walletBalance', 'desc').map((r) => r.id)).toEqual(['28', '1', '30', '2']);
    expect(sortDirectory(rows, 'district', 'asc').map((r) => r.district)).toEqual(['Deira', 'Kozhikode', 'Malappuram', 'Udupi']);
    expect(sortDirectory(rows, 'code', 'asc').map((r) => r.code)).toEqual(['2', '28', 'TTC0001', 'TTC0031']);
    expect(sortDirectory(rows, 'status', 'desc')[0]?.status).toBe('inactive');
  });

  test('CSV carries the visible columns', () => {
    const csv = directoryCsvRows(rows.slice(0, 1));
    expect(csv[0]).toContain('Affiliation Expiry');
    expect(csv[1]).toEqual(['28', 'upCarrera Education', 'Kozhikode', 'Kerala', '', 'Junaid KB', '9526389878', 'ops@upcarrera.in', 12, 75000, '2026-12-31', 'Active']);
  });
});

describe('URL state for Back from the profile', () => {
  test('round-trips filters, sort and page; the default view is an empty query', () => {
    expect(viewStateToQuery(DEFAULT_DIRECTORY_VIEW)).toBe('');
    const view = {
      filters: { search: 'kerala', country: 'India', state: 'Kerala', status: 'active' as const, expiredOnly: true },
      sort: { key: 'expiry' as const, dir: 'desc' as const },
      page: 3,
    };
    const q = viewStateToQuery(view);
    expect(viewStateFromQuery(`?${q}`)).toEqual(view);
  });

  test('ignores junk in the query', () => {
    expect(viewStateFromQuery('?status=paused&sort=password.up&page=-2')).toEqual(DEFAULT_DIRECTORY_VIEW);
  });
});
