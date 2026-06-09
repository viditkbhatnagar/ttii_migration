import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuthState } from '@ttii/frontend-core';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Window event dispatched by useAdminPageData when an authenticated data
 * call returns 401/"not authenticated" mid-session. */
export const SESSION_EXPIRED_EVENT = 'ttii:auth-expired';

/**
 * Global session-expiry dialog. Replaces the bare "User not authenticated!"
 * error card (Naji 2026-06-09): when a logged-in data call 401s mid-session,
 * this pops a modal asking the user to sign in again or log out, instead of
 * leaving them on a cryptic error screen. Mounted once at the app root inside
 * the auth context.
 *
 * Layout matches the EduPulse "Session Expired" reference (sessionexp.lovable.app,
 * Naji 2026-06-09): centred shield badge, title, two muted lines, and two
 * stacked full-width actions — "Stay Signed In" (primary) / "Log Out".
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
  const staySignedIn = (): void => {
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
        className="gap-0 p-8 sm:max-w-[420px]"
        style={{ width: 'min(420px, calc(100vw - 2rem))', maxWidth: 'min(420px, calc(100vw - 2rem))' }}
      >
        <DialogHeader className="items-center gap-0 space-y-0 text-center sm:text-center">
          <span
            aria-hidden="true"
            className="mb-5 flex size-16 items-center justify-center rounded-full bg-student-primary/10 text-student-primary"
          >
            <ShieldCheck className="size-8" strokeWidth={1.5} />
          </span>
          <DialogTitle className="text-center text-2xl font-bold text-student-text">
            Session Expired
          </DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-1 text-center text-sm leading-5 text-student-muted">
          <p>For your security, your session has expired due to inactivity.</p>
          <p>Please sign in again to continue where you left off.</p>
        </div>

        <div className="mt-7 space-y-2.5">
          <Button
            onClick={staySignedIn}
            disabled={busy}
            className="h-11 w-full rounded-xl bg-student-primary text-sm font-semibold text-white hover:bg-student-primary/90"
          >
            Stay Signed In
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleLogout()}
            disabled={busy}
            className="h-11 w-full rounded-xl border-slate-200 text-sm font-semibold text-student-text hover:bg-slate-50"
          >
            Log Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
