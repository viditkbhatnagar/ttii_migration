import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

const email = (row: Record<string, unknown>): string => asString(row.user_email) || asString(row.email);

const APPLICATION_COLUMNS: DataTableColumn[] = [
  { key: 'application_id', label: 'Application ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', render: (_v: unknown, row) => email(row) },
  { key: 'phone', label: 'Phone' },
  { key: 'stage', label: 'Stage', sortable: true },
  { key: 'created_at', label: 'Created', sortable: true, render: (v: unknown) => formatDate(v) },
];

const ENROLMENT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'enrollment_id', label: 'Enrolment ID', sortable: true },
  { key: 'email', label: 'Email', render: (_v: unknown, row) => email(row) },
  { key: 'phone', label: 'Phone' },
  { key: 'created_at', label: 'Enrolled On', sortable: true, render: (v: unknown) => formatDate(v) },
];

const TARGET_TYPE_LABELS: Record<number, string> = { 1: 'Applications', 2: 'Enrollments', 3: 'Payments' };
const TARGET_COLUMNS: DataTableColumn[] = [
  { key: 'from_date', label: 'From', sortable: true, render: (v: unknown) => formatDate(v) },
  { key: 'to_date', label: 'To', sortable: true, render: (v: unknown) => formatDate(v) },
  { key: 'type', label: 'Type', render: (v: unknown) => TARGET_TYPE_LABELS[asNumber(v)] ?? `Type ${asNumber(v)}` },
  { key: 'value', label: 'Target', sortable: true, render: (v: unknown) => asNumber(v).toLocaleString('en-IN') },
];

const REFERRAL_COLUMNS: DataTableColumn[] = [
  { key: 'student_name', label: 'Student', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'referrer_name', label: 'Referred By', sortable: true },
];

export default function CounsellorReportsPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([
        api.loadApplications(session.token),
        api.loadStudents(session.token),
        api.loadCounsellorTargets(session.token),
        api.loadReferrals(session.token),
      ]).then(([applications, students, targets, referrals]) => ({ applications, students, targets, referrals })),
    [api, session.token],
  );

  const applications = useMemo(() => toRecords(data?.applications), [data]);
  const students = useMemo(() => toRecords(data?.students), [data]);
  const targets = useMemo(() => toRecords(data?.targets), [data]);
  const referrals = useMemo(() => toRecords(data?.referrals), [data]);

  if (loading) {
    return <DashboardLoader label="reports" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Reports" />
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Reports" />
      <p className="-mt-4 text-sm text-gray-500">Export your applications, enrolments, targets and referrals</p>

      <Tabs defaultValue="applications">
        <TabsList className="bg-slate-100/70">
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="enrolments">Enrolments ({students.length})</TabsTrigger>
          <TabsTrigger value="targets">Targets ({targets.length})</TabsTrigger>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="applications" className="mt-4">
          <AdminDataTable columns={APPLICATION_COLUMNS} rows={applications} searchable exportable />
        </TabsContent>
        <TabsContent value="enrolments" className="mt-4">
          <AdminDataTable columns={ENROLMENT_COLUMNS} rows={students} searchable exportable />
        </TabsContent>
        <TabsContent value="targets" className="mt-4">
          <AdminDataTable columns={TARGET_COLUMNS} rows={targets} searchable exportable />
        </TabsContent>
        <TabsContent value="referrals" className="mt-4">
          <AdminDataTable columns={REFERRAL_COLUMNS} rows={referrals} searchable exportable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
