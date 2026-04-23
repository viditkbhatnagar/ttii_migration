import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';

export default function AppVersionPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadSettings(session.token),
    [session.token],
  );

  const [appVersion, setAppVersion] = useState('');
  const [appVersionIos, setAppVersionIos] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.appVersion) {
      const ver = data.appVersion;
      setAppVersion(asString(ver.app_version));
      setAppVersionIos(asString(ver.app_version_ios));
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAppVersion(session.token, { appVersion, appVersionIos });
      toast.success('App version saved successfully.');
    } catch {
      toast.error('Failed to save app version.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading app version..." />;
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
      <AdminPageHeader title="App Version" />
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="app_version" className="text-sm font-medium text-gray-700">
                  Android Version *
                </Label>
                <Input
                  id="app_version"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="app_version_ios" className="text-sm font-medium text-gray-700">
                  Ios Version *
                </Label>
                <Input
                  id="app_version_ios"
                  value={appVersionIos}
                  onChange={(e) => setAppVersionIos(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-ttii-primary hover:bg-ttii-primary/90"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
