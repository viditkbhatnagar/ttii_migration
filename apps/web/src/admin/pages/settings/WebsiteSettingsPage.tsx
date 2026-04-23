import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';

const TEXT_FIELDS = [
  { key: 'banner_title', label: 'Banner Title *', type: 'text' as const },
  { key: 'banner_sub_title', label: 'Banner Sub Title *', type: 'text' as const },
  { key: 'cookie_note', label: 'Cookie Note *', type: 'textarea' as const },
];

const RICH_TEXT_FIELDS = [
  { key: 'cookie_policy', label: 'Cookie Policy *' },
  { key: 'about_us', label: 'About Us *' },
  { key: 'terms_and_condition', label: 'Terms & Condition *' },
  { key: 'privacy_policy', label: 'Privacy Policy *' },
];

const LOGO_UPLOADS = [
  { key: 'light_logo', label: 'Update Light Logo (330 X 70)' },
  { key: 'dark_logo', label: 'Update Dark Logo (330 X 70)' },
  { key: 'small_logo', label: 'Update Small Logo (49 X 58)' },
  { key: 'favicon', label: 'Update Favicon (90 X 90)' },
];

export default function WebsiteSettingsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadSettings(session.token),
    [session.token],
  );

  const [form, setForm] = useState<Record<string, string>>({});
  const [cookieStatus, setCookieStatus] = useState<'active' | 'inactive'>('inactive');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const settings = toRecords(data.frontendSettings);
      const initial: Record<string, string> = {};
      for (const item of settings) {
        initial[asString(item.key)] = asString(item.value);
      }
      setForm(initial);
      if (initial.cookie_status === 'active' || initial.cookie_status === 'inactive') {
        setCookieStatus(initial.cookie_status);
      }
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateWebsiteSettings(session.token, { ...form, cookie_status: cookieStatus });
      toast.success('Website settings saved successfully.');
    } catch {
      toast.error('Failed to save website settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading website settings..." />;
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

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Website Settings" />

      {/* Main Content Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            {TEXT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={field.key} className="text-sm font-medium text-gray-700">{field.label}</Label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.key}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form[field.key] ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                ) : (
                  <Input
                    id={field.key}
                    value={form[field.key] ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {RICH_TEXT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={field.key} className="text-sm font-medium text-gray-700">{field.label}</Label>
                <textarea
                  id={field.key}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form[field.key] ?? ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder="Supports HTML"
                />
              </div>
            ))}

            {/* Cookie Status radio */}
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium text-gray-700">Cookie Status *</legend>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="cookie_status"
                    value="active"
                    checked={cookieStatus === 'active'}
                    onChange={() => setCookieStatus('active')}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="cookie_status"
                    value="inactive"
                    checked={cookieStatus === 'inactive'}
                    onChange={() => setCookieStatus('inactive')}
                  />
                  Inactive
                </label>
              </div>
            </fieldset>

            <div className="flex justify-end">
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

      {/* Logo Uploads — each is its own sub-form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logos & Favicon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {LOGO_UPLOADS.map((logo) => (
              <div key={logo.key} className="space-y-2 rounded-lg border border-gray-200 p-4">
                <Label className="text-sm font-medium text-gray-700">{logo.label}</Label>
                {form[logo.key] ? (
                  <div className="mb-2">
                    <img
                      src={asString(form[logo.key])}
                      alt={logo.label}
                      className="h-12 w-auto object-contain"
                    />
                  </div>
                ) : null}
                <Input id={logo.key} type="file" accept="image/*" />
                <Button
                  size="sm"
                  className="bg-ttii-primary hover:bg-ttii-primary/90"
                  onClick={() => toast.info(`${logo.label} upload — backend wiring pending.`)}
                >
                  {logo.label}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
