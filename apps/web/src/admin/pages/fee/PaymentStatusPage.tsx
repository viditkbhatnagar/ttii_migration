import { useState, useMemo, useEffect, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { asString, asNumber, formatDate, formatCurrency } from '../../shared/utils/admin-data-utils.js';
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

const PAYMENT_MODE_OPTIONS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'Online', 'Other'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface MarkPaidForm {
  paidDate: string;
  paymentMode: string;
  referenceNumber: string;
  receiptUrl: string;
}

export default function PaymentStatusPage({ api, session, onNavigate }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('overdue');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [actionDialog, setActionDialog] = useState<
    | { type: 'mark_paid'; row: Record<string, unknown> }
    | { type: 'reminder'; row: Record<string, unknown> }
    | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [markPaidForm, setMarkPaidForm] = useState<MarkPaidForm>({
    paidDate: todayIso(),
    paymentMode: 'Online',
    referenceNumber: '',
    receiptUrl: '',
  });
  const [uploading, setUploading] = useState(false);

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

  // Naji UAT 2026-05-14 — order is now Overdue → Due → Upcoming → Paid → All
  // (All moved to the end). The page also defaults to Overdue, which is
  // the actionable bucket the team triages from.
  const tabs: AdminTab[] = useMemo(() => [
    { id: 'overdue', label: 'Overdue', count: asNumber(counts.overdue) },
    { id: 'due', label: 'Due', count: asNumber(counts.due) },
    { id: 'upcoming', label: 'Upcoming', count: asNumber(counts.upcoming) },
    { id: 'paid', label: 'Paid', count: asNumber(counts.paid) },
    { id: 'all', label: 'All', count: allInstallments.length },
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

  // Reset the rich Mark-Paid form every time the dialog opens for a
  // different row. Reminder dialog doesn't need it.
  const openMarkPaid = useCallback((row: Record<string, unknown>) => {
    setMarkPaidForm({
      paidDate: todayIso(),
      paymentMode: asString(row.payment_mode) || 'Online',
      referenceNumber: '',
      receiptUrl: '',
    });
    setActionDialog({ type: 'mark_paid', row });
  }, []);

  const closeDialog = useCallback(() => {
    setActionDialog(null);
    setActionLoading(false);
    setUploading(false);
  }, []);

  const handleReceiptUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const result = await api.uploadFile(session.token, file);
      setMarkPaidForm((f) => ({ ...f, receiptUrl: result.url }));
      toast.success('Receipt uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }, [api, session.token]);

  const handleAction = useCallback(async () => {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      const id = asString(actionDialog.row.id);
      if (actionDialog.type === 'mark_paid') {
        const extras: {
          paidDate?: string;
          paymentMode?: string;
          referenceNumber?: string;
          receiptUrl?: string;
        } = {};
        if (markPaidForm.paidDate) extras.paidDate = markPaidForm.paidDate;
        if (markPaidForm.paymentMode) extras.paymentMode = markPaidForm.paymentMode;
        if (markPaidForm.referenceNumber) extras.referenceNumber = markPaidForm.referenceNumber;
        if (markPaidForm.receiptUrl) extras.receiptUrl = markPaidForm.receiptUrl;
        await api.markInstallmentPaid(session.token, id, extras);
        toast.success('Installment marked as paid.');
      } else {
        await api.sendPaymentReminder(session.token, id);
        toast.success('Reminder sent.');
      }
      closeDialog();
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setActionLoading(false);
    }
  }, [actionDialog, api, session.token, reload, markPaidForm, closeDialog]);

  // Column definitions — built per-tab so Paid drops the row Action and
  // moves Mode before Payment Status; Overdue/Due/Upcoming drop Paid
  // Date, Mode, To, and the Remind action (Naji UAT 2026-05-14). The All
  // tab keeps the full set.
  const columns: DataTableColumn[] = useMemo(() => {
    const enrolmentStatusCol: DataTableColumn = {
      key: 'enrolment_status',
      label: 'Enrolment Status',
      sortable: true,
      render: (v) => {
        const s = asString(v);
        return s ? <AdminStatusBadge status={s} /> : <span className="text-slate-400">—</span>;
      },
    };
    const studentIdCol: DataTableColumn = {
      key: 'student_id', label: 'Student ID', sortable: true, render: (v) => asString(v) || '-',
    };
    const nameCol: DataTableColumn = { key: 'user_name', label: 'Name', sortable: true };
    const courseCol: DataTableColumn = {
      key: 'course_title', label: 'course', sortable: true, render: (v) => asString(v) || '-',
    };
    const detailsCol: DataTableColumn = {
      key: 'installment_details',
      label: 'Installment Details',
      sortable: true,
      render: (v, row) => {
        const details = asString(v);
        return details || `Installment ${asNumber(row?.installment_no) || 1}`;
      },
    };
    const amountCol: DataTableColumn = {
      key: 'amount', label: 'Amount', sortable: true, render: (v) => formatCurrency(v),
    };
    const dueDateCol: DataTableColumn = {
      key: 'due_date', label: 'Due Date', sortable: true, render: (v) => formatDate(v),
    };
    const paidDateCol: DataTableColumn = {
      key: 'paid_date', label: 'Paid Date', sortable: true, render: (v) => formatDate(v) || '-',
    };
    const statusCol: DataTableColumn = {
      key: 'computed_status',
      label: 'Payment Status',
      sortable: true,
      render: (v) => <AdminStatusBadge status={asString(v) || 'pending'} />,
    };
    const modeCol: DataTableColumn = {
      key: 'payment_mode', label: 'Mode', render: (v) => asString(v) || '-',
    };
    const toCol: DataTableColumn = {
      key: 'payment_to', label: 'To', render: (v) => asString(v) || '-',
    };
    // Synthesised rows from applications.payment_plan have an id like
    // "app-{appId}-{idx}" and can't be marked paid through the
    // student_payments endpoint. Surface a View Application shortcut
    // instead so admins manage them in the Generate Payment Link
    // dialog on the application itself (Naji UAT 2026-05-14).
    const isApplicationRow = (row: Record<string, unknown> | undefined): { appId: string } | null => {
      const id = asString(row?.id);
      const m = /^app-(\d+)-/.exec(id);
      return m ? { appId: m[1] ?? '' } : null;
    };
    const actionMarkOnlyCol: DataTableColumn = {
      key: '_actions',
      label: 'Action',
      render: (_v, row) => {
        const appRow = isApplicationRow(row);
        if (appRow) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/admin/applications/view/${appRow.appId}`)}
            >
              View Application
            </Button>
          );
        }
        return (
          <Button variant="outline" size="sm" onClick={() => row && openMarkPaid(row)}>
            Mark Paid
          </Button>
        );
      },
    };
    const actionFullCol: DataTableColumn = {
      key: '_actions',
      label: 'Action',
      render: (_v, row) => {
        const status = asString(row?.computed_status);
        const appRow = isApplicationRow(row);
        if (appRow) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/admin/applications/view/${appRow.appId}`)}
            >
              View Application
            </Button>
          );
        }
        if (status === 'paid') return null;
        return (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => row && openMarkPaid(row)}>
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
    };

    if (activeTab === 'paid') {
      // Paid tab: drop "To" and the row Action entirely; move Mode in front
      // of Payment Status (Naji UAT 2026-05-14).
      return [
        enrolmentStatusCol,
        studentIdCol,
        nameCol,
        courseCol,
        detailsCol,
        amountCol,
        dueDateCol,
        paidDateCol,
        modeCol,
        statusCol,
      ];
    }
    if (activeTab === 'overdue' || activeTab === 'due' || activeTab === 'upcoming') {
      // Open buckets: drop Paid Date, Mode, To, and the Remind action;
      // keep Mark Paid as the only row action.
      return [
        enrolmentStatusCol,
        studentIdCol,
        nameCol,
        courseCol,
        detailsCol,
        amountCol,
        dueDateCol,
        statusCol,
        actionMarkOnlyCol,
      ];
    }
    // All tab keeps the full set.
    return [
      enrolmentStatusCol,
      studentIdCol,
      nameCol,
      courseCol,
      detailsCol,
      amountCol,
      dueDateCol,
      paidDateCol,
      statusCol,
      modeCol,
      toCol,
      actionFullCol,
    ];
  }, [activeTab, openMarkPaid]);

  if (loading) {
    return <PageLoader label="Loading payment status..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
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

      {/* Rich Mark-Paid / Reminder dialog */}
      <Dialog open={actionDialog != null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAction();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {actionDialog?.type === 'mark_paid' ? 'Mark as Paid' : 'Send Reminder'}
              </DialogTitle>
            </DialogHeader>

            {actionDialog?.type === 'mark_paid' ? (
              <div className="space-y-4 py-2">
                <p className="text-sm text-slate-600">
                  Mark installment for <strong>{asString(actionDialog.row.user_name)}</strong>
                  {' '}({formatCurrency(actionDialog.row.amount)}) as paid.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="mp-paid-date" className="text-xs">Date of Payment</Label>
                    <Input
                      id="mp-paid-date"
                      type="date"
                      value={markPaidForm.paidDate}
                      onChange={(e) => setMarkPaidForm((f) => ({ ...f, paidDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mp-mode" className="text-xs">Payment Mode</Label>
                    <select
                      id="mp-mode"
                      value={markPaidForm.paymentMode}
                      onChange={(e) => setMarkPaidForm((f) => ({ ...f, paymentMode: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {PAYMENT_MODE_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mp-ref" className="text-xs">Reference Number</Label>
                  <Input
                    id="mp-ref"
                    value={markPaidForm.referenceNumber}
                    onChange={(e) => setMarkPaidForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                    placeholder="Transaction / cheque / receipt number"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Receipt Upload</Label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-slate-50">
                      <Upload className="size-3.5" aria-hidden="true" />
                      <span>{uploading ? 'Uploading…' : 'Choose file'}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleReceiptUpload(f);
                        }}
                      />
                    </label>
                    {markPaidForm.receiptUrl ? (
                      <a
                        href={markPaidForm.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        View uploaded receipt
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">No file uploaded</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 py-2">
                Send a payment reminder to <strong>{asString(actionDialog?.row.user_name)}</strong> for
                {' '}{formatCurrency(actionDialog?.row.amount)}?
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={actionLoading || uploading}>
                {actionLoading ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
