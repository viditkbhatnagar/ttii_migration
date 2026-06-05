import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PageLoader } from '@/components/ui/page-loader';
import { Camera, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { useStudentLayout } from '../../layout/StudentLayoutContext.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

type SettingsTab = 'profile' | 'security';

const SETTINGS_TABS: ReadonlyArray<{ id: SettingsTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
];

const CARD_CLASS = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const FIELD_LABEL_CLASS = 'text-xs font-medium uppercase tracking-wider text-student-muted';

function computeProfileCompletion(profile: {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  image: string;
}): number {
  const fields = [
    profile.name,
    profile.email,
    profile.phone,
    profile.dateOfBirth,
    profile.gender,
    profile.addressLine1,
    profile.city,
    profile.state,
    profile.pincode,
    profile.image,
  ];
  const filled = fields.filter((f) => f !== '').length;
  return Math.round((filled / fields.length) * 100);
}

export default function StudentProfilePage({ api, session }: StudentPageProps) {
  const { data: profile, loading, error, reload } = useAdminPageData(
    () => api.loadProfile(session.token, session),
    [api, session.token, session.userId, session.roleId],
    `student:profile:${session.userId}`,
  );
  const { refreshCurrentUser } = useStudentLayout();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const resetProfileForm = useCallback(() => {
    if (!profile) return;
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setAcademicYear(profile.academicYear);
    setDateOfBirth(profile.dateOfBirth);
    setGender(profile.gender);
    setAddressLine1(profile.addressLine1);
    setCity(profile.city);
    setState(profile.state);
    setPincode(profile.pincode);
    setMessage('');
  }, [profile]);

  const handlePhotoUpload = useCallback(async (file: File) => {
    setPhotoUploading(true);
    setMessage('');
    try {
      await api.uploadProfileImage(session.token, file);
      setMessage('Profile photo updated successfully.');
      reload();
      refreshCurrentUser();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [api, session.token, reload, refreshCurrentUser]);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setPhone(profile.phone);
      setAcademicYear(profile.academicYear);
      setDateOfBirth(profile.dateOfBirth);
      setGender(profile.gender);
      setAddressLine1(profile.addressLine1);
      setCity(profile.city);
      setState(profile.state);
      setPincode(profile.pincode);
    }
  }, [profile]);

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    return computeProfileCompletion(profile);
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.updateProfile(
        session.token,
        { name, email, phone, academicYear, dateOfBirth, gender, addressLine1, city, state, pincode },
        session,
      );
      setMessage('Profile updated successfully.');
      reload();
      refreshCurrentUser();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }, [api, session, name, email, phone, academicYear, dateOfBirth, gender, addressLine1, city, state, pincode, reload, refreshCurrentUser]);

  const handlePasswordChange = useCallback(async () => {
    if (!password || password !== confirmPassword) {
      setPasswordMessage('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage('');
    try {
      await api.changePassword(session.token, { password, confirmPassword });
      setPasswordMessage('Password changed successfully.');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordMessage(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  }, [api, session.token, password, confirmPassword]);

  if (loading) {
    return <PageLoader label="Loading student profile..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Settings</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const initials = (profile?.name || 'S')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  const completionColor = profileCompletion >= 80 ? 'text-emerald-600' : profileCompletion >= 50 ? 'text-amber-600' : 'text-red-600';
  const completionBarColor = profileCompletion >= 80 ? 'bg-emerald-500' : profileCompletion >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const rollLabel = profile?.username ? `@${profile.username}` : `ID: ${profile?.studentId || 'N/A'}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">Settings</h1>
        <p className="mt-1 text-sm text-student-muted">Manage your profile and preferences</p>
      </div>

      <div role="tablist" aria-label="Settings sections" className="flex gap-1 border-b border-slate-200">
        {SETTINGS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors max-sm:min-h-11 ${
                isActive ? 'text-student-primary' : 'text-student-muted hover:text-student-text'
              }`}
            >
              {tab.label}
              {isActive ? (
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-student-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {message ? (
        <div
          role={message.includes('success') ? 'status' : 'alert'}
          aria-live={message.includes('success') ? 'polite' : 'assertive'}
          className={`rounded-xl px-4 py-3 text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {message}
        </div>
      ) : null}

      {activeTab === 'profile' ? (
        <div className="space-y-6">
          {/* Profile card: avatar + identity + completion */}
          <section className={`${CARD_CLASS} p-6`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="size-20 ring-2 ring-student-primary-light">
                    {profile?.image ? <AvatarImage src={profile.image} alt="" /> : null}
                    <AvatarFallback className="bg-gradient-to-br from-student-accent to-student-accent-light text-xl text-white font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    aria-label="Change profile photo"
                    disabled={photoUploading}
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-white bg-student-primary text-white shadow-sm transition-colors hover:bg-student-primary/90 disabled:opacity-60"
                  >
                    <Camera aria-hidden="true" className="size-4" />
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePhotoUpload(file);
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-student-text truncate">{profile?.name || 'Student'}</h2>
                  <p className="text-sm text-student-muted truncate">{rollLabel}</p>
                  {photoUploading ? (
                    <p className="mt-1 text-xs text-student-muted">Uploading photo…</p>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className={`text-3xl font-semibold ${completionColor}`}>{profileCompletion}%</p>
                <p className="text-xs uppercase tracking-wider text-student-muted">Profile Complete</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${completionBarColor} transition-all duration-500 ease-out`}
                style={{ width: `${profileCompletion}%` }}
                role="progressbar"
                aria-valuenow={profileCompletion}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Profile ${profileCompletion}% complete`}
              />
            </div>
          </section>

          {/* Personal information form */}
          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className={FIELD_LABEL_CLASS}>Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className={FIELD_LABEL_CLASS}>Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className={FIELD_LABEL_CLASS}>Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob" className={FIELD_LABEL_CLASS}>Date of Birth</Label>
                    <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className={FIELD_LABEL_CLASS}>Gender</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academicYear" className={FIELD_LABEL_CLASS}>Programme / Academic Year</Label>
                    <Input id="academicYear" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address" className={FIELD_LABEL_CLASS}>Address Line</Label>
                    <Input id="address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="House / Street" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className={FIELD_LABEL_CLASS}>City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className={FIELD_LABEL_CLASS}>State</Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode" className={FIELD_LABEL_CLASS}>Pincode</Label>
                    <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                  <Button type="submit" className="rounded-xl bg-student-primary hover:bg-student-primary/90" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={resetProfileForm}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Change password */}
          <Card className={`${CARD_CLASS} h-fit max-w-2xl`}>
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handlePasswordChange();
                }}
              >
                {passwordMessage ? (
                  <div
                    role={passwordMessage.includes('success') ? 'status' : 'alert'}
                    aria-live={passwordMessage.includes('success') ? 'polite' : 'assertive'}
                    className={`rounded-xl px-4 py-3 text-sm ${passwordMessage.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
                  >
                    {passwordMessage}
                  </div>
                ) : null}
                <PasswordField
                  id="currentPassword"
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  visible={showCurrentPassword}
                  onToggleVisible={() => setShowCurrentPassword((v) => !v)}
                  autoComplete="current-password"
                />
                <PasswordField
                  id="password"
                  label="New Password"
                  value={password}
                  onChange={setPassword}
                  visible={showPassword}
                  onToggleVisible={() => setShowPassword((v) => !v)}
                  autoComplete="new-password"
                />
                <PasswordField
                  id="confirmPassword"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  visible={showConfirmPassword}
                  onToggleVisible={() => setShowConfirmPassword((v) => !v)}
                  autoComplete="new-password"
                />
                <Button
                  type="submit"
                  className="rounded-xl bg-student-primary hover:bg-student-primary/90"
                  disabled={passwordSaving || !password || password !== confirmPassword}
                >
                  {passwordSaving ? 'Changing...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Two-factor authentication (coming soon — not wired) */}
          <Card className={`${CARD_CLASS} h-fit max-w-2xl`}>
            <CardHeader>
              <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-student-primary-light/40 p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-student-primary shadow-sm">
                    <ShieldCheck aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-student-text">Authenticator app</p>
                    <p className="text-xs text-student-muted">Two-factor authentication is coming soon.</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={false}
                  aria-label="Two-factor authentication (coming soon)"
                  disabled
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-slate-200 opacity-70"
                >
                  <span aria-hidden="true" className="ml-0.5 inline-block size-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete: string;
}

function PasswordField({ id, label, value, onChange, visible, onToggleVisible, autoComplete }: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={FIELD_LABEL_CLASS}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="rounded-xl pr-12"
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
          onClick={onToggleVisible}
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </div>
  );
}
