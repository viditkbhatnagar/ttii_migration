import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

interface SettingGroup {
  title: string;
  keywords: string[];
}

const SETTING_GROUPS: SettingGroup[] = [
  { title: 'Payment Gateway', keywords: ['payment', 'razorpay', 'gateway'] },
  { title: 'SMS Provider', keywords: ['sms'] },
  { title: 'Email / SMTP', keywords: ['email', 'smtp', 'mail'] },
  { title: 'WhatsApp', keywords: ['whatsapp'] },
  { title: 'Zoom', keywords: ['zoom'] },
  { title: 'Firebase', keywords: ['firebase'] },
  { title: 'Other', keywords: [] },
];

function maskValue(key: string, value: string): string {
  if (!value) return '-';
  const lk = key.toLowerCase();
  if (lk.includes('secret') || lk.includes('password') || lk.includes('key')) {
    return value.length > 6 ? value.slice(0, 3) + '***' + value.slice(-3) : '******';
  }
  return value;
}

export default function IntegrationsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadIntegrations(session.token),
    [],
  );

  const allSettings = useMemo(() => toRecords(data), [data]);

  const grouped = useMemo(() => {
    const groups: Record<string, Array<{ key: string; value: string }>> = {};
    for (const g of SETTING_GROUPS) groups[g.title] = [];

    for (const row of allSettings) {
      const key = asString(row.key);
      const value = asString(row.value);
      const lk = key.toLowerCase();

      let placed = false;
      for (const g of SETTING_GROUPS) {
        if (g.keywords.length > 0 && g.keywords.some((kw) => lk.includes(kw))) {
          groups[g.title]?.push({ key, value });
          placed = true;
          break;
        }
      }
      if (!placed) {
        groups['Other']?.push({ key, value });
      }
    }

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [allSettings]);

  const configuredCount = useMemo(
    () => allSettings.filter((r) => asString(r.value).trim() !== '').length,
    [allSettings],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Integrations" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Settings</p>
            <p className="text-2xl font-semibold text-gray-900">{allSettings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Configured</p>
            <p className="text-2xl font-semibold text-gray-900">{configuredCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Not Configured</p>
            <p className="text-2xl font-semibold text-gray-900">{allSettings.length - configuredCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map(([title, items]) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                {title}
                <AdminStatusBadge
                  status={items.some((i) => i.value.trim() !== '') ? 'Active' : 'Inactive'}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="grid gap-2 text-sm">
                {items.map((item) => (
                  <div key={item.key} className="flex justify-between gap-4">
                    <dt className="text-gray-500 truncate">{item.key}</dt>
                    <dd className="text-gray-900 font-mono text-xs truncate max-w-[200px]">
                      {maskValue(item.key, item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
