import { useCallback, useEffect, useState } from 'react';
import { User, Shield, KeyRound, Eye, EyeOff, Save, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageLoader } from '@/components/ui/page-loader';
import { useCounsellorLayout } from '../../layout/CounsellorLayoutContext.js';
import type { CounsellorProfileSnapshot } from '../../counsellor-portal-api.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';

interface ProfileFormState {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

interface PasswordFormState {
  password: string;
  confirmPassword: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'CN';
}

export default function CounsellorSettingsPage({ api, session }: CounsellorPageProps) {
  const { refreshCurrentUser } = useCounsellorLayout();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    email: '',
    phone: '',
    countryCode: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    password: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hydrate = useCallback((snapshot: CounsellorProfileSnapshot) => {
    setProfileForm({
      name: snapshot.name,
      email: snapshot.email,
      phone: snapshot.phone,
      countryCode: snapshot.countryCode,
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
        const snapshot = await api.updateProfile(session.token, profileForm, session);
        hydrate(snapshot);
        refreshCurrentUser();
        toast.success('Profile updated successfully');
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
        toast.success('Password updated successfully');
        setPasswordForm({ password: '', confirmPassword: '' });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not change password.');
      } finally {
        setPasswordSaving(false);
      }
    },
    [api, passwordForm, session.token],
  );

  if (loading) return <PageLoader label="Loading settings..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and account security.
          </p>
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {loadError}
        </div>
      ) : null}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Profile ─── */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/15">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                      {initialsOf(profileForm.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{profileForm.name || 'Counsellor'}</h2>
                  <p className="text-sm text-muted-foreground">Admission Counsellor</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profileForm.email ? (
                      <Badge variant="outline" className="text-xs">{profileForm.email}</Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <form onSubmit={(e) => void onSaveProfile(e)}>
              <Card className="p-6 space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="settings-name" className="text-sm font-medium">Full Name</label>
                    <Input
                      id="settings-name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                      onBlur={(e) => {
                        const next = titleCaseEachWord(e.target.value);
                        if (next !== e.target.value) setProfileForm((p) => ({ ...p, name: next }));
                      }}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="settings-email" className="text-sm font-medium">Email</label>
                    <Input
                      id="settings-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="settings-country-code" className="text-sm font-medium">Country Code</label>
                    <Input
                      id="settings-country-code"
                      value={profileForm.countryCode}
                      maxLength={10}
                      placeholder="+91"
                      onChange={(e) => setProfileForm((p) => ({ ...p, countryCode: e.target.value }))}
                      autoComplete="tel-country-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="settings-phone" className="text-sm font-medium">Phone</label>
                    <Input
                      id="settings-phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={profileSaving} className="gap-1.5">
                    {profileSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}{' '}
                    Save Changes
                  </Button>
                </div>
              </Card>
            </form>
          </div>
        </TabsContent>

        {/* ─── Security ─── */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <div className="space-y-6">
            <form onSubmit={(e) => void onChangePassword(e)}>
              <Card className="p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Change Password
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="settings-password" className="text-sm font-medium">New Password</label>
                    <div className="relative">
                      <Input
                        id="settings-password"
                        type={showNew ? 'text' : 'password'}
                        placeholder="Enter new password"
                        className="pr-10"
                        value={passwordForm.password}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="settings-confirm-password" className="text-sm font-medium">Confirm New Password</label>
                    <div className="relative">
                      <Input
                        id="settings-confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        className="pr-10"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pick a new password — at least 8 characters, and both fields must match.
                </p>
                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordSaving} className="gap-1.5">
                    {passwordSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}{' '}
                    Update Password
                  </Button>
                </div>
              </Card>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
