import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

const STATUS_CARDS = [
  { key: 'overdue', label: 'Overdue', color: 'border-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' },
  { key: 'due', label: 'Due', color: 'border-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
  { key: 'upcoming', label: 'Upcoming', color: 'border-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
  { key: 'paid', label: 'Paid', color: 'border-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
] as const;

export default function PaymentStatusPage({ api, session }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [actionDialog, setActionDialog] = useState<{ type: 'mark_paid' | 'reminder'; row: Record<string, unknown> } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadPaymentStatus(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(searchText ? { search: searchText } : {}),
      ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
      ...(dueDateFrom ? { dueDateFrom } : {}),
      ...(dueDateTo ? { dueDateTo } : {}),
    }),
    [courseFilter, searchText, paymentStatusFilter, dueDateFrom, dueDateTo],
  );

  const counts = useMemo(() => data?.counts ?? { overdue: 0, due: 0, upcoming: 0, paid: 0 }, [data]);
  const allInstallments = useMemo(() => data?.installments ?? [], [data]);

  const filteredInstallments = useMemo(() => {
    if (activeTab === 'all') return allInstallments;
    return allInstallments.filter((r) => asString(r.computed_status) === activeTab);
  }, [allInstallments, activeTab]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: allInstallments.length },
    { id: 'overdue', label: 'Overdue', count: asNumber(counts.overdue) },
    { id: 'due', label: 'Due', count: asNumber(counts.due) },
    { id: 'upcoming', label: 'Upcoming', count: asNumber(counts.upcoming) },
    { id: 'paid', label: 'Paid', count: asNumber(counts.paid) },
  ], [allInstallments.length, counts]);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: 'Name',
      type: 'text' as const,
      value: searchText,
      placeholder: 'Student name',
      onChange: setSearchText,
    },
    {
      key: 'dueDateFrom',
      label: 'Due date from',
      type: 'date' as const,
      value: dueDateFrom,
      onChange: setDueDateFrom,
    },
    {
      key: 'dueDateTo',
      label: 'Due date to',
      type: 'date' as const,
      value: dueDateTo,
      onChange: setDueDateTo,
    },
    {
      key: 'course',
      label: 'Course',
      type: 'select' as const,
      value: courseFilter,
      placeholder: 'Select any course',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      type: 'select' as const,
      value: paymentStatusFilter,
      placeholder: 'All',
      options: [
        { label: 'OVERDUE', value: 'overdue' },
        { label: 'DUE', value: 'due' },
        { label: 'UPCOMING', value: 'upcoming' },
        { label: 'PAID', value: 'paid' },
      ],
      onChange: setPaymentStatusFilter,
    },
  ], [searchText, dueDateFrom, dueDateTo, courseFilter, paymentStatusFilter, courses]);

  const handleAction = useCallback(async () => {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      const id = asString(actionDialog.row.id);
      if (actionDialog.type === 'mark_paid') {
        await api.markInstallmentPaid(session.token, id);
      } else {
        await api.sendPaymentReminder(session.token, id);
      }
      setActionDialog(null);
      reload();
    } catch {
      // error handled silently
    } finally {
      setActionLoading(false);
    }
  }, [actionDialog, api, session.token, reload]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'student_id', label: 'Student ID', sortable: true, render: (v) => asString(v) || '-' },
    { key: 'user_name', label: 'Name', sortable: true },
    { key: 'course_title', label: 'course', sortable: true, render: (v) => asString(v) || '-' },
    {
      key: 'installment_details',
      label: 'Installment Details',
      sortable: true,
      render: (v, row) => {
        const details = asString(v);
        return details || `Installment ${asNumber(row?.installment_no) || 1}`;
      },
    },
    { key: 'amount', label: 'Amount', sortable: true, render: (v) => formatCurrency(v) },
    { key: 'due_date', label: 'Due Date', sortable: true, render: (v) => formatDate(v) },
    { key: 'paid_date', label: 'Paid Date', sortable: true, render: (v) => formatDate(v) || '-' },
    {
      key: 'computed_status',
      label: 'Payment Status',
      sortable: true,
      render: (v) => <AdminStatusBadge status={asString(v) || 'pending'} />,
    },
    { key: 'payment_mode', label: 'Mode', render: (v) => asString(v) || '-' },
    { key: 'payment_to', label: 'To', render: (v) => asString(v) || '-' },
    {
      key: '_actions',
      label: 'Action',
      render: (_v, row) => {
        const status = asString(row?.computed_status);
        if (status === 'paid') return null;
        return (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => row && setActionDialog({ type: 'mark_paid', row })}
            >
              Mark Paid
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => row && setActionDialog({ type: 'reminder', row })}
            >
              Remind
            </Button>
          </div>
        );
      },
    },
  ], []);

  if (loading) {
    return <PageLoader label="Loading payment status..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Payment Status" />

      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUS_CARDS.map((card) => {
          const amount = asNumber(counts[`${card.key}_amount`]);
          const count = asNumber(counts[card.key as keyof typeof counts]);
          return (
            <Card
              key={card.key}
              className={`border-l-4 ${card.color} ${card.bgColor} cursor-pointer transition-shadow hover:shadow-md`}
              onClick={() => setActiveTab(card.key)}
            >
              <CardContent className="pt-4">
                <p className={`text-xs font-bold uppercase ${card.textColor}`}>{card.label}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>{formatCurrency(amount)}</p>
                <p className={`text-xs ${card.textColor}/70`}>{count} payments</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => {
          setCourseFilter('');
          setSearchText('');
          setPaymentStatusFilter('');
          setDueDateFrom('');
          setDueDateTo('');
        }}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable columns={columns} rows={filteredInstallments} searchable exportable />

      {/* Action confirmation dialog */}
      <Dialog open={actionDialog != null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'mark_paid' ? 'Mark as Paid' : 'Send Reminder'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {actionDialog?.type === 'mark_paid'
              ? `Mark installment for ${asString(actionDialog?.row.user_name)} (${formatCurrency(actionDialog?.row.amount)}) as paid?`
              : `Send a payment reminder to ${asString(actionDialog?.row.user_name)} for ${formatCurrency(actionDialog?.row.amount)}?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleAction} disabled={actionLoading}>
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
