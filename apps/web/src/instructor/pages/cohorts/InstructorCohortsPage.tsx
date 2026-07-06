import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ClipboardCheck,
  Download,
  Loader2,
  Megaphone,
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Users,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { AddLiveSessionModal } from '../../../admin/shared/components/AddLiveSessionModal.js';
import type {
  InstructorAssignmentSummary,
  InstructorCohortDetailSnapshot,
  InstructorCohortSummary,
  InstructorLiveClassRow,
} from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji UAT — EduPulse Faculty refresh. The cohort LIST (grid/table) reproduces
// Naji's Lovable markup verbatim (his semantic .faculty-portal classes:
// bg-primary, bg-primary-soft, text-muted-foreground, soft-shadow, glow-shadow,
// gradients, etc.). Clicking a cohort now opens his FULL in-page detail view
// (hero + Live Classes / Assignments / Learners / Announcements tabs) rather
// than a small modal — matching his cohorts.$cohortId route. Every value is a
// real API field: cohorts from api.loadCohorts / api.loadDashboard, live
// classes from api.loadLiveClasses (cohort-filtered), assignments from
// api.loadAssignments (cohort-filtered), learners from api.loadCohortDetail,
// and cohort-scoped scheduling via the shared AddLiveSessionModal. No mock data.

type CohortView = 'grid' | 'table';

function formatRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  return `${start ? formatDate(start) : '—'} → ${end ? formatDate(end) : '—'}`;
}

function nextSessionLabel(value: string | null): string {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const datePart = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : (weekdays[d.getDay()] ?? formatDate(value));
  return `${datePart} · ${formatDate(value)}`;
}

// His Lovable learner status pill used `bg-success/15 text-success` etc. Map our
// real statusLabel onto his semantic tone classes so it renders in the faculty
// theme rather than admin magenta.
function statusToneClass(label: string): string {
  switch (label) {
    case 'Active':
      return 'bg-success/15 text-success hover:bg-success/20';
    case 'Graduated':
      return 'bg-info/15 text-info hover:bg-info/20';
    case 'Dropped':
      return 'bg-destructive/15 text-destructive hover:bg-destructive/20';
    default:
      return 'bg-muted text-muted-foreground hover:bg-muted';
  }
}

// Approximate course progress from dates (cohort.startDate / endDate). If either
// is missing we fall back to 0 so the bar still renders. This mirrors how the
// Lovable mockup shows a progress %, without a separate completion table.
function computeProgressPercent(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

function format12hTime(value: string | null): string {
  if (!value) return '';
  const [h, m] = value.split(':');
  const hh = Number(h ?? 0);
  const mm = Number(m ?? 0);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

function platformLabel(row: InstructorLiveClassRow): string {
  const url = row.joinUrl ?? row.recordingUrl ?? '';
  if (/zoom/i.test(url) || /zoom/i.test(row.title ?? '')) return 'Zoom';
  if (/teams\.microsoft|teams\.live/i.test(url)) return 'Microsoft Teams';
  return 'Live';
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// date >= today (local) counts as upcoming; strictly earlier is past.
function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return day.getTime() >= startOfToday().getTime();
}

// ---------------------------------------------------------------------------
// Real client-side CSV download (his Lovable used XLSX; we ship a dependency-
// free CSV so no new package is added and the byte content is real).
// ---------------------------------------------------------------------------

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','));
  // Prepend a UTF-8 BOM so Excel opens accented/Unicode names correctly.
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFilePart(value: string): string {
  return (value || 'cohort').replace(/\s+/g, '_').replace(/[^\w-]/g, '');
}

// ---------------------------------------------------------------------------
// Presentational pieces from his cohorts.$cohortId route (classes verbatim).
// ---------------------------------------------------------------------------

function EmptyState({ icon: Icon, text }: { icon: typeof Video; text: string }) {
  return (
    <Card className="soft-shadow border-dashed">
      <CardContent className="flex flex-col items-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function LiveClassStatusBadge({ upcoming }: { upcoming: boolean }) {
  if (upcoming)
    return <Badge className="bg-primary-soft text-primary hover:bg-primary-soft/80">Upcoming</Badge>;
  return <Badge variant="secondary">Completed</Badge>;
}

// His ClassRow — title/date/time/platform + Join (upcoming) / View recording (past).
function ClassRow({
  row,
  upcoming,
  onJoin,
  onWatch,
  recordingLoading,
}: {
  row: InstructorLiveClassRow;
  upcoming: boolean;
  onJoin: () => void;
  onWatch: () => void;
  recordingLoading: boolean;
}) {
  const time = format12hTime(row.fromTime);
  const hasRecording = Boolean(row.recordingStorageKey || row.recordingUrl);
  return (
    <Card className="soft-shadow">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{row.title || 'Untitled session'}</p>
          <p className="text-xs text-muted-foreground">
            {row.date ? formatDate(row.date) : '—'}
            {time ? ` · ${time}` : ''} · {platformLabel(row)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveClassStatusBadge upcoming={upcoming} />
          {upcoming ? (
            <Button size="sm" variant="outline" disabled={!row.joinUrl} onClick={onJoin}>
              Join
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={!hasRecording || recordingLoading}
              onClick={onWatch}
            >
              {recordingLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Video className="mr-1.5 h-4 w-4" />
              )}
              View recording
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Cohort detail — his full in-page view (hero + 4 tabs), wired to real data.
// ---------------------------------------------------------------------------

function CohortDetailView({
  api,
  session,
  onNavigate,
  cohort,
  detail,
  detailLoading,
  progress,
  attendance,
  onBack,
}: {
  api: InstructorPageProps['api'];
  session: InstructorPageProps['session'];
  onNavigate: InstructorPageProps['onNavigate'];
  cohort: InstructorCohortSummary;
  detail: InstructorCohortDetailSnapshot | null;
  detailLoading: boolean;
  progress: number;
  attendance: number;
  onBack: () => void;
}) {
  // Lazily load this cohort's live classes + assignments once the detail opens.
  const { data: allClasses, loading: classesLoading, error: classesError, reload: reloadClasses } = useAdminPageData(
    () => api.loadLiveClasses(session.token, 'all'),
    [api, session.token],
  );
  const { data: allAssignments, loading: assignmentsLoading, error: assignmentsError } =
    useAdminPageData(() => api.loadAssignments(session.token), [api, session.token]);

  const [recordingLoadingId, setRecordingLoadingId] = useState<number | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [learnerQuery, setLearnerQuery] = useState('');

  const cohortClasses = useMemo(
    () => (allClasses ?? []).filter((row) => row.cohortId === cohort.id),
    [allClasses, cohort.id],
  );
  const upcomingClasses = useMemo(
    () => cohortClasses.filter((row) => isUpcoming(row.date)),
    [cohortClasses],
  );
  const pastClasses = useMemo(
    () => cohortClasses.filter((row) => !isUpcoming(row.date)),
    [cohortClasses],
  );

  const cohortAssignments = useMemo<InstructorAssignmentSummary[]>(
    () => (allAssignments ?? []).filter((a) => a.cohortId === cohort.id),
    [allAssignments, cohort.id],
  );

  const learners = useMemo(() => detail?.learners ?? [], [detail]);
  const filteredLearners = useMemo(() => {
    const q = learnerQuery.trim().toLowerCase();
    if (!q) return learners;
    return learners.filter(
      (l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q),
    );
  }, [learners, learnerQuery]);

  const watchRecording = useCallback(
    async (row: InstructorLiveClassRow) => {
      setRecordingLoadingId(row.id);
      const url = await api.loadRecordingUrl(session.token, row.id);
      setRecordingLoadingId(null);
      if (!url) {
        toast.error('Recording is not available yet for this session.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [api, session.token],
  );

  const openJoin = useCallback((row: InstructorLiveClassRow) => {
    if (row.joinUrl) window.open(row.joinUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const downloadClasses = useCallback(() => {
    if (cohortClasses.length === 0) {
      toast.error('No live classes to export.');
      return;
    }
    downloadCsv(
      `${safeFilePart(cohort.title)}_Live_Classes.csv`,
      ['Class ID', 'Title', 'Date', 'From', 'To', 'Platform', 'Status'],
      cohortClasses.map((row) => [
        row.id,
        row.title || 'Untitled session',
        row.date ?? '',
        row.fromTime ?? '',
        row.toTime ?? '',
        platformLabel(row),
        isUpcoming(row.date) ? 'Upcoming' : 'Completed',
      ]),
    );
    toast.success('Live class list downloaded');
  }, [cohortClasses, cohort.title]);

  const downloadLearners = useCallback(() => {
    if (filteredLearners.length === 0) {
      toast.error('No learners to export.');
      return;
    }
    downloadCsv(
      `${safeFilePart(cohort.title)}_Learners.csv`,
      ['Learner ID', 'Name', 'Email', 'Phone', 'Enrollment ID', 'Status'],
      filteredLearners.map((l) => [
        l.id,
        l.name || '—',
        l.email || '—',
        l.phone || '—',
        l.enrollmentId ?? '—',
        l.statusLabel,
      ]),
    );
    toast.success('Learner list downloaded');
  }, [filteredLearners, cohort.title]);

  const tabTriggerClass =
    'h-full rounded-xl px-5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground data-[state=active]:bg-primary data-[state=active]:font-semibold data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20';

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
        onClick={onBack}
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> All cohorts
      </Button>

      {/* Hero — his exact gradient + badge + stat grid */}
      <Card className="soft-shadow overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary via-primary to-[oklch(0.42_0.22_300)] p-6 text-primary-foreground">
          <Badge className="bg-white/15 text-white hover:bg-white/20">
            {cohort.courseTitle || 'Cohort'}
          </Badge>
          <h2 className="mt-3 text-2xl font-bold">{cohort.title || 'Cohort'}</h2>
          <p className="mt-1 text-xs text-white/70">
            Cohort ID: <span className="font-medium text-white">{cohort.cohortCode || '—'}</span>
          </p>
          <p className="mt-1 text-xs text-white/70">
            {formatRange(cohort.startDate, cohort.endDate)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Learners', value: String(cohort.learnerCount) },
              { label: 'Progress', value: `${progress}%` },
              { label: 'Upcoming', value: String(cohort.upcomingSessionCount) },
              { label: 'Attendance', value: attendance > 0 ? `${attendance}%` : '—' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[10px] uppercase tracking-wider text-white/70">{s.label}</p>
                <p className="mt-1 text-lg font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="live-classes">
        <TabsList className="mx-auto flex h-12 w-fit items-stretch justify-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
          <TabsTrigger value="live-classes" className={tabTriggerClass}>
            Live Classes
          </TabsTrigger>
          <TabsTrigger value="assignments" className={tabTriggerClass}>
            Assignments
          </TabsTrigger>
          <TabsTrigger value="learners" className={tabTriggerClass}>
            Learners
          </TabsTrigger>
          <TabsTrigger value="announcements" className={tabTriggerClass}>
            Announcements
          </TabsTrigger>
        </TabsList>

        {/* Live Classes tab — his Upcoming/Past sub-tabs + Download + Schedule */}
        <TabsContent value="live-classes" className="mt-4 space-y-3">
          <Tabs defaultValue="upcoming">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="w-fit bg-muted/60">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past Classes</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Download live class list as CSV"
                  onClick={downloadClasses}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button className="rounded-full" onClick={() => setScheduleOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Schedule New Class
                </Button>
              </div>
            </div>

            {classesLoading ? (
              <div className="mt-4 flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading live classes...
              </div>
            ) : classesError ? (
              <Card className="soft-shadow border-destructive/40">
                <CardContent className="p-8 text-center text-sm text-destructive" role="alert">
                  {classesError}
                </CardContent>
              </Card>
            ) : (
              <>
                <TabsContent value="upcoming" className="mt-4 space-y-3">
                  {upcomingClasses.length === 0 ? (
                    <EmptyState icon={Video} text="No upcoming classes scheduled." />
                  ) : (
                    upcomingClasses.map((row) => (
                      <ClassRow
                        key={row.id}
                        row={row}
                        upcoming
                        onJoin={() => openJoin(row)}
                        onWatch={() => void watchRecording(row)}
                        recordingLoading={recordingLoadingId === row.id}
                      />
                    ))
                  )}
                </TabsContent>
                <TabsContent value="past" className="mt-4 space-y-3">
                  {pastClasses.length === 0 ? (
                    <EmptyState icon={Video} text="No past classes yet." />
                  ) : (
                    pastClasses.map((row) => (
                      <ClassRow
                        key={row.id}
                        row={row}
                        upcoming={false}
                        onJoin={() => openJoin(row)}
                        onWatch={() => void watchRecording(row)}
                        recordingLoading={recordingLoadingId === row.id}
                      />
                    ))
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </TabsContent>

        {/* Assignments tab — his rows (title / due / submissions) + Review */}
        <TabsContent value="assignments" className="mt-4 space-y-3">
          {assignmentsLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading assignments...
            </div>
          ) : assignmentsError ? (
            <Card className="soft-shadow border-destructive/40">
              <CardContent className="p-8 text-center text-sm text-destructive" role="alert">
                {assignmentsError}
              </CardContent>
            </Card>
          ) : cohortAssignments.length === 0 ? (
            <EmptyState icon={ClipboardCheck} text="No assignments." />
          ) : (
            cohortAssignments.map((a) => (
              <Card key={a.id} className="soft-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title || 'Untitled assignment'}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {a.dueDate ? formatDate(a.dueDate) : '—'} · {a.submissionCount}
                      {a.totalMarks !== null ? `/${a.totalMarks}` : ''} submitted
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate('/instructor/assignments')}
                  >
                    Review
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Learners tab — his card layout + search + Download. Per-learner
            Attendance%/Performance% bars + Good/Average badge DROPPED (no such
            data); we surface the real enrollment id + status badge instead. */}
        <TabsContent value="learners" className="mt-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={learnerQuery}
                  onChange={(e) => setLearnerQuery(e.target.value)}
                  placeholder="Search learners by name or email"
                  className="pl-9"
                  aria-label="Search learners"
                />
              </div>
              <Button
                size="icon"
                variant="outline"
                aria-label="Download learner list as CSV"
                onClick={downloadLearners}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <Card className="soft-shadow">
              <CardContent className="p-0">
                {detailLoading ? (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading learners...
                  </div>
                ) : !detail ? (
                  <div className="p-8 text-center text-sm text-muted-foreground" role="status">
                    Could not load learner roster.
                  </div>
                ) : learners.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground" role="status">
                    No learners enrolled in this cohort yet.
                  </div>
                ) : filteredLearners.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No learners match &quot;{learnerQuery}&quot;.
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredLearners.map((l) => (
                      <div key={l.id} className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                          {(l.name || '?')
                            .split(' ')
                            .map((n) => n[0] ?? '')
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{l.name || '—'}</p>
                          <p className="truncate text-xs text-muted-foreground">{l.email || '—'}</p>
                        </div>
                        <div className="hidden w-40 md:block">
                          <p className="text-[10px] uppercase text-muted-foreground">Enrollment ID</p>
                          <p className="truncate text-xs font-medium">{l.enrollmentId || '—'}</p>
                        </div>
                        <Badge className={statusToneClass(l.statusLabel)}>{l.statusLabel}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Announcements tab — kept so his 4-tab layout matches, but there is no
            announcements backend, so we render only his empty state (no compose
            box → no fake local-only data). */}
        <TabsContent value="announcements" className="mt-4 space-y-3">
          <EmptyState icon={Megaphone} text="No announcements yet." />
        </TabsContent>
      </Tabs>

      {/* Cohort-scoped scheduling — the cohort is implied (no dropdown), same
          modal + shared backend as admin (Naji/Risha 2026-07-06). */}
      <AddLiveSessionModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        api={api}
        token={session.token}
        cohortId={String(cohort.id)}
        submitting={scheduleSubmitting}
        setSubmitting={setScheduleSubmitting}
        onSuccess={() => {
          setScheduleOpen(false);
          toast.success('Live session scheduled.');
          reloadClasses();
        }}
      />
    </div>
  );
}

export default function InstructorCohortsPage({ api, session, onNavigate }: InstructorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCohorts(session.token),
    [api, session.token],
  );
  const { data: dashboardData } = useAdminPageData(
    () => api.loadDashboard(session.token),
    [api, session.token],
  );

  const [activeCohort, setActiveCohort] = useState<InstructorCohortSummary | null>(null);
  const [detail, setDetail] = useState<InstructorCohortDetailSnapshot | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<CohortView>('grid');

  const openDetail = useCallback(
    async (cohort: InstructorCohortSummary) => {
      setActiveCohort(cohort);
      setDetail(null);
      setDetailLoading(true);
      const result = await api.loadCohortDetail(session.token, cohort.id);
      setDetail(result);
      setDetailLoading(false);
    },
    [api, session.token],
  );

  const closeDetail = useCallback(() => {
    setActiveCohort(null);
    setDetail(null);
  }, []);

  // When the detail view is open, scroll it into view (the layout <main> scrolls).
  useEffect(() => {
    if (activeCohort && typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  }, [activeCohort]);

  const cohorts = useMemo(() => data ?? [], [data]);

  // Per-cohort attendance from the dashboard payload (weekly avg per cohort).
  const attendanceByCohort = useMemo(() => {
    const map = new Map<number, number>();
    const cohortPerf = dashboardData?.cohortPerformance ?? [];
    for (const c of cohortPerf) {
      map.set(c.cohortId, c.avgPercent);
    }
    return map;
  }, [dashboardData]);

  const nextSessionByCohort = useMemo(() => {
    const map = new Map<number, string | null>();
    const upcoming = dashboardData?.upcomingLiveClasses ?? [];
    for (const cls of upcoming) {
      if (cls.cohortId == null) continue;
      if (!map.has(cls.cohortId)) map.set(cls.cohortId, cls.date);
    }
    return map;
  }, [dashboardData]);

  const filtered = useMemo(() => {
    if (!search) return cohorts;
    const q = search.toLowerCase();
    return cohorts.filter((c) =>
      c.title.toLowerCase().includes(q)
      || c.cohortCode.toLowerCase().includes(q)
      || (c.courseTitle ?? '').toLowerCase().includes(q),
    );
  }, [cohorts, search]);

  // In-page detail view (his cohorts.$cohortId route) — early-return before the
  // list so the whole page swaps to the cohort hero + 4 tabs.
  if (activeCohort) {
    return (
      <div className="faculty-portal">
        <CohortDetailView
          api={api}
          session={session}
          onNavigate={onNavigate}
          cohort={activeCohort}
          detail={detail}
          detailLoading={detailLoading}
          progress={computeProgressPercent(activeCohort.startDate, activeCohort.endDate)}
          attendance={attendanceByCohort.get(activeCohort.id) ?? 0}
          onBack={closeDetail}
        />
      </div>
    );
  }

  return (
    <div className="faculty-portal space-y-6">
      {/* His <PageHeader title subtitle /> reproduced inline (our layout already
          provides the TopBar + sidebar, so we do NOT render his shell). */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Cohorts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your assigned learner groups</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cohorts…"
            className="h-10 rounded-full pl-9"
            aria-label="Search cohorts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Grid
            </Button>
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => setView('table')}
            >
              <TableIcon className="mr-1.5 h-3.5 w-3.5" /> Table
            </Button>
          </div>
          {/* Naji 2026-07-06 — kept the real "New Cohort Request" action (mailto
              to admissions) from the prior version, themed to match the Lovable. */}
          <Button
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => window.open('mailto:admissions@teachersindia.in?subject=New%20Cohort%20Request', '_blank')}
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Cohort Request
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoader label="Loading cohorts..." />
      ) : error ? (
        <Card className="soft-shadow border-destructive/40">
          <CardContent className="p-8 text-center text-sm text-destructive" role="alert">
            {error}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="soft-shadow border-dashed border-border/60">
          <CardContent className="p-12 text-center text-sm text-muted-foreground" role="status">
            {search ? 'No cohorts match that search.' : "You aren't assigned to any cohorts yet."}
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const progress = computeProgressPercent(c.startDate, c.endDate);
            const nextSession = nextSessionByCohort.get(c.id) ?? null;
            return (
              <Card
                key={c.id}
                className="soft-shadow group overflow-hidden border-border/60 transition hover:-translate-y-0.5 hover:glow-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                        {c.courseTitle || 'Cohort'}
                      </p>
                      <h3 className="mt-1 truncate text-base font-semibold">
                        {c.title || `Cohort #${c.id}`}
                      </h3>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3 w-3" /> Learners
                      </div>
                      <p className="mt-1 text-lg font-semibold">{c.learnerCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Video className="h-3 w-3" /> Upcoming
                      </div>
                      <p className="mt-1 text-lg font-semibold">{c.upcomingSessionCount}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Course Progress</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Next session</p>
                      <p className="truncate text-xs font-medium">
                        {nextSession ? nextSessionLabel(nextSession) : 'TBD'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-primary-soft"
                      onClick={() => void openDetail(c)}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="soft-shadow overflow-hidden border-border/60">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-16 text-xs font-semibold tracking-wider">Sl No</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Cohort ID</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Cohort</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Subject</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Learners</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Live Classes</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Progress</TableHead>
                  <TableHead className="w-20 text-xs font-semibold tracking-wider">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, index) => {
                  const progress = computeProgressPercent(c.startDate, c.endDate);
                  return (
                    <TableRow key={c.id} className="text-sm">
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium text-primary">{c.cohortCode || '—'}</TableCell>
                      <TableCell className="font-medium">{c.title || `Cohort #${c.id}`}</TableCell>
                      <TableCell className="text-muted-foreground">{c.courseTitle || '—'}</TableCell>
                      <TableCell>{c.learnerCount}</TableCell>
                      <TableCell>{c.upcomingSessionCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 w-20" />
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-primary hover:bg-primary-soft h-8 px-2"
                          onClick={() => void openDetail(c)}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
