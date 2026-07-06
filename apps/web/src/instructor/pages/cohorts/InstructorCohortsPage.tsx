import { useCallback, useMemo, useState } from 'react';
import {
  BookOpen,
  Loader2,
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
import { AddLiveSessionModal } from '../../../admin/shared/components/AddLiveSessionModal.js';
import type {
  InstructorCohortDetailSnapshot,
  InstructorCohortSummary,
} from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji UAT — EduPulse Faculty refresh. This page reproduces Naji's Lovable
// cohorts markup VERBATIM (his semantic .faculty-portal classes: bg-primary,
// bg-primary-soft, text-muted-foreground, soft-shadow, glow-shadow, gradients,
// etc.) while keeping 100% of the real backend data + behaviors: real cohorts
// from api.loadCohorts / api.loadDashboard, the learner-roster "detail" (his
// route → our modal styled as his hero), and the cohort-scoped
// AddLiveSessionModal. No mock data — every value is a real API field.

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

export default function InstructorCohortsPage({ api, session }: InstructorPageProps) {
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
  // Naji/Risha 2026-07-06 — schedule live sessions from inside the cohort,
  // reusing the admin cohort modal (platform selector + bulk builder).
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

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

  const activeProgress = activeCohort
    ? computeProgressPercent(activeCohort.startDate, activeCohort.endDate)
    : 0;
  const activeAttendance = activeCohort ? attendanceByCohort.get(activeCohort.id) ?? 0 : 0;
  const activeNextSession = activeCohort ? nextSessionByCohort.get(activeCohort.id) ?? null : null;

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

      {/* His cohort DETAIL route → our modal. Reproduces his hero (gradient
          from-primary via-primary + stat grid) and his learner roster inside a
          single-page-with-modal shell. Inline width so it doesn't collapse to
          the shadcn sm:max-w-lg default; wide enough for the Email column. */}
      <Dialog open={activeCohort !== null} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent
          className="faculty-portal max-h-[90dvh] overflow-y-auto p-0"
          style={{ width: 'min(900px, calc(100vw - 2rem))', maxWidth: 'min(900px, calc(100vw - 2rem))' }}
        >
          {activeCohort && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{activeCohort.title || 'Cohort'}</DialogTitle>
                <DialogDescription>
                  {activeCohort.cohortCode ? `${activeCohort.cohortCode} • ` : ''}
                  {activeCohort.courseTitle ? `${activeCohort.courseTitle} • ` : ''}
                  {formatRange(activeCohort.startDate, activeCohort.endDate)}
                </DialogDescription>
              </DialogHeader>

              {/* Hero — his exact gradient + badge + stat grid */}
              <div className="overflow-hidden rounded-t-lg">
                <div className="bg-gradient-to-br from-primary via-primary to-[oklch(0.42_0.22_300)] p-6 text-primary-foreground">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge className="bg-white/15 text-white hover:bg-white/20">
                        {activeCohort.courseTitle || 'Cohort'}
                      </Badge>
                      <h2 className="mt-3 text-2xl font-bold">{activeCohort.title || 'Cohort'}</h2>
                      <p className="mt-1 text-xs text-white/70">
                        Cohort ID:{' '}
                        <span className="font-medium text-white">{activeCohort.cohortCode || '—'}</span>
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        {formatRange(activeCohort.startDate, activeCohort.endDate)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setScheduleOpen(true)}
                      className="shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25"
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add Live Session
                    </Button>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                      { label: 'Learners', value: String(activeCohort.learnerCount) },
                      { label: 'Progress', value: `${activeProgress}%` },
                      { label: 'Upcoming', value: String(activeCohort.upcomingSessionCount) },
                      {
                        label: 'Attendance',
                        value: activeAttendance > 0 ? `${activeAttendance}%` : '—',
                      },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-[10px] uppercase tracking-wider text-white/70">{s.label}</p>
                        <p className="mt-1 text-lg font-semibold">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Learner roster — real detail.learners in his soft-shadow table */}
              <div className="p-6 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Learners
                  </p>
                  {activeNextSession && (
                    <p className="text-xs text-muted-foreground">
                      Next session · {nextSessionLabel(activeNextSession)}
                    </p>
                  )}
                </div>

                {detailLoading ? (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading learners...
                  </div>
                ) : !detail ? (
                  <Card className="soft-shadow border-dashed border-border/60">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground" role="status">
                      Could not load learner roster.
                    </CardContent>
                  </Card>
                ) : detail.learners.length === 0 ? (
                  <Card className="soft-shadow border-dashed border-border/60">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground" role="status">
                      No learners enrolled in this cohort yet.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="soft-shadow overflow-hidden border-border/60">
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {detail.learners.map((learner) => (
                          <div key={learner.id} className="flex items-center gap-4 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                              {(learner.name || '?')
                                .split(' ')
                                .map((n) => n[0] ?? '')
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{learner.name || '—'}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {learner.email || '—'}
                              </p>
                            </div>
                            <div className="hidden w-36 md:block">
                              <p className="text-[10px] uppercase text-muted-foreground">Enrollment ID</p>
                              <p className="truncate text-xs font-medium">{learner.enrollmentId || '—'}</p>
                            </div>
                            <Badge className={statusToneClass(learner.statusLabel)}>
                              {learner.statusLabel}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cohort-scoped scheduling — the cohort is implied (no dropdown), same
          modal + shared backend as admin (Naji/Risha 2026-07-06). */}
      {activeCohort && (
        <AddLiveSessionModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          api={api}
          token={session.token}
          cohortId={String(activeCohort.id)}
          submitting={scheduleSubmitting}
          setSubmitting={setScheduleSubmitting}
          onSuccess={() => {
            setScheduleOpen(false);
            toast.success('Live session scheduled.');
          }}
        />
      )}
    </div>
  );
}
