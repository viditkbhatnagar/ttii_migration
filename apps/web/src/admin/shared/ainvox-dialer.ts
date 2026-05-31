// Ainvox click-to-call dialer — lazy SDK loader + singleton wrapper.
//
// The Ainvox browser SDK (https://app.ainvox.com/web-client/ainvox-dialer.js)
// injects a floating dialer widget and exposes call/open/close. We load the
// script on first use (not on every admin pageview), instantiate one dialer,
// and reuse it.
//
// NOTE: outbound calls only connect once Ainvox provisions our account +
// virtual (caller-id) number. Until then the widget loads but calls won't go
// through. Guaranteed call RECORDING + saving call history inside the LMS is
// the server-side phase (REST Call API + status webhooks), not this widget.

const SDK_URL = 'https://app.ainvox.com/web-client/ainvox-dialer.js';

export interface AinvoxDialerInstance {
  call(number: string, makeCall: boolean): Promise<void>;
  open(): Promise<void>;
  close(): Promise<void>;
}

// The SDK declares a global `AinvoxDialer` constructor. Depending on how it is
// bundled it may be a lexical global rather than a property of `window`, so we
// probe with `typeof` — the only reference form that won't throw on an
// undeclared identifier.
declare const AinvoxDialer: new () => AinvoxDialerInstance;

let sdkLoad: Promise<void> | null = null;
let instance: AinvoxDialerInstance | null = null;

function loadSdk(): Promise<void> {
  if (sdkLoad) return sdkLoad;
  sdkLoad = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load the Ainvox dialer')));
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => {
      sdkLoad = null; // allow a later retry
      reject(new Error('Failed to load the Ainvox dialer'));
    });
    document.head.appendChild(script);
  });
  return sdkLoad;
}

function resolveCtor(): (new () => AinvoxDialerInstance) | null {
  if (typeof AinvoxDialer !== 'undefined') return AinvoxDialer;
  const w = window as unknown as { AinvoxDialer?: new () => AinvoxDialerInstance };
  return w.AinvoxDialer ?? null;
}

async function getDialer(): Promise<AinvoxDialerInstance> {
  await loadSdk();
  const Ctor = resolveCtor();
  if (!Ctor) throw new Error('Ainvox dialer is unavailable');
  if (!instance) instance = new Ctor();
  return instance;
}

// Normalise a raw, possibly-messy phone string to E.164. Legacy LMS data
// stores numbers with spaces, dashes, leading zeros, or no country code.
// Defaults to India (+91) when no country code is present. Returns null when
// the input can't be turned into a plausibly-dialable number.
export function toDialableNumber(raw: string, defaultCountryCode = '91'): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return null;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

// Place an outbound call. Loads the SDK on first use, opens the widget, and
// dials immediately. Throws if the number can't be normalised or the SDK
// fails to load — callers surface this via a toast.
export async function placeCall(rawNumber: string | null | undefined): Promise<void> {
  const number = toDialableNumber(rawNumber ?? '');
  if (!number) throw new Error('No valid phone number to call');
  const dialer = await getDialer();
  await dialer.open();
  await dialer.call(number, true);
}
