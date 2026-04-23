import { useMemo, useCallback } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { useConfirm } from '@/components/confirm-dialog';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  issued: 'default',
  revoked: 'destructive',
  expired: 'secondary',
};

export default function CertificatesPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(() => api.listCertificates(session.token), []);
  const rows = useMemo(() => toRecords(data), [data]);

  const issuedCount = rows.filter((r) => r.status === 'issued').length;
  const revokedCount = rows.filter((r) => r.status === 'revoked').length;

  const handleRevoke = useCallback(async (row: Record<string, unknown>) => {
    if (!(await confirm({
      title: `Revoke certificate ${asString(row.certificate_no)}?`,
      description: `This will revoke the certificate issued to ${asString(row.user_name)}. This action cannot be undone.`,
      confirmText: 'Revoke',
      variant: 'destructive',
    }))) return;
    try { await api.revokeCertificate(session.token, asString(row.id)); reload(); } catch { /* ignore */ }
  }, [api, session.token, reload, confirm]);

  const columns: DataTableColumn[] = [
    { key: 'certificate_no', label: 'Certificate #', sortable: true },
    { key: 'user_name', label: 'Student' },
    { key: 'user_email', label: 'Email' },
    { key: 'course_title', label: 'Course' },
    { key: 'verification_code', label: 'Verification Code' },
    { key: 'issued_date', label: 'Issued', render: (v) => {
      if (!v) return '-';
      const d = new Date(asString(v));
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
    }},
    { key: 'status', label: 'Status', render: (v) => (
      <Badge variant={statusColors[String(v)] ?? 'secondary'}>{String(v)}</Badge>
    )},
  ];

  const actions: DataTableAction[] = [
    { label: 'Revoke', onClick: (row) => void handleRevoke(row), variant: 'destructive' },
  ];

  if (loading) return <PageLoader label="Loading certificates..." />;
  if (error) return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Issued Certificates" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Issued</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{issuedCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Revoked</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{revokedCount}</p></CardContent></Card>
      </div>

      <AdminDataTable columns={columns} rows={rows} actions={actions} />
    </div>
  );
}
