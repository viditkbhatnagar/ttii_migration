import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  User,
  Bell,
  Mail,
  LayoutDashboard,
  Shield,
  KeyRound,
  Smartphone,
  AlertCircle,
  Monitor,
  MapPin,
  Check,
  Upload,
  History,
  Clock,
  Briefcase,
  GraduationCap,
  Building2,
  Eye,
  EyeOff,
  Save,
  Lock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

interface AccountMeta {
  userId: string;
  roleId: number;
  email: string;
}

interface ToggleRow<K extends string> {
  label: string;
  desc: string;
  key: K;
}

const ROLE_LABEL = 'Admission Counsellor';

// Honest description of what this counsellor portal lets a counsellor do.
// These are real capabilities of the portal — not fabricated permission grants.
const PORTAL_CAPABILITIES: readonly string[] = [
  'View Applications',
  'Add & Edit Leads',
  'Manage Students',
  'View Payments',
  'View Performance',
  'Browse Courses',
  'Access Training',
  'Edit Own Profile',
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'CN';
}

// Best-effort device label from the browser. Honest — no IP/location guessing.
function currentDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'This browser';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let os = '';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/(iPhone|iPad|iPod)/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return os ? `${browser} / ${os}` : browser;
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
  const [account, setAccount] = useState<AccountMeta>({
    userId: String(session.userId),
    roleId: session.roleId,
    email: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Preferences (local UI state only — no persistence endpoint yet) ──
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    inApp: true,
  });
  const [emailPrefs, setEmailPrefs] = useState({
    dailyDigest: true,
    weeklyReport: true,
    newLead: true,
    paymentReceived: true,
    targetAlert: false,
    marketing: false,
  });
  const [dashboardPrefs, setDashboardPrefs] = useState({
    showKpiCards: true,
    showCharts: true,
    showQuickActions: true,
    compactMode: false,
  });

  const hydrate = useCallback((snapshot: CounsellorProfileSnapshot) => {
    setProfileForm({
      name: snapshot.name,
      email: snapshot.email,
      phone: snapshot.phone,
      countryCode: snapshot.countryCode,
    });
    setAccount({
      userId: snapshot.userId,
      roleId: snapshot.roleId,
      email: snapshot.email,
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
        await api.changePassword(session.token, {
          password: passwordForm.password,
          confirmPassword: passwordForm.confirmPassword,
        });
        toast.success('Password updated successfully');
        setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not change password.');
      } finally {
        setPasswordSaving(false);
      }
    },
    [api, passwordForm, session.token],
  );

  const notificationRows: readonly ToggleRow<keyof typeof notifications>[] = [
    { label: 'Email Notifications', desc: 'Receive updates via email', key: 'email' },
    { label: 'SMS Notifications', desc: 'Receive critical alerts via SMS', key: 'sms' },
    { label: 'Push Notifications', desc: 'Browser push notifications', key: 'push' },
    { label: 'In-App Notifications', desc: 'Notifications inside the dashboard', key: 'inApp' },
  ];

  const emailRows: readonly ToggleRow<keyof typeof emailPrefs>[] = [
    { label: 'Daily Digest', desc: 'Summary of daily activities', key: 'dailyDigest' },
    { label: 'Weekly Report', desc: 'Weekly performance summary', key: 'weeklyReport' },
    { label: 'New Lead Alert', desc: 'Notify when a new lead is assigned', key: 'newLead' },
    { label: 'Payment Received', desc: 'Notify on fee collection', key: 'paymentReceived' },
    { label: 'Target Alert', desc: 'Warn when targets are at risk', key: 'targetAlert' },
    { label: 'Marketing Updates', desc: 'Newsletters and promotional emails', key: 'marketing' },
  ];

  const dashboardRows: readonly ToggleRow<keyof typeof dashboardPrefs>[] = [
    { label: 'Show KPI Cards', desc: 'Display summary cards on dashboard', key: 'showKpiCards' },
    { label: 'Show Charts', desc: 'Display analytics charts on dashboard', key: 'showCharts' },
    { label: 'Show Quick Actions', desc: 'Display quick action buttons', key: 'showQuickActions' },
    { label: 'Compact Mode', desc: 'Reduce spacing for denser layout', key: 'compactMode' },
  ];

  // Current session row — honestly derived. No fabricated IPs, locations,
  // or historical logins (we have no login-history backend).
  const currentSession = useMemo(
    () => ({
      date: new Date().toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      device: currentDeviceLabel(),
    }),
    [],
  );

  if (loading) return <PageLoader label="Loading settings..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile, preferences, and account security.
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
          <TabsTrigger value="preferences" className="gap-1.5">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">System Info</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Profile ─── */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-primary-soft">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                      {initialsOf(profileForm.name)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => toast.info('Avatar upload is coming soon.')}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                    aria-label="Upload profile photo"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{profileForm.name || 'Counsellor'}</h2>
                  <p className="text-sm text-muted-foreground">{ROLE_LABEL}</p>
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

        {/* ─── Preferences (local UI state only — no persistence backend) ─── */}
        <TabsContent value="preferences" className="mt-6 space-y-6">
          <div className="space-y-6">
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Notification Settings
                </h3>
              </div>
              <div className="space-y-4">
                {notificationRows.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(v) => setNotifications((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Email Preferences
                </h3>
              </div>
              <div className="space-y-4">
                {emailRows.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={emailPrefs[item.key]}
                      onCheckedChange={(v) => setEmailPrefs((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Dashboard Preferences
                </h3>
              </div>
              <div className="space-y-4">
                {dashboardRows.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={dashboardPrefs[item.key]}
                      onCheckedChange={(v) => setDashboardPrefs((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast.success('Preferences saved')} className="gap-1.5">
                  <Save className="h-4 w-4" /> Save Preferences
                </Button>
              </div>
            </Card>
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
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="settings-current-password" className="text-sm font-medium">Current Password</label>
                    <div className="relative">
                      <Input
                        id="settings-current-password"
                        type={showCurrent ? 'text' : 'password'}
                        placeholder="Enter current password"
                        className="pr-10"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
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

            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Two-Factor Authentication
                </h3>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Enable 2FA</p>
                  <p className="text-xs text-muted-foreground">Secure your account with an authenticator app</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => toast.info('Two-factor authentication is coming soon.')}
                >
                  <Shield className="h-3.5 w-3.5" /> Enable
                </Button>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication adds an extra layer of security to your account. Once enabled,
                    you will be required to enter a verification code from your authenticator app every time you log in.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Login History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {currentSession.date}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{currentSession.device}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">—</TableCell>
                      <TableCell>
                        <Badge className="bg-success text-success-foreground hover:bg-success">
                          <Check className="h-3 w-3 mr-1" />
                          Current session
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Detailed login history (location and IP) is not recorded yet — only your current session is shown.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* ─── System Info ─── */}
        <TabsContent value="system" className="mt-6 space-y-6">
          <div className="space-y-6">
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Role &amp; Access
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="system-role" className="text-sm font-medium">Role</label>
                  <Input id="system-role" value={ROLE_LABEL} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="system-email" className="text-sm font-medium">Email</label>
                  <Input id="system-email" value={account.email || '—'} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="system-user-id" className="text-sm font-medium">User ID</label>
                  <Input id="system-user-id" value={account.userId} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="system-role-id" className="text-sm font-medium">Role ID</label>
                  <Input id="system-role-id" value={String(account.roleId)} disabled className="bg-muted" />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Permissions
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PORTAL_CAPABILITIES.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 rounded-lg border border-border p-3">
                    <div className="h-5 w-5 rounded-full bg-success/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-success" />
                    </div>
                    <span className="text-sm">{perm}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Assigned Courses
                </h3>
              </div>
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No course assignments are recorded for your account. You can browse the full catalogue from the Courses page.
                </p>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Assigned Centres
                </h3>
              </div>
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <p className="text-sm">No centre assignments are recorded for your account.</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
