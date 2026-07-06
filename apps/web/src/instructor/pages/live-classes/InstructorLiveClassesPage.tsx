import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Video,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  PlayCircle,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type {
  InstructorAttendanceSnapshot,
  InstructorLiveClassFilter,
  InstructorLiveClassRow,
} from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji UAT — Live Classes rebuilt to Naji's exact EduPulse Faculty (Lovable)
// markup: PageHeader, Upcoming/Past tabs, ClassTable / ClassCard grid, and a
// working month calendar with hover-detail popovers. His semantic classes are
// used verbatim (bg-card, text-muted-foreground, soft-shadow, bg-primary-soft,
// bg-success, Badge variants, etc.). Routing/data/shell are swapped for our
// real wiring; @tanstack/react-router, mock-data, TopBar, HoverCard, and
// ToggleGroup are replaced. The attendance dialog, recording-url loading,
// Start/Join, Edit/Delete->cohorts nav, and ?query deep-links are preserved.

type SessionStatus = 'upcoming' | 'ongoing' | 'past';
type ViewMode = 'list' | 'grid' | 'calendar';

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

function formatDay(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
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

// ---------------------------------------------------------------------------
// PageHeader — reproduced inline (his <PageHeader title subtitle />). Our
// layout provides the navbar + sidebar, so his <TopBar/> is dropped.
// ---------------------------------------------------------------------------

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational pieces (his classes verbatim)
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SessionStatus }) {
  if (status === 'ongoing')
    return <Badge className="bg-success/15 text-success hover:bg-success/20">Live</Badge>;
  if (status === 'upcoming')
    return <Badge className="bg-primary-soft text-primary hover:bg-primary-soft/80">Upcoming</Badge>;
  return <Badge variant="secondary">Completed</Badge>;
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: { id: ViewMode; label: string; icon: typeof List }[] = [
    { id: 'grid', label: 'Grid', icon: LayoutGrid },
    { id: 'list', label: 'List', icon: List },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  ];
  return (
    <div className="inline-flex rounded-full bg-muted/60 p-1">
      {options.map((o) => {
        const Icon = o.icon;
        const active = view === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            data-state={active ? 'on' : 'off'}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors data-[state=on]:bg-card data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground data-[state=off]:hover:text-foreground"
          >
            <Icon className="h-3.5 w-3.5" /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ icon: Icon, label }: { icon: typeof List; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5 text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate text-[11px]">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions — real behaviors wrapped in his button styling.
// ---------------------------------------------------------------------------

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
  const hasRecording = Boolean(row.recordingStorageKey || row.recordingUrl);
  return (
    <div className="flex items-center justify-end gap-1.5">
      {status !== 'past' ? (
        <>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit session"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete session"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : null}
      {status === 'upcoming' && row.joinUrl ? (
        <Button size="sm" className="rounded-full" onClick={onStart}>
          <PlayCircle className="mr-1 h-3.5 w-3.5" /> Start
        </Button>
      ) : null}
      {status === 'ongoing' && row.joinUrl ? (
        <Button size="sm" className="rounded-full bg-success text-white hover:bg-success/90" onClick={onJoin}>
          Join now
        </Button>
      ) : null}
      {status === 'past' && hasRecording ? (
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={recordingLoading}
          onClick={onWatch}
        >
          {recordingLoading ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Video className="mr-1 h-3.5 w-3.5" />
          )}
          View recording
        </Button>
      ) : null}
      {status === 'past' ? (
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onAttendance}>
          <Users className="mr-1 h-3.5 w-3.5" /> Attendance
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClassCard (his exact Card composition)
// ---------------------------------------------------------------------------

function ClassCard({
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
  const time = format12hTime(row.fromTime);
  const duration = durationLabel(row.fromTime, row.toTime);
  const timeLabel = time ? (duration ? `${time} · ${duration}` : time) : '—';
  return (
    <Card className="soft-shadow group overflow-hidden transition hover:-translate-y-0.5 hover:glow-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {status === 'ongoing' && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
              )}
              <p className="truncate font-semibold">{row.title || 'Untitled session'}</p>
            </div>
            {row.cohortTitle ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.cohortTitle}</p>
            ) : null}
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Stat icon={CalendarIcon} label={row.date ? formatDate(row.date) : '—'} />
          <Stat icon={Clock} label={timeLabel} />
          <Stat icon={Users} label={formatDay(row.date)} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Badge variant="outline" className="rounded-full">
            {platformLabel(row)}
          </Badge>
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
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ClassTable (his exact table structure + column order)
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
    <div className="rounded-xl border border-border/60 bg-card soft-shadow overflow-hidden">
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
                  <TableCell className="font-medium">{row.title || 'Untitled session'}</TableCell>
                  <TableCell className="text-muted-foreground">{row.cohortTitle ?? '—'}</TableCell>
                  <TableCell>{row.date ? formatDate(row.date) : '—'}</TableCell>
                  <TableCell>{formatDay(row.date)}</TableCell>
                  <TableCell>{format12hTime(row.fromTime) || '—'}</TableCell>
                  <TableCell>{durationLabel(row.fromTime, row.toTime) || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full">
                      {platformLabel(row)}
                    </Badge>
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
// Calendar (his month grid + hover popover). HoverCard is not available here,
// so the hover-detail is reproduced with plain state + his exact classes and
// plain Date math replaces date-fns.
// ---------------------------------------------------------------------------

function ymdKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // week starts Monday
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  const needsSixth = cells.slice(28, 35).some((d) => d.getMonth() === month.getMonth());
  return needsSixth ? cells : cells.slice(0, 35);
}

function CalendarView({
  rows,
  statusOf,
}: {
  rows: InstructorLiveClassRow[];
  statusOf: (row: InstructorLiveClassRow) => SessionStatus;
}) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

  const calendarDates = useMemo(() => buildMonthGrid(month), [month]);

  const classByDate = useMemo(() => {
    const map: Record<string, InstructorLiveClassRow[]> = {};
    for (const c of rows) {
      if (!c.date) continue;
      const d = new Date(c.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = ymdKey(d);
      const list = map[key] ?? [];
      list.push(c);
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
    <Card className="soft-shadow">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{monthLabel}</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
          {days.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDates.map((d) => {
            const key = ymdKey(d);
            const cs = classByDate[key];
            const isToday = key === todayKey;
            const inMonth = d.getMonth() === month.getMonth();
            return (
              <div
                key={key}
                className={`min-h-[88px] rounded-lg border p-2 text-left ${
                  isToday ? 'border-primary bg-primary-soft/40' : 'border-border/60 bg-card'
                } ${!inMonth ? 'opacity-50' : ''}`}
              >
                <span className={`text-xs font-semibold ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</span>
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
                              ? 'bg-secondary text-secondary-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          {format12hTime(c.fromTime)} {c.title}
                        </button>
                        {open ? (
                          <div
                            className="absolute left-0 top-full z-20 mt-1 w-64 space-y-3 rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
                            onMouseEnter={() => handleEnter(c.id)}
                            onMouseLeave={handleLeave}
                          >
                            <div className="space-y-0.5">
                              <p className="font-semibold text-sm">{c.title || 'Untitled session'}</p>
                              {c.cohortTitle ? (
                                <p className="text-xs text-muted-foreground">{c.cohortTitle}</p>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                              <span className="text-muted-foreground">Date</span>
                              <span>{c.date ? `${formatDate(c.date)} (${formatDay(c.date)})` : '—'}</span>
                              <span className="text-muted-foreground">Time</span>
                              <span>{format12hTime(c.fromTime) || '—'}</span>
                              <span className="text-muted-foreground">Duration</span>
                              <span>{durationLabel(c.fromTime, c.toTime) || '—'}</span>
                              <span className="text-muted-foreground">Platform</span>
                              <span>{platformLabel(c)}</span>
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
      </CardContent>
    </Card>
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

  const [tab, setTab] = useState<'upcoming' | 'past'>(initialFilter === 'past' ? 'past' : 'upcoming');
  const [view, setView] = useState<ViewMode>('list');
  const [attendanceFor, setAttendanceFor] = useState<InstructorLiveClassRow | null>(null);
  const [attendanceData, setAttendanceData] = useState<InstructorAttendanceSnapshot | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [recordingLoadingId, setRecordingLoadingId] = useState<number | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Load ALL classes once so we can compute the tab counts.
  const { data, loading, error } = useAdminPageData(
    () => api.loadLiveClasses(session.token, 'all'),
    [api, session.token],
  );

  const allRows = useMemo(() => data ?? [], [data]);

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

  // Naji's exact tabs are Upcoming / Past. Ongoing (today) sessions surface
  // under Upcoming with the Live / Join treatment his cards already render.
  const groups = useMemo(() => {
    const upcoming: InstructorLiveClassRow[] = [];
    const past: InstructorLiveClassRow[] = [];
    for (const r of allRows) {
      if (statusOf(r) === 'past') past.push(r);
      else upcoming.push(r);
    }
    return { upcoming, past };
  }, [allRows, statusOf]);

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

  const emptyLabel =
    tab === 'past' ? 'No past sessions yet.' : 'No upcoming sessions scheduled.';

  const renderRows = (rows: InstructorLiveClassRow[]) => {
    if (loading) return <PageLoader label="Loading sessions..." />;
    if (error)
      return (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
          {error}
        </div>
      );
    if (rows.length === 0)
      return (
        <div
          role="status"
          className="rounded-xl border border-dashed border-border/60 bg-card p-12 text-center text-sm text-muted-foreground"
        >
          {emptyLabel}
        </div>
      );
    if (view === 'grid')
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <ClassCard
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
      );
    return (
      <ClassTable
        rows={rows}
        statusOf={statusOf}
        onStart={openJoin}
        onJoin={openJoin}
        onWatch={(row) => void watchRecording(row)}
        onAttendance={(row) => void openAttendance(row)}
        onEdit={goToCohorts}
        onDelete={goToCohorts}
        recordingLoadingId={recordingLoadingId}
      />
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Live Classes" subtitle="Manage your Online Sessions." />

      {recordingError ? (
        <div role="alert" className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning-foreground">
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
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
              {error}
            </div>
          ) : (
            <CalendarView rows={allRows} statusOf={statusOf} />
          )}
        </>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'upcoming' | 'past')}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="upcoming">Upcoming ({groups.upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({groups.past.length})</TabsTrigger>
            </TabsList>
            <ViewToggle view={view} onChange={setView} />
          </div>
          <TabsContent value="upcoming" className="mt-4">
            {renderRows(groups.upcoming)}
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            {renderRows(groups.past)}
          </TabsContent>
        </Tabs>
      )}

      {/* Attendance dialog (behavior preserved) */}
      <Dialog open={attendanceFor !== null} onOpenChange={(open) => !open && closeAttendance()}>
        <DialogContent className="faculty-portal max-w-3xl">
          <DialogHeader>
            <DialogTitle>{attendanceFor?.title || 'Attendance'}</DialogTitle>
            <DialogDescription>
              {attendanceFor?.cohortTitle ? `${attendanceFor.cohortTitle} • ` : ''}
              {attendanceFor?.date ? formatDate(attendanceFor.date) : ''}
            </DialogDescription>
          </DialogHeader>

          {attendanceLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading attendance...
            </div>
          ) : !attendanceData || attendanceData.attendance.length === 0 ? (
            <div
              role="status"
              className="rounded-xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground"
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
                      <TableCell className="font-medium">
                        {row.userName || row.displayName || '—'}
                        {row.studentId ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">({row.studentId})</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.email ?? '—'}</TableCell>
                      <TableCell className="text-sm">{formatPercent(row.percentAttended)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatSeconds(row.totalSeconds)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {attendanceData.attendance[0]?.firstJoinedAt ? (
                <p className="mt-3 text-xs text-muted-foreground">
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
