// "Link Existing Recorded Session" panel — the second flow of
// AddLiveSessionModal (TTII 2026-08-11). A new cohort studying the same
// subject reuses last term's recordings instead of the trainer re-recording
// them, or students having no catch-up material.
//
// Presentational only: AddLiveSessionModal owns the history fetch, the
// selection and the import call, because its sticky footer carries the primary
// "Import N Sessions" action. This file owns the shapes (so the modal's narrow
// api interface can reference them without importing a portal API class) and
// the Year → Month → Sessions rendering that TTII explicitly asked for.
//
// TWO RECORDING SOURCES, both importable and visibly labelled: Teams meetings
// sync to DO Spaces (recording_url) while legacy course videos live on Vimeo
// (video_url). They are deliberately not consolidated — a screen that only
// understood Teams recordings would show an empty list for Communicative
// English, whose entire recorded history is video links.

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Download, CheckCircle2, Video, Link2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type RecordedSession = {
  id: number;
  title: string;
  /** 'YYYY-MM-DD' or ISO; '' when the source row has a NULL date. */
  date: string;
  /** 'HH:MM' IST wall clock. */
  fromTime: string;
  toTime: string;
  cohortTitle: string;
  source: 'teams' | 'video';
  alreadyImported: boolean;
};

export type RecordedSessionMonth = {
  year: number;
  month: number;
  label: string;
  sessionCount: number;
  alreadyImported: boolean;
  sessions: RecordedSession[];
};

export type RecordedSessionHistory = {
  /** '' means the cohort has NO subject set — a different problem, and a
      different fix, from "subject set but nothing recorded yet". */
  subjectId: string;
  subjectTitle: string;
  months: RecordedSessionMonth[];
};

export type RecordedSessionImportResult = {
  imported: number;
  skipped: number;
  message: string;
};

function monthKey(month: RecordedSessionMonth): string {
  return `${month.year}-${month.month}`;
}

function importableIdsOf(month: RecordedSessionMonth): number[] {
  return month.sessions.filter((s) => !s.alreadyImported).map((s) => s.id);
}

// Read the LEADING YYYY-MM-DD straight off the string — no Date parsing at
// all. Feeding a bare date to new Date() parses it as UTC midnight and renders
// the previous day in IST, which is the trap this whole module lives next to.
function formatRecordedDate(value: string): string {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts || !parts[1] || !parts[2] || !parts[3]) return 'Date not recorded';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = Number(parts[2]) - 1;
  const month = monthIdx >= 0 && monthIdx <= 11 ? months[monthIdx] : undefined;
  if (!month) return 'Date not recorded';
  return `${parts[3]} ${month} ${parts[1]}`;
}

// "19:00" → "7:00 PM". The stored value is already the IST wall clock.
function format12hTime(hhmm: string): string {
  const parts = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!parts || !parts[1] || !parts[2]) return '';
  const hour = Number(parts[1]);
  if (!Number.isFinite(hour)) return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${((hour + 11) % 12) + 1}:${parts[2]} ${period}`;
}

// Labels, not colour alone — an admin has to be able to tell a Teams recording
// from a legacy video link on a monochrome phone screen too.
function RecordedSourceBadge({ source }: { source: RecordedSession['source'] }) {
  if (source === 'teams') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
        <Video className="size-3" aria-hidden="true" /> Teams recording
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
      <Link2 className="size-3" aria-hidden="true" /> Video link
    </span>
  );
}

function RecordedMonthCard({
  month, expanded, busy, selectedIds, onToggleExpand, onToggleSession, onImportMonth,
}: {
  month: RecordedSessionMonth;
  expanded: boolean;
  busy: boolean;
  selectedIds: Set<number>;
  onToggleExpand: () => void;
  onToggleSession: (id: number) => void;
  onImportMonth: () => void;
}) {
  const importable = importableIdsOf(month);
  // Fall back to the month-level flag for the degenerate case where the server
  // sent a count but no session rows.
  const importedCount = month.sessions.length > 0
    ? month.sessions.length - importable.length
    : (month.alreadyImported ? month.sessionCount : 0);
  const allImported = month.sessions.length > 0 ? importable.length === 0 : month.alreadyImported;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Stacks on a 360px phone, sits on one row from sm up. */}
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Chevron className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900">{month.label}</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              {month.sessionCount} recorded session{month.sessionCount === 1 ? '' : 's'}
              {importedCount > 0 ? ` · ${importedCount} already in this cohort` : ''}
            </span>
          </span>
        </button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || importable.length === 0}
          onClick={onImportMonth}
          className="w-full shrink-0 sm:w-auto"
        >
          {allImported ? (
            <><CheckCircle2 className="mr-1 size-3.5 text-emerald-600" aria-hidden="true" /> All imported</>
          ) : (
            <><Download className="mr-1 size-3.5" aria-hidden="true" /> Import all{importable.length > 0 ? ` ${importable.length}` : ''}</>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-2">
          {month.sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-gray-500">
              This month has {month.sessionCount} recorded session{month.sessionCount === 1 ? '' : 's'}, but the server
              did not return their details, so they cannot be picked individually.
            </p>
          ) : (
            <ul className="space-y-1">
              {month.sessions.map((entry) => {
                const from = format12hTime(entry.fromTime);
                const to = format12hTime(entry.toTime);
                const timeLabel = from && to ? `${from} - ${to}` : from;
                return (
                  <li key={entry.id}>
                    <label
                      className={`flex items-start gap-2 rounded-md p-2 ${
                        entry.alreadyImported ? 'bg-emerald-50/60' : 'cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      {/* Ticked-and-locked, not blank-and-locked: an already
                          imported session should read as done, not as skipped. */}
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0"
                        checked={entry.alreadyImported || selectedIds.has(entry.id)}
                        disabled={entry.alreadyImported || busy}
                        onChange={() => onToggleSession(entry.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="min-w-0 truncate text-xs font-medium text-gray-900">
                            {entry.title || 'Untitled session'}
                          </span>
                          <RecordedSourceBadge source={entry.source} />
                          {entry.alreadyImported && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle2 className="size-3" aria-hidden="true" /> Already imported
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-gray-500">
                          {formatRecordedDate(entry.date)}
                          {timeLabel ? ` · ${timeLabel}` : ''}
                          {entry.cohortTitle ? ` · from ${entry.cohortTitle}` : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function RecordedSessionLinkPanel({
  history, loading, error, busy, selectedIds,
  onRetry, onToggleSession, onImportMonth, onSwitchToCreate,
}: {
  history: RecordedSessionHistory | null;
  loading: boolean;
  error: string;
  busy: boolean;
  selectedIds: Set<number>;
  onRetry: () => void;
  onToggleSession: (id: number) => void;
  onImportMonth: (sessionIds: number[]) => void;
  onSwitchToCreate: () => void;
}) {
  const months = history?.months ?? [];
  const hasSubject = (history?.subjectId ?? '') !== '';

  // Which months are open is pure presentation, so it lives here rather than
  // in the modal.
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const newestKey = months[0] ? monthKey(months[0]) : '';

  // Open the newest month once the history arrives — the Year/Month grouping is
  // the point of this screen, so it should not open as a row of closed drawers.
  // Never re-opens a month the admin has since collapsed.
  useEffect(() => {
    if (newestKey === '') return;
    setExpandedMonths((prev) => (prev.size > 0 ? prev : new Set([newestKey])));
  }, [newestKey]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* The whole flow keys off the cohort's subject, so it is stated up front
          instead of silently assumed. */}
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Subject detected from this cohort</p>
        <p className="mt-1 text-sm font-semibold text-gray-900">
          {loading && !history ? 'Detecting...' : (history?.subjectTitle || (hasSubject ? 'Untitled subject' : 'None set'))}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading past sessions...
        </div>
      ) : error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onRetry}>Try again</Button>
        </div>
      ) : !hasSubject ? (
        /* Empty state 1 of 2 — a MISSING SUBJECT, which the admin can fix.
           Kept distinct from "nothing recorded yet": same blank panel,
           completely different remedy. */
        <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> This cohort has no subject set.
          </p>
          <p className="mt-2 text-xs">
            Past recordings are matched by subject, so there is nothing to search for yet. Set this cohort&apos;s
            Subject under <span className="font-semibold">Cohorts &rarr; Edit</span>, then reopen this dialog. In the
            meantime you can{' '}
            <button type="button" className="font-semibold underline" onClick={onSwitchToCreate}>
              create a new live class
            </button>.
          </p>
        </div>
      ) : months.length === 0 ? (
        /* Empty state 2 of 2 — subject IS set, nothing recorded under it. Names
           the sources searched, so "never recorded" is distinguishable from
           "we looked in the wrong place". */
        <div role="status" className="rounded-md border border-gray-200 bg-gray-50 p-4 text-gray-700">
          <p className="text-sm font-semibold">
            No past recorded sessions for {history?.subjectTitle || 'this subject'}.
          </p>
          <p className="mt-2 text-xs">
            Only sessions that already carry a recording can be imported — a Teams recording synced to storage, or a
            video link saved on the session. Classes that ran but were never recorded are not listed. If an earlier
            batch studied this subject under a different subject record, its sessions will not appear here.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Counts below are <span className="font-semibold">recorded</span> sessions only — a month may have run more
            classes than this if some were never recorded.
          </p>
          {months.map((month) => (
            <RecordedMonthCard
              key={monthKey(month)}
              month={month}
              expanded={expandedMonths.has(monthKey(month))}
              busy={busy}
              selectedIds={selectedIds}
              onToggleExpand={() => toggleMonth(monthKey(month))}
              onToggleSession={onToggleSession}
              onImportMonth={() => onImportMonth(importableIdsOf(month))}
            />
          ))}
        </>
      )}
    </div>
  );
}
