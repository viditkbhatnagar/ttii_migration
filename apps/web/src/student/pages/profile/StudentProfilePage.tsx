import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
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
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }, [api, session, name, email, phone, academicYear, dateOfBirth, gender, addressLine1, city, state, pincode, reload]);

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
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
          </CardContent>
        </Card>
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>

      {message ? (
        <div className={`rounded-md px-4 py-3 text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      ) : null}

      {/* Profile Completion */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-14">
                {profile?.image ? (
                  <AvatarImage src={profile.image} alt={profile.name} />
                ) : null}
                <AvatarFallback className="bg-ttii-primary text-lg text-white">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{profile?.name || 'Student'}</h2>
                <p className="text-sm text-gray-500">
                  {profile?.username ? `@${profile.username}` : `ID: ${profile?.studentId || 'N/A'}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${completionColor}`}>{profileCompletion}%</p>
              <p className="text-xs text-gray-500">Profile Complete</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${completionBarColor} transition-all`}
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Personal Information */}
        <Card className="bg-white lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Personal Information</CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            {editing ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Input id="academicYear" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Separator />
                <h3 className="text-sm font-medium text-gray-700">Address</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address Line</Label>
                    <Input id="address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="House/Street" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button className="bg-ttii-primary hover:bg-ttii-primary/90" disabled={saving} onClick={() => void handleSave()}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => { setEditing(false); setMessage(''); }}>Cancel</Button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <InfoRow label="Name" value={profile?.name} />
                <InfoRow label="Email" value={profile?.email} />
                <InfoRow label="Phone" value={profile?.phone} />
                <InfoRow label="Academic Year" value={profile?.academicYear} />
                <InfoRow label="Date of Birth" value={profile?.dateOfBirth ? formatDisplayDate(profile.dateOfBirth) : ''} />
                <InfoRow label="Gender" value={profile?.gender} />
                <InfoRow label="Student ID" value={profile?.studentId} />
                <InfoRow label="Course ID" value={profile?.courseId} />
                <div className="md:col-span-2">
                  <InfoRow
                    label="Address"
                    value={formatAddress(profile?.addressLine1, profile?.city, profile?.state, profile?.pincode)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            {passwordMessage ? (
              <div className={`rounded-md px-4 py-3 text-sm ${passwordMessage.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {passwordMessage}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={passwordSaving || !password || password !== confirmPassword}
              onClick={() => void handlePasswordChange()}
            >
              {passwordSaving ? 'Changing...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || 'N/A'}</span>
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
  line1?: string | undefined,
  city?: string | undefined,
  state?: string | undefined,
  pincode?: string | undefined,
): string {
  const parts = [line1, city, state, pincode].filter((p) => p && p.trim() !== '');
  return parts.join(', ');
}
