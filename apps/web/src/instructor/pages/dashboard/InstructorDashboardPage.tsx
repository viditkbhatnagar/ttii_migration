import { Calendar, Clock, Play, Users, Video } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { useInstructorLayout } from '../../layout/InstructorLayoutContext.js';
import type { InstructorDashboardLiveClass } from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

function formatTimeRange(from: string | null, to: string | null): string {
  if (!from && !to) return '';
  const trim = (t: string | null) => (t ?? '').slice(0, 5);
  return [trim(from), trim(to)].filter(Boolean).join(' – ');
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Calendar }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-student-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-student-text">{value}</p>
        </div>
        <div className="rounded-lg bg-student-primary/10 p-2 text-student-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function LiveClassCard({
  row,
  variant,
  onNavigate,
}: {
  row: InstructorDashboardLiveClass;
  variant: 'upcoming' | 'past';
  onNavigate: (href: string) => void;
}) {
  const dateLabel = row.date ? formatDate(row.date) : '—';
  const timeLabel = formatTimeRange(row.fromTime, row.toTime);
  const hasRecording = Boolean(row.recordingStorageKey || row.recordingUrl);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-student-text">{row.title || 'Untitled session'}</p>
        <p className="mt-1 text-xs text-student-muted">
          {row.cohortTitle ? `${row.cohortTitle} • ` : ''}
          {dateLabel}
          {timeLabel ? ` • ${timeLabel}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {variant === 'upcoming' && row.joinUrl ? (
          <Button
            size="sm"
            className="bg-student-primary text-white hover:bg-student-primary/90"
            onClick={() => window.open(row.joinUrl ?? '#', '_blank', 'noopener,noreferrer')}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" /> Start Class
          </Button>
        ) : null}
        {variant === 'past' && hasRecording ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate(`/instructor/live-classes?recording=${row.id}`)}
          >
            <Video className="mr-1.5 h-3.5 w-3.5" /> Watch Recording
          </Button>
        ) : null}
        {variant === 'past' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigate(`/instructor/live-classes?attendance=${row.id}`)}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" /> Attendance
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-student-muted">
      {label}
    </div>
  );
}

export default function InstructorDashboardPage({ api, session, onNavigate }: InstructorPageProps) {
  const { currentUser } = useInstructorLayout();
  const { data, loading, error } = useAdminPageData(
    () => api.loadDashboard(session.token),
    [api, session.token],
  );

  const firstName = (currentUser?.name.split(/\s+/)[0] ?? '').trim();
  const greetingName = firstName || 'there';

  if (loading) {
    return <PageLoader label="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Dashboard</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const upcoming = data?.upcomingLiveClasses ?? [];
  const past = data?.pastLiveClasses ?? [];
  const cohortCount = data?.cohortCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">Welcome back, {greetingName}</h1>
        <p className="mt-1 text-sm text-student-muted">
          Your classes, cohorts, and assignments at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Cohorts" value={cohortCount} icon={Users} />
        <StatCard label="Upcoming sessions" value={upcoming.length} icon={Calendar} />
        <StatCard label="Recent sessions" value={past.length} icon={Clock} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-student-text">Upcoming Live Classes</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('/instructor/live-classes')}>
            View all
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState label="No upcoming sessions scheduled." />
        ) : (
          <div className="space-y-2">
            {upcoming.map((row) => (
              <LiveClassCard key={row.id} row={row} variant="upcoming" onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-student-text">Recent Sessions</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('/instructor/live-classes')}>
            View all
          </Button>
        </div>
        {past.length === 0 ? (
          <EmptyState label="No past sessions yet." />
        ) : (
          <div className="space-y-2">
            {past.map((row) => (
              <LiveClassCard key={row.id} row={row} variant="past" onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
