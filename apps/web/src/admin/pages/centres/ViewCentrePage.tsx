import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-900">{value || '-'}</span>
    </div>
  );
}

export default function ViewCentrePage({ api, session, onNavigate }: AdminPageProps) {
  const centreId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error } = useAdminPageData(
    () => api.getCentre(session.token, centreId),
    [centreId],
  );

  const centre = useMemo(() => {
    if (!data) return null;
    const record = data.centre;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  const coursePlans = useMemo(() => toRecords(data?.course_plans ?? data?.coursePlans), [data]);

  if (loading) {
    return <PageLoader label="Loading view centre..." />;
  }

  if (error || !centre) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error || 'Centre not found.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Centre Details">
        <Button variant="outline" onClick={() => onNavigate(`/admin/centres/edit/${centreId}`)}>
          Edit Centre
        </Button>
        <Button variant="outline" onClick={() => onNavigate('/admin/centres/index')}>
          Back to List
        </Button>
      </AdminPageHeader>

      {/* Section 1: Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 md:grid-cols-2">
            <div>
              <InfoRow label="Centre Name" value={asString(centre.centre_name)} />
              <InfoRow label="Centre Code" value={asString(centre.centre_code)} />
              <InfoRow label="Centre Type" value={asString(centre.centre_type)} />
              <InfoRow label="Status" value={asString(centre.status)} />
            </div>
            <div>
              <InfoRow label="Description" value={asString(centre.description)} />
              <InfoRow label="Wallet Balance" value={asNumber(centre.wallet_balance) ? `₹${asNumber(centre.wallet_balance).toLocaleString()}` : '-'} />
              <InfoRow label="Total Students" value={asString(centre.total_students)} />
              <InfoRow label="Fund Requests" value={asString(centre.fund_requests_count)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 md:grid-cols-2">
            <div>
              <InfoRow label="Contact Person" value={asString(centre.contact_person)} />
              <InfoRow label="Phone" value={asString(centre.phone)} />
              <InfoRow label="Email" value={asString(centre.email)} />
              <InfoRow label="Address" value={asString(centre.address)} />
            </div>
            <div>
              <InfoRow label="City" value={asString(centre.city)} />
              <InfoRow label="State" value={asString(centre.state)} />
              <InfoRow label="Pincode" value={asString(centre.pincode)} />
              <InfoRow label="Google Maps Link" value={asString(centre.google_maps_link)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Affiliation Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Affiliation Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 md:grid-cols-2">
            <div>
              <InfoRow label="Affiliation Number" value={asString(centre.affiliation_number)} />
              <InfoRow label="Affiliation Date" value={formatDate(centre.affiliation_date) || '-'} />
            </div>
            <div>
              <InfoRow label="Affiliation Document" value={asString(centre.affiliation_document)} />
              <InfoRow label="Recognition Status" value={asString(centre.recognition_status)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Course Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course Plans</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {coursePlans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600">Course Title</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Assigned Amount</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Start Date</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {coursePlans.map((plan, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-4 py-2.5 text-gray-900">{asString(plan.course_title) || asString(plan.title) || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-900">
                        {asNumber(plan.assigned_amount) ? `₹${asNumber(plan.assigned_amount).toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{formatDate(plan.start_date) || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-900">{formatDate(plan.end_date) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No course plans assigned to this centre.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
