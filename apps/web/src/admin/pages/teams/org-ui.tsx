import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Eye, FileText, Search, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import { StageBadge } from '../applications/StageBadge.js';
import { SectionCard } from '../counsellor/staff-profile-tabs.js';
import { formatYmd } from '../counsellor/staff-model.js';
import { PillTab } from '../students/list-chrome.js';
import {
  STATUS_LABEL, STATUS_TONE, filterPicker,
  type OrgApplication, type OrgKpis, type OrgStatus, type PickerItem, type TrendPoint,
} from './org-model.js';

// Shared pieces of the Teams and Groups screens (Naji's TeamsModule /
// TeamProfile / GroupsModule / GroupProfile), all on real data.

export { SectionCard };

const dash = (v: string) => v || '—';

export function OrgStatusPill({ status }: { status: OrgStatus }) {
  return (
    <Pill tone={STATUS_TONE[status]}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />{STATUS_LABEL[status]}
    </Pill>
  );
}

/** Shown when the API says the tables have not been migrated yet. */
export function NotReadyNotice({ message }: { message: string }) {
  return (
    <div role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message || 'Teams and Groups are not set up yet.'}</span>
    </div>
  );
}

export function HeaderStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden="true" className="size-3" /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground" title={value}>{value}</p>
    </div>
  );
}

export function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('text-right text-sm text-foreground', mono && 'font-mono font-semibold text-primary')}>{value}</dd>
    </div>
  );
}

/** Profile section switcher: plain buttons with aria-pressed in a group. */
export function SectionTabs<T extends string>({ tabs, active, onChange, label }: {
  tabs: Array<{ id: T; label: string; count?: number }>; active: T; onChange: (t: T) => void; label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto border-t border-border px-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            active === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
          {typeof t.count === 'number' ? <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

const CHART_TOOLTIP = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 };

export function TrendCard({ trend }: { trend: TrendPoint[] }) {
  const hasData = trend.some((t) => t.applications > 0 || t.enrollments > 0);
  return (
    <SectionCard title="Monthly Applications & Enrolments" icon={TrendingUp}>
      {hasData ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={CHART_TOOLTIP} />
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
  );
}

const shortLabel = (name: string, firstWord: boolean): string => {
  const label = firstWord ? (name.split(' ')[0] ?? name) : name;
  return label.length > 14 ? `${label.slice(0, 13)}…` : label;
};

export function ComparisonCard({ title, icon, rows, firstWord = false }: {
  title: string; icon: LucideIcon; rows: Array<{ name: string; kpis: OrgKpis }>; /** People: label bars by first name. */ firstWord?: boolean;
}) {
  const data = rows.map((r) => ({ name: shortLabel(r.name, firstWord), applications: r.kpis.applications, enrolled: r.kpis.enrolled }));
  return (
    <SectionCard title={title} icon={icon}>
      {data.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nothing to compare yet.</p> : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="applications" name="Applications" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enrolled" name="Enrolled" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

export function PerformerList({ title, items, tone }: {
  title: string; items: Array<{ id: string; name: string; subtitle: string; kpis: OrgKpis }>; tone: 'emerald' | 'rose';
}) {
  return (
    <SectionCard title={title} icon={tone === 'emerald' ? Trophy : AlertTriangle}>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Nobody to rank yet.</p> : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{m.subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{m.kpis.enrolled}/{m.kpis.applications}</span>
                <Pill tone={tone}>{m.kpis.conversion}%</Pill>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

type AppFilter = 'all' | 'pending' | 'enrolled' | 'rejected';
const APP_FILTERS: Array<{ id: AppFilter; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'enrolled', label: 'Enrolled' }, { id: 'rejected', label: 'Rejected' },
];

function matches(a: OrgApplication, f: AppFilter): boolean {
  if (f === 'enrolled') return a.enrolled;
  if (f === 'rejected') return !a.enrolled && a.stage === 'rejected';
  if (f === 'pending') return !a.enrolled && a.stage !== 'rejected';
  return true;
}

/** Applications (or, with `studentsOnly`, the converted students) handled by the members. */
export function OrgApplicationsTable({ apps, total, onView, studentsOnly = false }: {
  apps: OrgApplication[]; total: number; onView: (id: string) => void; studentsOnly?: boolean;
}) {
  const [filter, setFilter] = useState<AppFilter>(studentsOnly ? 'enrolled' : 'all');
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => matches(a, filter) && (!q || [a.applicationId, a.name, a.phone, a.course, a.counsellor].some((v) => v.toLowerCase().includes(q))));
  }, [apps, filter, search]);
  const noun = studentsOnly ? 'student' : 'application';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {studentsOnly ? <span /> : (
          <div role="group" aria-label="Application status" className="flex flex-wrap gap-2">
            {APP_FILTERS.map((f) => <PillTab key={f.id} active={filter === f.id} label={f.label} count={apps.filter((a) => matches(a, f.id)).length} onClick={() => setFilter(f.id)} />)}
          </div>
        )}
        <div className="relative w-full sm:w-72">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={`Search ${noun}s`} placeholder="Search name, ID, course or counsellor…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{shown.length} {noun}{shown.length === 1 ? '' : 's'}</p>
          {total > apps.length ? <p className="text-xs text-muted-foreground">From the latest {apps.length} of {total} applications</p> : null}
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={FileText} title={apps.length === 0 ? `No ${noun}s yet.` : `No ${noun}s match.`} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs">Application ID</TableHead>
                  <TableHead className="text-xs">{studentsOnly ? 'Name' : 'Student'}</TableHead>
                  <TableHead className="text-xs">Counsellor</TableHead>
                  <TableHead className="text-xs">Course</TableHead>
                  <TableHead className="text-xs">{studentsOnly ? 'Enrolled On' : 'Created'}</TableHead>
                  {studentsOnly ? null : <TableHead className="text-xs">Stage</TableHead>}
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
                    <TableCell className="text-sm text-muted-foreground">{dash(a.counsellor)}</TableCell>
                    <TableCell className="max-w-[220px] text-sm"><span className="line-clamp-2">{dash(a.course)}</span></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(studentsOnly ? a.converted || a.created : a.created) || '—'}</TableCell>
                    {studentsOnly ? null : <TableCell><StageBadge stage={a.stage} /></TableCell>}
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

/** A searchable checklist for the member / team pickers. */
export function PickerList({ items, selected, onToggle, placeholder, emptyText }: {
  items: PickerItem[]; selected: Set<string>; onToggle: (id: string) => void; placeholder: string; emptyText: string;
}) {
  const [search, setSearch] = useState('');
  const shown = filterPicker(items, search);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label={placeholder} className="h-9 pl-9 text-sm" placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <ul className="max-h-60 overflow-y-auto rounded-xl border border-border bg-background/40">
        {shown.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</li> : shown.map((item) => {
          const checked = selected.has(item.id);
          return (
            <li key={item.id} className="border-b border-border last:border-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-disabled={item.disabled}
                disabled={item.disabled}
                onClick={() => onToggle(item.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  item.disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/50',
                  checked && 'bg-primary/5',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">{item.badge}</span>
                  <span className={cn('flex size-5 items-center justify-center rounded-md border', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
                    {checked ? <Check aria-hidden="true" className="size-3.5" /> : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
