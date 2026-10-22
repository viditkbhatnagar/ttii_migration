import { httpUrlOrEmpty } from '../../../../lib/safe-url.js';
import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';
import { dayMonthYear, hhmmOf, to12h, ymdOf } from '../list-model.js';

// Cohort detail view model (TTII 2026-10-12, Naji's CohortDetailModule). Pure
// reads of the GET /admin/cohorts/view payload, lifted out of ViewCohortPage so
// the rules are tested. Behaviour is the old page's.

export interface SessionView {
  id: string;
  sessionId: string;
  title: string;
  platform: string;
  platformLabel: string;
  /** "Host" / "Zoom ID" / "Password" and its value. */
  detailLabel: string;
  detailValue: string;
  joinUrl: string;
  /** What Join opens: the join URL, else the legacy Zoom page, else nothing. */
  hostUrl: string;
  date: string;
  time: string;
  /** recording_url (Spaces / manual link) or video_url (Vimeo / imported). */
  recording: string;
  /** Spaces key-backed recording — needs a signed URL to open. */
  spacesRecording: string;
  /** Legacy Vimeo / imported link (video_url). */
  videoUrl: string;
  completed: boolean;
}

export function platformLabelOf(platform: string, zoomId: string): string {
  if (platform === 'teams') return 'Microsoft Teams';
  if (platform === 'zoom') return 'Zoom';
  if (platform === 'manual') return 'Manual link';
  return zoomId ? 'Zoom' : '-';
}

export function toSessionView(s: Record<string, unknown>): SessionView {
  const id = asString(s.id) || asString(s._id);
  const platform = asString(s.platform).toLowerCase();
  const zoomId = asString(s.zoom_id);
  const joinUrl = httpUrlOrEmpty(s.join_url);
  const hostEmail = asString(s.host_email);
  const from = to12h(hhmmOf(asString(s.from_time) || asString(s.fromTime)));
  const to = to12h(hhmmOf(asString(s.to_time) || asString(s.toTime)));
  const recording = asString(s.video_url) || asString(s.recording_url);
  return {
    id,
    sessionId: asString(s.session_id),
    title: asString(s.title),
    platform,
    platformLabel: platformLabelOf(platform, zoomId),
    detailLabel: platform === 'teams' ? 'Host' : platform === 'zoom' ? 'Zoom ID' : 'Password',
    detailValue: (platform === 'teams' ? hostEmail : platform === 'zoom' ? zoomId : asString(s.password)) || '-',
    joinUrl,
    hostUrl: joinUrl || (platform === 'zoom' || (!platform && zoomId) ? `/zoom/index/${id}` : ''),
    date: dayMonthYear(ymdOf(asString(s.date))) || asString(s.date),
    time: from || to ? `${from} – ${to}` : '',
    recording,
    spacesRecording: asString(s.recording_url),
    videoUrl: asString(s.video_url),
    // A session is "completed" once it carries a recording — the old page's rule.
    completed: recording !== '',
  };
}

export function splitSessions(rows: Record<string, unknown>[]): { upcoming: SessionView[]; completed: SessionView[] } {
  const views = rows.map(toSessionView);
  return { upcoming: views.filter((s) => !s.completed), completed: views.filter((s) => s.completed) };
}

export interface LearnerView {
  id: string;
  name: string;
  image: string;
  enrollmentId: string;
  course: string;
  offering: string;
}

export function toLearnerView(l: Record<string, unknown>): LearnerView {
  return {
    id: asString(l.id) || asString(l._id),
    name: asString(l.name).toUpperCase(),
    image: asString(l.image),
    enrollmentId: asString(l.enrollment_id),
    course: asString(l.course_title),
    offering: asString(l.offering_title),
  };
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';
}

/** Submissions with a mark entered — the "Evaluated" count. */
export function evaluatedCount(subs: Record<string, unknown>[]): number {
  return subs.filter((s) => asString(s.marks).trim() !== '').length;
}

export function assignmentMarks(a: Record<string, unknown>): number {
  return asNumber(a.total_marks);
}
