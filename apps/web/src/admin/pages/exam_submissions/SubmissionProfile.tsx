import { useState } from 'react';
import { Activity, ArrowLeft, FileText, ScrollText, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import {
  formatMinutes,
  marksLabel,
  percentage,
  scheduleLabel,
  toSubmissionDetail,
  type SubmissionRow,
} from './exam-submissions-model.js';
import { EvalBadge, MiniTile, ProfileTabBtn, ResultBadge, StatusBadge, TypeBadge } from './submission-ui.js';
import { EvaluationTab, OverviewTab, SubmissionTab, TimelineTab } from './submission-tabs.js';

// One student's submission on one sitting (Naji's SubmissionProfile). The
// prototype's "Device & Activity" tab is left out on purpose: device, OS,
// browser, IP, interruptions and refresh count are not recorded anywhere.

type ProfileTab = 'overview' | 'submission' | 'evaluation' | 'timeline';

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export function SubmissionProfile({
  api, token, row: opened, onBack,
}: { api: AdminPortalApi; token: string; row: SubmissionRow; onBack: () => void }) {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [rowKey, setRowKey] = useState(opened.key);
  const { data, loading, error, reload } = useAdminPageData(
    async () => toSubmissionDetail(await api.getExamSubmissionDetail(token, opened.sittingId, opened.userId)),
    [opened.sittingId, opened.userId],
  );

  const back = (
    <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5">
      <ArrowLeft aria-hidden="true" className="size-4" /> Back to submissions
    </Button>
  );
  if (loading && !data) return <PageLoader label="Loading submission…" />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        {back}
        <Card>
          <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
            {error ?? 'This submission could not be found. The student may no longer be allocated to the sitting.'}
            <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const row = data.rows.find((r) => r.key === rowKey) ?? data.rows[0] ?? opened;
  const pct = percentage(row);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {back}
        {data.rows.length > 1 ? (
          <div role="tablist" aria-label="Sitting" className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {data.rows.map((r) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={r.key === row.key}
                onClick={() => setRowKey(r.key)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  r.key === row.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r.type === 'reexam' ? 'Re-exam' : 'Regular sitting'}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-sm">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
                {initials(row.studentName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{row.studentName || `User ${row.userId}`}</h1>
                  {row.studentCode ? <span className="text-xs text-muted-foreground">• {row.studentCode}</span> : null}
                  <TypeBadge type={row.type} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.examTitle}</p>
                <p className="text-xs text-muted-foreground">{[row.subject, row.courses.join(', ')].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge row={row} />
              <EvalBadge row={row} />
              <ResultBadge row={row} />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniTile label="Scheduled (IST)" value={scheduleLabel(row)} />
            <MiniTile label="Duration" value={formatMinutes(row.durationMinutes)} />
            <MiniTile label="Attempt" value={`#${row.attemptNo}`} />
            <MiniTile label="Score" value={row.score !== null ? `${marksLabel(row)}${pct !== null ? ` (${pct}%)` : ''}` : '—'} />
          </div>
        </div>
        <div role="tablist" aria-label="Submission sections" className="flex flex-wrap gap-1 border-t border-border bg-muted/30 px-4">
          <ProfileTabBtn active={tab === 'overview'} onClick={() => setTab('overview')} icon={UserIcon} label="Overview" />
          <ProfileTabBtn active={tab === 'submission'} onClick={() => setTab('submission')} icon={FileText} label="Submission Details" />
          <ProfileTabBtn active={tab === 'evaluation'} onClick={() => setTab('evaluation')} icon={ScrollText} label="Evaluation" />
          <ProfileTabBtn active={tab === 'timeline'} onClick={() => setTab('timeline')} icon={Activity} label="Timeline" />
        </div>
      </Card>

      {tab === 'overview' ? <OverviewTab row={row} detail={data} /> : null}
      {tab === 'submission' ? <SubmissionTab row={row} detail={data} /> : null}
      {tab === 'evaluation' ? <EvaluationTab row={row} detail={data} /> : null}
      {tab === 'timeline' ? <TimelineTab row={row} detail={data} /> : null}
    </div>
  );
}
