import { useMemo, useState } from 'react';
import {
  ArrowLeft, Calendar, ClipboardList, GraduationCap, Mail, MessageCircle, MoreHorizontal, Pencil, Phone, Power, Users, Video,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { Pill } from '../../shared/components/ui-kit.js';
import { istToday, istYmd } from '../../shared/utils/ist-date.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import { initialsOf } from '../students/students-list-model.js';
import { InstructorFormDialog } from './InstructorFormDialog.js';
import { AssignmentsTab, CohortsScheduleTab } from './instructor-detail-tabs.js';
import { biographyText, instructorStats, toInstructorOverview } from './instructor-detail-model.js';
import { INSTRUCTOR_STATUS_TONE, instructorStatus, waNumber } from './instructor-list-model.js';
import { useInstructorActions } from './useInstructorActions.js';

// Admin → Instructor detail (TTII 2026-10-12, Naji's InstructorDetailModule):
// hero with the instructor's real counts, then Overview / Cohorts & Schedule /
// Assignments & Evaluation, all read from /admin/instructor/overview. Actions
// are the directory's own (Edit, Resend Login Email, Enable / Disable, Delete,
// Change Device) with the same confirms and toasts.
// NOT copied: Feedback & Performance (no rating / attendance-score data) and
// Documents & Certificates (no instructor document store) — both need tables;
// the photo is changed through Edit, not inline.

type Tab = 'overview' | 'cohorts' | 'assignments';

function instructorIdFromPath(): string {
  return /^\/admin\/instructor\/view\/(\d+)/.exec(window.location.pathname)?.[1] ?? '';
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-4" /></span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium text-foreground">{value || '—'}</div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 p-3 text-center shadow-sm">
      <div className="mx-auto grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-4" /></div>
      <div className="mt-1.5 text-2xl font-bold leading-none tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export default function InstructorDetailPage({ api, session, onNavigate }: AdminPageProps) {
  const id = useMemo(instructorIdFromPath, []);
  const { data, loading, error, reload } = useAdminPageData(
    () => (id ? api.loadInstructorOverview(session.token, id) : Promise.reject(new Error('Instructor not found.'))),
    [id],
  );
  const actions = useInstructorActions(api, session.token, reload);
  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);

  const model = useMemo(() => (data ? toInstructorOverview(data) : null), [data]);
  // The edit form reads list-shaped rows; give it the profile in that shape
  // (memoised: the form re-initialises whenever this object changes).
  const editRow = useMemo<Record<string, unknown> | null>(() => {
    if (!model) return null;
    const p = model.profile;
    return {
      id: p.id, name: p.name, user_email: p.email, phone: p.phone, whatsapp_phone: p.whatsapp,
      highest_qualification: p.qualification, biography: p.biography, image: p.image, status: p.status,
    };
  }, [model]);
  const today = istToday();
  const back = () => onNavigate('/admin/instructor/index');

  if (loading) return <PageLoader label="Loading instructor..." />;
  if (error || !model) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error || 'Instructor not found.'}
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={back}>Back to Instructors</Button>
            <Button variant="outline" onClick={reload}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const p = model.profile;
  const status = instructorStatus({ status: p.status, disabled_at: p.disabled ? 'set' : null });
  const ref = { id: p.id, name: p.name, isDisabled: p.disabled };
  const stats = instructorStats(model, today);
  const joined = formatYmd(istYmd(p.createdAt));
  const wa = waNumber(p.whatsapp);
  const bio = biographyText(p.biography);
  const tabs: Array<{ id: Tab; label: string; count?: number; icon: LucideIcon }> = [
    { id: 'overview', label: 'Overview', icon: GraduationCap },
    { id: 'cohorts', label: 'Cohorts & Schedule', count: model.totals.cohorts, icon: Users },
    { id: 'assignments', label: 'Assignments & Evaluation', count: model.totals.assignments, icon: ClipboardList },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back to Instructors"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <button type="button" onClick={back} className="hover:text-foreground">Instructors</button>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-foreground">{p.name || 'Instructor'}</span>
        </nav>
      </div>

      <Card className="relative gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="relative grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar className="size-20 shrink-0 ring-4 ring-card">
              {p.image ? <AvatarImage src={p.image} alt="" /> : null}
              <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">{initialsOf(p.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Instructor</p>
              <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-foreground">{p.name || 'Instructor'}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={INSTRUCTOR_STATUS_TONE[status]}>{status}</Pill>
                {p.qualification ? <Pill tone="slate">{p.qualification}</Pill> : null}
                {joined ? <span className="text-[11px] text-muted-foreground">Joined {joined}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}><Pencil aria-hidden="true" className="size-4" /> Edit</Button>
                {wa ? (
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" className="size-4" /> WhatsApp</a>
                  </Button>
                ) : null}
                {p.email ? (
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={`mailto:${p.email}`}><Mail aria-hidden="true" className="size-4" /> Email</a>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  className={cn('gap-1.5', !p.disabled && 'text-destructive hover:text-destructive')}
                  onClick={() => { void actions.toggleLogin(ref); }}
                >
                  <Power aria-hidden="true" className="size-4" /> {p.disabled ? 'Enable' : 'Disable'}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline" className="size-8" aria-label="More actions"><MoreHorizontal aria-hidden="true" className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => { void actions.resendLogin(ref); }}>Resend Login Email</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { void actions.changeDevice(ref); }}>Change Device</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => { void actions.remove(ref).then((deleted) => { if (deleted) back(); }); }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2">
            <StatTile icon={Users} label="Cohorts" value={stats.cohorts} />
            <StatTile icon={GraduationCap} label="Learners" value={stats.learners} />
            <StatTile icon={Video} label="Sessions Done" value={stats.sessionsDone} />
            <StatTile icon={ClipboardList} label="Pending Eval" value={stats.pendingEval} />
          </div>
        </div>
      </Card>

      <div role="group" aria-label="Instructor sections" className="rounded-2xl border border-border bg-muted/40 p-1.5">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-card hover:text-foreground',
              )}
            >
              <t.icon aria-hidden="true" className="size-4" />
              {t.label}
              {typeof t.count === 'number' ? (
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', tab === t.id ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{t.count}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 text-base font-semibold">Contact Information</h3>
            <div className="space-y-3.5">
              <InfoRow icon={Phone} label="Phone" value={p.phone} />
              <InfoRow icon={MessageCircle} label="WhatsApp" value={p.whatsapp} />
              <InfoRow icon={Mail} label="Email" value={p.email} />
            </div>
          </Card>
          <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-4 text-base font-semibold">Professional Details</h3>
            <div className="space-y-3.5">
              <InfoRow icon={GraduationCap} label="Highest Qualification" value={p.qualification} />
              <InfoRow icon={Calendar} label="Joined On" value={joined} />
              <InfoRow
                icon={Users}
                label="Cohorts Handling"
                value={`${stats.cohorts} cohort${stats.cohorts === 1 ? '' : 's'} · ${stats.learners} learner${stats.learners === 1 ? '' : 's'}`}
              />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Biography</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{bio || 'No biography on file.'}</p>
            </div>
          </Card>
        </div>
      )}

      {tab === 'cohorts' && (
        <CohortsScheduleTab
          cohorts={model.cohorts}
          cohortTotal={model.totals.cohorts}
          sessions={model.sessions}
          today={today}
          onOpenCohort={(cohortId) => onNavigate(`/admin/cohorts/view/${cohortId}`)}
        />
      )}
      {tab === 'assignments' && <AssignmentsTab assignments={model.assignments} total={model.totals.assignments} />}

      <InstructorFormDialog
        open={editOpen}
        initial={editRow}
        api={api}
        token={session.token}
        onClose={() => setEditOpen(false)}
        onSaved={reload}
      />
    </div>
  );
}
