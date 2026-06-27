import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Monitor,
  Check,
  Upload,
  History,
  Clock,
  Briefcase,
  Eye,
  EyeOff,
  Lock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

interface PasswordFormState {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

interface AccountMeta {
  userId: string;
  roleId: number;
  email: string;
  name: string;
  phone: string;
}

// Single login event, as surfaced by GET /api/profile/index → data.loginHistory.
// Each row maps to one auth_session row (see AuthService.createSession). All
// timestamps are real ISO-8601 DateTime values (no '0000-00-00' zero-date
// hazard — that gotcha is specific to student_payments).
interface LoginHistoryEntry {
  at: string; // login time (ISO-8601)
  ip: string;
  userAgent: string;
  current: boolean;
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

// 5 MB cap for avatar uploads — friendly client-side guard before the request.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'CN';
}

// Best-effort, human-friendly browser/OS label from a raw user-agent string.
// Honest — derived purely from the recorded UA, no guessing beyond it.
function deviceLabelFromUserAgent(ua: string): string {
  if (ua.trim() === '') return 'Unknown device';

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

// Format an ISO-8601 login timestamp. Full DateTime values are safe to feed to
// new Date() (only bare YYYY-MM-DD date-only strings have the IST day-shift
// hazard). Returns '—' for empty/unparseable input.
function formatLoginAt(iso: string): string {
  if (iso.trim() === '') return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Derive the API base URL the same way App.tsx does (the LegacyApiClient base).
// The login-history array is only exposed on the raw /profile/index payload,
// which the counsellor API client's typed loadProfile() snapshot does not carry
// — so the page reads it directly via the documented `auth_token` query param.
function resolveApiBaseUrl(): string {
  const value: unknown = import.meta.env.VITE_API_BASE_URL;
  if (typeof value === 'string' && value.trim() !== '') {
    return value.replace(/\/+$/, '');
  }
  if (typeof window === 'undefined') return '/api';
  return `${window.location.origin}/api`;
}

function toLoginHistory(raw: unknown): LoginHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: LoginHistoryEntry[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Record<string, unknown>;
    entries.push({
      at: typeof row.at === 'string' ? row.at : '',
      ip: typeof row.ip === 'string' ? row.ip : '',
      userAgent:
        typeof row.user_agent === 'string'
          ? row.user_agent
          : typeof row.device === 'string'
            ? row.device
            : '',
      current: row.current === true,
    });
  }
  return entries;
}

export default function CounsellorSettingsPage({ api, session }: CounsellorPageProps) {
  const { refreshCurrentUser } = useCounsellorLayout();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountMeta>({
    userId: String(session.userId),
    roleId: session.roleId,
    email: '',
    name: '',
    phone: '',
  });
  const [countryCode, setCountryCode] = useState('');
  const [avatarImage, setAvatarImage] = useState('');

  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);

  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hydrate = useCallback((snapshot: CounsellorProfileSnapshot) => {
    setAccount({
      userId: snapshot.userId,
      roleId: snapshot.roleId,
      email: snapshot.email,
      name: snapshot.name,
      phone: snapshot.phone,
    });
    setCountryCode(snapshot.countryCode);
    setAvatarImage(snapshot.image);
  }, []);

  // Read the real login history from the raw /profile/index payload. The typed
  // snapshot drops it, so we fetch the endpoint directly (GET auth via the
  // auth_token query param) and tolerate any failure gracefully.
  const loadLoginHistory = useCallback(async (): Promise<void> => {
    try {
      const url = `${resolveApiBaseUrl()}/profile/index?auth_token=${encodeURIComponent(session.token)}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: Record<string, unknown> };
      const data = payload.data ?? {};
      setLoginHistory(toLoginHistory(data.loginHistory ?? data.login_history));
    } catch {
      // Login history is supplementary — never block the page on it.
    }
  }, [session.token]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const snapshot = await api.loadProfile(session.token, session);
        if (cancelled) return;
        hydrate(snapshot);
        await loadLoginHistory();
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
  }, [api, session, hydrate, loadLoginHistory]);

  const onPickPhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onPhotoSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset the input so picking the same file again still fires onChange.
      event.target.value = '';
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file.');
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        toast.error('Image is too large (max 5 MB). Please choose a smaller file.');
        return;
      }

      setPhotoUploading(true);
      try {
        // 1) Upload the file via the shared admin upload endpoint.
        const uploaded = await api.admin.uploadFile(session.token, file);
        // 2) Persist the new image on the user row. /admin/user/edit accepts an
        //    image field and is open to counsellors (role 9 is in
        //    ADMIN_PORTAL_ROLES); we pass the current name and phone so nothing
        //    else is overwritten.
        await api.admin.editUser(session.token, account.userId, {
          name: account.name,
          phone: account.phone,
          image: uploaded.url,
        });
        // 3) Reflect the new avatar immediately and refresh the navbar.
        setAvatarImage(uploaded.url);
        refreshCurrentUser();
        toast.success('Profile photo updated');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not upload your photo.');
      } finally {
        setPhotoUploading(false);
      }
    },
    [api, account.name, account.phone, account.userId, refreshCurrentUser, session.token],
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

  // Display-only contact line: country code + phone, gracefully omitted when absent.
  const phoneDisplay = useMemo(() => {
    const cc = countryCode.trim();
    const phone = account.phone.trim();
    if (phone === '') return '—';
    return cc !== '' ? `${cc} ${phone}` : phone;
  }, [account.phone, countryCode]);

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
                    {avatarImage ? <AvatarImage src={avatarImage} alt={account.name} /> : null}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                      {initialsOf(account.name)}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onPhotoSelected(e)}
                  />
                  <button
                    type="button"
                    onClick={onPickPhoto}
                    disabled={photoUploading}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
                    aria-label="Upload profile photo"
                  >
                    {photoUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{account.name || 'Counsellor'}</h2>
                  <p className="text-sm text-muted-foreground">{ROLE_LABEL}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {account.email ? (
                      <Badge variant="outline" className="text-xs">{account.email}</Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Personal Information
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                  <dd className="text-sm font-medium">{account.name || '—'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-sm font-medium break-all">{account.email || '—'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                  <dd className="text-sm font-medium">{phoneDisplay}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                  <dd className="text-sm font-medium">{ROLE_LABEL}</dd>
                </div>
              </dl>
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

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Login History
                </h3>
              </div>
              {loginHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No login history is available yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date &amp; Time</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginHistory.map((entry, index) => (
                        <TableRow key={`${entry.at}-${index}`}>
                          <TableCell className="text-sm whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatLoginAt(entry.at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{deviceLabelFromUserAgent(entry.userAgent)}</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {entry.ip || '—'}
                          </TableCell>
                          <TableCell>
                            {entry.current ? (
                              <Badge className="bg-success text-success-foreground hover:bg-success">
                                <Check className="h-3 w-3 mr-1" />
                                Current session
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Signed in</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Showing your {loginHistory.length === 1 ? 'most recent login' : `last ${loginHistory.length} logins`}.
                Location is not recorded.
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
