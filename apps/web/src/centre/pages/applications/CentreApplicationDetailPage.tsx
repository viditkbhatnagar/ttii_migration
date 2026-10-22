import { canSeeMoney } from '../shared-money-access.js';
import { useMemo, useState } from 'react';
import {
  CheckCircle2, ClipboardList, FileText, GraduationCap, History, Mail, Phone, User, UserCheck, Wallet, XCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { BackLink, CARD, DotBadge, EmptyState, ErrorState, Field, FieldGrid, SectionCard } from '../list-kit/ListKit.js';
import { fmtInstant, fmtYmd, inr, initialsOf, pathId } from '../list-kit/list-kit-model.js';
import { PaymentLines } from './PaymentLines.js';
import { ConvertDialog, RejectDialog, type ActionTarget } from './ApplicationActionDialogs.js';
import {
  PAYMENT_STATUS_LABEL, STATE_LABEL, STATE_TONE, parseApplicationDetail, progressSteps, type ApplicationDetail,
} from './centre-applications-model.js';

// Centre portal → Application detail in Naji's design (applications.$id.tsx)
// with real data only. Kept: header, progress, Overview sections, Activity
// Timeline (application_events a centre may see). Not built (no real source):
// Documents (centre applications carry none), Notes (no notes column),
// Owner / Reassign, Touchpoints, Upcoming.

export default function CentreApplicationDetailPage({ api, session, onNavigate }: CentrePageProps) {
  const id = pathId(window.location.pathname);
  const { data, loading, error, reload } = useAdminPageData(
    () => (id ? api.loadApplicationDetail(session.token, id) : Promise.reject(new Error('Application not found.'))),
    [session.token, id],
  );
  const app = useMemo(() => parseApplicationDetail(data ?? {}), [data]);
  const [converting, setConverting] = useState<ActionTarget | null>(null);
  const [rejecting, setRejecting] = useState<ActionTarget | null>(null);
  const back = () => onNavigate('/centre/applications');

  if (loading && !data) return <PageLoader label="Loading application..." />;
  if (error || !app) {
    return (
      <div className="space-y-6 py-2">
        <BackLink label="All Applications" onClick={back} />
        <ErrorState message={error ?? 'Application not found.'} onRetry={reload} />
      </div>
    );
  }

  const target: ActionTarget = { id: app.id, name: app.name, course: app.course, email: app.email };

  return (
    <div className="space-y-6 py-2">
      <BackLink label="All Applications" onClick={back} trail={app.applicationId} />

      <Card className={cn(CARD, 'gap-0 p-6')}>
        <div className="flex flex-wrap items-start gap-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">{initialsOf(app.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{app.name || '—'}</h1>
              <DotBadge tone={STATE_TONE[app.state]} label={STATE_LABEL[app.state]} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">{app.applicationId}</span>
              {app.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {app.phone}</span> : null}
              {app.email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {app.email}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {app.phone ? (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`tel:${app.phone.replace(/\s+/g, '')}`}><Phone className="h-4 w-4" /> Call</a>
              </Button>
            ) : null}
            {app.email ? (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`mailto:${app.email}`}><Mail className="h-4 w-4" /> Email</a>
              </Button>
            ) : null}
            {app.state === 'pending' ? (
              <>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setRejecting(target)}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => setConverting(target)}>
                  <UserCheck className="h-4 w-4" /> Convert to student
                </Button>
              </>
            ) : null}
            {app.state === 'enrolled' && app.studentUserId ? (
              <Button size="sm" className="gap-1.5" onClick={() => onNavigate(`/centre/students/view/${app.studentUserId}`)}>
                <GraduationCap className="h-4 w-4" /> View student
              </Button>
            ) : null}
          </div>
        </div>
        <Progress app={app} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-6">
              <SectionCard title="Personal Information" icon={User}>
                <FieldGrid>
                  <Field label="Full Name" value={app.name} />
                  <Field label="Date of Birth" value={app.dob ? fmtYmd(app.dob) : ''} />
                  <Field label="Gender" value={app.gender} />
                  <Field label="Qualification" value={app.qualification} />
                </FieldGrid>
              </SectionCard>
              <SectionCard title="Contact Information" icon={Phone}>
                <FieldGrid>
                  <Field label="Phone" value={app.phone} />
                  <Field label="Email" value={app.email} />
                  <Field label="Address" value={[app.address, app.district, app.stateName].filter(Boolean).join(', ')} full />
                </FieldGrid>
              </SectionCard>
              <SectionCard title="Course Information" icon={FileText}>
                <FieldGrid>
                  <Field label="Course" value={app.course} />
                  <Field label="Course Offering" value={app.offering} />
                  <Field label="Certificate Combination" value={app.combination} />
                  <Field label="Mode of Study" value={app.modeOfStudy} />
                </FieldGrid>
              </SectionCard>
              {canSeeMoney(session.roleId) ? <PaymentSection app={app} /> : null}
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              <Card className={cn(CARD, 'gap-0 p-6')}>
                <h3 className="mb-4 text-sm font-semibold text-foreground">Activity Timeline</h3>
                {app.timeline.length === 0 ? <EmptyState icon={History} title="No activity recorded yet." /> : (
                  <ol className="relative ml-3 space-y-5 border-l border-border">
                    {app.timeline.map((e, i) => (
                      <li key={`${e.type}-${e.at}-${i}`} className="ml-6">
                        <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-primary">
                          {e.type === 'rejected' ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </span>
                        <p className="text-sm font-medium text-foreground">{e.description}</p>
                        <p className="text-xs text-muted-foreground">{fmtInstant(e.at)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className={cn(CARD, 'gap-0 p-6')}>
            <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Added" value={fmtYmd(app.date)} />
              <Row label="Added by" value={app.addedBy || '—'} />
              <Row label="Stage" value={STATE_LABEL[app.state]} />
              {app.state === 'enrolled' ? <Row label="Student ID" value={app.studentCode || '—'} /> : null}
              {app.state === 'rejected' ? (
                <>
                  <Row label="Rejected by" value={app.rejectedBy || '—'} />
                  {app.rejectedAt ? <Row label="Rejected on" value={fmtInstant(app.rejectedAt)} /> : null}
                </>
              ) : null}
            </dl>
            {app.state === 'rejected' && app.rejectionReason ? (
              <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">Reason: {app.rejectionReason}</p>
            ) : null}
          </Card>
          {app.state === 'pending' ? (
            <Card className={cn(CARD, 'gap-0 p-6')}>
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Next step</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Convert this application to enrol the student. They get a TTS student ID and their login details by email.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <ConvertDialog api={api} token={session.token} target={converting} onClose={() => setConverting(null)} onDone={() => { setConverting(null); reload(); }} />
      <RejectDialog api={api} token={session.token} target={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); reload(); }} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Progress({ app }: { app: ApplicationDetail }) {
  const steps = progressSteps(app.state);
  return (
    <div className="mt-7">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Progress</p>
      <ol className="flex items-start gap-1">
        {steps.map((s, i) => (
          <li key={s.label} className="flex flex-1 items-start">
            <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold',
                  s.status === 'done' && 'border-success bg-success text-success-foreground',
                  s.status === 'current' && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary-soft',
                  s.status === 'rejected' && 'border-destructive bg-destructive text-white',
                )}
              >
                {s.status === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.status === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('text-[11px]', s.status === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{s.label}</span>
              <span className="text-[10px] text-muted-foreground">{s.hint}</span>
            </div>
            {i < steps.length - 1 ? (
              <div className={cn('mt-3.5 h-0.5 min-w-6 flex-1', s.status === 'done' && steps[i + 1]?.status === 'done' ? 'bg-success' : 'bg-border')} />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PaymentSection({ app }: { app: ApplicationDetail }) {
  const { fee, paid, balance, status, lines } = app.payments;
  const pct = fee > 0 ? Math.min(100, Math.round((paid / fee) * 100)) : 0;
  return (
    <SectionCard title="Payment Information" icon={Wallet}>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payment plan yet. TTII sets the student&apos;s fee plan.</p>
      ) : (
        <div className="space-y-4">
          <FieldGrid>
            <Field label="Total Fee" value={inr(fee)} />
            <Field label="Amount Paid" value={inr(paid)} />
            <Field label="Balance" value={inr(balance)} />
            <Field label="Status" value={PAYMENT_STATUS_LABEL[status] ?? status} />
          </FieldGrid>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Payment Progress</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <PaymentLines lines={lines} />
        </div>
      )}
    </SectionCard>
  );
}
