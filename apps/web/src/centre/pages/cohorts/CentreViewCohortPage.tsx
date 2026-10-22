import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, ClipboardList, ExternalLink, Megaphone, Plus, Search, Users, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { daysBetween, fmtDay, fmtTime, initials, matchesQuery } from '../kit/format.js';
import { CentrePageHeader, NoticeCard } from '../kit/page-kit.js';
import { AddLearnersDialog } from './AddLearnersDialog.js';
import { AddSessionDialog } from './AddSessionDialog.js';
import { COHORT_STATUS_LABEL, COHORT_STATUS_STYLE, addableStudents, splitSessions, toCohortDetail, type CohortDetail, type LiveSession } from './cohort-model.js';

type Tab = 'learners' | 'live' | 'assignments' | 'announcements';

function cohortIdFromPath(): string {
  const parts = window.location.pathname.replace(/\/$/, '').split('/');
  return parts[parts.length - 1] ?? '';
}

function TabPill({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: typeof Users; label: string; count: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn('inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-card hover:text-foreground')}>
      <Icon className="h-4 w-4" />{label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{count}</span>
    </button>
  );
}

function MetaItem({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '—'}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function SessionRow({ s }: { s: LiveSession }) {
  const completed = s.state === 'completed';
  const time = s.from ? `${fmtTime(s.from)}${s.to ? ` – ${fmtTime(s.to)}` : ''}` : '';
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 transition hover:border-primary/30 hover:bg-primary/5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Video className="h-4 w-4" /></span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{s.title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{s.platform}{s.hostEmail ? <> · Host: <span className="text-primary">{s.hostEmail}</span></> : null}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs font-medium">{fmtDay(s.dateYmd)}</div>
          <div className="text-[11px] text-muted-foreground">{time}</div>
        </div>
        {completed && s.hasRecording && <Badge variant="outline" className="hidden rounded-full border-transparent bg-success-soft text-success sm:inline-flex">Recording uploaded</Badge>}
        {s.joinUrl && (
          <a href={s.joinUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open meeting link for ${s.title}`} title="Open meeting link"
            className="rounded-lg p-1.5 text-primary transition hover:bg-primary/10"><ExternalLink className="h-4 w-4" /></a>
        )}
      </div>
    </div>
  );
}

function SessionGroup({ label, sessions }: { label: string; sessions: LiveSession[] }) {
  if (sessions.length === 0) return null;
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="space-y-2 p-4">{sessions.map((s) => <SessionRow key={s.id} s={s} />)}</div>
    </div>
  );
}

function PanelHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export default function CentreViewCohortPage({ api, session, onNavigate }: CentrePageProps) {
  const cohortId = useMemo(cohortIdFromPath, []);
  const detail = useAdminPageData<CohortDetail>(async () => toCohortDetail(await api.loadCohortView(session.token, cohortId)), [session.token, cohortId]);
  const students = useAdminPageData(() => api.loadStudents(session.token), [session.token]);
  const [tab, setTab] = useState<Tab>('learners');
  const [search, setSearch] = useState('');
  const [addingLearners, setAddingLearners] = useState(false);
  const [addingSession, setAddingSession] = useState(false);

  const back = (
    <Button variant="outline" className="gap-1.5" onClick={() => onNavigate('/centre/cohorts')}><ArrowLeft className="h-4 w-4" />Back to Cohorts</Button>
  );

  if (detail.loading) return <PageLoader label="Loading cohort..." />;
  const c = detail.data;
  if (detail.error || !c) {
    return <div className="space-y-5"><CentrePageHeader title="Cohort Details" actions={back} /><NoticeCard tone="error">{detail.error || 'Cohort not found.'}</NoticeCard></div>;
  }

  const filteredLearners = c.learners.filter((l) => matchesQuery(search, [l.name, l.studentCode]));
  const sessions = splitSessions(c.sessions);
  const duration = daysBetween(c.startYmd, c.endYmd);
  const candidates = addableStudents(students.data ?? [], c.learners);

  return (
    <div className="space-y-5">
      <CentrePageHeader title="Cohort Details" subtitle={`${c.title} · ${c.code}`} actions={back} />
      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-md">{initials(c.instructor)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Faculty</p>
              <h2 className="mt-0.5 truncate text-2xl font-bold tracking-tight">{c.instructor || 'No instructor yet'}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('rounded-full', COHORT_STATUS_STYLE[c.status])}>{COHORT_STATUS_LABEL[c.status]}</Badge>
                <span className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[11px] font-medium">{c.code || '—'}</span>
                <span className="text-[11px] text-muted-foreground">Cohort {c.cid}</span>
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center sm:gap-3">
            {[['Students', c.learners.length], ['Live Sessions', c.sessions.length], ['Assignments', c.assignments.length]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/70 bg-card px-3 py-2">
                <dd className="text-xl font-bold tabular-nums">{value}</dd>
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid gap-4 border-t border-border/60 bg-muted/20 p-5 sm:grid-cols-2 md:grid-cols-4">
          <MetaItem icon={BookOpen} label="Subject" value={[c.subject, c.language].filter(Boolean).join(' - ')} />
          <MetaItem icon={BookOpen} label="Course" value={c.courses.join(', ')} />
          <MetaItem icon={Calendar} label="Start Date" value={fmtDay(c.startYmd)} />
          <MetaItem icon={Calendar} label="End Date" value={fmtDay(c.endYmd)} {...(duration !== null ? { sub: `${duration + 1} days` } : {})} />
        </div>
      </Card>

      <div className="rounded-2xl border border-border bg-muted/40 p-1.5">
        <div className="flex flex-wrap gap-1">
          <TabPill active={tab === 'learners'} onClick={() => setTab('learners')} icon={Users} label="Learners" count={c.learners.length} />
          <TabPill active={tab === 'live'} onClick={() => setTab('live')} icon={Video} label="Live Sessions" count={c.sessions.length} />
          <TabPill active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={ClipboardList} label="Assignments" count={c.assignments.length} />
          <TabPill active={tab === 'announcements'} onClick={() => setTab('announcements')} icon={Megaphone} label="Announcements" count={c.announcements.length} />
        </div>
      </div>

      {tab === 'learners' && (
        <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
          <PanelHeader title={`Learners List (${c.learners.length})`} subtitle="Enrolled students in this cohort.">
            <div className="relative">
              <label htmlFor="learner-filter" className="sr-only">Search learners</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="learner-filter" placeholder="Search learners" className="h-9 w-44 rounded-full pl-9 sm:w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setAddingLearners(true)}><Plus className="h-4 w-4" /> Add</Button>
          </PanelHeader>
          <div className="grid gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLearners.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-muted-foreground">{c.learners.length === 0 ? 'No learners in this cohort yet.' : 'No learners match your search.'}</div>
            )}
            {filteredLearners.map((l, i) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
                <span className="w-5 text-center text-xs font-medium text-muted-foreground">{i + 1}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{initials(l.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.name || '—'}</span>
                  {l.studentCode && <span className="block text-[11px] text-muted-foreground">{l.studentCode}</span>}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'live' && (
        <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
          <PanelHeader title="Live Sessions" subtitle="Scheduled and past live classes.">
            <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setAddingSession(true)}><Plus className="h-4 w-4" /> Add Live Session</Button>
          </PanelHeader>
          {c.sessions.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No live sessions yet.</div>}
          <SessionGroup label="Upcoming / Scheduled" sessions={sessions.scheduled} />
          <SessionGroup label="Completed" sessions={sessions.completed} />
        </Card>
      )}

      {tab === 'assignments' && (
        <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
          <PanelHeader title={`Assignments (${c.assignments.length})`} subtitle="Set by the cohort's faculty. Read-only here." />
          {c.assignments.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No assignments yet.</div>}
          <div className="divide-y divide-border">
            {c.assignments.map((a) => (
              <div key={a.id} className="space-y-1 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold">{a.title}</h4>
                  <span className="text-xs text-muted-foreground">{a.totalMarks !== null ? `${a.totalMarks} marks · ` : ''}{a.dueYmd ? `Due ${fmtDay(a.dueYmd)} · ` : ''}{a.submissions} submission{a.submissions === 1 ? '' : 's'}</span>
                </div>
                {a.description && <p className="line-clamp-2 text-sm text-muted-foreground">{a.description}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'announcements' && (
        <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
          <PanelHeader title={`Announcements (${c.announcements.length})`} subtitle="Messages the faculty has sent to this cohort." />
          {c.announcements.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No announcements posted.</div>}
          <div className="divide-y divide-border">
            {c.announcements.map((a) => (
              <div key={a.id} className="space-y-1 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold">{a.title}</h4>
                  <span className="text-xs text-muted-foreground">{fmtDay(a.sentYmd)}</span>
                </div>
                {a.content && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <AddLearnersDialog open={addingLearners} onOpenChange={setAddingLearners} api={api} token={session.token} cohortId={c.id} candidates={candidates} onAdded={detail.reload} />
      <AddSessionDialog open={addingSession} onOpenChange={setAddingSession} api={api} token={session.token} cohortId={c.id} today={c.today} hasInstructor={c.hasInstructor} onAdded={detail.reload} />
    </div>
  );
}
