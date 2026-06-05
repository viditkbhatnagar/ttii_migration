import { useState } from 'react';
import { toast } from 'sonner';
import {
  Radio,
  CalendarDays,
  Clock,
  Video,
  Play,
  ExternalLink,
  List as ListIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminTabBar } from '../../../admin/shared/components/AdminTabBar.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

type LiveTab = 'upcoming' | 'ongoing' | 'past';

function formatLiveDate(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortTime(value: string): string {
  if (!value) return '';
  const t = value.length > 8 ? value.slice(-8) : value;
  const d = new Date(`1970-01-01T${t}`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Minutes since midnight from an "HH:MM:SS" (or "HH:MM") time string.
function timeToMinutes(value: string): number | null {
  if (!value) return null;
  const parts = value.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? '0');
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

// Human-readable duration derived from the real from/to time fields.
// Returns '' when either bound is missing or the range is non-positive.
function formatDuration(from: string, to: string): string {
  const start = timeToMinutes(from);
  const end = timeToMinutes(to);
  if (start === null || end === null) return '';
  const total = end - start;
  if (total <= 0) return '';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

// "Started N min ago" for an ongoing (today) class, derived from the real
// start time vs the current local clock. Returns '' when the start time is
// missing or hasn't passed yet (avoids fabricating a value).
function startedAgo(fromTime: string): string {
  const start = timeToMinutes(fromTime);
  if (start === null) return '';
  const now = new Date();
  const elapsed = now.getHours() * 60 + now.getMinutes() - start;
  if (elapsed <= 0) return '';
  if (elapsed < 60) return `Started ${elapsed} min ago`;
  const hours = Math.floor(elapsed / 60);
  const minutes = elapsed % 60;
  return minutes > 0
    ? `Started ${hours}h ${minutes}m ago`
    : `Started ${hours}h ago`;
}

export default function StudentLiveClassPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAllLiveClasses(session.token),
    [api, session.token],
    `student:live-classes:${session.userId}`,
  );
  const [tab, setTab] = useState<LiveTab>('ongoing');
  const [recording, setRecording] = useState<{ title: string; url: string } | null>(null);
  const [recPending, setRecPending] = useState<string | null>(null);

  const rows = data ?? [];
  const upcoming = rows.filter((r) => asString(r.status) === 'upcoming');
  const ongoing = rows.filter((r) => asString(r.status) === 'today');
  const past = rows.filter((r) => asString(r.status) === 'past');
  const current = tab === 'upcoming' ? upcoming : tab === 'ongoing' ? ongoing : past;

  async function watchRecording(row: Record<string, unknown>) {
    const id = asString(row.id);
    setRecPending(id);
    try {
      const url = await api.getLiveRecordingUrl(session.token, id);
      if (url) setRecording({ title: asString(row.title) || 'Recording', url });
      else toast.error('Recording is not available yet.');
    } catch {
      toast.error('Could not load the recording.');
    } finally {
      setRecPending(null);
    }
  }

  if (loading) {
    return <PageLoader label="Loading live classes..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Live Classes</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'ongoing' as const, label: 'Ongoing', count: ongoing.length },
    { id: 'upcoming' as const, label: 'Upcoming', count: upcoming.length },
    { id: 'past' as const, label: 'Past Classes', count: past.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-student-text">
            <Radio aria-hidden="true" className="size-6 text-student-primary" />
            Live Classes
          </h1>
          <p className="mt-1 text-sm text-student-muted">Join live sessions and catch up on recordings</p>
        </div>

        {/* List / Calendar view toggle — Calendar navigates to the calendar page,
            mirroring the EduPulse reference (it has no second calendar here). */}
        <div
          role="group"
          aria-label="View"
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        >
          <span
            aria-current="true"
            className="inline-flex items-center gap-1.5 rounded-lg bg-student-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            <ListIcon aria-hidden="true" className="size-4" />
            List
          </span>
          <button
            type="button"
            onClick={() => onNavigate('/student/calendar')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-student-muted transition-colors hover:bg-slate-50 hover:text-student-text"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            Calendar
          </button>
        </div>
      </div>

      <AdminTabBar tabs={tabs} activeTab={tab} onChange={(id) => setTab(id as LiveTab)} />

      {current.length === 0 ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Radio aria-hidden="true" className="mx-auto size-8 text-slate-300" />
          <p className="mt-2 text-sm text-student-muted">
            {tab === 'past' ? 'No recordings yet.' : `No ${tab} live classes.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {current.map((row) => (
            <LiveClassCard
              key={asString(row.id)}
              row={row}
              isPast={tab === 'past'}
              isOngoing={tab === 'ongoing'}
              recPending={recPending === asString(row.id)}
              onWatch={() => void watchRecording(row)}
            />
          ))}
        </div>
      )}

      {/* Recording player */}
      <Dialog open={recording !== null} onOpenChange={(open) => { if (!open) setRecording(null); }}>
        <DialogContent className="w-[min(820px,calc(100vw-2rem))] max-w-[min(820px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle className="truncate">{recording?.title}</DialogTitle>
          </DialogHeader>
          {recording ? <RecordingPlayer url={recording.url} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LiveClassCard({
  row,
  isPast,
  isOngoing,
  recPending,
  onWatch,
}: {
  row: Record<string, unknown>;
  isPast: boolean;
  isOngoing: boolean;
  recPending: boolean;
  onWatch: () => void;
}) {
  const title = asString(row.title) || 'Live Class';
  const subject = asString(row.subject_title);
  const instructor = asString(row.instructor_name);
  const date = formatLiveDate(asString(row.date));
  const fromTime = shortTime(asString(row.from_time));
  const toTime = shortTime(asString(row.to_time));
  const joinUrl = asString(row.join_url);
  const timeRange = [fromTime, toTime].filter(Boolean).join(' – ');
  const duration = formatDuration(asString(row.from_time), asString(row.to_time));
  const sinceStart = isOngoing ? startedAgo(asString(row.from_time)) : '';
  // CTA label tracks the EduPulse reference (Enrol Now / Enrol Class / View Recording).
  const joinLabel = isOngoing ? 'Enrol Now' : 'Enrol Class';

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Top row: subject tag (left) + duration (right), per reference §5. */}
      <div className="mb-3 flex items-start justify-between gap-3">
        {subject ? (
          <span className="inline-flex items-center rounded-full bg-student-primary/10 px-3 py-1 text-[11px] font-semibold text-student-primary">
            {subject}
          </span>
        ) : <span />}
        {duration ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            <Clock aria-hidden="true" className="size-3" />
            {duration}
          </span>
        ) : null}
      </div>

      {isOngoing ? (
        <Badge className="mb-2 w-fit rounded-full border-red-200 bg-red-100 text-[10px] font-semibold uppercase tracking-wide text-red-700">
          <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-red-500" />
          Live
        </Badge>
      ) : null}

      <h3 className="text-base font-bold leading-snug text-student-text">{title}</h3>

      {instructor ? (
        <p className="mt-1 text-xs text-student-muted">
          with <span className="font-medium text-student-text">{instructor}</span>
        </p>
      ) : null}

      {/* Footer meta: date + time. No attendee count — the API does not return one. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-student-muted">
        {date ? (
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            {date}
          </span>
        ) : null}
        {timeRange ? (
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden="true" className="size-3.5" />
            {timeRange}
          </span>
        ) : null}
        {sinceStart ? (
          <span className="inline-flex items-center gap-1 font-medium text-red-600">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-red-500" />
            {sinceStart}
          </span>
        ) : null}
        {isPast ? (
          <span className="inline-flex items-center gap-1">
            <Video aria-hidden="true" className="size-3.5" />
            Recorded
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        {isPast ? (
          <Button
            onClick={onWatch}
            disabled={recPending}
            className="h-10 flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Play aria-hidden="true" className="mr-1.5 size-4" />
            {recPending ? 'Loading…' : 'View Recording'}
          </Button>
        ) : joinUrl ? (
          <Button
            asChild
            className="h-10 flex-1 rounded-xl bg-student-primary text-sm font-semibold text-white hover:bg-student-primary/90"
          >
            <a href={joinUrl} target="_blank" rel="noopener noreferrer">
              <Video aria-hidden="true" className="mr-1.5 size-4" />
              {joinLabel}
            </a>
          </Button>
        ) : (
          <span className="flex-1 rounded-xl bg-slate-50 py-2.5 text-center text-xs text-student-muted">
            Join link not available yet
          </span>
        )}
      </div>
    </div>
  );
}

function RecordingPlayer({ url }: { url: string }) {
  const isEmbed = /vimeo|youtube|youtu\.be/i.test(url);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl bg-black">
        {isEmbed ? (
          <iframe
            src={url}
            title="Live class recording"
            className="aspect-video w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video controls preload="metadata" className="aspect-video w-full" src={url}>
            <track kind="captions" />
          </video>
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-student-primary hover:underline"
      >
        <ExternalLink aria-hidden="true" className="size-3" />
        Open in a new tab
      </a>
    </div>
  );
}
