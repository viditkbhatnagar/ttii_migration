import { useMemo } from 'react';
import { Clock, FileText, GraduationCap, IndianRupee, Layers, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { BackLink, CARD, DotBadge, EmptyState, ErrorState, Field, FieldGrid, SectionCard, StatCard, Tag } from '../list-kit/ListKit.js';
import { fmtYmd, inr, pathId } from '../list-kit/list-kit-model.js';
import { PLAN_STATUS, parseCourseDetail, partnersLabel } from './centre-courses-model.js';

// Centre portal → Course detail (courses.$id.tsx) with real data only:
// course facts, the centre's fee plan(s), offerings with their certificate
// combinations, and the centre's own enrolment / pending counts. Not built
// (no real source): benefits, careers, FAQs, rating, per-combination fee / GST.

export default function CentreCourseDetailPage({ api, session, onNavigate }: CentrePageProps) {
  const id = pathId(window.location.pathname);
  const { data, loading, error, reload } = useAdminPageData(
    () => (id ? api.loadCourseDetail(session.token, id) : Promise.reject(new Error('Course not found.'))),
    [session.token, id],
  );
  const c = useMemo(() => parseCourseDetail(data ?? {}), [data]);
  const back = () => onNavigate('/centre/courses');

  if (loading && !data) return <PageLoader label="Loading course..." />;
  if (error || !c) {
    return (
      <div className="space-y-6 py-2">
        <BackLink label="All Courses" onClick={back} />
        <ErrorState message={error ?? 'Course not found.'} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <BackLink label="All Courses" onClick={back} trail={c.code || c.course} />

      <Card className={cn(CARD, 'gap-0 p-6')}>
        <div className="flex flex-wrap items-center gap-2">
          {c.category ? <Tag className="bg-primary-soft text-accent-foreground">{c.category}</Tag> : null}
          <DotBadge tone={PLAN_STATUS[c.status].tone} label={PLAN_STATUS[c.status].label} />
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{c.course}</h1>
        {c.summary ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{c.summary}</p> : null}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Duration" value={c.duration || '—'} icon={Clock} />
          <StatCard label="Centre fee" value={inr(c.centreFee)} icon={IndianRupee} tone="bg-info-soft text-info" sub="Set by TTII" />
          <StatCard label="Enrolled" value={c.enrolledStudents} icon={Users} tone="bg-success-soft text-success" sub="Your students" />
          <StatCard label="Pending applications" value={c.pendingApplications} icon={FileText} tone="bg-warning-soft text-warning-foreground" />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {c.description ? (
            <SectionCard title="About this course" icon={GraduationCap}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{c.description}</p>
            </SectionCard>
          ) : null}

          <SectionCard title="Offerings" icon={Layers}>
            {c.offerings.length === 0 ? <EmptyState icon={Layers} title="No active offerings." body="TTII has not published an offering for this course." /> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Offering</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Enrolment closes</TableHead>
                      <TableHead className="text-right">Capacity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.offerings.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{o.title}</p>
                          {o.code ? <p className="font-mono text-[11px] text-muted-foreground">{o.code}</p> : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.mode || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtYmd(o.startDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtYmd(o.endDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtYmd(o.enrolmentEnd)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{o.capacity ?? '—'}</TableCell>
                        <TableCell>
                          <DotBadge tone={o.open ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'} label={o.open ? 'Open' : 'Not open'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Certificate Combinations" icon={GraduationCap}>
            {c.combinations.length === 0 ? <EmptyState icon={GraduationCap} title="No certificate combinations set up." /> : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {c.combinations.map((k) => (
                  <li key={k.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{k.code}</p>
                    <p className="text-[11px] text-muted-foreground">{partnersLabel(k) || 'No partners listed'}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Centre fee plan" icon={IndianRupee}>
            <ul className="space-y-3">
              {c.plans.map((p) => (
                <li key={p.planId} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold tabular-nums text-foreground">{inr(p.centreFee)}</span>
                    <DotBadge tone={PLAN_STATUS[p.status].tone} label={PLAN_STATUS[p.status].label} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Valid {fmtYmd(p.startDate)} – {fmtYmd(p.endDate)}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">The centre fee is set by TTII.</p>
          </SectionCard>
          <SectionCard title="Course details" icon={FileText}>
            <FieldGrid>
              <Field label="Course code" value={c.code} />
              <Field label="Level" value={c.level} />
              <Field label="Language" value={c.language} />
              <Field label="Open offerings" value={String(c.openOfferings)} />
            </FieldGrid>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
