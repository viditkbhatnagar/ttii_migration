import { useCallback, useState } from 'react';
import { Calendar, GraduationCap, Loader2, Users, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  InstructorCohortDetailSnapshot,
  InstructorCohortSummary,
} from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

function formatRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  return `${start ? formatDate(start) : '—'} → ${end ? formatDate(end) : '—'}`;
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

function CohortCard({
  cohort,
  onView,
}: {
  cohort: InstructorCohortSummary;
  onView: (cohort: InstructorCohortSummary) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onView(cohort)}
      className="group flex w-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-student-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-student-text group-hover:text-student-primary">
            {cohort.title || 'Untitled cohort'}
          </p>
          <p className="mt-0.5 truncate text-xs text-student-muted">
            {cohort.cohortCode || `Cohort #${cohort.id}`}
          </p>
        </div>
        <div className="rounded-lg bg-student-primary/10 p-2 text-student-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
      </div>

      {cohort.courseTitle ? (
        <p className="mt-3 text-sm text-student-text">{cohort.courseTitle}</p>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-xs text-student-muted">
        <Calendar className="h-3.5 w-3.5" />
        {formatRange(cohort.startDate, cohort.endDate)}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-student-muted">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {cohort.learnerCount} learner{cohort.learnerCount === 1 ? '' : 's'}
        </span>
        {cohort.upcomingSessionCount > 0 ? (
          <span className="flex items-center gap-1">
            <Video className="h-3.5 w-3.5" />
            {cohort.upcomingSessionCount} upcoming
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function InstructorCohortsPage({ api, session }: InstructorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCohorts(session.token),
    [api, session.token],
  );

  const [activeCohort, setActiveCohort] = useState<InstructorCohortSummary | null>(null);
  const [detail, setDetail] = useState<InstructorCohortDetailSnapshot | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">My Cohorts</h1>
        <p className="mt-1 text-sm text-student-muted">
          Cohorts you teach. Click into one to see the learner roster.
        </p>
      </div>

      {loading ? (
        <PageLoader label="Loading cohorts..." />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {error}
        </div>
      ) : cohorts.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-student-muted">
          You aren't assigned to any cohorts yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cohorts.map((cohort) => (
            <CohortCard key={cohort.id} cohort={cohort} onView={(c) => void openDetail(c)} />
          ))}
        </div>
      )}

      <Dialog open={activeCohort !== null} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{activeCohort?.title || 'Cohort'}</DialogTitle>
            <DialogDescription>
              {activeCohort?.cohortCode ? `${activeCohort.cohortCode} • ` : ''}
              {activeCohort?.courseTitle ? `${activeCohort.courseTitle} • ` : ''}
              {formatRange(activeCohort?.startDate ?? null, activeCohort?.endDate ?? null)}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center p-8 text-student-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading learners...
            </div>
          ) : !detail ? (
            <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-student-muted">
              Could not load learner roster.
            </div>
          ) : detail.learners.length === 0 ? (
            <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-student-muted">
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
                      <TableCell className="font-medium text-student-text">
                        {learner.name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-student-muted">
                        {learner.enrollmentId || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-student-muted">
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
    </div>
  );
}
