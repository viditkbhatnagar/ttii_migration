import { useState, useEffect } from 'react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppVersionPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadSettings(session.token),
    [session.token],
  );

  const [appVersion, setAppVersion] = useState('');
  const [appVersionIos, setAppVersionIos] = useState('');

  useEffect(() => {
    if (data?.appVersion) {
      const ver = data.appVersion as Record<string, unknown>;
      setAppVersion(asString(ver.app_version));
      setAppVersionIos(asString(ver.app_version_ios));
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await api.updateAppVersion(session.token, { appVersion, appVersionIos });
      window.alert('App version saved successfully.');
    } catch {
      window.alert('Failed to save app version.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
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
      <AdminPageHeader title="App Version" />
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">
                App Version (Android)
              </Label>
              <Input
                value={appVersion}
                onChange={(e) => setAppVersion(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">
                App Version (iOS)
              </Label>
              <Input
                value={appVersionIos}
                onChange={(e) => setAppVersionIos(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              Save Version
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
