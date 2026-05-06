import { useEffect, useRef, useState } from 'react';

import type { AuthApi, AuthSession } from '@ttii/frontend-core';

interface SsoButtonsProps {
  authApi: AuthApi;
  /**
   * Called after a successful Google sign-in. The parent persists the
   * session via `applyExternalSession` and routes to the student portal.
   */
  onGoogleSuccess: (session: AuthSession, requiresProfileCompletion: boolean) => void;
  onError: (message: string) => void;
}

interface GoogleConfig {
  google: boolean;
  microsoft: boolean;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    config: {
      type?: string;
      theme?: string;
      size?: string;
      text?: string;
      shape?: string;
      logo_alignment?: string;
      width?: number | string;
    },
  ) => void;
  prompt: () => void;
}

interface GoogleNamespace {
  accounts?: {
    id?: GoogleAccountsId;
  };
}

declare global {
  interface Window {
    google?: GoogleNamespace;
  }
}

const GIS_SCRIPT_ID = 'ttii-google-identity-services';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Document is not available.'));
      return;
    }
    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS load failed.')));
      return;
    }
    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GIS load failed.'));
    document.head.appendChild(script);
  });
}

const googleClientId = (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined) ?? '';

export function SsoButtons({ authApi, onGoogleSuccess, onError }: SsoButtonsProps) {
  const [config, setConfig] = useState<GoogleConfig | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void authApi
      .loadSsoConfig()
      .then((c) => {
        if (cancelled) return;
        setConfig({ google: c.googleEnabled, microsoft: c.microsoftEnabled });
      })
      .catch(() => {
        if (cancelled) return;
        // If the config endpoint fails just hide the buttons — login form
        // still works, no need to surface the error.
        setConfig({ google: false, microsoft: false });
      });
    return () => {
      cancelled = true;
    };
  }, [authApi]);

  // Mount the Google button once both the config + the GIS script are
  // ready and the client ID is set.
  useEffect(() => {
    if (!config?.google) return;
    if (!googleClientId) return;
    if (!googleButtonRef.current) return;

    let cancelled = false;
    void loadGoogleIdentityScript()
      .then(() => {
        if (cancelled) return;
        const gid = window.google?.accounts?.id;
        if (!gid || !googleButtonRef.current) return;
        gid.initialize({
          client_id: googleClientId,
          callback: (response) => {
            const credential = response.credential ?? '';
            if (!credential) {
              onError('Google sign-in was cancelled.');
              return;
            }
            void authApi
              .loginWithGoogleSso(credential)
              .then(({ session, requiresProfileCompletion }) => {
                onGoogleSuccess(session, requiresProfileCompletion);
              })
              .catch((err: unknown) => {
                onError(err instanceof Error ? err.message : 'Google sign-in failed.');
              });
          },
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        gid.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        });
      })
      .catch(() => {
        // Script failed to load — buttons stay hidden; the regular form works.
      });
    return () => {
      cancelled = true;
    };
  }, [authApi, config?.google, onError, onGoogleSuccess]);

  // Hide the whole block if neither IdP is configured — keeps the login
  // page clean while the apps aren't registered yet.
  if (!config) return null;
  if (!config.google && !config.microsoft) return null;

  const handleMicrosoftClick = () => {
    // Server-side redirect flow: backend signs the state, redirects to MS,
    // then bounces back to /api/auth/sso/microsoft/callback which 302s to
    // learn.teachersindia.in/?auth_token=... (handled in App.tsx top-level
    // redirect handler).
    window.location.href = '/api/auth/sso/microsoft/start';
  };

  return (
    <div className="space-y-3">
      <div className="relative my-2 flex items-center">
        <div className="flex-1 border-t border-slate-200" />
        <span className="px-3 text-xs uppercase tracking-wider text-slate-400">or</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {config.google && googleClientId ? (
        <div className="flex justify-center">
          <div ref={googleButtonRef} aria-label="Sign in with Google" />
        </div>
      ) : null}

      {config.microsoft ? (
        <button
          type="button"
          onClick={handleMicrosoftClick}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <svg aria-hidden="true" viewBox="0 0 23 23" className="size-4">
            <rect x="1" y="1" width="10" height="10" fill="#F25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
            <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
            <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
          </svg>
          Sign in with Microsoft
        </button>
      ) : null}
    </div>
  );
}
