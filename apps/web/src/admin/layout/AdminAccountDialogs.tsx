import { useState, type FormEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../admin-portal-api.js';
import { asNumber, asString } from '../shared/utils/admin-data-utils.js';
import { passwordProblem } from './account-model.js';

// The profile-menu dialogs of Naji's Navbar, on real data: My Profile shows the
// signed-in account (/auth/me), Change Password calls /profile/change_password.
// His Edit Profile and photo upload are left out — admins have no self-edit
// endpoint — and so is "Current password": the server does not check it, and
// asking for it would pretend it does.

const DIALOG_STYLE = { width: 'min(440px, calc(100vw - 2rem))', maxWidth: 'min(440px, calc(100vw - 2rem))' };
const DIALOG_CLASS = 'flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0';

export interface AccountProfile {
  name: string;
  email: string;
  image: string;
  roleLabel: string;
  initials: string;
}

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: AccountProfile;
  onChangePassword: () => void;
}

export function MyProfileDialog({ open, onOpenChange, profile, onChangePassword }: ProfileDialogProps) {
  const rows: Array<[string, string]> = [
    ['Name', profile.name || '—'],
    ['Email', profile.email || '—'],
    ['Role', profile.roleLabel],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={DIALOG_STYLE} className={DIALOG_CLASS}>
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle>My Profile</DialogTitle>
          <DialogDescription>{profile.roleLabel}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-center gap-3">
            <Avatar className="size-14 rounded-xl">
              {profile.image ? <AvatarImage src={profile.image} alt="" className="rounded-xl object-cover" /> : null}
              <AvatarFallback className="rounded-xl bg-primary/10 text-base font-semibold text-primary">{profile.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{profile.name || 'Admin'}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <dl className="divide-y divide-border rounded-xl border border-border">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="shrink-0 text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words text-right font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onChangePassword}>
            <KeyRound aria-hidden="true" className="size-4" /> Change Password
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: AdminPortalApi;
  token: string;
}

export function ChangePasswordDialog({ open, onOpenChange, api, token }: ChangePasswordDialogProps) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const problem = passwordProblem(next, confirm);

  const reset = (value: boolean) => {
    if (!value) { setNext(''); setConfirm(''); setTouched(false); }
    onOpenChange(value);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (problem || saving) return;
    setSaving(true);
    try {
      const res = await api.changeMyPassword(token, next, confirm);
      const message = asString(res.message);
      if (asNumber(res.status) === 1) {
        toast.success(message || 'Password updated.');
        reset(false);
      } else {
        toast.error(message || 'Could not update the password.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent style={DIALOG_STYLE} className={DIALOG_CLASS}>
        <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Choose a new password for your account.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="admin-new-password">New Password *</Label>
              <Input id="admin-new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-confirm-password">Confirm New Password *</Label>
              <Input id="admin-confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {touched && problem ? <p role="alert" className="text-xs text-destructive">{problem}</p> : null}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
            <Button type="button" variant="outline" size="sm" onClick={() => reset(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null} Update Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
