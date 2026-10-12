import { describe, expect, test } from 'vitest';

import {
  EMPTY_STAFF_FILTERS,
  conversionPct,
  dateOnlyYmd,
  distinctCentres,
  filterStaff,
  formatYmd,
  istYmd,
  sortStaff,
  staffCounts,
  staffCsvRows,
  telLink,
  toStaffRows,
  todayIstYmd,
  whatsappLink,
} from '../src/admin/pages/counsellor/staff-model';

const rows = toStaffRows([
  {
    id: 12, name: 'Asha Menon', user_email: 'asha@ttii.in', phone: '+91 9876543210', status: 1, centre_name: 'Kochi',
    image: 'https://x/a.jpg', disabled_at: null, doj: '2026-03-01T00:00:00.000Z', created_at: '2026-02-20T20:00:00.000Z',
    applications_referred: 8, applications_converted: 3, gender: 'Female', dob: '1990-05-04T00:00:00.000Z',
    languages_spoken: 'English', highest_qualification: 'MBA',
  },
  {
    _id: '7', name: 'ravi kumar', user_email: '', phone: '9000000000', status: 0, centre_name: '', disabled_at: '2026-09-01T10:00:00Z',
    doj: null, created_at: '2026-01-31T19:00:00.000Z', applications_referred: 0, applications_converted: 0,
  },
  {
    id: 3, name: 'Zoya', user_email: 'zoya@ttii.in', phone: '', status: 1, centre_name: 'Bengaluru', disabled_at: null,
    doj: '2025-12-10', applications_referred: 4, applications_converted: 4,
  },
]);

describe('staff rows', () => {
  test('maps status, login, joined and conversion as the old pages read them', () => {
    expect(rows[0]).toMatchObject({
      id: '12', email: 'asha@ttii.in', photo: 'https://x/a.jpg', centre: 'Kochi', isActive: true, statusLabel: 'Active',
      loginDisabled: false, joined: '2026-03-01', applications: 8, converted: 3, conversion: 38, dob: '1990-05-04',
    });
    // No date of joining → the IST day the account was created (19:00Z = next day IST).
    expect(rows[1]).toMatchObject({ id: '7', isActive: false, statusLabel: 'Inactive', loginDisabled: true, joined: '2026-02-01', conversion: 0 });
    expect(rows[2]?.joined).toBe('2025-12-10');
  });

  test('date helpers never shift the day', () => {
    expect(dateOnlyYmd('2026-03-01T00:00:00.000Z')).toBe('2026-03-01');
    expect(dateOnlyYmd(null)).toBe('');
    expect(istYmd('2026-01-31T19:00:00.000Z')).toBe('2026-02-01');
    expect(istYmd('not a date')).toBe('');
    expect(formatYmd('2026-03-01')).toBe('01/03/2026');
    expect(formatYmd('')).toBe('');
    expect(todayIstYmd(new Date('2026-10-11T19:00:00Z'))).toBe('2026-10-12');
    expect(conversionPct(1, 3)).toBe(33);
    expect(conversionPct(5, 0)).toBe(0);
  });
});

describe('filter, count, sort', () => {
  test('tabs: Active / Inactive by users.status, Disabled by disabled_at', () => {
    expect(staffCounts(rows)).toEqual({ all: 3, Active: 2, Inactive: 1, Disabled: 1 });
    expect(filterStaff(rows, { ...EMPTY_STAFF_FILTERS, tab: 'Disabled' }).map((r) => r.id)).toEqual(['7']);
    expect(filterStaff(rows, { ...EMPTY_STAFF_FILTERS, tab: 'Inactive' }).map((r) => r.id)).toEqual(['7']);
  });

  test('search covers name, email, phone and id; centre and joined range filter', () => {
    expect(filterStaff(rows, { ...EMPTY_STAFF_FILTERS, search: 'RAVI' }).map((r) => r.id)).toEqual(['7']);
    expect(filterStaff(rows, { ...EMPTY_STAFF_FILTERS, search: '98765' }).map((r) => r.id)).toEqual(['12']);
    expect(filterStaff(rows, { ...EMPTY_STAFF_FILTERS, centre: 'Bengaluru' }).map((r) => r.id)).toEqual(['3']);
    expect(filterStaff(rows, { ...EMPTY_STAFF_FILTERS, from: '2026-01-01', to: '2026-02-28' }).map((r) => r.id)).toEqual(['7']);
    expect(distinctCentres(rows)).toEqual(['Bengaluru', 'Kochi']);
  });

  test('sorts a copy; blanks sink; target uses the supplied percentage', () => {
    expect(sortStaff(rows, 'name', 'asc').map((r) => r.id)).toEqual(['12', '7', '3']);
    expect(sortStaff(rows, 'joined', 'desc').map((r) => r.id)).toEqual(['12', '7', '3']);
    expect(sortStaff(rows, 'centre', 'asc').map((r) => r.id)).toEqual(['3', '12', '7']);
    expect(sortStaff(rows, 'conversion', 'desc').map((r) => r.id)).toEqual(['3', '12', '7']);
    const pct = (r: { id: string }) => (r.id === '3' ? 10 : r.id === '12' ? 90 : null);
    expect(sortStaff(rows, 'target', 'desc', pct).map((r) => r.id)).toEqual(['12', '3', '7']);
    expect(rows.map((r) => r.id)).toEqual(['12', '7', '3']);
  });
});

describe('export and links', () => {
  test('csv has a header plus one line per row and an optional extra column', () => {
    const csv = staffCsvRows(rows.slice(0, 1), { header: 'Active Target', value: () => 'Points 2/10 (20%)' });
    expect(csv[0]).toContain('Active Target');
    expect(csv[1]).toEqual(['12', 'Asha Menon', 'asha@ttii.in', '+91 9876543210', 'Kochi', '01/03/2026', 8, 3, 38, 'Active', 'Enabled', 'Points 2/10 (20%)']);
  });

  test('tel and WhatsApp links need a real number', () => {
    expect(telLink('+91 98765 43210')).toBe('tel:+919876543210');
    expect(telLink('123')).toBe('');
    expect(whatsappLink('9876543210')).toBe('https://wa.me/919876543210');
    expect(whatsappLink('+971 50 123 4567')).toBe('https://wa.me/971501234567');
    expect(whatsappLink('')).toBe('');
  });
});
