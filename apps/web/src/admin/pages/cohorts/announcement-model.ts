// Pure helpers for Cohorts Management → Announcements (TTII 2026-10-12, Naji's
// AnnouncementsModule design). The page and its dialog stay thin; everything
// that can be tested lives here.

import { compareValues, matchesSearch, type SortDir } from './list-model.js';

export type AnnouncementStatus = 'draft' | 'sent';
export type AudienceType = 'all' | 'selected';
export type Channel = 'in_app' | 'email' | 'whatsapp';

export interface AnnouncementRow {
  id: string;
  title: string;
  cohortId: string;
  cohortTitle: string;
  content: string;
  audienceType: AudienceType;
  audienceUserIds: string[];
  channels: Channel[];
  attachmentUrl: string;
  status: AnnouncementStatus;
  /** Raw created_at (ISO timestamp) — kept for sorting. */
  createdAt: string;
}

export interface AnnouncementForm {
  cohort_id: string;
  title: string;
  content: string;
  audience_type: AudienceType;
  delivery_in_app: boolean;
  delivery_email: boolean;
  delivery_whatsapp: boolean;
  attachment_url: string;
  status: AnnouncementStatus;
}

export const EMPTY_ANNOUNCEMENT_FORM: AnnouncementForm = {
  cohort_id: '',
  title: '',
  content: '',
  audience_type: 'all',
  delivery_in_app: true,
  delivery_email: false,
  delivery_whatsapp: false,
  attachment_url: '',
  status: 'draft',
};

export const STATUS_LABEL: Record<AnnouncementStatus, string> = { draft: 'Draft', sent: 'Sent' };
export const AUDIENCE_LABEL: Record<AudienceType, string> = { all: 'All in cohort', selected: 'Selected students' };
const CHANNEL_LABEL: Record<Channel, string> = { in_app: 'In-app', email: 'Email', whatsapp: 'WhatsApp' };

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const isChannel = (v: unknown): v is Channel => v === 'in_app' || v === 'email' || v === 'whatsapp';

export function toAnnouncementRows(raw: Record<string, unknown>[]): AnnouncementRow[] {
  return raw.map((r) => ({
    id: str(r.id),
    title: str(r.title),
    cohortId: str(r.cohort_id),
    cohortTitle: str(r.cohort_title),
    content: str(r.content),
    audienceType: str(r.audience_type) === 'selected' ? 'selected' : 'all',
    audienceUserIds: Array.isArray(r.audience_user_ids) ? r.audience_user_ids.map((u) => str(u)).filter(Boolean) : [],
    channels: Array.isArray(r.delivery_channels) ? r.delivery_channels.filter(isChannel) : [],
    attachmentUrl: str(r.attachment_url),
    status: str(r.status) === 'sent' ? 'sent' : 'draft',
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : str(r.created_at),
  }));
}

/** "In-app, Email" — '—' when the row has no channel. */
export function deliveryLabel(channels: Channel[]): string {
  return channels.length === 0 ? '—' : channels.map((c) => CHANNEL_LABEL[c]).join(', ');
}

/** Blank cohort = the announcement is not tied to one cohort (shown as "All"). */
export function cohortLabel(row: AnnouncementRow): string {
  return row.cohortTitle || (row.cohortId ? `Cohort #${row.cohortId}` : 'All');
}

/** dd/mm/yyyy of a created_at timestamp, in IST. */
export function createdLabel(createdAt: string): string {
  const ms = Date.parse(createdAt);
  if (!createdAt || Number.isNaN(ms)) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).format(ms);
}

export interface AnnouncementFilters {
  /** '' = all, '__none__' = announcements with no cohort, else a cohort id. */
  cohortId: string;
  status: '' | AnnouncementStatus;
  search: string;
}

export const NO_COHORT = '__none__';

export function filterAnnouncements(rows: AnnouncementRow[], f: AnnouncementFilters): AnnouncementRow[] {
  return rows.filter((r) => {
    if (f.cohortId === NO_COHORT && r.cohortId) return false;
    if (f.cohortId && f.cohortId !== NO_COHORT && r.cohortId !== f.cohortId) return false;
    if (f.status && r.status !== f.status) return false;
    return matchesSearch(f.search, [r.title, cohortLabel(r), r.content]);
  });
}

export type AnnouncementSortKey = 'title' | 'cohort' | 'audience' | 'delivery' | 'status' | 'created';

function sortValue(r: AnnouncementRow, k: AnnouncementSortKey): string | number {
  switch (k) {
    case 'title': return r.title;
    case 'cohort': return cohortLabel(r);
    case 'audience': return AUDIENCE_LABEL[r.audienceType];
    case 'delivery': return deliveryLabel(r.channels);
    case 'status': return STATUS_LABEL[r.status];
    case 'created': {
      const ms = Date.parse(r.createdAt);
      return Number.isNaN(ms) ? 0 : ms;
    }
  }
}

export function sortAnnouncements(rows: AnnouncementRow[], k: AnnouncementSortKey, dir: SortDir): AnnouncementRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareValues(sortValue(a, k), sortValue(b, k)));
}

export function announcementCsvRows(rows: AnnouncementRow[]): Array<Array<string | number>> {
  return [
    ['Title', 'Cohort', 'Audience', 'Delivery', 'Status', 'Created', 'Message', 'Attachment URL'],
    ...rows.map((r) => [
      r.title, cohortLabel(r), AUDIENCE_LABEL[r.audienceType], deliveryLabel(r.channels),
      STATUS_LABEL[r.status], createdLabel(r.createdAt), r.content, r.attachmentUrl,
    ]),
  ];
}

export function formFromRow(row: AnnouncementRow): AnnouncementForm {
  // A legacy row with no stored channel opens with In-app ticked: the server
  // writes in_app when none is sent, so that is what the row already means.
  const noChannel = row.channels.length === 0;
  return {
    cohort_id: row.cohortId,
    title: row.title,
    content: row.content,
    audience_type: row.audienceType,
    delivery_in_app: noChannel || row.channels.includes('in_app'),
    delivery_email: row.channels.includes('email'),
    delivery_whatsapp: row.channels.includes('whatsapp'),
    attachment_url: row.attachmentUrl,
    status: row.status,
  };
}

export interface FormErrors { title?: string; content?: string; channels?: string; attachment?: string }

/**
 * Title + message are required (as before). The newer checks never block an
 * edit of a legacy record: the attachment URL is checked only when it changed
 * from the stored value (`original`), so an old relative path still saves.
 */
export function validateAnnouncement(form: AnnouncementForm, original: AnnouncementForm | null = null): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'Title is required';
  if (!form.content.trim()) errors.content = 'Message is required';
  if (!form.delivery_in_app && !form.delivery_email && !form.delivery_whatsapp) errors.channels = 'Choose at least one delivery channel';
  const url = form.attachment_url.trim();
  const urlChanged = original === null || url !== original.attachment_url.trim();
  if (url && urlChanged && !/^https?:\/\/\S+$/i.test(url)) errors.attachment = 'Enter a valid URL starting with http(s)://';
  return errors;
}

/**
 * The exact body the old page posted to /admin/announcements(/:id/update).
 * One addition: when an edit keeps "Selected students", the row's existing
 * audience_user_ids go back with it — the server rewrites that column on every
 * update, so omitting them silently emptied a list set elsewhere (instructor
 * portal).
 */
export function buildAnnouncementPayload(form: AnnouncementForm, existing: AnnouncementRow | null): Record<string, unknown> {
  const channels: Channel[] = [];
  if (form.delivery_in_app) channels.push('in_app');
  if (form.delivery_email) channels.push('email');
  if (form.delivery_whatsapp) channels.push('whatsapp');
  const payload: Record<string, unknown> = {
    cohort_id: form.cohort_id,
    title: form.title.trim(),
    content: form.content.trim(),
    audience_type: form.audience_type,
    delivery_channels: channels,
    attachment_url: form.attachment_url.trim(),
    status: form.status,
  };
  if (existing && form.audience_type === 'selected' && existing.audienceUserIds.length > 0) {
    payload.audience_user_ids = existing.audienceUserIds;
  }
  return payload;
}
