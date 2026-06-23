import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { formatSessionDate } from '../../shared/utils/admin-data-utils.js';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseOnBlur } from '@/lib/text-format';

export type ScheduleEntry = {
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

export type CohortOption = { id: string; title: string };

/**
 * Add Live Session(s) dialog. Used in two places:
 *   - Inside a cohort detail page (ViewCohortPage) with a fixed `cohortId`.
 *   - On the global Live Sessions page (LiveClassPage) with a `cohorts` list,
 *     which renders a cohort picker so an admin can add a session without first
 *     drilling into a specific cohort (Risha UAT 2026-06-23).
 *
 * Session IDs are auto-generated (`LS-<timestamp>`) for both single and
 * multiple sessions — admins asked not to type one for single sessions, since
 * group sessions already auto-generate it (Risha UAT 2026-06-23).
 */
export function AddLiveSessionModal({
  open, onClose, api, token, cohortId, cohorts, submitting, setSubmitting, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: AdminPageProps['api'];
  token: string;
  cohortId?: string;
  cohorts?: CohortOption[];
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'multiple' | 'single'>('multiple');
  // Cohort picker is only shown when a `cohorts` list is supplied (global Live
  // Sessions page). On a cohort detail page the `cohortId` prop is fixed.
  const [selectedCohortId, setSelectedCohortId] = useState(cohortId ?? '');
  const effectiveCohortId = cohorts ? selectedCohortId : (cohortId ?? '');
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

  useEffect(() => {
    if (!open || platform !== 'teams') return;
    let cancelled = false;
    void (async () => {
      try {
        const hosts = await api.listTeamsMeetingHosts(token);
        if (cancelled) return;
        const activeCount = hosts.filter((h) => h.is_active === 1).length;
        setTeamsHostCount(activeCount);
      } catch {
        if (!cancelled) setTeamsHostCount(null);
      }
    })();
    return () => { cancelled = true; };
  }, [api, token, open, platform]);

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
      if (!effectiveCohortId) {
        toast.error('Select a cohort first.');
        setSubmitting(false);
        return;
      }
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
        // Auto-generate the session ID (matches the multiple-session flow).
        const sessionId = `LS-${Date.now()}`;
        result = await api.addCohortLiveSession(token, effectiveCohortId, {
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
        result = await api.addCohortLiveSessionsBulk(token, effectiveCohortId, {
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form
          onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
        >
          <DialogHeader>
            <DialogTitle>Add Live Session{mode === 'multiple' ? 's' : ''}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {cohorts && (
              <div>
                <Label className="mb-1 text-xs">Cohort *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                >
                  <option value="">Select a cohort…</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

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
                    <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs">To Time *</Label>
                    <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
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
                    <Input type="time" value={scheduleFrom} onChange={(e) => setScheduleFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs">To Time *</Label>
                    <Input type="time" value={scheduleTo} onChange={(e) => setScheduleTo(e.target.value)} />
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
                                  <Input type="time" value={e.fromTime} onChange={(ev) => updateEntry(idx, { fromTime: ev.target.value })} className="h-7 w-24 text-xs" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input type="time" value={e.toTime} onChange={(ev) => updateEntry(idx, { toTime: ev.target.value })} className="h-7 w-24 text-xs" />
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={submitting || !effectiveCohortId || (mode === 'single' ? (!title || !date || !fromTime || !toTime) : entries.length === 0)}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {submitting ? 'Saving...' : mode === 'multiple' ? 'Save All' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
