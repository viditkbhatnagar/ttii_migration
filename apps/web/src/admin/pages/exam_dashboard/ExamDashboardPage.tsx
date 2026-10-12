import { useMemo, useState } from 'react';
import { Activity, Award, CalendarDays, CheckCircle2, ClipboardList, Clock, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { KpiTile } from '../../shared/components/ui-kit.js';
import { ViewExamDialog } from '../exam/ViewExamDialog.js';
import type { CalendarItem } from '../exam_calendar/exam-calendar-model.js';
import { ActivityCard, PendingCard, PipelineCard, UpcomingCard } from './dashboard-sections.js';
import { ModuleSummary, ParticipationCard, QuestionBankCard, QuickAccess, StatusCard, TrendCard } from './dashboard-panels.js';
import {
  HREF,
  formatWhen,
  pendingTasks,
  pipelineStages,
  questionBars,
  resultsHref,
  statusBars,
  toExamDashboard,
} from './exam-dashboard-model.js';

// Exam → Dashboard (TTII 2026-10-12, Naji's ExamDashboardModule): the exam
// section's command centre — KPIs, the eight-stage pipeline, what is coming up,
// what is waiting on staff, and what happened lately — all from one read-only
// summary (/admin/exam_dashboard/summary). Not built from the prototype:
// academic-year / session / course / exam-type filters, KPI deltas, the
// difficulty donut, withheld / archived results and marksheets (no data).

export default function ExamDashboardPage({ api, session, onNavigate }: AdminPageProps) {
  const [viewing, setViewing] = useState<number | null>(null);
  const { data, loading, error, reload } = useAdminPageData(
    async () => toExamDashboard(await api.getExamDashboard(session.token)),
    [],
    'exam-dashboard',
  );
  const now = useMemo(() => (data?.generatedAt ? new Date(data.generatedAt) : new Date()), [data?.generatedAt]);

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          <Sparkles aria-hidden="true" className="size-3" /> Command centre
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Exam Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor and manage the complete examination lifecycle.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNavigate(HREF.reExam)}>
          <RefreshCw aria-hidden="true" className="size-4" /> Re-exam
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNavigate(HREF.results)}>
          <Award aria-hidden="true" className="size-4" /> Results
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => onNavigate(HREF.newExam)}>
          <Plus aria-hidden="true" className="size-4" /> New Exam
        </Button>
      </div>
    </div>
  );

  if (loading && !data) return <PageLoader label="Loading exam dashboard…" />;
  if (error && !data) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
            {error}
            <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data) return null;

  const s = data.status;
  const openItem = (item: CalendarItem) => {
    if (item.kind === 'reexam') onNavigate(HREF.reExam);
    else setViewing(item.examId);
  };

  return (
    <div className="space-y-6">
      {header}

      <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-muted-foreground">
        <span>Updated {formatWhen(data.generatedAt, new Date())}</span>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={reload} disabled={loading}>
          <RefreshCw aria-hidden="true" className={loading ? 'size-3.5 animate-spin' : 'size-3.5'} /> Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Total Exams" value={s.total} icon={ClipboardList} tone="slate" onClick={() => onNavigate(HREF.exams)} />
        <KpiTile label="Upcoming Exams" value={s.upcoming} icon={CalendarDays} tone="blue" onClick={() => onNavigate(HREF.exams)} />
        <KpiTile label="In Progress" value={s.inProgress} icon={Activity} tone="primary" onClick={() => onNavigate(HREF.calendar)} />
        <KpiTile label="Awaiting Results" value={s.ready} icon={Clock} tone="amber" onClick={() => onNavigate(resultsHref(data.readyToPublish))} />
        <KpiTile label="Results Published" value={s.published} icon={CheckCircle2} tone="emerald" onClick={() => onNavigate(HREF.results)} />
        <KpiTile label="Re-exams Pending" value={data.reExamsScheduled} icon={RefreshCw} tone="rose" onClick={() => onNavigate(HREF.reExam)} />
      </div>

      <PipelineCard stages={pipelineStages(data)} onNavigate={onNavigate} />

      <div className="grid gap-4 lg:grid-cols-3">
        <UpcomingCard items={data.upcoming} now={now} onOpen={openItem} onNavigate={onNavigate} />
        <PendingCard tasks={pendingTasks(data)} onNavigate={onNavigate} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatusCard bars={statusBars(data)} total={s.total} />
        <ActivityCard items={data.activity} now={now} />
      </div>

      <ModuleSummary d={data} onNavigate={onNavigate} />

      <div className="grid gap-4 lg:grid-cols-3">
        <TrendCard rows={data.trend} />
        <ParticipationCard p={data.participation} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <QuestionBankCard bars={questionBars(data)} total={data.questionBank.total} />
        <QuickAccess onNavigate={onNavigate} />
      </div>

      <ViewExamDialog
        examId={viewing}
        api={api}
        token={session.token}
        onClose={() => setViewing(null)}
        onNavigate={onNavigate}
        onDeleted={reload}
      />
    </div>
  );
}
