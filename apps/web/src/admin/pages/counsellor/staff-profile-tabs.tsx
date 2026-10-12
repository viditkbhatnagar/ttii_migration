import { useMemo, useState } from 'react';
import {
  Activity, Building2, CheckCircle2, Eye, FileText, GraduationCap, Search, Target, TrendingUp, UserCheck,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EmptyState, Pill, StatBox } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { StageBadge } from '../applications/StageBadge.js';
import { PillTab } from '../students/list-chrome.js';
import {
  PHASE_TONE, TYPE_TONE, monthLabel, progressTone, type TargetRow,
} from './counsellor-target-model.js';
import { formatYmd, type StaffRow } from './staff-model.js';
import {
  filterProfileApplications, formatIstDateTime, humanize,
  type ProfileActivity, type ProfileAppFilter, type ProfileApplication, type ProfileStats,
} from './staff-profile-model.js';

// The tab bodies of the Counsellor / Associate profile (Naji's
// CounsellorProfile / AssociateProfile), all on real data.

const dash = (v: string) => v || '—';

export function SectionCard({ title, icon: Icon, children, className }: {
  title: string; icon: typeof Activity; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={cn('gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />{title}
      </h3>
      {children}
    </Card>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('text-right text-sm text-foreground', mono && 'font-mono font-semibold text-primary')}>{value}</dd>
    </div>
  );
}

export function OverviewTab({ row, noun, stats }: { row: StaffRow; noun: string; stats: ProfileStats }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Basic Information" icon={UserCheck}>
        <dl>
          <InfoRow label={`${noun} ID`} value={`#${row.id}`} mono />
          <InfoRow label="Full Name" value={dash(row.name)} />
          <InfoRow label="Email" value={dash(row.email)} />
          <InfoRow label="Phone" value={dash(row.phone)} />
          <InfoRow label="Gender" value={dash(row.gender)} />
          <InfoRow label="Date of Birth" value={formatYmd(row.dob) || '—'} />
          <InfoRow label="Languages Spoken" value={dash(row.languages)} />
          <InfoRow label="Highest Qualification" value={dash(row.qualification)} />
        </dl>
      </SectionCard>
      <SectionCard title="Work Details" icon={Building2}>
        <dl>
          <InfoRow label="Joining Date" value={formatYmd(row.joined) || '—'} />
          <InfoRow label="Centre" value={dash(row.centre)} />
          <InfoRow label="Status" value={<Pill tone={row.isActive ? 'emerald' : 'rose'}>{row.statusLabel}</Pill>} />
          <InfoRow label="Login" value={<Pill tone={row.loginDisabled ? 'rose' : 'emerald'}>{row.loginDisabled ? 'Disabled' : 'Enabled'}</Pill>} />
          <InfoRow label="Applications Handled" value={stats.kpis.applications} />
          <InfoRow label="Students Converted" value={stats.kpis.enrolled} />
        </dl>
      </SectionCard>
    </div>
  );
}

export function PerformanceTab({ stats }: { stats: ProfileStats }) {
  const { kpis } = stats;
  const conversion = kpis.applications > 0 ? Math.round((kpis.enrolled / kpis.applications) * 100) : 0;
  const mix = useMemo(() => {
    const by = new Map<string, { n: number; e: number }>();
    for (const a of stats.applications) {
      const key = a.course || 'No course';
      const cur = by.get(key) ?? { n: 0, e: 0 };
      by.set(key, { n: cur.n + 1, e: cur.e + (a.enrolled ? 1 : 0) });
    }
    return [...by.entries()].map(([course, v]) => ({ course, ...v })).sort((a, b) => b.n - a.n).slice(0, 8);
  }, [stats.applications]);
  const hasTrend = stats.trend.some((t) => t.applications > 0 || t.enrollments > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatBox label="Total Applications" value={kpis.applications} tone="primary" />
        <StatBox label="Pending Applications" value={kpis.pending} tone="amber" />
        <StatBox label="Enrolled" value={kpis.enrolled} tone="emerald" />
        <StatBox label="Rejected" value={kpis.rejected} tone="rose" />
        <StatBox label="Dropouts" value={kpis.dropouts} tone="slate" />
        <StatBox label="Conversion" value={`${conversion}%`} tone="blue" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="Monthly Applications & Enrolments" icon={TrendingUp} className="lg:col-span-2">
          {hasTrend ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="applications" name="Applications" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="enrollments" name="Enrolments" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No applications in the last 12 months.</p>
          )}
        </SectionCard>
        <SectionCard title="Course Mix" icon={GraduationCap}>
          {mix.length === 0 ? <p className="text-sm text-muted-foreground">No applications yet.</p> : (
            <ul className="space-y-3">
              {mix.map((m) => (
                <li key={m.course}>
                  <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span className="truncate" title={m.course}>{m.course}</span>
                    <span className="shrink-0 text-muted-foreground">{m.e} enrolled / {m.n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((m.n / Math.max(1, stats.applications.length)) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const tone = progressTone(pct);
  const bar = tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className={cn('w-10 text-xs font-semibold tabular-nums', TONE[tone].text)}>{pct}%</span>
    </div>
  );
}

export function TargetsTab({ targets }: { targets: TargetRow[] }) {
  const current = targets.filter((t) => t.phase === 'Active');
  if (targets.length === 0) {
    return (
      <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <EmptyState icon={Target} title="No targets assigned yet." body="Assign one from Counsellors → Counsellor Target." />
      </Card>
    );
  }
  return (
    <div className="space-y-5">
      {current.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {current.map((t) => (
            <Card key={t.id} className="gap-2 border-border/70 p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between gap-2">
                <Pill tone={TYPE_TONE[t.type] ?? 'slate'}>{t.type}</Pill>
                <span className="text-xs text-muted-foreground">{monthLabel(t.monthKey)}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{t.achieved}<span className="text-base font-medium text-muted-foreground"> / {t.value}</span></p>
              <ProgressBar pct={t.pct} />
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No target covers the current month.</p>
      )}
      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">{targets.length} target{targets.length === 1 ? '' : 's'}</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs">Month</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Target</TableHead>
                <TableHead className="text-xs">Achieved</TableHead>
                <TableHead className="text-xs">Progress</TableHead>
                <TableHead className="text-xs">State</TableHead>
                <TableHead className="text-xs">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-sm font-medium">{monthLabel(t.monthKey) || '—'}</TableCell>
                  <TableCell><Pill tone={TYPE_TONE[t.type] ?? 'slate'}>{dash(t.type)}</Pill></TableCell>
                  <TableCell className="tabular-nums">{t.value}</TableCell>
                  <TableCell className="tabular-nums">{t.achieved}</TableCell>
                  <TableCell><ProgressBar pct={t.pct} /></TableCell>
                  <TableCell>{t.phase ? <Pill tone={PHASE_TONE[t.phase]}>{t.phase}</Pill> : '—'}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground" title={t.remarks}>{dash(t.remarks)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

const APP_FILTERS: Array<{ id: ProfileAppFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'rejected', label: 'Rejected' },
];

export function ApplicationsTab({ apps, onView }: { apps: ProfileApplication[]; onView: (id: string) => void }) {
  const [filter, setFilter] = useState<ProfileAppFilter>('all');
  const [search, setSearch] = useState('');
  const shown = filterProfileApplications(apps, filter, search);
  const count = (f: ProfileAppFilter) => filterProfileApplications(apps, f, '').length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Application status" className="flex flex-wrap gap-2">
          {APP_FILTERS.map((f) => <PillTab key={f.id} active={filter === f.id} label={f.label} count={count(f.id)} onClick={() => setFilter(f.id)} />)}
        </div>
        <div className="relative w-full sm:w-72">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search applications" placeholder="Search name, ID, phone or course…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">{shown.length} application{shown.length === 1 ? '' : 's'} handled</div>
        {shown.length === 0 ? (
          <EmptyState icon={FileText} title={apps.length === 0 ? 'No applications yet.' : 'No applications match.'} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs">Application ID</TableHead>
                  <TableHead className="text-xs">Student Name</TableHead>
                  <TableHead className="text-xs">Course</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs">Payment</TableHead>
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{a.applicationId}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{dash(a.name)}</p>
                      <p className="text-[11px] text-muted-foreground">{dash(a.phone)}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm"><span className="line-clamp-2">{dash(a.course)}</span></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(a.created) || '—'}</TableCell>
                    <TableCell><StageBadge stage={a.stage} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.paymentStatus ? humanize(a.paymentStatus) : '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="size-8" title="View Application" aria-label={`View application ${a.applicationId}`} onClick={() => onView(a.id)}>
                        <Eye aria-hidden="true" className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function StudentsTab({ apps, onView }: { apps: ProfileApplication[]; onView: (id: string) => void }) {
  const students = apps.filter((a) => a.enrolled);
  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold">{students.length} converted student{students.length === 1 ? '' : 's'}</div>
      {students.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No converted students yet." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs">Application ID</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Course</TableHead>
                <TableHead className="text-xs">Enrolled On</TableHead>
                <TableHead className="text-xs">Enrolment</TableHead>
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{s.applicationId}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{dash(s.name)}</p>
                    <p className="text-[11px] text-muted-foreground">{dash(s.email || s.phone)}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm"><span className="line-clamp-2">{dash(s.course)}</span></TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(s.converted || s.created) || '—'}</TableCell>
                  <TableCell>
                    <Pill tone={/active/i.test(s.enrollmentStatus) || !s.enrollmentStatus ? 'emerald' : 'slate'}>{s.enrollmentStatus ? humanize(s.enrollmentStatus) : 'Enrolled'}</Pill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="size-8" title="View Application" aria-label={`View application ${s.applicationId}`} onClick={() => onView(s.id)}>
                      <Eye aria-hidden="true" className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

export function ActivityTab({ activity }: { activity: ProfileActivity[] }) {
  return (
    <SectionCard title="Activity Timeline" icon={Activity}>
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity on this person&rsquo;s applications yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-border pl-6">
          {activity.map((e) => (
            <li key={e.id} className="relative">
              <span aria-hidden="true" className="absolute -left-[33px] grid size-7 place-items-center rounded-full bg-primary/10 text-primary ring-4 ring-card">
                <CheckCircle2 className="size-3.5" />
              </span>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{e.title}</p>
                  <p className="text-[11px] text-muted-foreground">{formatIstDateTime(e.at) || '—'}</p>
                </div>
                {e.student ? <p className="mt-1 text-xs text-muted-foreground">{e.student}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
