import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuthState } from '@ttii/frontend-core';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Window event dispatched by useAdminPageData when an authenticated data
 * call returns 401/"not authenticated" mid-session. */
export const SESSION_EXPIRED_EVENT = 'ttii:auth-expired';

// ── Exam focus lock ────────────────────────────────────────────────
// Naji UAT 2026-08-11 — on 10 Aug this dialog opened ON TOP of a live 75-minute
// exam (the session TTL is shorter than the exam), and its "Log Out" button sat
// one mis-click away from ending the attempt. A modal is the wrong response
// while a student is being timed: it steals the screen, it breaks proctoring
// focus, and there is nothing useful they can do about it mid-paper.
//
// So the exam player holds this lock for as long as it owns the screen, and the
// dialog stays shut. Nothing is queued for afterwards: the player has its own,
// non-destructive handling for a dead session (answers are autosaved server-side
// and a failed submit offers a retry instead of tearing the attempt down), and
// the moment the student leaves the exam the assessments page reloads — that
// call 401s and raises this dialog again on its own. Suppressed here, surfaced
// there, and never over a running clock.
let examFocusLocks = 0;

/** Held by the exam player while an attempt owns the screen. Returns the
 * release function (idempotent) — call it from an effect cleanup. */
export function acquireExamFocusLock(): () => void {
  examFocusLocks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    examFocusLocks = Math.max(0, examFocusLocks - 1);
  };
}

export function isExamFocusLocked(): boolean {
  return examFocusLocks > 0;
}

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
    const onExpired = (): void => {
      // Never over a live exam — see the exam focus lock above.
      if (isExamFocusLocked()) return;
      setOpen(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // "Stay Signed In" simply DISMISSES the dialog and keeps the user where they
  // are on their current session — it must NOT navigate to '/', which reloads
  // to the login landing and effectively logs them out (Naji 2026-06-29: "Stay
  // Signed In was also logging out"). Many of these 401s are transient / a
  // single endpoint hiccup, so the session is usually still valid; if it truly
  // is dead, the next data call simply re-raises this dialog. Only "Log Out"
  // ends the session.
  const staySignedIn = (): void => {
    setOpen(false);
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

        {/* Naji UAT 2026-08-11 — this used to read "your session has expired due
            to inactivity", which was never true of it. Nothing here measures
            idle time: the dialog fires when ANY authenticated data call comes
            back 401, which happens because the session has a fixed lifetime, or
            the token was replaced elsewhere, or one endpoint simply hiccuped —
            and it fired on students who were mid-exam and anything but idle.
            The copy now says what actually happened and what each button does,
            because "Stay Signed In" only dismisses this box; it cannot renew a
            session that has genuinely ended. */}
        <div className="mt-3 space-y-1 text-center text-sm leading-5 text-student-muted">
          <p>Your sign-in could not be verified, so the last request was refused.</p>
          <p>Stay Signed In keeps you on this page. Log Out signs you out now.</p>
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
