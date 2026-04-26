import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

function formatINR(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function CourseFeeStructurePage({ api, session }: AdminPageProps) {
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  const { data, loading, error } = useAdminPageData(
    () => api.listCourseFeeStructure(session.token),
    [],
  );

  const allRows = useMemo(() => toRecords(data), [data]);

  const courseOptions = useMemo(() => {
    const titles = [...new Set(allRows.map((r) => asString(r.course_title)).filter(Boolean))];
    return titles.sort().map((t) => ({ label: t, value: t }));
  }, [allRows]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (statusFilter && asString(r.status).toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (courseFilter && asString(r.course_title) !== courseFilter) return false;
      return true;
    });
  }, [allRows, statusFilter, courseFilter]);

  const columns: DataTableColumn[] = [
    { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '—' },
    {
      key: 'offering_title',
      label: 'Course Offering',
      render: (v, row) => {
        const r = row;
        const title = asString(v) || asString(r.offering_code);
        const combo = asString(r.combination_code);
        return (
          <div>
            <div>{title || '—'}</div>
            {combo ? <div className="text-xs text-slate-400">Package: {combo}</div> : null}
          </div>
        );
      },
    },
    { key: 'fee_category', label: 'Type', render: (v) => asString(v) === 'free' ? 'Free' : 'Paid' },
    { key: 'base_fee', label: 'Base Fee', render: formatINR },
    { key: 'discount', label: 'Discount', render: formatINR },
    { key: 'final_before_tax', label: 'Fee (Before Tax)', render: formatINR },
    {
      key: 'gst_percent',
      label: 'GST',
      render: (v, row) => {
        if (!row.gst_applicable) return '—';
        const pct = typeof v === 'number' || typeof v === 'string' ? String(v) : '18';
        return `${pct}%`;
      },
    },
    { key: 'fee_inc_tax', label: 'Fee Inc. Tax', render: formatINR },
    {
      key: 'status',
      label: 'Status',
      render: (v) => {
        const s = asString(v) || 'draft';
        const cls = s === 'active'
          ? 'bg-emerald-100 text-emerald-700'
          : s === 'inactive'
          ? 'bg-slate-200 text-slate-700'
          : 'bg-amber-100 text-amber-700';
        return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{s}</span>;
      },
    },
  ];

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'course',
        label: 'Course',
        type: 'select' as const,
        value: courseFilter,
        placeholder: 'All Courses',
        options: courseOptions,
        onChange: setCourseFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Draft', value: 'draft' },
          { label: 'Inactive', value: 'inactive' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [courseOptions, courseFilter, statusFilter],
  );

  if (loading) return <PageLoader label="Loading fee structure..." />;
  if (error)
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Course Fee Structure" />
      <p className="text-sm text-slate-500">
        Read-only view of every offering and its certificate packages with the fee tier each carries.
        Edit per-offering pricing under <em>Courses → Course Offerings → Edit</em>.
      </p>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => {
          setCourseFilter('');
          setStatusFilter('');
        }}
      />

      <AdminDataTable columns={columns} rows={filtered} />
    </div>
  );
}
