import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asNumber, asString, formatDate } from '../../../shared/utils/admin-data-utils.js';
import { DialogShell } from './DialogShell.js';

type Api = AdminPageProps['api'];

/** "Edit Recorded link" — writes live_class.recording_url via /admin/cohorts/update_recording. */
export function EditRecordingDialog({
  api, token, sessionId, initialLink, onClose, onSaved,
}: { api: Api; token: string; sessionId: string; initialLink: string; onClose: () => void; onSaved: () => void }) {
  const [link, setLink] = useState(initialLink);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.updateLiveSessionRecording(token, sessionId, link);
      toast.success(asString(res.message) || 'Recording link saved');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save recording link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Edit Recorded link"
      onSubmit={() => void submit()}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting || !link}>{submitting ? 'Saving…' : 'Save'}</Button>
        </>
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="recording-link">Vimeo Link *</Label>
        <Input id="recording-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://vimeo.com/..." />
      </div>
    </DialogShell>
  );
}

/** Teams attendance for one session (synced by the teams-artifacts cron). */
export function AttendanceDialog({
  api, token, sessionId, sessionTitle, onClose,
}: { api: Api; token: string; sessionId: string; sessionTitle: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const response = await api.loadLiveSessionAttendance(token, sessionId);
        if (cancelled) return;
        if (asNumber(response.status) === 1) setData((response.data as Record<string, unknown>) ?? null);
        else setError(asString(response.message) || 'Failed to load attendance.');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load attendance.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, token, sessionId]);

  const session = (data?.session as Record<string, unknown>) ?? null;
  const attendance = (data?.attendance as Record<string, unknown>[]) ?? [];
  const fetchedAt = session ? asString(session.attendance_fetched_at) : '';
  const fetchError = session ? asString(session.attendance_fetch_error) : '';

  return (
    <DialogShell open onClose={onClose} title={`Attendance · ${sessionTitle}`} width={768} footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading attendance…</p>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : fetchedAt === '' ? (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Attendance has not been synced from Microsoft Teams yet. The sync job runs every 5 minutes and typically completes within 10 minutes of a meeting ending.
          {fetchError ? <p className="mt-2 text-xs text-amber-700">Last sync error: {fetchError}</p> : null}
        </div>
      ) : attendance.length === 0 ? (
        <div role="status" className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          No attendance records for this session — no participants joined, or Teams did not return any.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Synced {formatDate(fetchedAt)} · {attendance.length} participant{attendance.length === 1 ? '' : 's'}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2">Name</th>
                  <th scope="col" className="px-3 py-2">Email</th>
                  <th scope="col" className="px-3 py-2">Role</th>
                  <th scope="col" className="px-3 py-2 text-right">Time (mins)</th>
                  <th scope="col" className="px-3 py-2 text-right">Attended %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendance.map((a) => {
                  const pct = a.percent_attended === null ? null : asNumber(a.percent_attended);
                  return (
                    <tr key={asString(a.id)} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium text-foreground">{asString(a.user_name) || asString(a.display_name) || asString(a.email)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{asString(a.email)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{asString(a.role) || 'Attendee'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Math.round(asNumber(a.total_seconds) / 60)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {pct !== null ? (
                          <span className={pct >= 80 ? 'font-semibold text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-muted-foreground'}>{pct.toFixed(1)}%</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DialogShell>
  );
}
