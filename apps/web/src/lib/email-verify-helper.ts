import { toast } from 'sonner';

/**
 * Shared on-blur email verification handler used by all admin user-creation
 * forms (Application, Counsellor, Associate, Instructor, Centre).
 *
 * Behaviour:
 *   - If the server says the email is invalid (bad format / disposable /
 *     no MX), surface the reason as an error toast.
 *   - If the server returns a typo suggestion (e.g. user typed
 *     `naji@gnail.com`, server says "did you mean gmail.com?"), show a
 *     non-blocking toast with a "Use this" action that calls
 *     `onAcceptSuggestion` with the corrected email.
 *
 * Network errors are swallowed — the server validates again on submit.
 */
interface VerifyEmailFn {
  verifyEmail: (
    authToken: string,
    email: string,
  ) => Promise<{ valid: boolean; message: string; reason?: string; suggestion?: string }>;
}

export async function verifyEmailWithFeedback(
  api: VerifyEmailFn,
  authToken: string,
  email: string,
  onAcceptSuggestion: (correctedEmail: string) => void,
): Promise<void> {
  try {
    const result = await api.verifyEmail(authToken, email);
    if (!result.valid) {
      toast.error(result.message || 'Email failed verification.');
    }
    if (result.suggestion) {
      const local = email.split('@')[0] ?? '';
      const corrected = `${local}@${result.suggestion}`;
      if (corrected !== email) {
        toast(`Did you mean ${corrected}?`, {
          action: { label: 'Use this', onClick: () => onAcceptSuggestion(corrected) },
          duration: 8000,
        });
      }
    }
  } catch {
    /* network — server validates again on submit */
  }
}
