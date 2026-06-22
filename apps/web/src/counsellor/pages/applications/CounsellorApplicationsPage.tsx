import { useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Eye, FileText, Pencil, Plus, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminAddLeadPage from '../../../admin/pages/applications/AddLeadPage.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

/* ─── Stage definitions (real lowercase keys → display labels + Lovable styles) ─── */

interface StageDef {
  key: string;
  label: string;
  style: string;
}

/* The pipeline has EXACTLY 7 stages (matches the Lovable prototype). 'enrolled'
   is intentionally NOT a pill/dropdown/count — the backend already filters
   enrolled rows out of this list (stage: { not: 'enrolled' }). It survives only
   as a badge-render fallback (see ENROLLED_FALLBACK). */
const STAGES: StageDef[] = [
  { key: 'lead', label: 'Lead', style: 'bg-info-soft text-info border-transparent' },
  { key: 'payment_pending', label: 'Payment Pending', style: 'bg-warning-soft text-warning-foreground border-transparent' },
  { key: 'paid', label: 'Paid', style: 'bg-success-soft text-success border-transparent' },
  { key: 'form_pending', label: 'Form Pending', style: 'bg-[oklch(0.95_0.05_310)] text-[oklch(0.45_0.2_310)] border-transparent' },
  { key: 'form_submitted', label: 'Form Submitted', style: 'bg-primary-soft text-accent-foreground border-transparent' },
  { key: 'approval_waiting', label: 'Approval Waiting', style: 'bg-[oklch(0.96_0.06_85)] text-[oklch(0.4_0.12_75)] border-transparent' },
  { key: 'rejected', label: 'Rejected', style: 'bg-destructive/10 text-destructive border-transparent' },
];

const ENROLLED_FALLBACK: StageDef = { key: 'enrolled', label: 'Enrolled', style: 'bg-success-soft text-success border-transparent' };

const STAGE_BY_KEY = new Map([...STAGES, ENROLLED_FALLBACK].map((s) => [s.key, s]));
const PAGE_SIZE = 8;

function appStage(a: Record<string, unknown>): string {
  const stage = asString(a.stage);
  if (stage && STAGE_BY_KEY.has(stage)) return stage;
  const status = asString(a.status).toLowerCase();
  if (status === 'rejected') return 'rejected';
  return 'lead';
}

function appCourse(a: Record<string, unknown>): string {
  return asString(a.course_title);
}

function appOffering(a: Record<string, unknown>): string {
  return asString(a.offering_title);
}

function appEmail(a: Record<string, unknown>): string {
  return asString(a.user_email) || asString(a.email);
}

function appOwner(a: Record<string, unknown>): string {
  return asString(a.pipeline_user_name);
}

function appId(a: Record<string, unknown>): string {
  return asString(a.id) || asString(a._id);
}

/** Real location line under the applicant name — district preferred, else state. */
function appLocation(a: Record<string, unknown>): string {
  return asString(a.district).trim() || asString(a.state).trim();
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

function StageBadge({ stage }: { stage: string }) {
  const def = STAGE_BY_KEY.get(stage) ?? { label: stage || '—', style: 'bg-muted text-muted-foreground border-transparent' };
  return (
    <Badge variant="outline" className={`font-medium gap-1.5 py-0.5 ${def.style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {def.label}
    </Badge>
  );
}

function PillButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
        (active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/40')
      }
    >
      {label}
      <span className={'rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' + (active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>
        {count}
      </span>
    </button>
  );
}

export default function CounsellorApplicationsPage({ api, session, onNavigate }: CounsellorPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadApplications(session.token), [api, session.token]);
  const rows = useMemo(() => toRecords(data), [data]);

  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string>('all');
  const [course, setCourse] = useState<string>('all');
  const [offering, setOffering] = useState<string>('all');
  const [range, setRange] = useState<string>('30');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const courses = useMemo(() => Array.from(new Set(rows.map(appCourse).filter(Boolean))).sort(), [rows]);
  const offerings = useMemo(() => Array.from(new Set(rows.map(appOffering).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - parseInt(range, 10) * 86400000;
    const q = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (stage !== 'all' && appStage(a) !== stage) return false;
      if (course !== 'all' && appCourse(a) !== course) return false;
      if (offering !== 'all' && appOffering(a) !== offering) return false;
      if (range !== 'all') {
        const ts = new Date(asString(a.created_at)).getTime();
        if (Number.isFinite(ts) && ts < cutoff) return false;
      }
      if (q) {
        return (
          asString(a.name).toLowerCase().includes(q) ||
          asString(a.application_id).toLowerCase().includes(q) ||
          appEmail(a).toLowerCase().includes(q) ||
          asString(a.phone).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, stage, course, offering, range]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const current = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stageCount = (key: string) => rows.filter((a) => appStage(a) === key).length;

  const allChecked = current.length > 0 && current.every((a) => selected.has(appId(a)));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) current.forEach((a) => next.delete(appId(a)));
    else current.forEach((a) => next.add(appId(a)));
    setSelected(next);
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  if (loading) return <DashboardLoader label="applications" />;
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
    <main className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} applications across {STAGES.length} pipeline stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(filtered)}>
            <FileText className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddLeadOpen(true)}>
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Stage pills */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <PillButton
            key={s.key}
            active={stage === s.key}
            onClick={() => {
              setStage(s.key);
              setPage(1);
            }}
            label={s.label}
            count={stageCount(s.key)}
          />
        ))}
        <PillButton
          active={stage === 'all'}
          onClick={() => {
            setStage('all');
            setPage(1);
          }}
          label="All"
          count={rows.length}
        />
      </div>

      {/* Filters */}
      <Card className="p-4 shadow-[var(--shadow-soft)] border-border/70">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, email or phone…"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={course}
            onValueChange={(v) => {
              setCourse(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="md:w-44">
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
          <Select
            value={offering}
            onValueChange={(v) => {
              setOffering(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Offering" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Offerings</SelectItem>
              {offerings.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={stage}
            onValueChange={(v) => {
              setStage(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={range}
            onValueChange={(v) => {
              setRange(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="md:w-40">
              <CalendarRange className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="shadow-[var(--shadow-soft)] border-border/70 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Application ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Offering</TableHead>
                <TableHead>Certificate Combination</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Owner</TableHead>
                {stage === 'all' && <TableHead>Stage</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.length === 0 && (
                <TableRow>
                  <TableCell colSpan={stage === 'all' ? 13 : 12} className="text-center py-12 text-muted-foreground">
                    No applications match your filters.
                  </TableCell>
                </TableRow>
              )}
              {current.map((a, idx) => {
                const id = appId(a);
                const name = asString(a.name);
                const showStage = stage === 'all';
                return (
                  <TableRow key={id || idx} className="hover:bg-muted/30 cursor-pointer group">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(id)} onCheckedChange={(v) => toggleOne(id, v === true)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {String((safePage - 1) * PAGE_SIZE + idx + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => onNavigate(`/counsellor/applications/view/${id}`)}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                      >
                        {asString(a.application_id) || '—'}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(a.created_at)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => onNavigate(`/counsellor/applications/view/${id}`)}
                        className="flex items-center gap-2.5 text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary-soft text-accent-foreground text-xs font-semibold">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">{name || '—'}</p>
                          <p className="text-[11px] text-muted-foreground">{appLocation(a) || '—'}</p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{appCourse(a) || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{appOffering(a) || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{asString(a.combination_title) || '—'}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{asString(a.phone) || '—'}</p>
                      <p className="text-[11px] text-muted-foreground">{appEmail(a)}</p>
                    </TableCell>
                    <TableCell className="text-sm">{asString(a.pipeline) || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{appOwner(a) || '—'}</TableCell>
                    {showStage && (
                      <TableCell>
                        <StageBadge stage={appStage(a)} />
                      </TableCell>
                    )}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="View"
                          onClick={() => onNavigate(`/counsellor/applications/view/${id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={() => onNavigate(`/counsellor/applications/edit/${id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{current.length}</span> of{' '}
            <span className="font-medium text-foreground">{filtered.length}</span> applications
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Add Lead — inline modal (was a full-page route). Reuses the proven
          admin lead form; the counsellor-theme class scopes its tokens to the
          portal's orange palette inside the portalled dialog. */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent
          className="counsellor-theme student-dashboard max-h-[90vh] overflow-y-auto"
          style={{ width: 'min(720px, calc(100vw - 2rem))', maxWidth: 'min(720px, calc(100vw - 2rem))' }}
        >
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <AdminAddLeadPage
            api={api.admin}
            session={session}
            onNavigate={() => {
              setAddLeadOpen(false);
              reload();
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}

function exportCsv(rows: Record<string, unknown>[]): void {
  const headers = ['Application ID', 'Date', 'Name', 'Course', 'Offering', 'Combination', 'Phone', 'Email', 'Pipeline', 'Owner', 'Stage'];
  const lines = rows.map((a) =>
    [
      asString(a.application_id),
      formatDate(a.created_at),
      asString(a.name),
      appCourse(a),
      appOffering(a),
      asString(a.combination_title),
      asString(a.phone),
      appEmail(a),
      asString(a.pipeline),
      appOwner(a),
      STAGE_BY_KEY.get(appStage(a))?.label ?? appStage(a),
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(','),
  );
  const csv = `${headers.join(',')}\n${lines.join('\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'applications.csv';
  link.click();
  URL.revokeObjectURL(url);
}
