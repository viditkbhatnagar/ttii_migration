import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PageLoader } from '@/components/ui/page-loader';
import { Eye, EyeOff, Pencil, X } from 'lucide-react';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { useStudentLayout } from '../../layout/StudentLayoutContext.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;

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
  );
  const { refreshCurrentUser } = useStudentLayout();

  const [editing, setEditing] = useState(false);
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

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      setEditing(false);
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
  const completionBarColor = profileCompletion >= 80 ? 'from-emerald-500 to-teal-500' : profileCompletion >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-pink-500';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-student-text">Settings</h1>

      {message ? (
        <div
          role={message.includes('success') ? 'status' : 'alert'}
          aria-live={message.includes('success') ? 'polite' : 'assertive'}
          className={`rounded-xl px-4 py-3 text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {message}
        </div>
      ) : null}

      {/* Profile Completion */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 shadow-md">
              {profile?.image ? (
                <AvatarImage src={profile.image} alt={profile.name} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-student-accent to-student-accent-light text-lg text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-student-text">{profile?.name || 'Student'}</h2>
              <p className="text-sm text-student-muted">
                {profile?.username ? `@${profile.username}` : `ID: ${profile?.studentId || 'N/A'}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${completionColor}`}>{profileCompletion}%</p>
            <p className="text-xs text-student-muted">Profile Complete</p>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${completionBarColor} transition-all duration-700 ease-out`}
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Personal Information</CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-xl gap-1.5">
                  <Pencil aria-hidden="true" className="size-3.5" />
                  Edit
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Cancel editing"
                  onClick={() => { setEditing(false); setMessage(''); }}
                  className="max-sm:size-11"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            {editing ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase tracking-wider text-student-muted">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-wider text-student-muted">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-student-muted">Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academicYear" className="text-xs uppercase tracking-wider text-student-muted">Academic Year</Label>
                    <Input id="academicYear" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-xs uppercase tracking-wider text-student-muted">Date of Birth</Label>
                    <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-xs uppercase tracking-wider text-student-muted">Gender</Label>
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
                </div>
                <Separator />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-student-muted">Address</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address" className="text-xs uppercase tracking-wider text-student-muted">Address Line</Label>
                    <Input id="address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="House/Street" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-xs uppercase tracking-wider text-student-muted">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-xs uppercase tracking-wider text-student-muted">State</Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode" className="text-xs uppercase tracking-wider text-student-muted">Pincode</Label>
                    <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="rounded-xl bg-student-primary hover:bg-student-primary/90" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setEditing(false); setMessage(''); }}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <InfoRow label="Name" value={profile?.name} />
                <InfoRow label="Email" value={profile?.email} />
                <InfoRow label="Phone" value={profile?.phone} />
                <InfoRow label="Academic Year" value={profile?.academicYear} />
                <InfoRow label="Date of Birth" value={profile?.dateOfBirth ? formatDisplayDate(profile.dateOfBirth) : ''} />
                <InfoRow label="Gender" value={profile?.gender} />
                <InfoRow label="Student ID" value={profile?.studentId} />
                <InfoRow label="Course ID" value={profile?.courseId} />
                <InfoRow
                  label="Address"
                  value={formatAddress(profile?.addressLine1, profile?.city, profile?.state, profile?.pincode)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            <form
              className="space-y-4"
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
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-student-muted">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="rounded-xl pr-12"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-student-muted">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="rounded-xl pr-12"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showConfirmPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
              </div>
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
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 pb-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wider text-student-muted">{label}</span>
      <span className="text-sm font-medium text-student-text">{value || 'N/A'}</span>
    </div>
  );
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAddress(
  line1?: string  ,
  city?: string  ,
  state?: string  ,
  pincode?: string  ,
): string {
  const parts = [line1, city, state, pincode].filter((p) => p && p.trim() !== '');
  return parts.join(', ');
}
