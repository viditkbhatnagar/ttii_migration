import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { AuthSession } from '@ttii/frontend-core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { PASSWORD_MIN_LENGTH, passwordProblem } from './centre-profile-model.js';

export function ProfileSecurityTab({ api, session }: { api: CentrePortalApi; session: AuthSession }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      const result = await api.changeOwnPassword(session.token, password, confirm);
      if (result.status !== 1) throw new Error(typeof result.message === 'string' && result.message ? result.message : 'The password could not be changed.');
      toast.success('Password updated');
      setPassword('');
      setConfirm('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'The password could not be changed.');
    } finally {
      setSaving(false);
    }
  };

  const type = show ? 'text' : 'password';
  return (
    <Card className="gap-0 max-w-xl p-6">
      <form className="space-y-4" onSubmit={(e) => void submit(e)} noValidate>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><Lock aria-hidden="true" className="h-4 w-4" />Change Password</h2>
        <div className="space-y-2">
          <label htmlFor="centre-new-password" className="text-sm font-medium">New Password</label>
          <div className="relative">
            <Input id="centre-new-password" type={type} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" aria-describedby="centre-password-hint" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide passwords' : 'Show passwords'} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {show ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
          <p id="centre-password-hint" className="text-xs text-muted-foreground">At least {PASSWORD_MIN_LENGTH} characters.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="centre-confirm-password" className="text-sm font-medium">Confirm New Password</label>
          <Input id="centre-confirm-password" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
          Update Password
        </Button>
      </form>
    </Card>
  );
}
