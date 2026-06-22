import { useCallback, useEffect, useState } from 'react';
import { Loader2, KeyRound, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  if (loading) return <PageLoader label="Loading settings..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-cn-muted-fg">Update your profile and password.</p>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {loadError}
        </div>
      ) : null}

      <form onSubmit={(e) => void onSaveProfile(e)} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-cn-orange/10 p-2 text-cn-orange">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Profile</h2>
            <p className="text-xs text-cn-muted-fg">Your name and contact details.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Full name</Label>
            <Input id="settings-name" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setProfileForm((p) => ({ ...p, name: next })); }} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-country-code">Country code</Label>
            <Input id="settings-country-code" value={profileForm.countryCode} maxLength={10} placeholder="+91" onChange={(e) => setProfileForm((p) => ({ ...p, countryCode: e.target.value }))} autoComplete="tel-country-code" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">Phone</Label>
            <Input id="settings-phone" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} autoComplete="tel-national" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" className="bg-cn-orange text-white hover:bg-cn-orange/90" disabled={profileSaving}>
            {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Profile
          </Button>
        </div>
      </form>

      <form onSubmit={(e) => void onChangePassword(e)} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-cn-orange/10 p-2 text-cn-orange">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
            <p className="text-xs text-cn-muted-fg">Pick a new password — at least 8 characters.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-password">New password</Label>
            <Input id="settings-password" type="password" value={passwordForm.password} onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-confirm-password">Confirm new password</Label>
            <Input id="settings-confirm-password" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} autoComplete="new-password" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" className="bg-cn-orange text-white hover:bg-cn-orange/90" disabled={passwordSaving}>
            {passwordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
}
