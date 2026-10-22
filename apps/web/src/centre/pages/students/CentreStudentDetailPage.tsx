import { canSeeMoney } from '../shared-money-access.js';
import { useMemo } from 'react';
import { CalendarDays, CreditCard, GraduationCap, IndianRupee, Mail, Phone, User, Users, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { BackLink, CARD, DotBadge, EmptyState, ErrorState, Field, FieldGrid, SectionCard, StatCard, Tag } from '../list-kit/ListKit.js';
import { fmtYmd, inr, initialsOf, pathId } from '../list-kit/list-kit-model.js';
import { PaymentLines } from '../applications/PaymentLines.js';
import { COHORT_STATUS, FEE_STATE, STATUS_TONE, parseStudentProfile, profileStatus, type FeeState } from './centre-students-model.js';

// Centre portal → Student profile (students.$id.tsx) with real data: contact,
// enrolments, payments (Fees → Payment Status instalments) and cohorts.
// Not built (no real source here): attendance, assignments, certificates
// issued, mentor, upcoming.

export default function CentreStudentDetailPage({ api, session, onNavigate }: CentrePageProps) {
  const id = pathId(window.location.pathname);
  const { data, loading, error, reload } = useAdminPageData(
    () => (id ? api.loadStudentProfile(session.token, id) : Promise.reject(new Error('Student not found.'))),
    [session.token, id],
  );
  const s = useMemo(() => parseStudentProfile(data ?? {}), [data]);
  const back = () => onNavigate('/centre/students');
  const showMoney = canSeeMoney(session.roleId);

  if (loading && !data) return <PageLoader label="Loading student..." />;
  if (error || !s) {
    return (
      <div className="space-y-6 py-2">
        <BackLink label="All Students" onClick={back} />
        <ErrorState message={error ?? 'Student not found.'} onRetry={reload} />
      </div>
    );
  }

  const status = profileStatus(s.enrolments);
  const feeState = (s.payments.status in FEE_STATE ? s.payments.status : 'no_plan') as FeeState;
  const hasPlan = feeState !== 'no_plan';

  return (
    <div className="space-y-6 py-2">
      <BackLink label="All Students" onClick={back} trail={s.studentCode} />

      <Card className={cn(CARD, 'gap-0 p-6')}>
        <div className="flex flex-wrap items-start gap-5">
          <Avatar className="h-16 w-16">
            {s.photo ? <AvatarImage src={s.photo} alt="" /> : null}
            <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">{initialsOf(s.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{s.name || '—'}</h1>
              <DotBadge tone={STATUS_TONE[status]} label={status} />
              {s.loginDisabled ? <Tag className="bg-muted text-muted-foreground">Login disabled</Tag> : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">{s.studentCode}</span>
              {s.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span> : null}
              {s.email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.phone ? <Button variant="outline" size="sm" className="gap-1.5" asChild><a href={`tel:${s.phone.replace(/\s+/g, '')}`}><Phone className="h-4 w-4" /> Call</a></Button> : null}
            {s.email ? <Button variant="outline" size="sm" className="gap-1.5" asChild><a href={`mailto:${s.email}`}><Mail className="h-4 w-4" /> Email</a></Button> : null}
            {s.applicationId ? (
              <Button variant="outline" size="sm" onClick={() => onNavigate(`/centre/applications/view/${s.applicationId}`)}>View application</Button>
            ) : null}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Enrolments" value={s.enrolments.length} icon={GraduationCap} />
          {showMoney ? (
            <>
              <StatCard label="Total Fee" value={hasPlan ? inr(s.payments.fee) : '—'} icon={IndianRupee} tone="bg-info-soft text-info" />
              <StatCard label="Fee Paid" value={hasPlan ? inr(s.payments.paid) : '—'} icon={CreditCard} tone="bg-success-soft text-success" />
              <StatCard label="Pending" value={hasPlan ? inr(s.payments.balance) : '—'} icon={Wallet} tone="bg-warning-soft text-warning-foreground" />
            </>
          ) : null}
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enrolments">Enrolments</TabsTrigger>
          {showMoney ? <TabsTrigger value="finance">Payments</TabsTrigger> : null}
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <SectionCard title="Personal Information" icon={User}>
            <FieldGrid>
              <Field label="Full Name" value={s.name} />
              <Field label="Date of Birth" value={s.dob ? fmtYmd(s.dob) : ''} />
              <Field label="Gender" value={s.gender} />
              <Field label="City / PIN" value={s.place} />
            </FieldGrid>
          </SectionCard>
          <SectionCard title="Contact Information" icon={Phone}>
            <FieldGrid>
              <Field label="Phone" value={s.phone} />
              <Field label="Email" value={s.email} />
            </FieldGrid>
          </SectionCard>
          <SectionCard title="Enrolment" icon={GraduationCap}>
            <FieldGrid>
              <Field label="Student ID" value={s.studentCode} />
              <Field label="Course" value={s.enrolments.map((e) => e.course).filter(Boolean).join(', ')} />
              <Field label="Offering" value={s.offering} />
              <Field label="Certificate Combination" value={s.combination} />
              <Field label="Joined" value={fmtYmd(s.joinedOn)} />
            </FieldGrid>
          </SectionCard>
        </TabsContent>

        <TabsContent value="enrolments" className="mt-4">
          <SectionCard title="Enrolments" icon={GraduationCap}>
            {s.enrolments.length === 0 ? <EmptyState icon={GraduationCap} title="No enrolments." /> : (
              <ul className="space-y-2">
                {s.enrolments.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{e.course || '—'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.enrolmentId ? `${e.enrolmentId} · ` : ''}Enrolled {fmtYmd(e.enrolledOn)}{e.mode ? ` · ${e.mode}` : ''}
                      </p>
                    </div>
                    <DotBadge tone={STATUS_TONE[e.status]} label={e.status} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        {showMoney ? <TabsContent value="finance" className="mt-4">
          <SectionCard
            title="Payment Schedule"
            icon={IndianRupee}
            action={hasPlan ? <Tag className={FEE_STATE[feeState].tone}>{FEE_STATE[feeState].label}</Tag> : undefined}
          >
            {s.payments.lines.length === 0
              ? <EmptyState icon={IndianRupee} title="No payment plan yet" body="TTII has not set up a payment schedule for this student." />
              : <PaymentLines lines={s.payments.lines} />}
          </SectionCard>
        </TabsContent> : null}

        <TabsContent value="cohorts" className="mt-4">
          <SectionCard title="Cohorts" icon={Users}>
            {s.cohorts.length === 0 ? <EmptyState icon={Users} title="Not in any cohort yet." /> : (
              <ul className="space-y-2">
                {s.cohorts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/centre/cohorts/view/${c.id}`)}
                      className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{c.title || c.code}</p>
                        <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                          {c.course ? <span>{c.course}</span> : null}
                          {c.instructor ? <span>{c.instructor}</span> : null}
                          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {fmtYmd(c.startDate)} – {fmtYmd(c.endDate)}</span>
                        </p>
                      </div>
                      <Tag className={COHORT_STATUS[c.status].tone}>{COHORT_STATUS[c.status].label}</Tag>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
