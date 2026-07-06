import { useCallback, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  Table as TableIcon,
  Users,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

// Naji UAT — EduPulse Faculty refresh. This page keeps its ORIGINAL behavior
// (real cohort data, learner-roster modal, cohort-scoped Add-Live-Session
// modal) and adds the new Lovable layout: a Grid/Table view toggle on top of
// the existing violet cohort cards, plus a compact table view for the same
// real data. All cohort fields come straight from api.loadCohorts /
// api.loadDashboard — no mock data.

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

function statusToneClass(label: string): string {
  switch (label) {
    case 'Active':
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    case 'Graduated':
      return 'bg-sky-100 text-sky-700 hover:bg-sky-100';
    case 'Dropped':
      return 'bg-red-100 text-red-700 hover:bg-red-100';
    case 'Inactive':
      return 'bg-slate-200 text-slate-700 hover:bg-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 hover:bg-slate-100';
  }
}

// Approximate course progress from dates. cohort.startDate / endDate are
// usually populated; if either is missing we fall back to 0 so the bar
// still renders cleanly. This mirrors how the Lovable mockup shows a
// progress %, without us needing a separate completion table.
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

function CohortCard({
  cohort,
  onView,
  attendanceByCohort,
  nextSessionByCohort,
}: {
  cohort: InstructorCohortSummary;
  onView: (cohort: InstructorCohortSummary) => void;
  attendanceByCohort: Map<number, number>;
  nextSessionByCohort: Map<number, string | null>;
}) {
  const progress = computeProgressPercent(cohort.startDate, cohort.endDate);
  const attendance = attendanceByCohort.get(cohort.id) ?? 0;
  const nextSession = nextSessionByCohort.get(cohort.id) ?? null;
  return (
    <Card className="group overflow-hidden border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-violet-600">
              {cohort.courseTitle || 'Cohort'}
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
              {cohort.title || `Cohort #${cohort.id}`}
            </h3>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <BookOpen className="size-5" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-slate-100 p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Users className="size-3" /> Learners
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900">{cohort.learnerCount}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Video className="size-3" /> Upcoming
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900">{cohort.upcomingSessionCount}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="size-3" /> Attend.
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900">{attendance > 0 ? `${attendance}%` : '—'}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-500">Course Progress</span>
            <span className="font-semibold text-slate-700">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Next Session</p>
            <p className="mt-0.5 truncate text-xs text-slate-700">
              {nextSession ? nextSessionLabel(nextSession) : 'TBD'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-violet-600 hover:bg-violet-50 hover:text-violet-700"
            onClick={() => onView(cohort)}
          >
            Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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

  // Pull per-cohort attendance from the dashboard payload (we already
  // compute weekly attendance there; here we surface the latest single
  // weekly average as the cohort's attendance number).
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cohorts</h1>
        <p className="mt-0.5 text-sm text-slate-500">Your assigned learner groups</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search cohorts"
            placeholder="Search cohorts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1">
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="mr-1.5 size-3.5" /> Grid
            </Button>
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => setView('table')}
            >
              <TableIcon className="mr-1.5 size-3.5" /> Table
            </Button>
          </div>
          <Button
            className="rounded-full bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 hover:text-white"
            onClick={() => window.open('mailto:admissions@teachersindia.in?subject=New%20Cohort%20Request', '_blank')}
          >
            <Plus className="mr-1.5 size-4" /> New Cohort Request
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoader label="Loading cohorts..." />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div role="status" className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          {search ? 'No cohorts match that search.' : "You aren't assigned to any cohorts yet."}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cohort) => (
            <CohortCard
              key={cohort.id}
              cohort={cohort}
              onView={(c) => void openDetail(c)}
              attendanceByCohort={attendanceByCohort}
              nextSessionByCohort={nextSessionByCohort}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100">
                  <TableHead className="w-16 text-xs font-semibold tracking-wider">Sl No</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Cohort Code</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Cohort</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Course</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Learners</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Upcoming</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider">Progress</TableHead>
                  <TableHead className="w-20 text-xs font-semibold tracking-wider">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cohort, index) => {
                  const progress = computeProgressPercent(cohort.startDate, cohort.endDate);
                  return (
                    <TableRow key={cohort.id} className="text-sm">
                      <TableCell className="text-slate-500">{index + 1}</TableCell>
                      <TableCell className="font-medium text-violet-600">{cohort.cohortCode || '—'}</TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {cohort.title || `Cohort #${cohort.id}`}
                      </TableCell>
                      <TableCell className="text-slate-500">{cohort.courseTitle || '—'}</TableCell>
                      <TableCell className="text-slate-700">{cohort.learnerCount}</TableCell>
                      <TableCell className="text-slate-700">{cohort.upcomingSessionCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 w-20" />
                          <span className="text-xs font-medium text-slate-700">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                          onClick={() => void openDetail(cohort)}
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

      <Dialog open={activeCohort !== null} onOpenChange={(open) => !open && closeDetail()}>
        {/* Inline width (not just max-w-*) so it doesn't collapse to the shadcn
            sm:max-w-lg default on mobile; wide enough for the Email column.
            Risha 2026-07-01: email was clipped in the learner roster. */}
        <DialogContent
          className="faculty-portal max-h-[90dvh] overflow-y-auto"
          style={{ width: 'min(900px, calc(100vw - 2rem))', maxWidth: 'min(900px, calc(100vw - 2rem))' }}
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="min-w-0">
                <DialogTitle>{activeCohort?.title || 'Cohort'}</DialogTitle>
                <DialogDescription>
                  {activeCohort?.cohortCode ? `${activeCohort.cohortCode} • ` : ''}
                  {activeCohort?.courseTitle ? `${activeCohort.courseTitle} • ` : ''}
                  {formatRange(activeCohort?.startDate ?? null, activeCohort?.endDate ?? null)}
                </DialogDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setScheduleOpen(true)}
                className="shrink-0 rounded-full bg-violet-600 text-white hover:bg-violet-700"
              >
                <Plus className="mr-1 size-4" /> Add Live Session
              </Button>
            </div>
          </DialogHeader>

          {activeCohort && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Learners', value: String(activeCohort.learnerCount) },
                {
                  label: 'Progress',
                  value: `${computeProgressPercent(activeCohort.startDate, activeCohort.endDate)}%`,
                },
                { label: 'Upcoming', value: String(activeCohort.upcomingSessionCount) },
                {
                  label: 'Attendance',
                  value:
                    (attendanceByCohort.get(activeCohort.id) ?? 0) > 0
                      ? `${attendanceByCohort.get(activeCohort.id) ?? 0}%`
                      : '—',
                },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-violet-50 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-violet-600">{s.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {detailLoading ? (
            <div className="flex items-center justify-center p-8 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading learners...
            </div>
          ) : !detail ? (
            <div role="status" className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Could not load learner roster.
            </div>
          ) : detail.learners.length === 0 ? (
            <div role="status" className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              No learners enrolled in this cohort yet.
            </div>
          ) : (
            <div className="max-h-96 overflow-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 hover:bg-slate-100">
                    <TableHead>Name</TableHead>
                    <TableHead>Enrollment ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.learners.map((learner) => (
                    <TableRow key={learner.id}>
                      <TableCell className="font-medium text-slate-900">
                        {learner.name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {learner.enrollmentId || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {learner.email || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusToneClass(learner.statusLabel)}>
                          {learner.statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
          onSuccess={() => { setScheduleOpen(false); toast.success('Live session scheduled.'); }}
        />
      )}
    </div>
  );
}
