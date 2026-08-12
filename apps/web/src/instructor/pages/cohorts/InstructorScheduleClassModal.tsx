// Faculty-portal "Schedule New Class" modal — Naji's Lovable "Add Live Sessions"
// design (Mode radio, Basic Details + Schedule Builder cards, day toggle pills,
// Generate Sessions, editable Preview & Edit list, "Schedule N Session(s)").
//
// The MARKUP is his Lovable dialog (faculty semantic classes: bg-primary,
// bg-primary-soft, border-border/60, text-muted-foreground, …). The DATA logic
// (generate over a start→end date range filtered by weekday, single vs bulk
// submit) is lifted verbatim from admin/shared/components/AddLiveSessionModal so
// both flows stay field-for-field identical against the same backend endpoint.
//
// Instructor has NO listTeamsMeetingHosts (admin-only), so the Teams hint is a
// static "auto-assigning" line — the server picks a free Teams faculty host.
//
// Dialog + Select portal to <body>, escaping the parent's `.faculty-portal`
// wrapper, so `faculty-portal` is re-applied to DialogContent AND SelectContent
// (theme-escape gotcha — otherwise magenta admin tokens bleed in).

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClassTimeInput } from '@/components/ui/class-time-input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { titleCaseOnBlur } from '@/lib/text-format';
import { cn } from '@/lib/utils';

// Narrow interface both InstructorPortalApi and AdminPortalApi satisfy — mirrors
// LiveSessionScheduleApi from AddLiveSessionModal (minus the admin-only host
// endpoint the instructor path never calls).
type SessionEntryPayload = {
  sessionId: string;
  title: string;
  date: string;
  fromTime: string;
  toTime: string;
};

export interface ScheduleClassApi {
  addCohortLiveSession: (
    token: string,
    cohortId: string,
    input: SessionEntryPayload & {
      zoomId?: string;
      password?: string;
      platform?: 'teams' | 'zoom' | 'manual' | 'other';
      manualJoinUrl?: string;
    },
  ) => Promise<Record<string, unknown>>;
  addCohortLiveSessionsBulk: (
    token: string,
    cohortId: string,
    input: {
      platform?: 'teams' | 'zoom' | 'manual' | 'other';
      manualJoinUrl?: string;
      zoomId?: string;
      password?: string;
      entries: SessionEntryPayload[];
    },
  ) => Promise<Record<string, unknown>>;
}

const WEEKDAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

// Weekday label where Monday=0 … Sunday=6 (matches AddLiveSessionModal).
function weekdayIndex(d: Date): WeekdayKey {
  const monIdx = (d.getDay() + 6) % 7;
  return WEEKDAY_KEYS[monIdx] ?? 'Mon';
}

type GeneratedSession = {
  id: string;
  date: string; // YYYY-MM-DD (built from LOCAL parts to avoid UTC day-shift)
  day: WeekdayKey;
  fromTime: string;
  toTime: string;
  title: string;
};

type Platform = 'teams' | 'zoom' | 'manual';

export function InstructorScheduleClassModal({
  open,
  onClose,
  api,
  token,
  cohortId,
  cohortName,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  api: ScheduleClassApi;
  token: string;
  cohortId: string;
  cohortName: string;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'multiple' | 'single'>('multiple');
  const [platform, setPlatform] = useState<Platform>('teams');
  const [title, setTitle] = useState('');
  const [manualJoinUrl, setManualJoinUrl] = useState('');
  const [zoomId, setZoomId] = useState('');
  const [password, setPassword] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [pickedDays, setPickedDays] = useState<Set<WeekdayKey>>(
    () => new Set<WeekdayKey>(['Mon', 'Wed', 'Fri']),
  );
  const [sessions, setSessions] = useState<GeneratedSession[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleDay = (d: WeekdayKey) => {
    setPickedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const generateSessions = () => {
    if (!startDate || !fromTime || !toTime) {
      toast.error('Fill start date and times before generating.');
      return;
    }
    if (mode === 'multiple' && !endDate) {
      toast.error('Fill an end date for multiple sessions.');
      return;
    }
    if (mode === 'multiple' && pickedDays.size === 0) {
      toast.error('Pick at least one day of the week.');
      return;
    }
    const start = new Date(startDate);
    const end = mode === 'multiple' ? new Date(endDate) : new Date(startDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      toast.error('End date must be on or after start date.');
      return;
    }
    const out: GeneratedSession[] = [];
    const cursor = new Date(start);
    let i = 0;
    while (cursor <= end) {
      const include = mode === 'single' ? true : pickedDays.has(weekdayIndex(cursor));
      if (include) {
        // Build YYYY-MM-DD from LOCAL parts (never toISOString — that shifts a
        // day back in IST). Matches the AddLiveSessionModal generate.
        const yyyy = cursor.getFullYear();
        const mm = String(cursor.getMonth() + 1).padStart(2, '0');
        const dd = String(cursor.getDate()).padStart(2, '0');
        out.push({
          id: `s-${cursor.getTime()}-${i++}`,
          date: `${yyyy}-${mm}-${dd}`,
          day: weekdayIndex(cursor),
          fromTime,
          toTime,
          title: title.trim() || 'Live Session',
        });
      }
      if (mode === 'single') break;
      cursor.setDate(cursor.getDate() + 1);
    }
    if (out.length === 0) {
      toast.error('No matching dates in this range.');
      return;
    }
    setSessions(out);
  };

  const updateSession = (id: string, patch: Partial<GeneratedSession>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const changeSessionDate = (id: string, value: string) => {
    const parsed = new Date(value);
    const day = value && !isNaN(parsed.getTime()) ? weekdayIndex(parsed) : undefined;
    updateSession(id, day ? { date: value, day } : { date: value });
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const resetAndClose = () => {
    setSessions([]);
    onClose();
  };

  const handleSubmit = async () => {
    if (sessions.length === 0) {
      toast.error('Generate sessions before scheduling.');
      return;
    }
    setSubmitting(true);
    try {
      // Platform-specific extras, built conditionally so we never pass
      // `undefined` for exactOptionalPropertyTypes.
      const sharedExtras: { manualJoinUrl?: string; zoomId?: string; password?: string } = {};
      if (platform === 'manual') {
        if (!manualJoinUrl.trim()) {
          toast.error('Paste the meeting link.');
          setSubmitting(false);
          return;
        }
        sharedExtras.manualJoinUrl = manualJoinUrl.trim();
      } else if (platform === 'zoom') {
        sharedExtras.zoomId = zoomId;
        sharedExtras.password = password;
      }

      const baseSessionId = `LS-${Date.now()}`;
      let result: Record<string, unknown>;

      if (mode === 'single') {
        const first = sessions[0];
        if (!first) {
          toast.error('Generate a session before scheduling.');
          setSubmitting(false);
          return;
        }
        result = await api.addCohortLiveSession(token, cohortId, {
          sessionId: baseSessionId,
          title: first.title || title.trim() || 'Live Session',
          date: first.date,
          fromTime: first.fromTime,
          toTime: first.toTime,
          platform,
          ...sharedExtras,
        });
      } else {
        result = await api.addCohortLiveSessionsBulk(token, cohortId, {
          platform,
          ...sharedExtras,
          entries: sessions.map((s, idx) => ({
            sessionId: `${baseSessionId}-${idx + 1}`,
            title: s.title || title.trim() || 'Live Session',
            date: s.date,
            fromTime: s.fromTime,
            toTime: s.toTime,
          })),
        });
      }

      const success = result.success === true || result.success === 1 || result.status === 1;
      if (!success) {
        toast.error((result.message as string) || 'Failed to schedule session.');
        setSubmitting(false);
        return;
      }
      setSessions([]);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule session.');
    } finally {
      setSubmitting(false);
    }
  };

  const scheduleLabel = `Schedule ${sessions.length} Session${sessions.length === 1 ? '' : 's'}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      {/* Thasneem 2026-08-12 — modal-maxh rather than a bare max-h-[85dvh]:
          Lightning CSS keeps a lone dvh declaration, so a webview without dvh
          support gets NO height cap and the dialog runs off the screen. Same
          85dvh everywhere that supports it, 78vh where it does not. */}
      <DialogContent className="faculty-portal modal-maxh max-w-2xl overflow-y-auto [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>Add Live Sessions</DialogTitle>
          <DialogDescription>For {cohortName}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {/* Mode */}
          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">Mode</Label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                <input
                  type="radio"
                  name="schedule-mode"
                  className="h-4 w-4 accent-primary"
                  checked={mode === 'multiple'}
                  onChange={() => setMode('multiple')}
                />
                Multiple Sessions
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                <input
                  type="radio"
                  name="schedule-mode"
                  className="h-4 w-4 accent-primary"
                  checked={mode === 'single'}
                  onChange={() => setMode('single')}
                />
                Single Session
              </label>
            </div>
          </div>

          {/* Basic Details */}
          <div className="grid gap-3 rounded-lg border border-border/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Basic Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Platform *</Label>
                <Select value={platform} onValueChange={(v) => v && setPlatform(v as Platform)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent className="faculty-portal">
                    <SelectItem value="teams">Microsoft Teams (auto-create)</SelectItem>
                    <SelectItem value="manual">Manual link (Teams / Zoom / Meet)</SelectItem>
                    <SelectItem value="zoom">Zoom (legacy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Title</Label>
                <Input
                  placeholder="e.g. Physics — Batch A"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={titleCaseOnBlur(setTitle)}
                />
              </div>
            </div>
            {platform === 'teams' && (
              <p className="text-xs text-primary">
                Auto-assigning a free Teams faculty account from the pool…
              </p>
            )}
            {platform === 'manual' && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Meeting Link *</Label>
                <Input
                  value={manualJoinUrl}
                  onChange={(e) => setManualJoinUrl(e.target.value)}
                  placeholder="https://teams.microsoft.com/l/… or Zoom/Meet URL"
                />
              </div>
            )}
            {platform === 'zoom' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Zoom ID</Label>
                  <Input value={zoomId} onChange={(e) => setZoomId(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Password</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Schedule Builder */}
          <div className="grid gap-3 rounded-lg border border-border/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Schedule Builder
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Start Date *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              {mode === 'multiple' && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">End Date *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label className="text-xs">From Time *</Label>
                <ClassTimeInput value={fromTime} onChange={setFromTime} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">To Time *</Label>
                <ClassTimeInput value={toTime} onChange={setToTime} />
              </div>
            </div>

            {mode === 'multiple' && (
              <div className="grid gap-2">
                <Label className="text-xs">Days</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_KEYS.map((day) => {
                    const selected = pickedDays.has(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        aria-pressed={selected}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition',
                          selected
                            ? 'border-primary bg-primary-soft text-primary'
                            : 'border-border/60 bg-background text-muted-foreground hover:bg-muted/50',
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button type="button" variant="outline" className="w-full" onClick={generateSessions}>
              Generate Sessions
            </Button>
          </div>

          {/* Preview & Edit */}
          {sessions.length > 0 && (
            <div className="grid gap-3 rounded-lg border border-border/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Preview &amp; Edit ({sessions.length})
              </p>
              <div className="hidden grid-cols-[1fr_80px_110px_110px_1.4fr_40px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
                <span>Date</span>
                <span>Day</span>
                <span>Start</span>
                <span>End</span>
                <span>Title</span>
                <span></span>
              </div>
              <div className="grid gap-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-2 gap-2 rounded-md border border-border/50 bg-muted/20 p-2 md:grid-cols-[1fr_80px_110px_110px_1.4fr_40px] md:items-center md:bg-transparent md:p-1"
                  >
                    <Input
                      type="date"
                      value={s.date}
                      onChange={(e) => changeSessionDate(s.id, e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input value={s.day} readOnly className="h-8 bg-muted/40 text-xs" />
                    <ClassTimeInput
                      value={s.fromTime}
                      onChange={(v) => updateSession(s.id, { fromTime: v })}
                      className="h-8 text-xs"
                    />
                    <ClassTimeInput
                      value={s.toTime}
                      onChange={(v) => updateSession(s.id, { toTime: v })}
                      className="h-8 text-xs"
                    />
                    <Input
                      value={s.title}
                      onChange={(e) => updateSession(s.id, { title: e.target.value })}
                      onBlur={titleCaseOnBlur((value) => updateSession(s.id, { title: value }))}
                      className="col-span-2 h-8 text-xs md:col-span-1"
                      placeholder="Session title"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 h-8 w-full text-destructive hover:bg-destructive/10 hover:text-destructive md:col-span-1 md:w-8"
                      onClick={() => deleteSession(s.id)}
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={resetAndClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || sessions.length === 0}
          >
            {submitting ? 'Scheduling…' : scheduleLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
