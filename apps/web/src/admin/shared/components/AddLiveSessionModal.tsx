// Shared "Add Live Session" modal — the cohort-scoped scheduling dialog used by
// the admin cohort page (ViewCohortPage) and, from 2026-07-06, the instructor
// cohort view. Single or bulk (Schedule Builder) sessions + platform selector
// (Teams auto-create default, Manual link, Zoom legacy). Extracted verbatim from
// ViewCohortPage so both flows stay field-for-field identical.
//
// The `api` prop is a NARROW interface (not the full portal API class) so both
// AdminPortalApi and InstructorPortalApi satisfy it. listTeamsMeetingHosts is
// optional — the instructor portal can't call the admin-only host endpoint, so
// it simply omits it and the host-count hint falls back to a neutral message.
//
// TTII 2026-08-11 — top-level flow choice: "Create New Live Class" (everything
// below, unchanged) vs "Link Existing Recorded Session", which reuses last
// term's recordings for the SAME SUBJECT instead of asking the trainer to
// re-record. The link flow's two api methods are optional for the same reason
// as listTeamsMeetingHosts: the endpoints are admin-guarded, so a client that
// omits them simply never sees the choice.

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, CalendarPlus, Library, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClassTimeInput } from '@/components/ui/class-time-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { titleCaseOnBlur } from '@/lib/text-format';
import {
  RecordedSessionLinkPanel,
  type RecordedSessionHistory, type RecordedSessionImportResult,
} from './RecordedSessionLinkPanel.js';

type SessionEntryInput = {
  sessionId: string;
  title: string;
  date: string;
  fromTime: string;
  toTime: string;
  isRepetitive?: boolean;
  repeatDates?: string[];
};

/* The recorded-session shapes live in RecordedSessionLinkPanel (imported
   above) rather than in admin-portal-api, so this modal stays decoupled from
   any one portal's API class — AdminPortalApi satisfies them structurally,
   exactly as it already does for SessionEntryInput. */

/**
 * TTII 2026-08-11 — plus what the server left OUT of `months`, in its own
 * words: "N recorded session(s) are not listed because they have no date on
 * record and cannot be grouped by month." That sentence lives in the response
 * envelope's `message`, and the API client used to drop it, so the deliberate
 * decision to REPORT undated rows rather than silently discard them never
 * reached the admin — the month list was just quietly short. Optional so a
 * client that has nothing to add still satisfies the interface.
 */
type RecordedSessionHistoryWithNotice = RecordedSessionHistory & { notice?: string };

export interface LiveSessionScheduleApi {
  /** Optional — admin portal only (instructor can't call the admin host endpoint). */
  listTeamsMeetingHosts?: (token: string) => Promise<Array<{ is_active: number }>>;
  /** Optional pair — admin portal only. Both must be present for the
      "Link Existing Recorded Session" choice to appear at all. */
  listCohortRecordedSessions?: (token: string, cohortId: string) => Promise<RecordedSessionHistoryWithNotice>;
  importCohortRecordedSessions?: (
    token: string,
    cohortId: string,
    sessionIds: number[],
  ) => Promise<RecordedSessionImportResult>;
  addCohortLiveSession: (
    token: string,
    cohortId: string,
    input: SessionEntryInput & {
      zoomId?: string;
      password?: string;
      platform?: 'teams' | 'zoom' | 'manual' | 'other';
      teamsHostEmail?: string;
      manualJoinUrl?: string;
    },
  ) => Promise<Record<string, unknown>>;
  addCohortLiveSessionsBulk: (
    token: string,
    cohortId: string,
    input: {
      platform?: 'teams' | 'zoom' | 'manual' | 'other';
      teamsHostEmail?: string;
      manualJoinUrl?: string;
      zoomId?: string;
      password?: string;
      entries: SessionEntryInput[];
    },
  ) => Promise<Record<string, unknown>>;
}

type ScheduleEntry = {
  date: string;
  fromTime: string;
  toTime: string;
  title: string;
  selected: boolean;
};

const WEEKDAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type WeekdayKey = typeof WEEKDAY_KEYS[number];

// Weekday index where Monday=0 ... Sunday=6.
function weekdayIndex(d: Date): WeekdayKey {
  const js = d.getDay(); // 0=Sun ... 6=Sat
  const monIdx = (js + 6) % 7;
  return WEEKDAY_KEYS[monIdx] as WeekdayKey;
}

// "2026-03-14" → "14 Mar 2026" for the preview table.
function formatSessionDate(d: string): string {
  if (!d) return '';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[parsed.getUTCMonth()] ?? '';
  return `${day} ${month} ${parsed.getUTCFullYear()}`;
}

export function AddLiveSessionModal({
  open, onClose, api, token, cohortId, submitting, setSubmitting, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: LiveSessionScheduleApi;
  token: string;
  cohortId: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  // TTII 2026-08-11 — 'create' is the pre-existing flow, byte-for-byte.
  const [flow, setFlow] = useState<'create' | 'link'>('create');
  const [mode, setMode] = useState<'multiple' | 'single'>('multiple');
  const [platform, setPlatform] = useState<'teams' | 'zoom' | 'manual'>('teams');
  const [teamsHostCount, setTeamsHostCount] = useState<number | null>(null);
  const [manualJoinUrl, setManualJoinUrl] = useState('');
  const [zoomId, setZoomId] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');

  // Single-mode fields
  const [date, setDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [isRepetitive, setIsRepetitive] = useState(false);

  // Multiple-mode schedule builder
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleFrom, setScheduleFrom] = useState('');
  const [scheduleTo, setScheduleTo] = useState('');
  const [pickedDays, setPickedDays] = useState<Set<WeekdayKey>>(new Set(['Mon', 'Wed', 'Fri']));
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);

  // Link-existing-recording flow
  const [history, setHistory] = useState<RecordedSessionHistoryWithNotice | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Rows were added behind the dialog, so closing must reload the cohort page.
  const [importedAny, setImportedAny] = useState(false);

  const canLink = typeof api.listCohortRecordedSessions === 'function'
    && typeof api.importCohortRecordedSessions === 'function';

  useEffect(() => {
    // Risha UAT 2026-08-12 — .bind(api) is NOT optional. `api` is the
    // AdminPortalApi INSTANCE and these are ordinary methods that call
    // `this.get(...)`, so pulling one off the object detaches `this` and the
    // call dies with "Cannot read properties of undefined (reading 'get')".
    // The local is only here to keep TypeScript's narrowing inside the async
    // closure below; binding preserves the receiver as well. This line had the
    // bug silently — the failure is swallowed by the catch, which is why the
    // Teams host count never appeared.
    const listHosts = api.listTeamsMeetingHosts?.bind(api);
    if (!open || platform !== 'teams' || !listHosts) return;
    let cancelled = false;
    void (async () => {
      try {
        const hosts = await listHosts(token);
        if (cancelled) return;
        const activeCount = hosts.filter((h) => h.is_active === 1).length;
        setTeamsHostCount(activeCount);
      } catch {
        if (!cancelled) setTeamsHostCount(null);
      }
    })();
    return () => { cancelled = true; };
  }, [api, token, open, platform]);

  // Load the subject's recorded history the first time the Link flow is
  // opened, and again after every import so the "Already imported" badges are
  // the server's truth rather than an optimistic guess.
  useEffect(() => {
    // .bind(api) — see the note above listTeamsMeetingHosts. Without it this
    // threw "Cannot read properties of undefined (reading 'get')" in the panel
    // and the subject read as "None set", because the fetch never ran.
    const loadHistory = api.listCohortRecordedSessions?.bind(api);
    if (!open || flow !== 'link' || !loadHistory) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError('');
    void (async () => {
      try {
        const result = await loadHistory(token, cohortId);
        if (cancelled) return;
        setHistory(result);
      } catch (err) {
        if (cancelled) return;
        setHistory(null);
        setHistoryError(err instanceof Error ? err.message : 'Could not load past sessions.');
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, token, cohortId, open, flow, historyReloadKey]);

  // Ids still importable right now — guards a selection made before a refetch
  // flipped some rows to already-imported.
  const importableIds = useMemo(() => {
    const ids = new Set<number>();
    for (const month of history?.months ?? []) {
      for (const entry of month.sessions) {
        if (!entry.alreadyImported) ids.add(entry.id);
      }
    }
    return ids;
  }, [history]);

  const selectedImportableIds = useMemo(
    () => [...selectedIds].filter((id) => importableIds.has(id)),
    [selectedIds, importableIds],
  );

  const toggleSession = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runImport = async (ids: number[]) => {
    // .bind(api) — see the note above listTeamsMeetingHosts.
    const importSessions = api.importCohortRecordedSessions?.bind(api);
    if (!importSessions) return;
    if (ids.length === 0) {
      toast.error('Select at least one recorded session to import.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await importSessions(token, cohortId, ids);
      // The server dedupes, so a second press reports skips instead of
      // duplicating. Say so plainly rather than claiming a success of 0.
      if (result.imported === 0 && result.skipped > 0) {
        toast.info(result.message
          || `Already in this cohort — skipped ${result.skipped} session${result.skipped === 1 ? '' : 's'}.`);
      } else {
        const skippedNote = result.skipped > 0 ? `, skipped ${result.skipped} already imported` : '';
        toast.success(result.message
          || `Imported ${result.imported} recorded session${result.imported === 1 ? '' : 's'}${skippedNote}.`);
      }
      if (result.imported > 0) setImportedAny(true);
      setSelectedIds(new Set());
      setHistoryReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import recorded sessions');
    } finally {
      setSubmitting(false);
    }
  };

  // Closing after an import must refresh the cohort page behind the dialog —
  // onSuccess is exactly "close + reload" at the call site.
  const handleClose = () => {
    if (importedAny) onSuccess();
    else onClose();
  };

  const toggleDay = (d: WeekdayKey) => {
    setPickedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const handleGenerate = () => {
    if (!scheduleStart || !scheduleEnd || !scheduleFrom || !scheduleTo) {
      toast.error('Fill start date, end date and times before generating.');
      return;
    }
    if (pickedDays.size === 0) {
      toast.error('Pick at least one day of the week.');
      return;
    }
    const start = new Date(scheduleStart);
    const end = new Date(scheduleEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      toast.error('End date must be on or after start date.');
      return;
    }
    const generated: ScheduleEntry[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      if (pickedDays.has(weekdayIndex(cursor))) {
        const yyyy = cursor.getFullYear();
        const mm = String(cursor.getMonth() + 1).padStart(2, '0');
        const dd = String(cursor.getDate()).padStart(2, '0');
        generated.push({
          date: `${yyyy}-${mm}-${dd}`,
          fromTime: scheduleFrom,
          toTime: scheduleTo,
          title: title.trim() || 'Live Session',
          selected: true,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (generated.length === 0) {
      toast.error('No matching dates in this range.');
      return;
    }
    setEntries(generated);
  };

  const updateEntry = (idx: number, patch: Partial<ScheduleEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };
  const removeSelected = () => setEntries((prev) => prev.filter((e) => !e.selected));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sharedExtras: { manualJoinUrl?: string; zoomId?: string; password?: string } = {};
      if (platform === 'manual') {
        if (!manualJoinUrl.trim()) { toast.error('Paste the meeting link.'); setSubmitting(false); return; }
        sharedExtras.manualJoinUrl = manualJoinUrl.trim();
      } else if (platform === 'zoom') {
        sharedExtras.zoomId = zoomId;
        sharedExtras.password = password;
      }

      let result: Record<string, unknown>;
      if (mode === 'single') {
        if (!title || !date || !fromTime || !toTime) {
          toast.error('Fill all required fields.');
          setSubmitting(false);
          return;
        }
        // Auto-generate the session ID (matches the multiple-session flow) —
        // admins asked not to type one for single sessions (Risha UAT 2026-06-23).
        const sessionId = `LS-${Date.now()}`;
        result = await api.addCohortLiveSession(token, cohortId, {
          sessionId, title, date, fromTime, toTime, isRepetitive, platform,
          ...sharedExtras,
        });
      } else {
        if (entries.length === 0) {
          toast.error('Generate sessions before saving.');
          setSubmitting(false);
          return;
        }
        const baseSessionId = `LS-${Date.now()}`;
        result = await api.addCohortLiveSessionsBulk(token, cohortId, {
          platform,
          ...sharedExtras,
          entries: entries.map((e, idx) => ({
            sessionId: `${baseSessionId}-${idx + 1}`,
            title: e.title || title.trim() || 'Live Session',
            date: e.date,
            fromTime: e.fromTime,
            toTime: e.toTime,
          })),
        });
      }

      const success = result.success === true || result.success === 1 || result.status === 1;
      if (!success) {
        toast.error((result.message as string) || 'Failed to add session');
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      {/* Risha UAT 2026-08-06 idiom — modal-maxh carries a real @supports vh
          fallback (a bare dvh cap is stripped by Lightning CSS and then ignored
          by dvh-less webviews, leaving the modal unbounded and the footer
          unreachable); shrink-0 header/footer with ONE scrolling body; anchored
          to the top on phones so the centred box is not pushed down behind the
          browser toolbars. Both flows are long lists on a 360px screen. */}
      <DialogContent
        className="top-2 flex modal-maxh translate-y-0 flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0 sm:top-[50%] sm:translate-y-[-50%]"
        style={{ width: 'min(720px, calc(100vw - 2rem))', maxWidth: 'min(720px, calc(100vw - 2rem))' }}
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (flow === 'link') { void runImport(selectedImportableIds); return; }
            void handleSubmit();
          }}
        >
          <DialogHeader className="shrink-0 border-b border-gray-200 p-4 sm:p-6">
            <DialogTitle className="pr-8 text-base sm:text-lg">
              {flow === 'link' ? 'Link Existing Recorded Session' : `Add Live Session${mode === 'multiple' ? 's' : ''}`}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {/* TTII 2026-08-11 — the two options TTII asked for. Hidden when the
                client has no recorded-session endpoints (instructor portal). */}
            {canLink && (
              <div className="mb-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="How to add this session">
                {[
                  { key: 'create' as const, icon: CalendarPlus, title: 'Create New Live Class', hint: 'Schedule a new session with a meeting link.' },
                  { key: 'link' as const, icon: Library, title: 'Link Existing Recorded Session', hint: "Reuse recordings already made for this cohort's subject." },
                ].map((option) => {
                  const Icon = option.icon;
                  const active = flow === option.key;
                  return (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors ${active ? 'border-ttii-primary bg-ttii-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <input
                        type="radio"
                        name="live-session-flow"
                        className="mt-0.5 size-4 shrink-0"
                        checked={active}
                        onChange={() => setFlow(option.key)}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                          <Icon className="size-4 shrink-0 text-ttii-primary" aria-hidden="true" />
                          {option.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500">{option.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {flow === 'create' && (<div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 text-xs">Mode</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={mode === 'multiple'} onChange={() => setMode('multiple')} />
                  Multiple Sessions
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={mode === 'single'} onChange={() => setMode('single')} />
                  Single Session
                </label>
              </div>
            </div>

            <div className="rounded-md border bg-gray-50 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Basic Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-xs">Platform *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as 'teams' | 'zoom' | 'manual')}
                  >
                    <option value="teams">Microsoft Teams (auto-create)</option>
                    <option value="manual">Manual link (Teams / Zoom / Meet)</option>
                    <option value="zoom">Zoom (legacy)</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1 text-xs">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={titleCaseOnBlur(setTitle)} placeholder="e.g. Physics — Batch A" />
                </div>
              </div>
              {platform === 'teams' && (
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                  {teamsHostCount === null ? (
                    <p className="text-xs text-blue-800">Auto-assigning a free Teams faculty account from the pool…</p>
                  ) : teamsHostCount === 0 ? (
                    <p className="text-xs text-amber-800">
                      No Teams faculty accounts configured. Ask an admin to add hosts under
                      <span className="font-semibold"> Integrations → Teams Meeting Hosts</span>.
                    </p>
                  ) : (
                    <p className="text-xs text-blue-800">
                      <span className="font-semibold">Auto-assign</span> — picks a free Teams faculty from the pool
                      of <span className="font-semibold">{teamsHostCount}</span>. If none are free for the chosen time,
                      saving is blocked with a warning.
                    </p>
                  )}
                </div>
              )}
              {platform === 'manual' && (
                <div>
                  <Label className="mb-1 text-xs">Meeting Link *</Label>
                  <Input value={manualJoinUrl} onChange={(e) => setManualJoinUrl(e.target.value)}
                    placeholder="https://teams.microsoft.com/l/... or Zoom/Meet URL" />
                </div>
              )}
              {platform === 'zoom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 text-xs">Zoom ID</Label>
                    <Input value={zoomId} onChange={(e) => setZoomId(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs">Password</Label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {mode === 'single' && (
              <div className="rounded-md border bg-white p-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Session</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 text-xs">Date *</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs">From Time *</Label>
                    <ClassTimeInput value={fromTime} onChange={setFromTime} />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs">To Time *</Label>
                    <ClassTimeInput value={toTime} onChange={setToTime} />
                  </div>
                  <label className="flex items-end gap-2 text-xs">
                    <input type="checkbox" checked={isRepetitive} onChange={(e) => setIsRepetitive(e.target.checked)} className="size-4" />
                    Is Repetitive?
                  </label>
                </div>
              </div>
            )}

            {mode === 'multiple' && (
              <div className="rounded-md border bg-white p-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Schedule Builder</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 text-xs">Start Date *</Label>
                    <Input type="date" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs">End Date *</Label>
                    <Input type="date" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs">From Time *</Label>
                    <ClassTimeInput value={scheduleFrom} onChange={setScheduleFrom} />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs">To Time *</Label>
                    <ClassTimeInput value={scheduleTo} onChange={setScheduleTo} />
                  </div>
                </div>
                <div>
                  <Label className="mb-1 text-xs">Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_KEYS.map((d) => (
                      <label key={d} className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs cursor-pointer ${pickedDays.has(d) ? 'border-ttii-primary bg-ttii-primary/10 text-ttii-primary' : 'border-gray-300 text-gray-600'}`}>
                        <input type="checkbox" checked={pickedDays.has(d)} onChange={() => toggleDay(d)} className="size-3" />
                        {d}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerate}>
                    Generate Sessions
                  </Button>
                </div>

                {entries.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Session Preview ({entries.length})
                      </p>
                      <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={removeSelected}>
                        <Trash2 className="mr-1 size-3" /> Remove Selected
                      </Button>
                    </div>
                    <div className="overflow-x-auto rounded border border-gray-200">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left">
                          <tr>
                            <th className="px-2 py-2 w-8"></th>
                            <th className="px-2 py-2">#</th>
                            <th className="px-2 py-2">Date</th>
                            <th className="px-2 py-2">Day</th>
                            {/* Naji UAT 2026-05-22 — From/To Time editable per row so
                                instructors can fine-tune a single session out of the bulk
                                generated set without regenerating everything. */}
                            <th className="px-2 py-2">From Time</th>
                            <th className="px-2 py-2">To Time</th>
                            <th className="px-2 py-2">Title</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e, idx) => {
                            const day = weekdayIndex(new Date(e.date));
                            return (
                              <tr key={idx} className="border-t">
                                <td className="px-2 py-1.5">
                                  <input type="checkbox" checked={e.selected} onChange={(ev) => updateEntry(idx, { selected: ev.target.checked })} className="size-3" />
                                </td>
                                <td className="px-2 py-1.5">{idx + 1}</td>
                                <td className="px-2 py-1.5">{formatSessionDate(e.date)}</td>
                                <td className="px-2 py-1.5">{day}</td>
                                <td className="px-2 py-1.5">
                                  <ClassTimeInput value={e.fromTime} onChange={(v) => updateEntry(idx, { fromTime: v })} className="h-7 w-24 text-xs" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <ClassTimeInput value={e.toTime} onChange={(v) => updateEntry(idx, { toTime: v })} className="h-7 w-24 text-xs" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input value={e.title} onChange={(ev) => updateEntry(idx, { title: ev.target.value })} onBlur={titleCaseOnBlur((value) => updateEntry(idx, { title: value }))} className="h-7 text-xs" />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>)}

            {/* The server's own account of what it did NOT list. Rendered here
                rather than inside the panel because the panel is presentational
                and the fetch (and therefore the envelope) belongs to this
                modal. Suppressed while loading/erroring, and when the cohort has
                no subject — the panel's amber empty state already says exactly
                that, word for word. */}
            {flow === 'link' && !historyLoading && !historyError
              && (history?.notice ?? '') !== '' && (history?.subjectId ?? '') !== '' && (
              <div
                role="status"
                className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
              >
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">{history?.notice}</span>
              </div>
            )}

            {flow === 'link' && (
              <RecordedSessionLinkPanel
                history={history}
                loading={historyLoading}
                error={historyError}
                busy={submitting}
                selectedIds={selectedIds}
                onRetry={() => setHistoryReloadKey((k) => k + 1)}
                onToggleSession={toggleSession}
                onImportMonth={(sessionIds) => { void runImport(sessionIds); }}
                onSwitchToCreate={() => setFlow('create')}
              />
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-gray-200 bg-white p-4 sm:p-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              {flow === 'link' && importedAny ? 'Done' : 'Cancel'}
            </Button>
            {flow === 'link' ? (
              <Button
                type="submit"
                disabled={submitting || selectedImportableIds.length === 0}
                className="bg-ttii-primary hover:bg-ttii-primary/90"
              >
                {submitting
                  ? 'Importing...'
                  : selectedImportableIds.length === 0
                    ? 'Import Selected'
                    : `Import ${selectedImportableIds.length} Session${selectedImportableIds.length === 1 ? '' : 's'}`}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitting || (mode === 'single' ? (!title || !date || !fromTime || !toTime) : entries.length === 0)}
                className="bg-ttii-primary hover:bg-ttii-primary/90"
              >
                {submitting ? 'Saving...' : mode === 'multiple' ? 'Save All' : 'Save'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
