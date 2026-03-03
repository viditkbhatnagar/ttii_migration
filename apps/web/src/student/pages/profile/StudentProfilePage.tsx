import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

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
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.updateProfile(session.token, { name, email, phone, academicYear }, session);
      setMessage('Profile updated successfully.');
      setEditing(false);
      reload();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }, [api, session, name, email, phone, academicYear, reload]);

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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>

      {message ? (
        <div className={`rounded-md px-4 py-3 text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="bg-ttii-primary text-lg text-white">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile?.name || 'Student'}</CardTitle>
                <CardDescription>Student ID: {profile?.studentId || 'N/A'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            {editing ? (
              <>
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
                <div className="flex gap-3 pt-2">
                  <Button className="bg-ttii-primary hover:bg-ttii-primary/90" disabled={saving} onClick={() => void handleSave()}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => { setEditing(false); setMessage(''); }}>Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-3">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="text-sm font-medium text-gray-900">{profile?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm font-medium text-gray-900">{profile?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-gray-500">Phone</span>
                    <span className="text-sm font-medium text-gray-900">{profile?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm text-gray-500">Academic Year</span>
                    <span className="text-sm font-medium text-gray-900">{profile?.academicYear || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Course ID</span>
                    <span className="text-sm font-medium text-gray-900">{profile?.courseId || 'N/A'}</span>
                  </div>
                </div>
                <Button variant="outline" className="mt-2" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              </>
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
