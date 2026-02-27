import { useState, useEffect } from 'react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const CONTACT_FIELDS = [
  { key: 'contact_email', label: 'Contact Email' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'contact_address', label: 'Contact Address' },
  { key: 'support_email', label: 'Support Email' },
  { key: 'support_phone', label: 'Support Phone' },
  { key: 'whatsapp_number', label: 'WhatsApp Number' },
] as const;

export default function ContactSettingsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadContactSettings(session.token),
    [session.token],
  );

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const rows = toRecords(data);
      const initial: Record<string, string> = {};
      for (const item of rows) {
        initial[asString(item.key)] = asString(item.value);
      }
      setForm(initial);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await api.updateContactSettings(session.token, form);
      window.alert('Contact settings saved successfully.');
    } catch {
      window.alert('Failed to save contact settings.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
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
      <AdminPageHeader title="Contact Settings" />
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {CONTACT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">
                  {field.label}
                </Label>
                <Input
                  value={form[field.key] ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
