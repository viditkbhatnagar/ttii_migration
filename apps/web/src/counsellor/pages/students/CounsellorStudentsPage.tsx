import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  PauseCircle,
  Search,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { cn } from '@/lib/utils';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { KpiCard } from '../../components/CounsellorWidgets.js';

function rowId(row: Record<string, unknown>): string {
  return asString(row._id) || asString(row.id);
}

function rowEmail(row: Record<string, unknown>): string {
  return asString(row.user_email) || asString(row.email);
}

function rowCourse(row: Record<string, unknown>): string {
  return asString(row.course_title) || asString(row.course_name);
}

// Real `status_label` from listStudents: Active | Inactive | Graduated | Dropped.
function rowStatus(row: Record<string, unknown>): string {
  return asString(row.status_label) || 'Unknown';
}

// Map the real status_label onto the prototype's pill palette (semantic tokens).
const STATUS_STYLES: Record<string, string> = {
  Active: 'border-transparent bg-info-soft text-info',
  Graduated: 'border-transparent bg-success-soft text-success',
  Inactive: 'border-transparent bg-warning-soft text-warning',
  Dropped: 'border-transparent bg-destructive-soft text-destructive',
};

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
  const [status, setStatus] = useState('all');

  const courses = useMemo(
    () => Array.from(new Set(rows.map(rowCourse).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (course !== 'all' && rowCourse(r) !== course) return false;
      if (status !== 'all' && rowStatus(r) !== status) return false;
      if (q) {
        return `${asString(r.name)} ${asString(r.student_id)} ${asString(
          r.enrollment_id,
        )} ${rowEmail(r)} ${asString(r.phone)} ${rowCourse(r)}`
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [rows, search, course, status]);

  // KPI counts derived entirely from the real status_label field.
  const total = rows.length;
  const active = useMemo(() => rows.filter((r) => rowStatus(r) === 'Active').length, [rows]);
  const completed = useMemo(() => rows.filter((r) => rowStatus(r) === 'Graduated').length, [rows]);
  const onHold = useMemo(() => rows.filter((r) => rowStatus(r) === 'Inactive').length, [rows]);
  const dropped = useMemo(() => rows.filter((r) => rowStatus(r) === 'Dropped').length, [rows]);
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  const open = (row: Record<string, unknown>) =>
    onNavigate(`/counsellor/students/view/${rowId(row)}`);

  function exportCsv(): void {
    const headers = ['Student ID', 'Enrolment ID', 'Name', 'Email', 'Phone', 'Course', 'Status'];
    const lines = filtered.map((r) =>
      [
        asString(r.student_id),
        asString(r.enrollment_id),
        asString(r.name),
        rowEmail(r),
        asString(r.phone),
        rowCourse(r),
        rowStatus(r),
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
      <Card className="border-border/70 p-5 shadow-[var(--shadow-soft)]">
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

      {/* KPIs — mirrors the prototype's five-card row, counts from real status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Total Students"
          value={String(total)}
          icon={Users}
          tone="primary"
          progress={100}
          sub="All-time converted"
        />
        <KpiCard
          label="Active Students"
          value={String(active)}
          icon={UserCheck}
          tone="info"
          progress={pct(active)}
          sub={`${Math.round(pct(active))}% currently learning`}
        />
        <KpiCard
          label="Completed Students"
          value={String(completed)}
          icon={CheckCircle2}
          tone="success"
          progress={pct(completed)}
          sub="Graduated cohorts"
        />
        <KpiCard
          label="On Hold Students"
          value={String(onHold)}
          icon={PauseCircle}
          tone="warning"
          progress={pct(onHold)}
          sub="Temporarily paused"
        />
        <KpiCard
          label="Dropout Students"
          value={String(dropped)}
          icon={UserX}
          tone="destructive"
          progress={pct(dropped)}
          sub="Discontinued"
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
            <SelectContent className="counsellor-theme">
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="counsellor-theme">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Graduated">Completed</SelectItem>
              <SelectItem value="Inactive">On Hold</SelectItem>
              <SelectItem value="Dropped">Dropped</SelectItem>
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
                <TableHead>Course</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Centre</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No students match your filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r, index) => {
                const name = asString(r.name) || '—';
                const id = rowId(r);
                const photo = asString(r.image) || asString(r.profile_picture);
                const studentId = asString(r.student_id) || asString(r.enrollment_id) || '—';
                const st = rowStatus(r);
                return (
                  <TableRow key={id || index} className="hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => open(r)}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                      >
                        {studentId}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => open(r)}
                        className="flex items-center gap-2.5 text-left"
                      >
                        <Avatar className="h-8 w-8">
                          {photo ? <AvatarImage src={photo} alt={name} /> : null}
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
                    <TableCell className="text-sm font-medium">{rowCourse(r) || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asString(r.batch_title) || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asString(r.centre_name) || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          STATUS_STYLES[st] ?? 'border-border text-muted-foreground',
                        )}
                      >
                        {st === 'Graduated' ? 'Completed' : st === 'Inactive' ? 'On Hold' : st}
                      </Badge>
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
