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

export default function WebsiteSettingsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadSettings(session.token),
    [session.token],
  );

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const settings = toRecords(data.frontendSettings);
      const initial: Record<string, string> = {};
      for (const item of settings) {
        initial[asString(item.key)] = asString(item.value);
      }
      setForm(initial);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await api.updateWebsiteSettings(session.token, form);
      window.alert('Website settings saved successfully.');
    } catch {
      window.alert('Failed to save website settings.');
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

  const entries = Object.entries(form);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Website Settings" />
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {entries.map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">{key}</Label>
                <Input
                  value={value}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
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
