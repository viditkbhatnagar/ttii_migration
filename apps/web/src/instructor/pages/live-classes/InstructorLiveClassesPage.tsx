import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, Play, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type {
  InstructorAttendanceSnapshot,
  InstructorLiveClassFilter,
  InstructorLiveClassRow,
} from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

function formatTimeRange(from: string | null, to: string | null): string {
  const trim = (t: string | null) => (t ?? '').slice(0, 5);
  return [trim(from), trim(to)].filter(Boolean).join(' – ');
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

function statusBadge(row: InstructorLiveClassRow) {
  const hasRecording = Boolean(row.recordingStorageKey || row.recordingUrl);
  const hasAttendance = Boolean(row.attendanceFetchedAt);
  if (hasRecording && hasAttendance) {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Synced</Badge>;
  }
  if (hasRecording || hasAttendance) {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Partial</Badge>;
  }
  return <Badge variant="outline">Pending</Badge>;
}

export default function InstructorLiveClassesPage({ api, session }: InstructorPageProps) {
  const initialFilter = useMemo<InstructorLiveClassFilter>(() => {
    if (typeof window === 'undefined') return 'upcoming';
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter');
    if (f === 'past' || f === 'all') return f;
    return 'upcoming';
  }, []);

  const [filter, setFilter] = useState<InstructorLiveClassFilter>(initialFilter);
  const [attendanceFor, setAttendanceFor] = useState<InstructorLiveClassRow | null>(null);
  const [attendanceData, setAttendanceData] = useState<InstructorAttendanceSnapshot | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [recordingLoadingId, setRecordingLoadingId] = useState<number | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const { data, loading, error } = useAdminPageData(
    () => api.loadLiveClasses(session.token, filter),
    [api, session.token, filter],
  );

  const rows = data ?? [];

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

  // Auto-trigger from query param (?attendance=<id> or ?recording=<id>) once rows load
  useEffect(() => {
    if (typeof window === 'undefined' || rows.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const attendanceId = params.get('attendance');
    const recordingId = params.get('recording');
    if (attendanceId) {
      const target = rows.find((r) => String(r.id) === attendanceId);
      if (target) void openAttendance(target);
    } else if (recordingId) {
      const target = rows.find((r) => String(r.id) === recordingId);
      if (target) void watchRecording(target);
    }
    if (attendanceId || recordingId) {
      params.delete('attendance');
      params.delete('recording');
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, [rows, openAttendance, watchRecording]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">Live Classes</h1>
        <p className="mt-1 text-sm text-student-muted">
          Upcoming and past live sessions for your cohorts.
        </p>
      </div>

      {recordingError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {recordingError}
        </div>
      ) : null}

      <Tabs value={filter} onValueChange={(value) => setFilter(value as InstructorLiveClassFilter)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <PageLoader label="Loading sessions..." />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-student-muted">
          {filter === 'upcoming'
            ? 'No upcoming sessions scheduled.'
            : filter === 'past'
              ? 'No past sessions yet.'
              : 'No sessions in your cohorts yet.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const hasRecording = Boolean(row.recordingStorageKey || row.recordingUrl);
                const isPast = row.date ? new Date(row.date) < new Date(new Date().toDateString()) : false;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-student-text">{row.title || 'Untitled'}</TableCell>
                    <TableCell className="text-sm text-student-muted">{row.cohortTitle ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5 text-student-muted">
                        <Calendar className="h-3.5 w-3.5" />
                        {row.date ? formatDate(row.date) : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-student-muted">
                      {formatTimeRange(row.fromTime, row.toTime) || '—'}
                    </TableCell>
                    <TableCell>{statusBadge(row)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        {!isPast && row.joinUrl ? (
                          <Button
                            size="sm"
                            className="bg-student-primary text-white hover:bg-student-primary/90"
                            onClick={() => window.open(row.joinUrl ?? '#', '_blank', 'noopener,noreferrer')}
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" /> Start Class
                          </Button>
                        ) : null}
                        {isPast && hasRecording ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={recordingLoadingId === row.id}
                            onClick={() => void watchRecording(row)}
                          >
                            {recordingLoadingId === row.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Video className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Watch Recording
                          </Button>
                        ) : null}
                        {isPast ? (
                          <Button size="sm" variant="ghost" onClick={() => void openAttendance(row)}>
                            <Users className="mr-1.5 h-3.5 w-3.5" /> Attendance
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
            <div className="flex items-center justify-center p-8 text-student-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading attendance...
            </div>
          ) : !attendanceData || attendanceData.attendance.length === 0 ? (
            <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-student-muted">
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
                      <TableCell className="font-medium text-student-text">
                        {row.userName || row.displayName || '—'}
                        {row.studentId ? (
                          <span className="ml-1.5 text-xs text-student-muted">({row.studentId})</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-student-muted">{row.email ?? '—'}</TableCell>
                      <TableCell className="text-sm">{formatPercent(row.percentAttended)}</TableCell>
                      <TableCell className="text-sm text-student-muted">{formatSeconds(row.totalSeconds)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {attendanceData.attendance[0]?.firstJoinedAt ? (
                <p className="mt-3 text-xs text-student-muted">
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
