import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';

const SYSTEM_FIELDS: Array<{ key: string; label: string; type: 'text' | 'textarea' }> = [
  { key: 'system_name', label: 'Website Name *', type: 'text' },
  { key: 'system_title', label: 'Website Title *', type: 'text' },
  { key: 'system_email', label: 'System Email *', type: 'text' },
  { key: 'website_keywords', label: 'Website Keywords *', type: 'text' },
  { key: 'website_description', label: 'Website Description *', type: 'textarea' },
  { key: 'address', label: 'Address *', type: 'textarea' },
  { key: 'author', label: 'Author *', type: 'text' },
  { key: 'privacy_policy', label: 'Privacy Policy *', type: 'text' },
  { key: 'phone', label: 'Phone *', type: 'text' },
];

export default function SystemSettingsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadSettings(session.token),
    [session.token],
  );

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const settings = toRecords(data.systemSettings);
      const initial: Record<string, string> = {};
      for (const item of settings) {
        initial[asString(item.key)] = asString(item.value);
      }
      setForm(initial);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await api.updateSystemSettings(session.token, form);
      toast.success('System settings saved successfully.');
    } catch {
      toast.error('Failed to save system settings.');
    }
  };

  if (loading) {
    return <PageLoader label="Loading system settings..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="System Settings" />
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SYSTEM_FIELDS.map((field) => (
              <div key={field.key} className={`space-y-1 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form[field.key] ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : (
                  <Input
                    id={field.key}
                    value={form[field.key] ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => { void handleSave(); }}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
