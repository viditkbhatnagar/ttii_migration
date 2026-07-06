import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Pencil,
  PlayCircle,
  Users,
  Video,
  X,
} from 'lucide-react';
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

// Naji UAT — Live Classes restyled to match the EduPulse Faculty (Lovable)
// refresh: Grid / List / Calendar view toggle, Upcoming / Ongoing / Past tabs
// with counts, session table + cards, platform tags, and a working month
// calendar with hover detail popovers. The existing attendance dialog,
// recording-url loading, deep-links, and cohort-scheduling navigation are
// all preserved — only the presentation changed.

// ---- Local bucketing status derived from the real `date` field. The
// backend returns a raw `status` string, but the Lovable design keys off
// upcoming / ongoing (today) / past, which we compute from the date. ----
type SessionStatus = 'upcoming' | 'ongoing' | 'past';

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

function weekdayLabel(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function platformLabel(row: InstructorLiveClassRow): string {
  const url = row.joinUrl ?? row.recordingUrl ?? '';
  if (/zoom/i.test(url) || /zoom/i.test(row.title ?? '')) return 'Zoom';
  if (/teams\.microsoft|teams\.live/i.test(url)) return 'Microsoft Teams';
  return 'Live';
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function sessionStatus(row: InstructorLiveClassRow, today: Date, tomorrow: Date): SessionStatus {
  if (!row.date) return 'upcoming';
  const d = startOfDay(new Date(row.date));
  if (Number.isNaN(d.getTime())) return 'upcoming';
  if (d < today) return 'past';
  if (d < tomorrow) return 'ongoing';
  return 'upcoming';
}

type ViewMode = 'grid' | 'list' | 'calendar';
type TabKey = 'upcoming' | 'ongoing' | 'past';

// ---------------------------------------------------------------------------
// Presentational pieces
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SessionStatus }) {
  if (status === 'ongoing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
    );
  }
  if (status === 'upcoming') {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      Completed
    </span>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: { id: ViewMode; label: string; icon: typeof ListIcon }[] = [
    { id: 'grid', label: 'Grid', icon: LayoutGrid },
    { id: 'list', label: 'List', icon: ListIcon },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  ];
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1">
      {options.map((o) => {
        const Icon = o.icon;
        const active = view === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className="size-3.5" /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

function StatChip({ icon: Icon, label }: { icon: typeof ListIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5 text-slate-500">
      <Icon className="size-3 shrink-0" />
      <span className="truncate text-[11px]">{label}</span>
    </div>
  );
}

function SessionActions({
  row,
  status,
  onStart,
  onJoin,
  onWatch,
  onAttendance,
  onEdit,
  onDelete,
  recordingLoading,
  compact,
}: {
  row: InstructorLiveClassRow;
  status: SessionStatus;
  onStart: () => void;
  onJoin: () => void;
  onWatch: () => void;
  onAttendance: () => void;
  onEdit: () => void;
  onDelete: () => void;
  recordingLoading: boolean;
  compact?: boolean;
}) {
  const hasRecording = Boolean(row.recordingStorageKey || row.recordingUrl);
  return (
    <div className={`flex items-center gap-1.5 ${compact ? 'justify-end' : ''}`}>
      {status !== 'past' ? (
        <>
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
        </>
      ) : null}
      {status === 'ongoing' && row.joinUrl ? (
        <Button
          size="sm"
          className="rounded-full gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={onJoin}
        >
          Join now
        </Button>
      ) : null}
      {status === 'upcoming' && row.joinUrl ? (
        <Button
          size="sm"
          className="rounded-full gap-1 bg-violet-600 text-white hover:bg-violet-700"
          onClick={onStart}
        >
          <PlayCircle className="size-3.5" /> Start
        </Button>
      ) : null}
      {status === 'past' && hasRecording ? (
        <Button
          size="sm"
          variant="outline"
          disabled={recordingLoading}
          onClick={onWatch}
          className="rounded-full gap-1 border-slate-200"
        >
          {recordingLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Video className="size-3.5" />
          )}
          View recording
        </Button>
      ) : null}
      {status === 'past' ? (
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full gap-1 text-slate-600 hover:bg-slate-100"
          onClick={onAttendance}
        >
          <Users className="size-3.5" /> Attendance
        </Button>
      ) : null}
    </div>
  );
}

function SessionCard({
  row,
  status,
  onStart,
  onJoin,
  onWatch,
  onAttendance,
  onEdit,
  onDelete,
  recordingLoading,
}: {
  row: InstructorLiveClassRow;
  status: SessionStatus;
  onStart: () => void;
  onJoin: () => void;
  onWatch: () => void;
  onAttendance: () => void;
  onEdit: () => void;
  onDelete: () => void;
  recordingLoading: boolean;
}) {
  const timeLabel = format12hTime(row.fromTime)
    ? `${format12hTime(row.fromTime)}${durationLabel(row.fromTime, row.toTime) ? ` · ${durationLabel(row.fromTime, row.toTime)}` : ''}`
    : '—';
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900">{row.title || 'Untitled session'}</p>
          {row.cohortTitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">{row.cohortTitle}</p>
          ) : null}
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <StatChip icon={CalendarIcon} label={row.date ? formatDate(row.date) : '—'} />
        <StatChip icon={Clock} label={timeLabel} />
        <StatChip icon={Users} label={weekdayLabel(row.date)} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
          {platformLabel(row)}
        </span>
        <SessionActions
          row={row}
          status={status}
          onStart={onStart}
          onJoin={onJoin}
          onWatch={onWatch}
          onAttendance={onAttendance}
          onEdit={onEdit}
          onDelete={onDelete}
          recordingLoading={recordingLoading}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar (month grid + hover detail). Built with plain Date math since
// date-fns is not available in this workspace.
// ---------------------------------------------------------------------------

function ymdKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // Week starts on Monday.
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  // Trim the trailing full week if it's entirely in the next month.
  const trimmed = cells.slice(0, 35);
  const needsSixth = cells.slice(28, 35).some((d) => d.getMonth() === month.getMonth());
  return needsSixth ? trimmed : cells.slice(0, 35);
}

function CalendarView({
  rows,
  statusOf,
}: {
  rows: InstructorLiveClassRow[];
  statusOf: (row: InstructorLiveClassRow) => SessionStatus;
}) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const initialMonth = useMemo(() => {
    const withDate = rows.find((r) => r.date && !Number.isNaN(new Date(r.date).getTime()));
    if (withDate?.date) {
      const d = new Date(withDate.date);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [rows]);

  const [month, setMonth] = useState<Date>(initialMonth);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const grid = useMemo(() => buildMonthGrid(month), [month]);

  const byDate = useMemo(() => {
    const map: Record<string, InstructorLiveClassRow[]> = {};
    for (const r of rows) {
      if (!r.date) continue;
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = ymdKey(d);
      const list = map[key] ?? [];
      list.push(r);
      map[key] = list;
    }
    return map;
  }, [rows]);

  const handleEnter = useCallback((id: number) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredId(id);
  }, []);

  const handleLeave = useCallback(() => {
    leaveTimeoutRef.current = setTimeout(() => setHoveredId(null), 150);
  }, []);

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const todayKey = ymdKey(new Date());
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8 text-slate-500 hover:bg-slate-100" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-slate-500 hover:bg-slate-100" onClick={nextMonth} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500">
        {dayNames.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const key = ymdKey(d);
          const cs = byDate[key];
          const isToday = key === todayKey;
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <div
              key={key}
              className={`min-h-[88px] rounded-lg border p-2 text-left ${
                isToday ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white'
              } ${inMonth ? '' : 'opacity-50'}`}
            >
              <span className={`text-xs font-semibold ${isToday ? 'text-violet-600' : 'text-slate-700'}`}>
                {d.getDate()}
              </span>
              <div className="relative mt-1 space-y-0.5">
                {cs?.map((c) => {
                  const st = statusOf(c);
                  const open = hoveredId === c.id;
                  return (
                    <div
                      key={c.id}
                      className="relative"
                      onMouseEnter={() => handleEnter(c.id)}
                      onMouseLeave={handleLeave}
                    >
                      <button
                        type="button"
                        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] ${
                          st === 'past'
                            ? 'bg-slate-100 text-slate-600'
                            : st === 'ongoing'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-violet-600 text-white'
                        }`}
                      >
                        {format12hTime(c.fromTime)} {c.title}
                      </button>
                      {open ? (
                        <div
                          className="absolute left-0 top-full z-20 mt-1 w-64 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
                          onMouseEnter={() => handleEnter(c.id)}
                          onMouseLeave={handleLeave}
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-slate-900">{c.title || 'Untitled session'}</p>
                            {c.cohortTitle ? <p className="text-xs text-slate-500">{c.cohortTitle}</p> : null}
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                            <span className="text-slate-500">Date</span>
                            <span className="text-slate-900">
                              {c.date ? `${formatDate(c.date)} (${weekdayLabel(c.date)})` : '—'}
                            </span>
                            <span className="text-slate-500">Time</span>
                            <span className="text-slate-900">{format12hTime(c.fromTime) || '—'}</span>
                            <span className="text-slate-500">Duration</span>
                            <span className="text-slate-900">{durationLabel(c.fromTime, c.toTime) || '—'}</span>
                            <span className="text-slate-500">Platform</span>
                            <span className="text-slate-900">{platformLabel(c)}</span>
                          </div>
                          <div>
                            <StatusBadge status={st} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List (table) view
// ---------------------------------------------------------------------------

function ClassTable({
  rows,
  statusOf,
  onStart,
  onJoin,
  onWatch,
  onAttendance,
  onEdit,
  onDelete,
  recordingLoadingId,
}: {
  rows: InstructorLiveClassRow[];
  statusOf: (row: InstructorLiveClassRow) => SessionStatus;
  onStart: (row: InstructorLiveClassRow) => void;
  onJoin: (row: InstructorLiveClassRow) => void;
  onWatch: (row: InstructorLiveClassRow) => void;
  onAttendance: (row: InstructorLiveClassRow) => void;
  onEdit: (row: InstructorLiveClassRow) => void;
  onDelete: (row: InstructorLiveClassRow) => void;
  recordingLoadingId: number | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[240px]">Title</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const st = statusOf(row);
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-slate-900">{row.title || 'Untitled session'}</TableCell>
                  <TableCell className="text-slate-500">{row.cohortTitle ?? '—'}</TableCell>
                  <TableCell className="text-slate-700">{row.date ? formatDate(row.date) : '—'}</TableCell>
                  <TableCell className="text-slate-700">{weekdayLabel(row.date)}</TableCell>
                  <TableCell className="text-slate-700">{format12hTime(row.fromTime) || '—'}</TableCell>
                  <TableCell className="text-slate-700">{durationLabel(row.fromTime, row.toTime) || '—'}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {platformLabel(row)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={st} />
                  </TableCell>
                  <TableCell className="text-right">
                    <SessionActions
                      row={row}
                      status={st}
                      onStart={() => onStart(row)}
                      onJoin={() => onJoin(row)}
                      onWatch={() => onWatch(row)}
                      onAttendance={() => onAttendance(row)}
                      onEdit={() => onEdit(row)}
                      onDelete={() => onDelete(row)}
                      recordingLoading={recordingLoadingId === row.id}
                      compact
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InstructorLiveClassesPage({ api, session, onNavigate }: InstructorPageProps) {
  const initialFilter = useMemo<InstructorLiveClassFilter>(() => {
    if (typeof window === 'undefined') return 'upcoming';
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter');
    if (f === 'past' || f === 'all') return f;
    return 'upcoming';
  }, []);

  const [tab, setTab] = useState<TabKey>(initialFilter === 'past' ? 'past' : 'upcoming');
  const [view, setView] = useState<ViewMode>('grid');
  const [attendanceFor, setAttendanceFor] = useState<InstructorLiveClassRow | null>(null);
  const [attendanceData, setAttendanceData] = useState<InstructorAttendanceSnapshot | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [recordingLoadingId, setRecordingLoadingId] = useState<number | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Load ALL classes once so we can compute the three tab counts.
  const { data, loading, error } = useAdminPageData(
    () => api.loadLiveClasses(session.token, 'all'),
    [api, session.token],
  );

  const allRows = useMemo(() => data ?? [], [data]);

  // Scheduling lives in the cohort view (InstructorCohortsPage) to match the
  // admin portal — Naji/Risha 2026-07-06. Edit/Delete navigate there.

  const dayAnchors = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { today, tomorrow };
  }, []);

  const statusOf = useCallback(
    (row: InstructorLiveClassRow): SessionStatus => sessionStatus(row, dayAnchors.today, dayAnchors.tomorrow),
    [dayAnchors],
  );

  const buckets = useMemo(() => {
    const upcoming: InstructorLiveClassRow[] = [];
    const ongoing: InstructorLiveClassRow[] = [];
    const past: InstructorLiveClassRow[] = [];
    for (const r of allRows) {
      const st = statusOf(r);
      if (st === 'past') past.push(r);
      else if (st === 'ongoing') ongoing.push(r);
      else upcoming.push(r);
    }
    return { upcoming, ongoing, past };
  }, [allRows, statusOf]);

  const visibleRows = tab === 'past' ? buckets.past : tab === 'ongoing' ? buckets.ongoing : buckets.upcoming;

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

  const openJoin = useCallback((row: InstructorLiveClassRow) => {
    if (row.joinUrl) window.open(row.joinUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const goToCohorts = useCallback(() => onNavigate('/instructor/cohorts'), [onNavigate]);

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

  const tabs: { id: TabKey; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: buckets.upcoming.length },
    { id: 'ongoing', label: 'Ongoing', count: buckets.ongoing.length },
    { id: 'past', label: 'Past', count: buckets.past.length },
  ];

  const emptyLabel =
    tab === 'past'
      ? 'No past sessions yet.'
      : tab === 'ongoing'
        ? 'No sessions in progress right now.'
        : 'No upcoming sessions scheduled.';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Live Classes</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage your Online Sessions.</p>
      </div>

      {recordingError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {recordingError}
        </div>
      ) : null}

      {view === 'calendar' ? (
        <>
          <div className="flex items-center justify-end">
            <ViewToggle view={view} onChange={setView} />
          </div>
          {loading ? (
            <PageLoader label="Loading sessions..." />
          ) : error ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
              {error}
            </div>
          ) : (
            <CalendarView rows={allRows} statusOf={statusOf} />
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t.label}{' '}
                    <span className={active ? 'text-slate-400' : 'text-slate-400'}>({t.count})</span>
                  </button>
                );
              })}
            </div>
            <ViewToggle view={view} onChange={setView} />
          </div>

          {loading ? (
            <PageLoader label="Loading sessions..." />
          ) : error ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
              {error}
            </div>
          ) : visibleRows.length === 0 ? (
            <div
              role="status"
              className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400"
            >
              {emptyLabel}
            </div>
          ) : view === 'list' ? (
            <ClassTable
              rows={visibleRows}
              statusOf={statusOf}
              onStart={openJoin}
              onJoin={openJoin}
              onWatch={(row) => void watchRecording(row)}
              onAttendance={(row) => void openAttendance(row)}
              onEdit={goToCohorts}
              onDelete={goToCohorts}
              recordingLoadingId={recordingLoadingId}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRows.map((row) => (
                <SessionCard
                  key={row.id}
                  row={row}
                  status={statusOf(row)}
                  onStart={() => openJoin(row)}
                  onJoin={() => openJoin(row)}
                  onWatch={() => void watchRecording(row)}
                  onAttendance={() => void openAttendance(row)}
                  onEdit={goToCohorts}
                  onDelete={goToCohorts}
                  recordingLoading={recordingLoadingId === row.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Attendance dialog (behavior preserved) */}
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
            <div
              role="status"
              className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400"
            >
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
