import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Calendar, Loader2, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { AddLiveSessionModal } from '../../../admin/shared/components/AddLiveSessionModal.js';
import type {
  InstructorCohortDetailSnapshot,
  InstructorCohortSummary,
} from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji UAT 2026-05-22 — Cohorts page restyled to match the
// ttiifaculty.lovable.app mockup: white sidebar already provided by the
// layout shell, and the grid now renders cohort cards with a small
// purple subject tag, a violet book-icon chip, two stat tiles, and a
// course-progress bar with NEXT SESSION footer.

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
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
            {cohort.courseTitle || 'Cohort'}
          </p>
          <p className="mt-1 truncate text-base font-bold text-slate-900">
            {cohort.title || `Cohort #${cohort.id}`}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <BookOpen className="size-5" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Users className="size-3" /> Learners
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{cohort.learnerCount}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Calendar className="size-3" /> Attendance
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{attendance > 0 ? `${attendance}%` : '—'}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Course Progress</span>
          <span className="font-semibold text-slate-700">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Next Session
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-700">
            {nextSession ? nextSessionLabel(nextSession) : 'TBD'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onView(cohort)}
          className="text-sm font-semibold text-violet-600 hover:text-violet-700"
        >
          Open →
        </button>
      </div>
    </div>
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

  const cohorts = data ?? [];

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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search cohorts"
            placeholder="Search cohorts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white px-10 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          />
        </div>
        <Button
          variant="ghost"
          className="ml-auto rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 hover:text-white"
          onClick={() => window.open('mailto:admissions@teachersindia.in?subject=New%20Cohort%20Request', '_blank')}
        >
          + New Cohort Request
        </Button>
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
      ) : (
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
      )}

      <Dialog open={activeCohort !== null} onOpenChange={(open) => !open && closeDetail()}>
        {/* Inline width (not just max-w-*) so it doesn't collapse to the shadcn
            sm:max-w-lg default on mobile; wide enough for the Email column.
            Risha 2026-07-01: email was clipped in the learner roster. */}
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto"
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
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
