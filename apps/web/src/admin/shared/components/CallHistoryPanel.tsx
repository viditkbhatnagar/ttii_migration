// Call History panel — admin-only. Lists a student's Ainvox call log
// (outbound + inbound) with inline recording playback. Recordings stream
// through our server proxy (the Ainvox secret stays server-side); the auth
// token rides in the <audio src> query. Inert until AINVOX_PROVIDER=ainvox.
import { useCallback, useEffect, useRef, useState } from 'react';
import { PhoneIncoming, PhoneOutgoing, RefreshCw, Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminPortalApi, AdminCallLog } from '../../admin-portal-api.js';
import { toDialableNumber } from '../call-actions.js';
import { CallButton } from './CallButton.js';

interface CallHistoryPanelProps {
  api: AdminPortalApi;
  authToken: string;
  phone: string | null | undefined;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_TONE: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  answered: 'bg-sky-50 text-sky-700 ring-sky-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
  busy: 'bg-amber-50 text-amber-700 ring-amber-200',
  'no-answer': 'bg-amber-50 text-amber-700 ring-amber-200',
  missed: 'bg-rose-50 text-rose-700 ring-rose-200',
};

function statusTone(status: string | null): string {
  return STATUS_TONE[(status ?? '').toLowerCase()] ?? 'bg-slate-50 text-slate-600 ring-slate-200';
}

// Ainvox finalises and uploads a call recording a short time after the call
// ends, so a just-completed call can briefly show no recording. Poll a few
// times until it lands instead of making the admin refresh manually.
const POLL_INTERVAL_MS = 15_000;
const MAX_POLLS = 8; // ~2 minutes of polling
const RECORDING_GRACE_MS = 15 * 60 * 1000; // treat as "processing" for 15 min

function isRecordingPending(call: AdminCallLog): boolean {
  if (call.recordingUrl) return false;
  if ((call.status ?? '').toLowerCase() !== 'completed') return false;
  if ((call.durationSeconds ?? 0) <= 0) return false;
  const started = call.startedAt ? new Date(call.startedAt).getTime() : 0;
  return started > 0 && Date.now() - started < RECORDING_GRACE_MS;
}

export function CallHistoryPanel({ api, authToken, phone }: CallHistoryPanelProps) {
  const dialable = toDialableNumber(phone ?? '');
  const [logs, setLogs] = useState<AdminCallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const pollRef = useRef(0);

  const load = useCallback(async (isPoll = false) => {
    if (!dialable) {
      setError('No valid phone number on file for this student.');
      setLoaded(true);
      return;
    }
    if (!isPoll) {
      pollRef.current = 0; // a fresh view/refresh resets the polling budget
      setLoading(true);
    }
    setError(null);
    try {
      const page = await api.getStudentCallLogs(authToken, dialable);
      setLogs(page.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load call history.');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [api, authToken, dialable]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-poll while a recently-completed call's recording is still processing,
  // so it appears on its own without the admin having to refresh.
  useEffect(() => {
    if (!logs.some(isRecordingPending) || pollRef.current >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      pollRef.current += 1;
      void load(true);
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [logs, load]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ttii-primary/10 text-ttii-primary">
            <PhoneOutgoing className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Call History</h3>
            <p className="text-[11px] text-gray-500">{dialable ? `Calls with ${dialable}` : 'No phone number on file'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <CallButton phone={phone} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            title="Refresh call history"
            aria-label="Refresh call history"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="px-4 py-3">
        {loading && !loaded ? (
          <p className="py-6 text-center text-sm text-gray-400">Loading call history…</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-rose-600">{error}</p>
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No calls logged yet for this student.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map((call) => {
              const outbound = (call.direction ?? '').toLowerCase() === 'outbound';
              const DirectionIcon = outbound ? PhoneOutgoing : PhoneIncoming;
              return (
                <li key={call.uuid} className="flex flex-wrap items-center gap-3 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      outbound ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <DirectionIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{outbound ? 'Outgoing' : 'Incoming'}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${statusTone(call.status)}`}
                      >
                        {call.status ?? 'unknown'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {[formatWhen(call.startedAt), formatDuration(call.durationSeconds)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {call.recordingUrl ? (
                    <audio
                      controls
                      preload="none"
                      className="h-8 w-full max-w-[260px] sm:w-auto"
                      src={api.getCallRecordingUrl(authToken, call.recordingUrl)}
                    >
                      <track kind="captions" />
                    </audio>
                  ) : isRecordingPending(call) ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> Recording processing…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <Mic className="h-3 w-3" /> No recording
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
