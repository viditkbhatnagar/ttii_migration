import { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useAuthState } from '@ttii/frontend-core';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Window event dispatched by useAdminPageData when an authenticated data
 * call returns 401/"not authenticated" mid-session. */
export const SESSION_EXPIRED_EVENT = 'ttii:auth-expired';

/**
 * Global session-expiry dialog. Replaces the bare "User not authenticated!"
 * error card (Naji 2026-06-09): when a logged-in data call 401s mid-session,
 * this pops a modal asking the user to sign in again or log out, instead of
 * leaving them on a cryptic error screen. Mounted once at the app root inside
 * the auth context.
 */
export function SessionExpiredDialog() {
  const { logout } = useAuthState();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onExpired = (): void => setOpen(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Full reload to the login landing — clears all stale in-memory state and
  // re-runs the auth bootstrap on a clean slate.
  const signInAgain = (): void => {
    window.location.assign('/');
  };

  const handleLogout = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } catch {
      // Even if the server logout call fails, fall through to the reload —
      // the stale token is useless anyway.
    } finally {
      window.location.assign('/');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[420px]"
        style={{ width: 'min(420px, calc(100vw - 2rem))', maxWidth: 'min(420px, calc(100vw - 2rem))' }}
      >
        <DialogHeader>
          <DialogTitle>Session expired</DialogTitle>
          <DialogDescription>
            You&apos;ve been signed out — your session ended for security. Sign in again to pick up
            where you left off, or log out.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void handleLogout()}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            <LogOut aria-hidden="true" className="mr-1.5 size-4" />
            Log out
          </Button>
          <Button onClick={signInAgain} disabled={busy} className="w-full sm:w-auto">
            <LogIn aria-hidden="true" className="mr-1.5 size-4" />
            Sign in again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
