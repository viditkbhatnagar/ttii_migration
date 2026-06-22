import { useMemo, useState } from 'react';
import { BookOpen, CalendarPlus, CalendarRange, Download, Eye, Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { KpiCard } from '../../components/CounsellorWidgets.js';

const RANGE_DAYS: Record<string, number> = { '30': 30, '90': 90, '180': 180 };
const MS_PER_DAY = 86_400_000;

function rowId(row: Record<string, unknown>): string {
  return asString(row._id) || asString(row.id);
}

function rowEmail(row: Record<string, unknown>): string {
  return asString(row.email) || asString(row.user_email);
}

// Prototype date style: "12 Sep 2026" (guards invalid/empty dates).
function formatEnrolled(value: unknown): string {
  const str = asString(value);
  if (!str) return '—';
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '—'
  );
}

export default function CounsellorStudentsPage({ api, session, onNavigate }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadStudents(session.token),
    [api, session.token],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('all');
  const [range, setRange] = useState('all');

  const courses = useMemo(
    () => Array.from(new Set(rows.map((r) => asString(r.course_name)).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - (RANGE_DAYS[range] ?? 0) * MS_PER_DAY;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (course !== 'all' && asString(r.course_name) !== course) return false;
      if (cutoff > 0) {
        const enrolled = new Date(asString(r.created_at)).getTime();
        if (Number.isFinite(enrolled) && enrolled < cutoff) return false;
      }
      if (q) {
        return `${asString(r.name)} ${asString(r.enrollment_id)} ${rowEmail(r)} ${asString(
          r.phone,
        )} ${asString(r.course_name)}`
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [rows, search, course, range]);

  const total = rows.length;
  const distinctCourses = courses.length;
  const newThisMonth = useMemo(() => {
    const cutoff = Date.now() - 30 * MS_PER_DAY;
    return rows.filter((r) => {
      const t = new Date(asString(r.created_at)).getTime();
      return Number.isFinite(t) && t >= cutoff;
    }).length;
  }, [rows]);

  const open = (row: Record<string, unknown>) => onNavigate(`/counsellor/students/view/${rowId(row)}`);

  function exportCsv(): void {
    const headers = ['Name', 'Enrolment ID', 'Email', 'Phone', 'Course', 'Enrolled On'];
    const lines = filtered.map((r) =>
      [
        asString(r.name),
        asString(r.enrollment_id),
        rowEmail(r),
        asString(r.phone),
        asString(r.course_name),
        formatDate(r.created_at),
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([`${headers.join(',')}\n${lines.join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-enrolments.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <DashboardLoader label="enrolments" />;
  if (error) {
    return (
      <Card className="p-5 shadow-[var(--shadow-soft)] border-border/70">
        <p role="alert" className="py-8 text-center text-sm text-destructive">
          {error}
        </p>
      </Card>
    );
  }

  return (
    <main className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Enrollments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Students successfully converted and onboarded by you
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Students"
          value={String(total)}
          icon={Users}
          tone="primary"
          progress={100}
          sub="All-time converted"
        />
        <KpiCard
          label="Active Courses"
          value={String(distinctCourses)}
          icon={BookOpen}
          tone="info"
          progress={total ? Math.min(100, (distinctCourses / total) * 100) : 0}
          sub="Distinct programmes"
        />
        <KpiCard
          label="New This Month"
          value={String(newThisMonth)}
          icon={CalendarPlus}
          tone="success"
          progress={total ? (newThisMonth / total) * 100 : 0}
          sub="Enrolled in last 30 days"
        />
      </div>

      {/* Filters */}
      <Card className="border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID or email…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="md:w-44">
              <CalendarRange className="mr-1.5 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-border/70 shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-16">Sl No</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No students match your filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r, index) => {
                const name = asString(r.name) || '—';
                const id = rowId(r);
                return (
                  <TableRow key={id || index} className="hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => open(r)}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                      >
                        {asString(r.enrollment_id) || '—'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => open(r)}
                        className="flex items-center gap-2.5 text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary-soft text-xs font-semibold text-accent-foreground">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">{name}</p>
                          <p className="text-[11px] text-muted-foreground">{rowEmail(r) || '—'}</p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asString(r.phone) || '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {asString(r.course_name) || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatEnrolled(r.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="View"
                        onClick={() => open(r)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{' '}
            <span className="font-medium text-foreground">{total}</span> students
          </p>
        </div>
      </Card>
    </main>
  );
}
