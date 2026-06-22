import { useMemo, useState } from 'react';
import { Download, Eye, GraduationCap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

const CARD = 'rounded-[14px] border border-cn-border/70 bg-white shadow-[var(--cn-shadow-soft)]';

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '—';
}

const studentId = (row: Record<string, unknown>): string => asString(row._id) || asString(row.id);
const studentEmail = (row: Record<string, unknown>): string => asString(row.email) || asString(row.user_email);

function exportCsv(rows: Record<string, unknown>[]): void {
  const headers = ['Name', 'Enrolment ID', 'Email', 'Phone', 'Course', 'Enrolled On'];
  const lines = rows.map((r) =>
    [asString(r.name), asString(r.enrollment_id), studentEmail(r), asString(r.phone), asString(r.course_name), formatDate(r.created_at)]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(','),
  );
  const url = URL.createObjectURL(new Blob([`${headers.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'my-enrolments.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function CounsellorStudentsPage({ api, session, onNavigate }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(() => api.loadStudents(session.token), [api, session.token]);
  const rows = useMemo(() => toRecords(data), [data]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${asString(r.name)} ${asString(r.enrollment_id)} ${studentEmail(r)} ${asString(r.phone)} ${asString(r.course_name)}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const open = (row: Record<string, unknown>) => onNavigate(`/counsellor/students/view/${studentId(row)}`);

  if (loading) return <DashboardLoader label="enrolments" />;
  if (error) {
    return (
      <div className="rounded-[14px] border border-cn-border/70 bg-white p-5 shadow-[var(--cn-shadow-soft)]">
        <p role="alert" className="py-8 text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Enrollments</h1>
        <p className="mt-1 text-sm text-cn-muted-fg">Students you have enrolled or referred. Click a name to open their record and add a second enrolment.</p>
      </div>

      <div className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <button type="button" onClick={() => exportCsv(filtered)} className="inline-flex items-center gap-1.5 rounded-lg border border-cn-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="size-4" /> Export
          </button>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search enrolments…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-cn-muted-fg">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Enrolment ID</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Enrolled On</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">No enrolments found.</td></tr>
              ) : (
                filtered.map((r, idx) => {
                  const name = asString(r.name) || '—';
                  return (
                    <tr key={studentId(r) || idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-xs text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => open(r)} className="flex items-center gap-2.5 text-left">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cn-orange-soft text-[11px] font-semibold text-cn-orange-fg">{initials(name)}</span>
                          <span className="font-medium text-slate-800 hover:text-cn-orange-fg">{name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cn-muted-fg">{asString(r.enrollment_id) || '—'}</td>
                      <td className="px-4 py-3 text-cn-muted-fg">{studentEmail(r) || '—'}</td>
                      <td className="px-4 py-3 text-cn-muted-fg">{asString(r.phone) || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{asString(r.course_name) || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-cn-muted-fg">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" title="View" onClick={() => open(r)} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-cn-orange-fg">
                            <Eye className="size-4" />
                          </button>
                          <button type="button" title="Add enrolment" onClick={() => open(r)} className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-cn-orange-fg">
                            <GraduationCap className="size-4" />
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
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-cn-muted-fg">
          Showing {filtered.length} enrolment{filtered.length === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}
