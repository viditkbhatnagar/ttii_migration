import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PageLoader } from '@/components/ui/page-loader';
import { useInstructorLayout } from '../../layout/InstructorLayoutContext.js';
import type { InstructorProfileSnapshot } from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

interface ProfileFormState {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  image: string;
}

interface PasswordFormState {
  password: string;
  confirmPassword: string;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FA';
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'FA';
}

export default function InstructorSettingsPage({ api, session }: InstructorPageProps) {
  const { refreshCurrentUser } = useInstructorLayout();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    email: '',
    phone: '',
    countryCode: '',
    image: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    password: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const hydrate = useCallback((snapshot: InstructorProfileSnapshot) => {
    setRoleId(snapshot.roleId);
    setProfileForm({
      name: snapshot.name,
      email: snapshot.email,
      phone: snapshot.phone,
      countryCode: snapshot.countryCode,
      image: snapshot.image,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const snapshot = await api.loadProfile(session.token, session);
        if (cancelled) return;
        hydrate(snapshot);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Could not load your profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, session, hydrate]);

  const onSaveProfile = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (profileForm.name.trim() === '') {
        toast.error('Name is required.');
        return;
      }
      setProfileSaving(true);
      try {
        const snapshot = await api.updateProfile(
          session.token,
          {
            name: profileForm.name,
            email: profileForm.email,
            phone: profileForm.phone,
            countryCode: profileForm.countryCode,
          },
          session,
        );
        hydrate(snapshot);
        refreshCurrentUser();
        toast.success('Profile updated');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not update profile.');
      } finally {
        setProfileSaving(false);
      }
    },
    [api, hydrate, profileForm, refreshCurrentUser, session],
  );

  const onChangePassword = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (passwordForm.password.length < 8) {
        toast.error('New password must be at least 8 characters.');
        return;
      }
      if (passwordForm.password !== passwordForm.confirmPassword) {
        toast.error('New password and confirm password must match.');
        return;
      }
      setPasswordSaving(true);
      try {
        await api.changePassword(session.token, passwordForm);
        toast.success('Password updated');
        setPasswordForm({ password: '', confirmPassword: '' });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not change password.');
      } finally {
        setPasswordSaving(false);
      }
    },
    [api, passwordForm, session.token],
  );

  if (loading) {
    return <PageLoader label="Loading settings..." />;
  }

  const roleLabel = roleId === 3 ? 'Instructor · Faculty' : 'Faculty';
  const displayName = profileForm.name.trim() === '' ? 'Faculty' : profileForm.name;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {loadError}
        </div>
      ) : null}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Password &amp; Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="soft-shadow">
            <CardHeader>
              <CardTitle className="text-base">Profile information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={(e) => void onSaveProfile(e)} className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {profileForm.image ? (
                      <img
                        src={profileForm.image}
                        alt={displayName}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                        {initialsFromName(profileForm.name)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="settings-name">Full name</Label>
                    <Input
                      id="settings-name"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      autoComplete="name"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="settings-email">Email</Label>
                    <Input
                      id="settings-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      autoComplete="email"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="settings-country-code">Country code</Label>
                    <Input
                      id="settings-country-code"
                      value={profileForm.countryCode}
                      maxLength={10}
                      placeholder="+91"
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, countryCode: e.target.value }))
                      }
                      autoComplete="tel-country-code"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="settings-phone">Phone</Label>
                    <Input
                      id="settings-phone"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={profileSaving}>
                    {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="soft-shadow">
            <CardHeader>
              <CardTitle className="text-base">Change password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={(e) => void onChangePassword(e)} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pick a new password — at least 8 characters.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="settings-password">New password</Label>
                    <Input
                      id="settings-password"
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="settings-confirm-password">Confirm new password</Label>
                    <Input
                      id="settings-confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordSaving}>
                    {passwordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
