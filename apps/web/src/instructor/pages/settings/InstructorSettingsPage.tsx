import { useCallback, useEffect, useState } from 'react';
import { Loader2, KeyRound, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        toast.success('Profile updated.');
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
        toast.success('Password updated.');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account and preferences.</p>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
        >
          {loadError}
        </div>
      ) : null}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-white data-[state=active]:text-violet-600"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-white data-[state=active]:text-violet-600"
          >
            Password &amp; Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <span className="rounded-lg bg-violet-600/10 p-2 text-violet-600">
                  <User className="h-5 w-5" />
                </span>
                Profile information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void onSaveProfile(e)} className="space-y-6">
                <div className="flex items-center gap-5">
                  <Avatar className="h-20 w-20 ring-2 ring-violet-300">
                    {profileForm.image ? (
                      <AvatarImage src={profileForm.image} alt={profileForm.name} />
                    ) : null}
                    <AvatarFallback className="bg-violet-600 text-2xl font-semibold text-white">
                      {initialsFromName(profileForm.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {profileForm.name.trim() === '' ? 'Faculty' : profileForm.name}
                    </p>
                    <p className="text-xs text-slate-500">{roleLabel}</p>
                  </div>
                </div>

                <Separator className="bg-slate-200" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <Button
                    type="submit"
                    className="bg-violet-600 text-white hover:bg-violet-600/90"
                    disabled={profileSaving}
                  >
                    {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <span className="rounded-lg bg-violet-600/10 p-2 text-violet-600">
                  <KeyRound className="h-5 w-5" />
                </span>
                Change password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void onChangePassword(e)} className="space-y-4">
                <p className="text-xs text-slate-500">
                  Pick a new password — at least 8 characters.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <Button
                    type="submit"
                    className="bg-violet-600 text-white hover:bg-violet-600/90"
                    disabled={passwordSaving}
                  >
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
