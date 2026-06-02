// Browser dialer — talk in the dashboard. Loads the Ainvox widget SDK and
// initialises it the SUPPORTED way (per Ainvox's official docs): a bare
// `new AinvoxDialer()` with no arguments. The widget manages its OWN session —
// the admin signs in once and it persists (it refreshes its own tokens), so
// there is no per-call or per-visit login after the first time. Injecting
// tokens via an iframe URL (our earlier approach) is unsupported and breaks
// the widget's socket auth, which is what caused the logout loop.
//
// On a Call click we open the dialer and dial; the call goes out under the
// account's virtual number and is recorded by the Ainvox account.

const SDK_URL = 'https://app.ainvox.com/web-client/ainvox-dialer.js';

interface AinvoxDialerInstance {
  call(number: string, makeCall: boolean): Promise<void> | void;
  open(): Promise<void> | void;
  close(): Promise<void> | void;
}

// The SDK exposes a global `AinvoxDialer` constructor that takes no arguments.
// It may be a lexical global rather than a window property, so probe with
// `typeof` (the only reference form that won't throw when it's undeclared).
declare const AinvoxDialer: new () => AinvoxDialerInstance;

let sdkLoad: Promise<void> | null = null;
let instance: AinvoxDialerInstance | null = null;

function loadSdk(): Promise<void> {
  if (sdkLoad) return sdkLoad;
  sdkLoad = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }
    const script = existing ?? document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => {
      sdkLoad = null;
      reject(new Error('Failed to load the dialer.'));
    });
    if (!existing) document.head.appendChild(script);
  });
  return sdkLoad;
}

function resolveCtor(): (new () => AinvoxDialerInstance) | null {
  if (typeof AinvoxDialer !== 'undefined') return AinvoxDialer;
  const w = window as unknown as { AinvoxDialer?: new () => AinvoxDialerInstance };
  return w.AinvoxDialer ?? null;
}

// Mount the widget once, then reuse it. The first mount prompts the admin to
// sign in; subsequent calls reuse the same authenticated instance.
function getDialer(): AinvoxDialerInstance {
  const Ctor = resolveCtor();
  if (!Ctor) throw new Error('Dialer is unavailable.');
  if (!instance) instance = new Ctor();
  return instance;
}

/**
 * Open the dialer and dial a number (E.164), placing the call immediately.
 * Recording is handled by the Ainvox account, not by this call.
 */
export async function placeBrowserCall(e164Number: string): Promise<void> {
  await loadSdk();
  const dialer = getDialer();
  await dialer.open();
  await dialer.call(e164Number, true);
}
