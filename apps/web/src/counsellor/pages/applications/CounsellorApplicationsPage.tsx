import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, Pencil, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { StageBadge } from '../../components/CounsellorWidgets.js';

const CARD = 'rounded-[14px] border border-cn-border/70 bg-white p-5 shadow-[var(--cn-shadow-soft)]';

const STAGES: { key: string; label: string }[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'form_pending', label: 'Form Pending' },
  { key: 'form_submitted', label: 'Form Submitted' },
  { key: 'approval_waiting', label: 'Approval Waiting' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'rejected', label: 'Rejected' },
];

const PAGE_SIZE = 8;

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '—';
}

function appStage(a: Record<string, unknown>): string {
  const stage = asString(a.stage);
  if (stage) return stage;
  // Fall back to status when an older row has no stage.
  const status = asString(a.status).toLowerCase();
  if (status === 'rejected') return 'rejected';
  return 'lead';
}

function exportCsv(rows: Record<string, unknown>[]): void {
  const headers = ['Application ID', 'Date', 'Name', 'Course', 'Offering', 'Phone', 'Email', 'Pipeline', 'Stage'];
  const lines = rows.map((a) =>
    [
      asString(a.application_id),
      formatDate(a.created_at),
      asString(a.name),
      asString(a.course_title),
      asString(a.offering_title),
      asString(a.phone),
      asString(a.user_email) || asString(a.email),
      asString(a.pipeline),
      appStage(a),
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

export default function CounsellorApplicationsPage({ api, session, onNavigate }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(() => api.loadApplications(session.token), [api, session.token]);

  const applications = useMemo(() => toRecords(data), [data]);
  const courseOptions = useMemo(
    () => [...new Set(applications.map((a) => asString(a.course_title)).filter(Boolean))].sort(),
    [applications],
  );

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [course, setCourse] = useState('all');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);

  const stageCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) counts.set(appStage(a), (counts.get(appStage(a)) ?? 0) + 1);
    return counts;
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = range === 'all' ? 0 : Date.now() - Number(range) * 86400000;
    return applications.filter((a) => {
      if (stage !== 'all' && appStage(a) !== stage) return false;
      if (course !== 'all' && asString(a.course_title) !== course) return false;
      if (cutoff > 0) {
        const t = new Date(asString(a.created_at)).getTime();
        if (Number.isNaN(t) || t < cutoff) return false;
      }
      if (q) {
        const hay = `${asString(a.name)} ${asString(a.application_id)} ${asString(a.user_email)} ${asString(a.email)} ${asString(a.phone)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applications, search, stage, course, range]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <DashboardLoader label="applications" />;
  if (error) {
    return (
      <div className={CARD}>
        <p role="alert" className="py-8 text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Applications</h1>
          <p className="mt-1 text-sm text-cn-muted-fg">{filtered.length} across your pipeline stages</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cn-border bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="size-4" /> Export
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/counsellor/leads/add')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cn-orange px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cn-orange-fg"
          >
            <Plus className="size-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Stage pills */}
      <div className="flex flex-wrap gap-2">
        <PillButton active={stage === 'all'} onClick={() => { setStage('all'); resetPage(); }} label="All" count={applications.length} />
        {STAGES.map((s) => (
          <PillButton
            key={s.key}
            active={stage === s.key}
            onClick={() => { setStage(s.key); resetPage(); }}
            label={s.label}
            count={stageCount.get(s.key) ?? 0}
          />
        ))}
      </div>

      {/* Filters */}
      <div className={CARD}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by name, ID, email or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
          </div>
          <select
            value={course}
            onChange={(e) => { setCourse(e.target.value); resetPage(); }}
            className="rounded-lg border border-cn-border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cn-orange/30 md:w-52"
          >
            <option value="all">All Courses</option>
            {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={range}
            onChange={(e) => { setRange(e.target.value); resetPage(); }}
            className="rounded-lg border border-cn-border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cn-orange/30 md:w-40"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border border-cn-border/70 bg-white shadow-[var(--cn-shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-cn-muted-fg">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Application ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Offering</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Pipeline</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {current.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-400">No applications match your filters.</td></tr>
              ) : (
                current.map((a, idx) => {
                  const id = asString(a.id);
                  const name = asString(a.name) || '—';
                  return (
                    <tr key={id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-xs text-slate-400">{String((page - 1) * PAGE_SIZE + idx + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => onNavigate(`/counsellor/applications/view/${id}`)} className="font-mono text-xs font-medium text-cn-orange-fg hover:underline">
                          {asString(a.application_id) || `#${id}`}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-cn-muted-fg">{formatDate(a.created_at)}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => onNavigate(`/counsellor/applications/view/${id}`)} className="flex items-center gap-2.5 text-left">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cn-orange-soft text-[11px] font-semibold text-cn-orange-fg">{initials(name)}</span>
                          <span className="font-medium text-slate-800">{name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{asString(a.course_title) || '—'}</td>
                      <td className="px-4 py-3 text-cn-muted-fg">{asString(a.offering_title) || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-700">{asString(a.phone) || '—'}</p>
                        <p className="text-[11px] text-cn-muted-fg">{asString(a.user_email) || asString(a.email)}</p>
                      </td>
                      <td className="px-4 py-3 text-cn-muted-fg">{asString(a.pipeline) || '—'}</td>
                      <td className="px-4 py-3"><StageBadge stage={appStage(a)} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" title="View" onClick={() => onNavigate(`/counsellor/applications/view/${id}`)} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-cn-orange-fg">
                            <Eye className="size-4" />
                          </button>
                          <button type="button" title="Edit" onClick={() => onNavigate(`/counsellor/applications/edit/${id}`)} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-cn-orange-fg">
                            <Pencil className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-cn-muted-fg">
            Showing <span className="font-medium text-slate-700">{current.length}</span> of{' '}
            <span className="font-medium text-slate-700">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex items-center gap-1 rounded-lg border border-cn-border px-2.5 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 enabled:hover:bg-slate-50">
              <ChevronLeft className="size-4" /> Prev
            </button>
            <span className="px-1 text-xs text-cn-muted-fg">Page {page} of {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="inline-flex items-center gap-1 rounded-lg border border-cn-border px-2.5 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 enabled:hover:bg-slate-50">
              Next <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PillButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
        (active ? 'border-cn-orange bg-cn-orange text-white' : 'border-cn-border bg-white text-cn-muted-fg hover:border-cn-orange/40 hover:text-slate-700')
      }
    >
      {label}
      <span className={'rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' + (active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>{count}</span>
    </button>
  );
}
