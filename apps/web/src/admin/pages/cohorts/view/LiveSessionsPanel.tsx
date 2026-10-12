import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Copy, ExternalLink, Eye, LayoutGrid, Link2, List, Pencil, Plus, Trash2, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import { AddLiveSessionModal } from '../../../shared/components/AddLiveSessionModal.js';
// How to read a live_class row this API returned — see admin-portal-api.ts.
import { externalRecordingUrl, isImportedLiveSession } from '../../../admin-portal-api.js';
import { toSessionView, type SessionView } from './cohort-detail-model.js';
import { AttendanceDialog, EditRecordingDialog } from './LiveSessionDialogs.js';
import { IconBtn, PanelHeader, SegmentedToggle } from './panel-ui.js';

type Api = AdminPageProps['api'];
interface Session { view: SessionView; imported: boolean }

// Copy a session's join link (Naji/Ansaba 2026-06-08: "just a copy button").
function copyLiveLink(url: string): void {
  if (!url) {
    toast.error('No link available for this session yet.');
    return;
  }
  void navigator.clipboard.writeText(url)
    .then(() => toast.success('Live class link copied'))
    .catch(() => toast.error('Could not copy link.'));
}

export function LiveSessionsPanel({
  api, token, cohortId, sessions, onReload,
}: { api: Api; token: string; cohortId: string; sessions: Record<string, unknown>[]; onReload: () => void }) {
  const confirm = useConfirm();
  // Naji UAT 2026-05-22 — Row is the default view, Card one click away.
  const [view, setView] = useState<'row' | 'card'>('row');
  // Risha UAT 2026-08-12 — the server sends sessions oldest-first (course
  // order, as students see them); newest-first stays one click away.
  const [completedOrder, setCompletedOrder] = useState<'oldest' | 'newest'>('oldest');
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<SessionView | null>(null);
  const [attendance, setAttendance] = useState<SessionView | null>(null);

  const all = useMemo<Session[]>(() => sessions.map((s) => ({ view: toSessionView(s), imported: isImportedLiveSession(s) })), [sessions]);
  const upcoming = all.filter((s) => !s.view.completed);
  const completedAsc = all.filter((s) => s.view.completed);
  const completed = completedOrder === 'oldest' ? completedAsc : [...completedAsc].reverse();

  const remove = async (s: SessionView) => {
    const ok = await confirm({
      title: 'Delete this live session?',
      description: `${s.title}${s.date ? ` · ${s.date}` : ''}. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteCohortLiveSession(token, s.id);
      toast.success(asString(res.message) || 'Live session deleted');
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const join = (s: SessionView) => {
    if (s.hostUrl) window.open(s.hostUrl, '_blank', 'noopener,noreferrer');
  };

  // Spaces-backed Teams recordings need a signed URL; a Vimeo / imported
  // video_url row has no storage key, so it opens the link itself.
  const openRecording = (s: SessionView) => {
    if (!s.recording) return;
    const linked = externalRecordingUrl(s.videoUrl);
    if (!s.spacesRecording) {
      if (linked) window.open(linked, '_blank', 'noopener,noreferrer');
      else toast.error('Recording link is not a valid web address.');
      return;
    }
    void (async () => {
      try {
        const signedUrl = await api.getLiveSessionRecordingSignedUrl(token, s.id);
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        if (linked) {
          window.open(linked, '_blank', 'noopener,noreferrer');
          return;
        }
        toast.error(err instanceof Error ? err.message : 'Failed to open recording');
      }
    })();
  };

  const upcomingActions = (s: SessionView) => (
    <>
      <IconBtn icon={Pencil} tone="muted" label="Edit recording link" onClick={() => setEditing(s)} />
      <IconBtn icon={ExternalLink} tone="info" label="Join" disabled={!s.hostUrl} onClick={() => join(s)} />
      {s.joinUrl ? <IconBtn icon={Copy} tone="muted" label="Copy meeting link" onClick={() => copyLiveLink(s.joinUrl)} /> : null}
      <IconBtn icon={Trash2} tone="danger" label="Delete session" onClick={() => void remove(s)} />
    </>
  );
  const completedActions = (s: SessionView) => (
    <>
      <IconBtn icon={Eye} tone="info" label="View recording" disabled={!s.recording} onClick={() => openRecording(s)} />
      <IconBtn icon={Users} tone="success" label="View attendance" onClick={() => setAttendance(s)} />
      <IconBtn icon={Pencil} tone="muted" label="Edit recording link" onClick={() => setEditing(s)} />
      <IconBtn icon={Trash2} tone="danger" label="Delete session" onClick={() => void remove(s)} />
    </>
  );

  return (
    <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <PanelHeader title="Live Sessions" subtitle="Scheduled and past live classes.">
        <SegmentedToggle
          label="View mode"
          value={view}
          onChange={setView}
          options={[{ id: 'row', label: 'Row', icon: List }, { id: 'card', label: 'Card', icon: LayoutGrid }]}
        />
        <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" className="size-4" /> Add Live Session
        </Button>
      </PanelHeader>

      <Section label="Upcoming / Scheduled" empty="No upcoming sessions." count={upcoming.length} view={view}>
        {upcoming.map(({ view: s }) => (view === 'row'
          ? <SessionRow key={s.id} s={s} meta={`${s.sessionId || 'No session ID'} · ${s.platformLabel} · ${s.detailLabel}: ${s.detailValue}`} badges={null} actions={upcomingActions(s)} />
          : <SessionCard key={s.id} s={s} state="scheduled" imported={false} actions={upcomingActions(s)} />))}
      </Section>

      <Section
        label="Completed"
        empty="No completed sessions."
        count={completed.length}
        view={view}
        tools={completed.length > 1 ? (
          <SegmentedToggle
            label="Sort completed sessions by date"
            value={completedOrder}
            onChange={setCompletedOrder}
            options={[{ id: 'oldest', label: 'Oldest first' }, { id: 'newest', label: 'Newest first' }]}
          />
        ) : null}
      >
        {completed.map(({ view: s, imported }) => (view === 'row'
          ? (
            <SessionRow
              key={s.id}
              s={s}
              meta={`${s.sessionId || 'No session ID'} · ${s.platformLabel}`}
              badges={<StateBadges imported={imported} />}
              actions={completedActions(s)}
            />
          )
          : <SessionCard key={s.id} s={s} state="completed" imported={imported} actions={completedActions(s)} />))}
      </Section>

      {adding ? (
        <AddLiveSessionModal
          open
          onClose={() => setAdding(false)}
          api={api}
          token={token}
          cohortId={cohortId}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSuccess={() => { setAdding(false); onReload(); }}
        />
      ) : null}
      {editing ? (
        <EditRecordingDialog
          api={api}
          token={token}
          sessionId={editing.id}
          initialLink={editing.recording}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onReload(); }}
        />
      ) : null}
      {attendance ? (
        <AttendanceDialog api={api} token={token} sessionId={attendance.id} sessionTitle={attendance.title} onClose={() => setAttendance(null)} />
      ) : null}
    </Card>
  );
}

function Section({
  label, empty, count, view, tools, children,
}: { label: string; empty: string; count: number; view: 'row' | 'card'; tools?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        {tools}
      </div>
      {count === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className={view === 'card' ? 'grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2 p-4'}>{children}</div>
      )}
    </div>
  );
}

function StateBadges({ imported }: { imported: boolean }) {
  return (
    <>
      {imported ? (
        <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary sm:inline-flex" title="Recording linked from an earlier cohort">
          <Link2 aria-hidden="true" className="size-3" /> Linked
        </span>
      ) : null}
      <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline-flex">
        <CheckCircle2 aria-hidden="true" className="size-3" /> Uploaded
      </span>
    </>
  );
}

function SessionRow({ s, meta, badges, actions }: { s: SessionView; meta: string; badges: React.ReactNode; actions: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 transition hover:border-primary/30 hover:bg-primary/5 md:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Video aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{s.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
      </div>
      <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 md:col-span-1">
        <div className="text-right">
          <p className="text-xs font-medium">{s.date}</p>
          <p className="text-[11px] text-muted-foreground">{s.time}</p>
        </div>
        {badges}
        <div className="flex items-center">{actions}</div>
      </div>
    </div>
  );
}

function SessionCard({
  s, state, imported, actions,
}: { s: SessionView; state: 'scheduled' | 'completed'; imported: boolean; actions: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/30">
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Video aria-hidden="true" className="size-4" />
        </span>
        {state === 'completed' ? (
          <div className="flex gap-1"><StateBadges imported={imported} /></div>
        ) : (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Scheduled</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{s.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{s.sessionId || 'No session ID'}</p>
      </div>
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p>{s.date}{s.time ? ` · ${s.time}` : ''}</p>
        <p className="truncate">{s.platformLabel}{state === 'scheduled' ? ` · ${s.detailLabel}: ${s.detailValue}` : ''}</p>
        {state === 'scheduled' && s.joinUrl ? (
          <a href={s.joinUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-primary hover:underline">{s.joinUrl}</a>
        ) : null}
      </div>
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-border/70 pt-2">{actions}</div>
    </div>
  );
}
