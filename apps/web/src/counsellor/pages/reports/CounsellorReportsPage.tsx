import { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText as FileTextIcon,
  Printer,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  GraduationCap,
  Target as TargetIcon,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

// ── Tone palette (mirrors the prototype's toneMap) ───────────────────────────
type Tone = 'primary' | 'success' | 'warning' | 'info';
const toneMap: Record<Tone, string> = {
  primary: 'bg-primary-soft text-accent-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning-foreground',
  info: 'bg-info-soft text-info',
};

const email = (row: Record<string, unknown>): string => asString(row.user_email) || asString(row.email);

// Stage falls back to status for legacy rows that predate the pipeline column.
function appStage(a: Record<string, unknown>): string {
  const stage = asString(a.stage);
  if (stage) return stage;
  const status = asString(a.status).toLowerCase();
  if (status === 'rejected') return 'rejected';
  return 'lead';
}

const TARGET_TYPE_LABELS: Record<number, string> = { 1: 'Applications', 2: 'Enrollments', 3: 'Payments' };
function targetType(v: unknown): string {
  const n = asNumber(v);
  return TARGET_TYPE_LABELS[n] ?? (asString(v) || `Type ${n}`);
}

// ── CSV export (client-side, no deps) ────────────────────────────────────────
function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const lines = [headers, ...rows].map((cells) => cells.map(escapeCsv).join(','));
  const csv = lines.join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Report category descriptor (real datasets only) ──────────────────────────
interface ColumnDef {
  header: string;
  value: (row: Record<string, unknown>) => string;
}

interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  filename: string;
  columns: ColumnDef[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'applications',
    title: 'Application Report',
    description: 'All applications with stage, course and contact details.',
    icon: FileTextIcon,
    tone: 'info',
    filename: 'applications.csv',
    columns: [
      { header: 'Application ID', value: (r) => asString(r.application_id) || `#${asString(r.id)}` },
      { header: 'Date', value: (r) => formatDate(r.created_at) },
      { header: 'Name', value: (r) => asString(r.name) },
      { header: 'Course', value: (r) => asString(r.course_title) },
      { header: 'Offering', value: (r) => asString(r.offering_title) },
      { header: 'Phone', value: (r) => asString(r.phone) },
      { header: 'Email', value: email },
      { header: 'Pipeline', value: (r) => asString(r.pipeline) },
      { header: 'Stage', value: appStage },
    ],
  },
  {
    id: 'enrolments',
    title: 'Enrolment Report',
    description: 'Confirmed enrolments with student and contact details.',
    icon: GraduationCap,
    tone: 'success',
    filename: 'enrolments.csv',
    columns: [
      { header: 'Enrolment ID', value: (r) => asString(r.enrollment_id) || `#${asString(r.id)}` },
      { header: 'Name', value: (r) => asString(r.name) },
      { header: 'Phone', value: (r) => asString(r.phone) },
      { header: 'Email', value: email },
      { header: 'Enrolled On', value: (r) => formatDate(r.created_at) },
    ],
  },
  {
    id: 'targets',
    title: 'Target Report',
    description: 'Monthly targets versus achieved across your pipeline.',
    icon: TargetIcon,
    tone: 'warning',
    filename: 'targets.csv',
    columns: [
      { header: 'Month', value: (r) => asString(r.month) },
      { header: 'Year', value: (r) => asString(r.year) },
      { header: 'Type', value: (r) => targetType(r.type) },
      { header: 'Target', value: (r) => asString(r.target ?? r.value) },
      { header: 'Achieved', value: (r) => asString(r.achieved) },
      { header: '% Achieved', value: (r) => `${asNumber(r.percentage)}%` },
    ],
  },
  {
    id: 'referrals',
    title: 'Referral Report',
    description: 'Students you have referred and their current status.',
    icon: Share2,
    tone: 'primary',
    filename: 'referrals.csv',
    columns: [
      { header: 'Student', value: (r) => asString(r.student_name) },
      { header: 'Phone', value: (r) => asString(r.phone) },
      { header: 'Course', value: (r) => asString(r.course_name) },
      { header: 'Status', value: (r) => asString(r.status) },
      { header: 'Referred By', value: (r) => asString(r.referrer_name) },
      { header: 'Referred On', value: (r) => formatDate(r.created_at) },
    ],
  },
];

const PREVIEW_ROWS = 5;

export default function CounsellorReportsPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([
        api.loadApplications(session.token),
        api.loadStudents(session.token),
        api.loadCounsellorTargets(session.token),
        api.loadReferrals(session.token),
        api.loadCourses(session.token),
      ]).then(([applications, students, targets, referrals, courses]) => ({
        applications,
        students,
        targets,
        referrals,
        courses,
      })),
    [api, session.token],
  );

  const datasets = useMemo<Record<string, Record<string, unknown>[]>>(
    () => ({
      applications: toRecords(data?.applications),
      enrolments: toRecords(data?.students),
      targets: toRecords(data?.targets),
      referrals: toRecords(data?.referrals),
    }),
    [data],
  );

  const [activeId, setActiveId] = useState<string>(REPORT_CATEGORIES[0]?.id ?? 'applications');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [course, setCourse] = useState('all');
  const [pipeline, setPipeline] = useState('all');
  const [groupBy, setGroupBy] = useState('none');

  // Distinct course titles from the live catalogue, for the Course filter.
  const courseOptions = useMemo<string[]>(() => {
    const titles = toRecords(data?.courses)
      .map((row) => asString(row.title) || asString(row.name))
      .filter((title): title is string => title.length > 0);
    return Array.from(new Set(titles)).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredCategories = useMemo(
    () =>
      REPORT_CATEGORIES.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  const active = useMemo(
    () => REPORT_CATEGORIES.find((c) => c.id === activeId) ?? REPORT_CATEGORIES[0],
    [activeId],
  );

  const totalRecords = useMemo(
    () => Object.values(datasets).reduce((sum, rows) => sum + rows.length, 0),
    [datasets],
  );

  if (loading) {
    return <DashboardLoader label="reports" />;
  }

  if (error || !active) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and export operational reports</p>
        </div>
        <Card className="p-12 text-center shadow-[var(--shadow-soft)] border-border/70">
          <p role="alert" className="text-sm text-destructive">
            {error ?? 'Unable to load reports.'}
          </p>
        </Card>
      </main>
    );
  }

  const ActiveIcon = active.icon;
  const activeRows = datasets[active.id] ?? [];
  const previewRows = activeRows.slice(0, PREVIEW_ROWS);
  const today = formatDate(new Date().toISOString());

  const exportCategory = (category: ReportCategory): void => {
    const rows = datasets[category.id] ?? [];
    const headers = category.columns.map((col) => col.header);
    const body = rows.map((row) => category.columns.map((col) => col.value(row)));
    downloadCsv(category.filename, headers, body);
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Export your applications, enrolments, targets and referrals
          </p>
        </div>
        <Button size="sm" className="bg-[image:var(--gradient-primary)] text-white" onClick={() => exportCategory(active)}>
          <Download className="h-4 w-4 mr-1.5" /> Export {active.title.replace(' Report', '')}
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {REPORT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const count = (datasets[category.id] ?? []).length;
          return (
            <Card key={category.id} className="p-4 shadow-[var(--shadow-soft)] border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    {category.title.replace(' Report', '')}
                  </p>
                  <p className="mt-1 text-xl font-bold">{count.toLocaleString('en-IN')}</p>
                </div>
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', toneMap[category.tone])}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Categories list */}
        <Card className="p-4 shadow-[var(--shadow-soft)] border-border/70 h-fit">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Report Categories</h3>
            <Badge variant="outline" className="text-[10px]">
              {REPORT_CATEGORIES.length}
            </Badge>
          </div>
          <div className="relative mb-3">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="space-y-1 max-h-[520px] overflow-auto pr-1">
            {filteredCategories.map((category) => {
              const Icon = category.icon;
              const isActive = active.id === category.id;
              const count = (datasets[category.id] ?? []).length;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveId(category.id)}
                  className={cn(
                    'w-full text-left flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors group',
                    isActive ? 'bg-primary-soft' : 'hover:bg-muted',
                  )}
                >
                  <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0', toneMap[category.tone])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', isActive && 'text-accent-foreground')}>
                      {category.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {count.toLocaleString('en-IN')} records
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
                      isActive && 'translate-x-0.5 text-accent-foreground',
                    )}
                  />
                </button>
              );
            })}
          </div>
        </Card>

        {/* Export panel + preview */}
        <div className="space-y-6 min-w-0">
          <Card className="p-5 shadow-[var(--shadow-soft)] border-border/70">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn('h-11 w-11 rounded-lg flex items-center justify-center', toneMap[active.tone])}>
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{active.title}</h2>
                  <p className="text-sm text-muted-foreground">{active.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last generated: {today} • {activeRows.length.toLocaleString('en-IN')} records
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date Range
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="fy">This FY</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Course
                </label>
                <Select value={course} onValueChange={setCourse}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courseOptions.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Pipeline
                </label>
                <Select value={pipeline} onValueChange={setPipeline}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pipelines</SelectItem>
                    <SelectItem value="inbound">Inbound Web</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="walkin">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Group By
                </label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="stage">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-border">
              <Button size="sm" onClick={() => setPreviewOpen(true)}>
                <FileTextIcon className="h-4 w-4 mr-1.5" /> Preview
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportCategory(active)}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" /> Print
              </Button>
            </div>
          </Card>

          {/* Preview table */}
          <Card className="p-5 shadow-[var(--shadow-soft)] border-border/70">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Sample preview</h3>
                <p className="text-xs text-muted-foreground">
                  Showing first {previewRows.length} of {activeRows.length.toLocaleString('en-IN')} rows
                </p>
              </div>
              <Badge variant="outline" className="text-[11px]">
                Live
              </Badge>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {active.columns.map((col) => (
                      <TableHead key={col.header} className="text-xs font-semibold whitespace-nowrap">
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={active.columns.length} className="py-8 text-center text-sm text-muted-foreground">
                        No records available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewRows.map((row, i) => (
                      <TableRow key={asString(row.id) || i}>
                        {active.columns.map((col) => (
                          <TableCell key={col.header} className="text-sm">
                            {col.value(row) || '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      {/* Export cards by dataset */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Exports</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {REPORT_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const count = (datasets[category.id] ?? []).length;
              return (
                <Card
                  key={category.id}
                  className="p-4 shadow-[var(--shadow-soft)] border-border/70 hover:shadow-[var(--shadow-card)] transition-shadow flex flex-col"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', toneMap[category.tone])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{category.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {count.toLocaleString('en-IN')} records
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{category.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => exportCategory(category)}
                  >
                    <Download className="h-4 w-4 mr-1.5" /> Export CSV
                  </Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="p-0 shadow-[var(--shadow-soft)] border-border/70 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Report</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REPORT_CATEGORIES.map((category) => {
                  const count = (datasets[category.id] ?? []).length;
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{category.description}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {count.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => exportCategory(category)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/30">
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-bold">{totalRecords.toLocaleString('en-IN')}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{active.title} — Preview</DialogTitle>
            <DialogDescription>
              Showing first {previewRows.length} of {activeRows.length.toLocaleString('en-IN')} records
              {' • '}
              {today}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {active.columns.map((col) => (
                    <TableHead key={col.header} className="text-xs font-semibold whitespace-nowrap">
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={active.columns.length} className="py-8 text-center text-sm text-muted-foreground">
                      No records available.
                    </TableCell>
                  </TableRow>
                ) : (
                  previewRows.map((row, i) => (
                    <TableRow key={asString(row.id) || i}>
                      {active.columns.map((col) => (
                        <TableCell key={col.header} className="text-sm">
                          {col.value(row) || '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => exportCategory(active)}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
            <Button onClick={() => setPreviewOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
