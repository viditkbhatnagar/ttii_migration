import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, ClipboardList, Megaphone, Users, Video, type LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { Pill } from '../../shared/components/ui-kit.js';
import { STATUS_LABEL, STATUS_TONE, formatCohortCode } from './cohort-list-model.js';
import { cohortDurationDays, cohortStatusOn } from './cohort-form-model.js';
import { dmy, istTodayYmd, ymdOf } from './list-model.js';
import { AnnouncementsPanel } from './view/AnnouncementsPanel.js';
import { AssignmentsPanel } from './view/AssignmentsPanel.js';
import { LearnersPanel } from './view/LearnersPanel.js';
import { LiveSessionsPanel } from './view/LiveSessionsPanel.js';

// Cohort detail (TTII 2026-10-12), rebuilt after Naji's CohortDetailModule:
// breadcrumb, faculty hero with counts and dates, then Learners / Live
// Sessions / Assignments / Announcements. Every action of the old page is kept
// (see the panels); the panels live in ./view/.

type Tab = 'learners' | 'live' | 'assignments' | 'announcements';

function StatTile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 p-3 text-center shadow-sm">
      <div className={cn('mx-auto grid size-8 place-items-center rounded-lg', tone)}>
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="mt-1.5 text-2xl font-bold leading-none tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value, sub, accent }: { icon: LucideIcon; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn('truncate text-sm font-medium', accent ? 'text-primary' : 'text-foreground')} title={value}>{value}</div>
        {sub ? <div className="text-[11px] text-muted-foreground">{sub}</div> : null}
      </div>
    </div>
  );
}

function TabPill({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-card hover:text-foreground',
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{count}</span>
    </button>
  );
}

export default function ViewCohortPage({ api, session, onNavigate }: AdminPageProps) {
  const [tab, setTab] = useState<Tab>('learners');
  const cohortId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error, reload } = useAdminPageData(() => api.getCohortDetail(session.token, cohortId), [cohortId]);
  const cohort = useMemo(() => {
    const record = data?.cohort;
    return record && typeof record === 'object' ? (record as Record<string, unknown>) : null;
  }, [data]);
  const learners = useMemo(() => toRecords(data?.learners), [data]);
  const liveSessions = useMemo(() => toRecords(data?.live_sessions), [data]);
  const assignments = useMemo(() => toRecords(data?.assignments), [data]);
  const announcements = useMemo(() => toRecords(data?.announcements), [data]);

  const back = () => onNavigate('/admin/cohorts/index');

  if (loading) return <PageLoader label="Loading cohort…" />;
  if (error || !cohort) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error || asString(data?.message) || 'Cohort not found.'}
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={back}>Back to Cohorts</Button>
            <Button variant="outline" onClick={reload}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const instructorName = asString(cohort.instructor_name) || 'Unassigned';
  const instructorImage = asString(cohort.instructor_image);
  const courseTitles = Array.isArray(cohort.course_titles) ? cohort.course_titles.map((t) => asString(t)).filter(Boolean) : [];
  const courseLabel = courseTitles.join(', ') || asString(cohort.course_title) || '-';
  const subjectTitle = asString(cohort.subject_title) || '-';
  const language = asString(cohort.language) || asString(cohort.language_title);
  const code = formatCohortCode(cohort.cohort_id) || asString(cohort.title);
  const rowId = `C${asString(cohort.id) || cohortId}`;
  const startYmd = ymdOf(cohort.start_date);
  const endYmd = ymdOf(cohort.end_date);
  const days = cohortDurationDays(startYmd, endYmd);
  const status = cohortStatusOn(startYmd, endYmd, istTodayYmd());
  const cohortName = asString(cohort.title);
  const studentCount = learners.length || asNumber(cohort.student_count);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back to Cohorts"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>
        <nav aria-label="Breadcrumb" className="min-w-0 truncate text-xs text-muted-foreground">
          <button type="button" onClick={back} className="hover:text-foreground">Cohorts</button>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-foreground">{cohortName || code}</span>
        </nav>
      </div>

      <Card className="relative gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/[0.03] to-transparent" />
        <div className="relative grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar className="size-16 shrink-0 rounded-2xl shadow-md">
              {instructorImage ? <AvatarImage src={instructorImage} alt={instructorName} className="object-cover" /> : null}
              <AvatarFallback className="rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">{instructorName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Faculty</p>
              <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-foreground">{instructorName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>
                {code ? <span className="rounded-full border border-border bg-card/70 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">{code}</span> : null}
                <span className="text-[11px] text-muted-foreground">Cohort {rowId}{cohortName ? ` · ${cohortName}` : ''}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile icon={Users} label="Students" value={studentCount} tone="bg-primary/10 text-primary" />
            <StatTile icon={Video} label="Live Sessions" value={liveSessions.length || asNumber(cohort.live_class_count)} tone="bg-sky-50 text-sky-600" />
            <StatTile icon={ClipboardList} label="Assignments" value={assignments.length || asNumber(cohort.assignments_count)} tone="bg-amber-50 text-amber-600" />
          </div>
        </div>
        <div className="relative grid gap-4 border-t border-border/60 bg-card/60 p-5 sm:grid-cols-2 md:grid-cols-4">
          <MetaItem icon={BookOpen} label="Subject" value={language ? `${subjectTitle} - ${language}` : subjectTitle} accent />
          <MetaItem icon={BookOpen} label={courseTitles.length > 1 ? 'Programs' : 'Course'} value={courseLabel} accent />
          <MetaItem icon={Calendar} label="Start Date" value={dmy(startYmd) || '-'} />
          <MetaItem icon={Calendar} label="End Date" value={dmy(endYmd) || '-'} {...(days ? { sub: `${days} day${days === 1 ? '' : 's'}` } : {})} />
        </div>
      </Card>

      <div role="tablist" aria-label="Cohort sections" className="overflow-x-auto rounded-2xl border border-border bg-muted/40 p-1.5">
        <div className="flex gap-1">
          <TabPill active={tab === 'learners'} onClick={() => setTab('learners')} icon={Users} label="Learners" count={learners.length} />
          <TabPill active={tab === 'live'} onClick={() => setTab('live')} icon={Video} label="Live Sessions" count={liveSessions.length} />
          <TabPill active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={ClipboardList} label="Assignments" count={assignments.length} />
          <TabPill active={tab === 'announcements'} onClick={() => setTab('announcements')} icon={Megaphone} label="Announcements" count={announcements.length} />
        </div>
      </div>

      {tab === 'learners' ? (
        <LearnersPanel
          api={api}
          token={session.token}
          cohortId={cohortId}
          learners={learners}
          cohortInfo={[
            { label: 'Cohort', value: `${code} (${rowId})` },
            { label: 'Subject', value: subjectTitle },
            { label: 'Language', value: language },
            { label: 'Faculty', value: instructorName },
          ]}
          onReload={reload}
        />
      ) : null}
      {tab === 'live' ? <LiveSessionsPanel api={api} token={session.token} cohortId={cohortId} sessions={liveSessions} onReload={reload} /> : null}
      {tab === 'assignments' ? (
        <AssignmentsPanel
          api={api}
          token={session.token}
          cohortId={cohortId}
          cohortName={cohortName}
          studentCount={studentCount}
          assignments={assignments}
          onReload={reload}
        />
      ) : null}
      {tab === 'announcements' ? (
        <AnnouncementsPanel api={api} token={session.token} cohortId={cohortId} announcements={announcements} onReload={reload} />
      ) : null}
    </div>
  );
}
