import { describe, expect, test } from 'vitest';

import {
  EMPTY_LIST_FILTERS,
  displayEmail,
  displayPhone,
  exportTable,
  filterApplications,
  initials,
  presetFromDate,
  sortApplications,
  stageCounts,
  stageLabel,
  toApplicationRows,
} from '../src/admin/pages/applications/application-list-model';

const rows = toApplicationRows([
  { id: 187, application_id: 'TTII260101', created_at: '2026-10-01T06:00:00.000Z', name: 'Asha Nair', phone: '9876543210', country_code: '91', user_email: 'asha@example.com', course_title: 'Diploma', offering_title: 'Oct 2026', pipeline: 'Counsellor', pipeline_user: 12, pipeline_user_name: 'Priya', stage: 'lead', district: 'Kottayam', state: 'Kerala' },
  { id: 188, application_id: 'TTII260102', created_at: '2026-10-05T06:00:00.000Z', name: 'Bina K', phone: '9000000001', email: '919000000001', course_title: 'PG Diploma', offering_title: 'Nov 2026', pipeline: 'Associate', pipeline_user: 30, stage: 'approval_waiting' },
  { id: 189, application_id: 'TTII260103', created_at: '2026-09-20T06:00:00.000Z', name: 'Chitra', phone: '9111111111', course_title: 'Diploma', offering_title: 'Oct 2026', pipeline: 'Counsellor', pipeline_user: 12, stage: '' },
  { id: 190, application_id: 'TTII260104', created_at: '2026-09-21T06:00:00.000Z', name: 'Devi', phone: '9222222222', stage: 'form_submitted' },
]);

describe('application rows', () => {
  test('an empty stage reads as a lead; the legacy email column is shown only when it is an email', () => {
    expect(rows[2]?.stage).toBe('lead');
    expect(rows[1]?.email).toBe('');
    expect(displayEmail({ user_email: '', email: 'x@y.in' })).toBe('x@y.in');
  });

  test('phone carries its country code', () => {
    expect(displayPhone({ phone: '9876543210', country_code: '91' })).toBe('+91 9876543210');
    expect(displayPhone({ phone: '9876543210', country_code: '+971' })).toBe('+971 9876543210');
    expect(displayPhone({ phone: '9876543210' })).toBe('9876543210');
    expect(rows[0]?.location).toBe('Kottayam, Kerala');
  });

  test('legacy stages have labels; initials never come back empty', () => {
    expect(stageLabel('form_submitted')).toBe('Form Submitted');
    expect(stageLabel('enrolled')).toBe('Enrolled');
    expect(initials('asha nair')).toBe('AN');
    expect(initials('')).toBe('?');
  });
});

describe('application filters', () => {
  const all = { ...EMPTY_LIST_FILTERS, stage: 'all' as const };

  test('stage tab, offering and pipeline user', () => {
    expect(filterApplications(rows, EMPTY_LIST_FILTERS).map((r) => r.id)).toEqual(['187', '189']);
    expect(filterApplications(rows, { ...all, offering: 'Nov 2026' }).map((r) => r.id)).toEqual(['188']);
    expect(filterApplications(rows, { ...all, pipelineUserId: '12' }).map((r) => r.id)).toEqual(['187', '189']);
  });

  test('search matches name, application id, email and phone digits', () => {
    expect(filterApplications(rows, { ...all, search: 'bina' }).map((r) => r.id)).toEqual(['188']);
    expect(filterApplications(rows, { ...all, search: 'ttii260103' }).map((r) => r.id)).toEqual(['189']);
    expect(filterApplications(rows, { ...all, search: 'asha@' }).map((r) => r.id)).toEqual(['187']);
    expect(filterApplications(rows, { ...all, search: '91 98765' }).map((r) => r.id)).toEqual(['187']);
  });

  test('pill counts come from the same rows as the table (form_submitted only counts under All)', () => {
    expect(stageCounts(rows)).toEqual({ all: 4, lead: 2, payment_pending: 0, paid: 0, form_pending: 0, approval_waiting: 1, rejected: 0 });
  });

  test('sort by date and by stage label', () => {
    expect(sortApplications(rows, 'date', 'desc').map((r) => r.id)).toEqual(['188', '187', '190', '189']);
    expect(sortApplications(rows, 'stage', 'asc').map((r) => r.stage)).toEqual(['approval_waiting', 'form_submitted', 'lead', 'lead']);
  });

  test('export has a header row and one line per application', () => {
    const t = exportTable(rows.slice(0, 1));
    expect(t[0]?.[0]).toBe('Application ID');
    expect(t[1]).toEqual(['TTII260101', rows[0]?.dateLabel, 'Asha Nair', 'Diploma', 'Oct 2026', '', '91 9876543210', 'asha@example.com', 'Counsellor', 'Priya', 'Lead']);
  });
});

describe('date presets', () => {
  test('a preset sends a local From date; All time and Custom send none', () => {
    const today = new Date(2026, 9, 12, 1, 30); // 12 Oct 2026, 01:30 local
    expect(presetFromDate('7', today)).toBe('2026-10-05');
    expect(presetFromDate('30', today)).toBe('2026-09-12');
    expect(presetFromDate('all', today)).toBe('');
    expect(presetFromDate('custom', today)).toBe('');
  });
});
