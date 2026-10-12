import { describe, expect, test } from 'vitest';

import {
  EMPTY_ANNOUNCEMENT_FORM,
  NO_COHORT,
  announcementCsvRows,
  buildAnnouncementPayload,
  cohortLabel,
  createdLabel,
  deliveryLabel,
  filterAnnouncements,
  formFromRow,
  sortAnnouncements,
  toAnnouncementRows,
  validateAnnouncement,
} from '../src/admin/pages/cohorts/announcement-model';

const rows = toAnnouncementRows([
  { id: '1', title: 'Welcome', cohort_id: '7', cohort_title: 'CET - APR 26', content: 'Hello cohort', audience_type: 'all', delivery_channels: ['in_app', 'email'], status: 'sent', created_at: '2026-10-01T20:00:00.000Z' },
  { id: '2', title: 'Exam Notice', cohort_id: '', cohort_title: '', content: 'Exams next week', audience_type: 'selected', audience_user_ids: ['5', '9'], delivery_channels: ['bogus'], status: 'draft', created_at: '2026-09-20T05:00:00.000Z' },
  { id: '3', title: 'Holiday', cohort_id: '8', cohort_title: '', content: '', audience_type: 'all', delivery_channels: 'in_app', status: 'weird', created_at: null },
]);

describe('announcement rows', () => {
  test('normalises status, audience and channels', () => {
    expect(rows[0]?.status).toBe('sent');
    expect(rows[2]?.status).toBe('draft');
    expect(rows[1]?.audienceType).toBe('selected');
    expect(rows[1]?.audienceUserIds).toEqual(['5', '9']);
    expect(rows[1]?.channels).toEqual([]);
    expect(rows[2]?.channels).toEqual([]);
  });

  test('labels', () => {
    expect(deliveryLabel(rows[0]?.channels ?? [])).toBe('In-app, Email');
    expect(deliveryLabel([])).toBe('—');
    expect(cohortLabel(rows[1]!)).toBe('All');
    expect(cohortLabel(rows[2]!)).toBe('Cohort #8');
  });

  test('created date is the IST calendar day', () => {
    // 20:00 UTC on 1 Oct is 01:30 IST on 2 Oct.
    expect(createdLabel('2026-10-01T20:00:00.000Z')).toBe('02/10/2026');
    expect(createdLabel('')).toBe('—');
  });
});

describe('filter + sort', () => {
  test('cohort, no-cohort, status and search', () => {
    expect(filterAnnouncements(rows, { cohortId: '7', status: '', search: '' }).map((r) => r.id)).toEqual(['1']);
    expect(filterAnnouncements(rows, { cohortId: NO_COHORT, status: '', search: '' }).map((r) => r.id)).toEqual(['2']);
    expect(filterAnnouncements(rows, { cohortId: '', status: 'draft', search: '' }).map((r) => r.id)).toEqual(['2', '3']);
    expect(filterAnnouncements(rows, { cohortId: '', status: '', search: 'next week' }).map((r) => r.id)).toEqual(['2']);
  });

  test('created sorts by timestamp, missing dates first ascending', () => {
    expect(sortAnnouncements(rows, 'created', 'desc').map((r) => r.id)).toEqual(['1', '2', '3']);
    expect(sortAnnouncements(rows, 'title', 'asc').map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  test('csv has a header and one line per row', () => {
    const csv = announcementCsvRows(rows);
    expect(csv[0]?.[0]).toBe('Title');
    expect(csv).toHaveLength(4);
  });
});

describe('form + payload', () => {
  test('validation', () => {
    const e = validateAnnouncement({ ...EMPTY_ANNOUNCEMENT_FORM, delivery_in_app: false, attachment_url: 'ftp://x' });
    expect(Object.keys(e).sort()).toEqual(['attachment', 'channels', 'content', 'title']);
    expect(validateAnnouncement({ ...EMPTY_ANNOUNCEMENT_FORM, title: 'A', content: 'B', attachment_url: 'https://x.y/z' })).toEqual({});
  });

  test('payload matches the old body', () => {
    const form = { ...formFromRow(rows[0]!), title: '  Welcome  ' };
    expect(buildAnnouncementPayload(form, null)).toEqual({
      cohort_id: '7', title: 'Welcome', content: 'Hello cohort', audience_type: 'all',
      delivery_channels: ['in_app', 'email'], attachment_url: '', status: 'sent',
    });
  });

  test('an edit that keeps "selected" carries the existing student list', () => {
    const payload = buildAnnouncementPayload(formFromRow(rows[1]!), rows[1]!);
    expect(payload.audience_user_ids).toEqual(['5', '9']);
    const switched = buildAnnouncementPayload({ ...formFromRow(rows[1]!), audience_type: 'all' }, rows[1]!);
    expect(switched.audience_user_ids).toBeUndefined();
  });
});

describe('legacy records are never blocked', () => {
  test('a row with no stored channel opens with In-app ticked and validates', () => {
    const form = formFromRow(rows[1]!);
    expect(form.delivery_in_app).toBe(true);
    expect(validateAnnouncement(form, formFromRow(rows[1]!)).channels).toBeUndefined();
  });

  test('an unchanged legacy attachment path saves; a changed one is checked', () => {
    const [legacy] = toAnnouncementRows([{ id: '9', title: 'Old', content: 'x', attachment_url: 'uploads/circular.pdf', delivery_channels: ['in_app'] }]);
    const original = formFromRow(legacy!);
    expect(validateAnnouncement(original, original)).toEqual({});
    expect(validateAnnouncement({ ...original, attachment_url: 'uploads/other.pdf' }, original).attachment).toBeDefined();
    expect(validateAnnouncement(original, null).attachment).toBeDefined();
  });
});

