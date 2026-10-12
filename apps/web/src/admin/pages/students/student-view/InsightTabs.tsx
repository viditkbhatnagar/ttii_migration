import { Activity, Award, BarChart3, Bell } from 'lucide-react';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { CallHistoryPanel } from '../../../shared/components/CallHistoryPanel.js';
import { Pill, StatBox } from '../../../shared/components/ui-kit.js';
import { asNumber, asString, formatDate } from '../../../shared/utils/admin-data-utils.js';
import { EmptyLine, Panel, SectionHeader } from './student-view-ui.js';

// Performance Analytics, Certification, Communication and Activity Log tabs —
// same data as before (/admin/students/analytics), in Naji's cards.

export function PerformanceTab({ performance }: { performance: Record<string, unknown> | null }) {
  return (
    <Panel>
      <SectionHeader icon={BarChart3} title="Performance Analytics" description="Quiz, assignment, video and practice performance" />
      {performance === null ? (
        <EmptyLine>No performance data yet.</EmptyLine>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatBox label={`Quiz Avg Score · ${asNumber(performance.quiz_attempts)} attempts`} value={Number(performance.quiz_avg_score ?? 0).toFixed(1)} tone="blue" />
          <StatBox label={`Assignment Avg · ${asNumber(performance.assignment_submissions)} submitted`} value={Number(performance.assignment_avg_score ?? 0).toFixed(1)} tone="emerald" />
          <StatBox
            label={`Video Completion · ${asNumber(performance.videos_watched)}/${asNumber(performance.total_videos)}`}
            value={`${asNumber(performance.video_completion_pct)}%`}
            tone={asNumber(performance.video_completion_pct) >= 50 ? 'emerald' : 'amber'}
          />
          <StatBox label={`Practice Avg · ${asNumber(performance.practice_attempts)} attempts`} value={Number(performance.practice_avg_score ?? 0).toFixed(1)} tone="slate" />
        </div>
      )}
    </Panel>
  );
}

export function CertificationTab() {
  return (
    <Panel>
      <SectionHeader icon={Award} title="Certification" />
      <EmptyLine>No certificates issued yet. Will appear here once the certificates table is wired in.</EmptyLine>
    </Panel>
  );
}

export function CommunicationTab({
  api, token, phone, notifications,
}: { api: AdminPortalApi; token: string; phone: string; notifications: Record<string, unknown>[] }) {
  return (
    <div className="space-y-6">
      <CallHistoryPanel api={api} authToken={token} phone={phone} />
      <Panel>
        <SectionHeader icon={Bell} title="Notifications" description="In-app notifications sent to this student" />
        {notifications.length === 0 ? (
          <EmptyLine>No in-app notifications yet.</EmptyLine>
        ) : (
          <ul className="space-y-3 border-l border-border pl-4">
            {notifications.slice(0, 50).map((n, idx) => (
              <li key={idx} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <div className="text-sm font-medium text-foreground">{asString(n.title)}</div>
                <div className="text-xs text-muted-foreground">{asString(n.description)}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(n.sent_at)}</div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs italic text-muted-foreground">Email and WhatsApp logs not yet available — will be wired once provider integrations land.</p>
      </Panel>
    </div>
  );
}

export function ActivityTab({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <Panel>
      <SectionHeader icon={Activity} title="Activity Log" description="Sign-ins and account events" />
      {rows.length === 0 ? (
        <EmptyLine>No activity recorded yet.</EmptyLine>
      ) : (
        <ul className="space-y-3 border-l border-border pl-4">
          {rows.slice(0, 200).map((a, idx) => {
            const event = asString(a.event);
            const description = asString(a.description);
            const success = Boolean(a.success);
            const failed = event.includes('FAIL') || event.includes('REJECT') || event.includes('DENIED');
            const ua = asString(a.user_agent);
            const ip = asString(a.ip_address);
            return (
              <li key={idx} className="relative">
                <span className={`absolute -left-[21px] top-1.5 size-2 rounded-full ${success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={failed ? 'rose' : success ? 'emerald' : 'slate'} className="text-[10px] uppercase">{event}</Pill>
                  {description ? <span className="text-sm text-foreground first-letter:uppercase">{description}</span> : null}
                  {ip ? <span className="text-xs text-muted-foreground">{ip}</span> : null}
                </div>
                {ua ? <div className="max-w-[600px] truncate text-[11px] text-muted-foreground">{ua}</div> : null}
                <div className="text-[11px] text-muted-foreground">{formatDate(a.created_at)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
