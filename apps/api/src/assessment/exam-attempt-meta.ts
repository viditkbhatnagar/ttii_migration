// Why a formal-exam paper ended, and what the exam-screen guard saw (Risha,
// TTII 2026-11-17).
//
// A student who scored 69-70/70 on five papers handed in the sixth after 60
// seconds with 0 answers. The results page could only say "almost no answers
// saved" — whether she pressed Submit, ran out of time, or was auto-submitted
// by the proctoring guard (3 "left the exam screen" warnings) was never sent to
// the server, so nobody could tell a technical problem from a real attempt.
//
// The player now reports both. They live in the exam_attempt.draft_answers
// envelope ({ writer, answers, ... }) next to the sheet they describe, for the
// same reason the writer token does: no new column, so no DDL owed on
// production. Every reader of the column goes through parseDraftAnswers, which
// only looks at `answers`, so the extra keys are invisible to scoring.

export type SubmitReason = 'student' | 'timer' | 'proctor' | 'closed';
export type ProctorEventKind = 'tab' | 'window' | 'fullscreen';

export interface ProctorEvent {
  /** ISO instant, as the student's browser saw it. */
  at: string;
  kind: ProctorEventKind;
}

export interface ProctorReport {
  /** Warnings counted against the limit (one per slip, see the player). */
  warnings: number;
  events: ProctorEvent[];
}

export interface AttemptMeta {
  submitReason: SubmitReason | null;
  proctor: ProctorReport | null;
}

export const MAX_PROCTOR_EVENTS = 20;
const MAX_WARNINGS = 50;
const CLIENT_REASONS: ReadonlySet<string> = new Set(['student', 'timer', 'proctor']);
const SERVER_REASONS: ReadonlySet<string> = new Set([...CLIENT_REASONS, 'closed']);
const EVENT_KINDS: ReadonlySet<string> = new Set(['tab', 'window', 'fullscreen']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What a client may claim. 'closed' is the server's own (a paper graded after its window shut). */
export function parseClientSubmitReason(raw: unknown): SubmitReason | null {
  return typeof raw === 'string' && CLIENT_REASONS.has(raw) ? (raw as SubmitReason) : null;
}

function parseStoredReason(raw: unknown): SubmitReason | null {
  return typeof raw === 'string' && SERVER_REASONS.has(raw) ? (raw as SubmitReason) : null;
}

function parseEvent(raw: unknown): ProctorEvent | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  const at = raw.at;
  if (typeof kind !== 'string' || !EVENT_KINDS.has(kind)) return null;
  if (typeof at !== 'string' || at.length > 40 || Number.isNaN(Date.parse(at))) return null;
  return { at: new Date(at).toISOString(), kind: kind as ProctorEventKind };
}

/** A client's proctoring report, bounded so a rogue client cannot park junk on the row. */
export function parseProctorReport(raw: unknown): ProctorReport | null {
  const value = typeof raw === 'string' ? safeJson(raw) : raw;
  if (!isRecord(value)) return null;
  const warnings = Number(value.warnings);
  if (!Number.isInteger(warnings) || warnings < 0 || warnings > MAX_WARNINGS) return null;
  const events = Array.isArray(value.events)
    ? value.events.slice(-MAX_PROCTOR_EVENTS).map(parseEvent).filter((e): e is ProctorEvent => e !== null)
    : [];
  return { warnings, events };
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readEnvelope(rawDraft: unknown): Record<string, unknown> | null {
  const value = typeof rawDraft === 'string' ? safeJson(rawDraft.trim() || 'null') : rawDraft;
  return isRecord(value) && Array.isArray(value.answers) ? value : null;
}

/** The meta stored on an attempt's draft; nulls for a legacy row or a plain-array draft. */
export function readAttemptMeta(rawDraft: unknown): AttemptMeta {
  const envelope = readEnvelope(rawDraft);
  if (!envelope) return { submitReason: null, proctor: null };
  return {
    submitReason: parseStoredReason(envelope.submit_reason),
    proctor: parseProctorReport(envelope.proctor),
  };
}

/**
 * The draft document with `meta` merged in, keeping its writer and answers.
 * A plain-array draft (the Flutter client, legacy rows) is lifted into the
 * envelope with an empty writer, which every reader already accepts.
 */
export function withAttemptMeta(rawDraft: unknown, meta: Partial<AttemptMeta>): string {
  const envelope = readEnvelope(rawDraft);
  const plain = typeof rawDraft === 'string' ? safeJson(rawDraft.trim() || 'null') : rawDraft;
  const base: Record<string, unknown> = envelope
    ? { ...envelope }
    : { writer: '', answers: Array.isArray(plain) ? plain : [] };
  if (meta.proctor) base.proctor = meta.proctor;
  if (meta.submitReason) base.submit_reason = meta.submitReason;
  return JSON.stringify(base);
}
