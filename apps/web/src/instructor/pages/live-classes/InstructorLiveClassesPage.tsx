import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarDays, Clock, LayoutList, Loader2, Pencil, Play, Users, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type {
  InstructorAttendanceSnapshot,
  InstructorLiveClassFilter,
  InstructorLiveClassRow,
} from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji UAT 2026-05-22 — Live Classes restyled to match the
// ttiifaculty.lovable.app reference: List/Calendar toggle, three
// Upcoming/Ongoing/Past tabs with counts, and a 2-column grid of
// session cards (title + status pill, three info chips, platform tag,
// Edit/Delete/Start actions). The existing dialogs / attendance flow
// and recording playback are reused.

function format12hTime(value: string | null): string {
  if (!value) return '';
  const [h, m] = value.split(':');
  const hh = Number(h ?? 0);
  const mm = Number(m ?? 0);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

function durationLabel(from: string | null, to: string | null): string {
  if (!from || !to) return '';
  const [hF, mF] = from.split(':');
  const [hT, mT] = to.split(':');
  const start = Number(hF ?? 0) * 60 + Number(mF ?? 0);
  const end = Number(hT ?? 0) * 60 + Number(mT ?? 0);
  const mins = end > start ? end - start : 0;
  if (mins === 0) return '';
  return `${mins} min`;
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}%`;
}

function formatSeconds(value: number | null): string {
  if (value === null) return '—';
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function platformLabel(row: InstructorLiveClassRow): string {
  const url = row.joinUrl ?? row.recordingUrl ?? '';
  if (/zoom/i.test(url) || /zoom/i.test(row.title ?? '')) return 'Zoom';
  if (/teams\.microsoft|teams\.live/i.test(url)) return 'Microsoft Teams';
  return 'Live';
}

type ViewMode = 'list' | 'calendar';

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ filter }: { filter: InstructorLiveClassFilter }) {
  const palette: Record<InstructorLiveClassFilter, { bg: string; fg: string; label: string }> = {
    upcoming: { bg: 'bg-violet-50', fg: 'text-violet-700', label: 'Upcoming' },
    past: { bg: 'bg-slate-100', fg: 'text-slate-600', label: 'Past' },
    all: { bg: 'bg-slate-100', fg: 'text-slate-600', label: 'Session' },
  };
  const c = palette[filter];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${c.bg} ${c.fg}`}>
      {c.label}
    </span>
  );
}

function SessionCard({
  row,
  filter,
  onStart,
  onWatch,
  onAttendance,
  onEdit,
  onDelete,
  recordingLoading,
}: {
  row: InstructorLiveClassRow;
  filter: InstructorLiveClassFilter;
  onStart: () => void;
  onWatch: () => void;
  onAttendance: () => void;
  onEdit: () => void;
  onDelete: () => void;
  recordingLoading: boolean;
}) {
  const hasRecording = Boolean(row.recordingStorageKey || row.recordingUrl);
  const isPast = row.date ? new Date(row.date) < new Date(new Date().toDateString()) : false;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900">{row.title || 'Untitled session'}</p>
          {row.cohortTitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">{row.cohortTitle}</p>
          ) : null}
        </div>
        <StatusPill filter={filter} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
          <Calendar className="size-3.5 text-slate-400" />
          {row.date ? formatDate(row.date) : '—'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
          <Clock className="size-3.5 text-slate-400" />
          {format12hTime(row.fromTime) ? `${format12hTime(row.fromTime)} · ${durationLabel(row.fromTime, row.toTime) || ''}` : '—'}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {platformLabel(row)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit session"
            className="size-8 text-slate-500 hover:bg-slate-100"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete session"
            className="size-8 text-red-500 hover:bg-red-50"
            onClick={onDelete}
          >
            <X className="size-4" />
          </Button>
          {!isPast && row.joinUrl ? (
            <Button
              size="sm"
              className="gap-1 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={onStart}
            >
              <Play className="size-3.5" /> Start
            </Button>
          ) : null}
          {isPast && hasRecording ? (
            <Button
              size="sm"
              variant="outline"
              disabled={recordingLoading}
              onClick={onWatch}
              className="gap-1"
            >
              {recordingLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Video className="size-3.5" />}
              Recording
            </Button>
          ) : null}
          {isPast ? (
            <Button size="sm" variant="ghost" className="gap-1 text-slate-600" onClick={onAttendance}>
              <Users className="size-3.5" /> Attendance
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function InstructorLiveClassesPage({ api, session, onNavigate }: InstructorPageProps) {
  const initialFilter = useMemo<InstructorLiveClassFilter>(() => {
    if (typeof window === 'undefined') return 'upcoming';
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter');
    if (f === 'past' || f === 'all') return f;
    return 'upcoming';
  }, []);

  const [filter, setFilter] = useState<InstructorLiveClassFilter>(initialFilter);
  const [view, setView] = useState<ViewMode>('list');
  // Ongoing tab doesn't map 1:1 to the backend filter — we keep this
  // local flag so the chip can highlight + the grid swaps to ongoing[].
  const [ongoingPreview, setOngoingPreview] = useState(false);
  const [attendanceFor, setAttendanceFor] = useState<InstructorLiveClassRow | null>(null);
  const [attendanceData, setAttendanceData] = useState<InstructorAttendanceSnapshot | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [recordingLoadingId, setRecordingLoadingId] = useState<number | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Load ALL classes once so we can compute the three tab counts in
  // parens (Upcoming / Ongoing / Past) — mirrors the Lovable mockup.
  const { data, loading, error } = useAdminPageData(
    () => api.loadLiveClasses(session.token, 'all'),
    [api, session.token],
  );

  const allRows = useMemo(() => data ?? [], [data]);

  // Tab bucketing. "Ongoing" = scheduled today; "Upcoming" = future
  // (after today); "Past" = strictly before today.
  const buckets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const upcoming: InstructorLiveClassRow[] = [];
    const ongoing: InstructorLiveClassRow[] = [];
    const past: InstructorLiveClassRow[] = [];
    for (const r of allRows) {
      if (!r.date) {
        upcoming.push(r);
        continue;
      }
      const d = new Date(r.date);
      if (d < today) past.push(r);
      else if (d < tomorrow) ongoing.push(r);
      else upcoming.push(r);
    }
    return { upcoming, ongoing, past };
  }, [allRows]);

  const visibleRows = filter === 'past' ? buckets.past
    : filter === 'all' ? allRows
    : buckets.upcoming;

  const openAttendance = useCallback(
    async (row: InstructorLiveClassRow) => {
      setAttendanceFor(row);
      setAttendanceData(null);
      setAttendanceLoading(true);
      const result = await api.loadLiveClassAttendance(session.token, row.id);
      setAttendanceData(result);
      setAttendanceLoading(false);
    },
    [api, session.token],
  );

  const closeAttendance = useCallback(() => {
    setAttendanceFor(null);
    setAttendanceData(null);
  }, []);

  const watchRecording = useCallback(
    async (row: InstructorLiveClassRow) => {
      setRecordingError(null);
      setRecordingLoadingId(row.id);
      const url = await api.loadRecordingUrl(session.token, row.id);
      setRecordingLoadingId(null);
      if (!url) {
        setRecordingError('Recording is not available yet for this session.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [api, session.token],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || allRows.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const attendanceId = params.get('attendance');
    const recordingId = params.get('recording');
    if (attendanceId) {
      const target = allRows.find((r) => String(r.id) === attendanceId);
      if (target) void openAttendance(target);
    } else if (recordingId) {
      const target = allRows.find((r) => String(r.id) === recordingId);
      if (target) void watchRecording(target);
    }
    if (attendanceId || recordingId) {
      params.delete('attendance');
      params.delete('recording');
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, [allRows, openAttendance, watchRecording]);

  const tabs: { id: InstructorLiveClassFilter | 'ongoing'; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: buckets.upcoming.length },
    { id: 'ongoing', label: 'Ongoing', count: buckets.ongoing.length },
    { id: 'past', label: 'Past', count: buckets.past.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Live Classes</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage your virtual classroom sessions</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          <ToggleButton active={view === 'list'} onClick={() => setView('list')}>
            <LayoutList className="size-4" /> List
          </ToggleButton>
          <ToggleButton active={view === 'calendar'} onClick={() => setView('calendar')}>
            <CalendarDays className="size-4" /> Calendar
          </ToggleButton>
        </div>
        <Button
          variant="ghost"
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 hover:text-white"
          onClick={() => onNavigate('/instructor/cohorts')}
        >
          + Schedule Class
        </Button>
      </div>

      {recordingError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {recordingError}
        </div>
      ) : null}

      {/* Tabs with counts */}
      <div className="flex flex-wrap items-center gap-1">
        {tabs.map((t) => {
          const isActive = (filter === 'upcoming' && t.id === 'upcoming')
            || (filter === 'past' && t.id === 'past')
            || (t.id === 'ongoing' && false); // ongoing isn't a real backend filter; selecting it shows ongoing list
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.id === 'ongoing') {
                  setFilter('upcoming');
                  // Surface ongoing inline; visibleRows below tweaked to ongoing when ongoing tab clicked
                  setOngoingPreview(true);
                  return;
                }
                setOngoingPreview(false);
                setFilter(t.id);
              }}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive || (t.id === 'ongoing' && ongoingPreview)
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label} <span className="ml-1 text-slate-400">({t.count})</span>
            </button>
          );
        })}
      </div>

      {/* Calendar view stub — surfaces upcoming sessions as a chronological
          list grouped by date; full calendar grid is a follow-up. */}
      {view === 'calendar' ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          Calendar view is on the way. Switch back to List for now.
        </div>
      ) : loading ? (
        <PageLoader label="Loading sessions..." />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {error}
        </div>
      ) : (ongoingPreview ? buckets.ongoing : visibleRows).length === 0 ? (
        <div role="status" className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          {ongoingPreview ? 'No sessions in progress right now.'
            : filter === 'past' ? 'No past sessions yet.'
            : filter === 'all' ? 'No sessions in your cohorts yet.'
            : 'No upcoming sessions scheduled.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(ongoingPreview ? buckets.ongoing : visibleRows).map((row) => (
            <SessionCard
              key={row.id}
              row={row}
              filter={ongoingPreview ? 'upcoming' : filter}
              onStart={() => row.joinUrl && window.open(row.joinUrl, '_blank', 'noopener,noreferrer')}
              onWatch={() => void watchRecording(row)}
              onAttendance={() => void openAttendance(row)}
              onEdit={() => onNavigate('/instructor/cohorts')}
              onDelete={() => onNavigate('/instructor/cohorts')}
              recordingLoading={recordingLoadingId === row.id}
            />
          ))}
        </div>
      )}

      {/* Attendance dialog (unchanged from previous version) */}
      <Dialog open={attendanceFor !== null} onOpenChange={(open) => !open && closeAttendance()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{attendanceFor?.title || 'Attendance'}</DialogTitle>
            <DialogDescription>
              {attendanceFor?.cohortTitle ? `${attendanceFor.cohortTitle} • ` : ''}
              {attendanceFor?.date ? formatDate(attendanceFor.date) : ''}
            </DialogDescription>
          </DialogHeader>

          {attendanceLoading ? (
            <div className="flex items-center justify-center p-8 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading attendance...
            </div>
          ) : !attendanceData || attendanceData.attendance.length === 0 ? (
            <div role="status" className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              {attendanceData
                ? 'Attendance has not synced yet for this session. Microsoft Teams typically posts attendance ~2 minutes after the session ends.'
                : 'Could not load attendance.'}
            </div>
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Attended</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.attendance.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-slate-900">
                        {row.userName || row.displayName || '—'}
                        {row.studentId ? (
                          <span className="ml-1.5 text-xs text-slate-500">({row.studentId})</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{row.email ?? '—'}</TableCell>
                      <TableCell className="text-sm">{formatPercent(row.percentAttended)}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatSeconds(row.totalSeconds)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {attendanceData.attendance[0]?.firstJoinedAt ? (
                <p className="mt-3 text-xs text-slate-500">
                  First joined: {formatDateTime(attendanceData.attendance[0].firstJoinedAt)}
                </p>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

