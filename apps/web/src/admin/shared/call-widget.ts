// Browser dialer — talk in the dashboard, no login. Loads the Ainvox widget
// SDK and initialises it PRE-AUTHENTICATED via a server-minted iframe URL
// (tokens in the URL), so there's no email/password screen. The admin then
// talks through the browser; the student sees our virtual number as caller ID.

const SDK_URL = 'https://app.ainvox.com/web-client/ainvox-dialer.js';

interface AinvoxDialerInstance {
  call(number: string, makeCall: boolean): Promise<void> | void;
  open(): Promise<void> | void;
  close(): Promise<void> | void;
}

// The SDK exposes a global `AinvoxDialer` constructor taking { iframeUrl, ... }.
// It may be a lexical global rather than a window property, so probe with
// `typeof` (the only reference form that won't throw when it's undeclared).
declare const AinvoxDialer: new (options: { iframeUrl: string }) => AinvoxDialerInstance;

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

function resolveCtor(): (new (options: { iframeUrl: string }) => AinvoxDialerInstance) | null {
  if (typeof AinvoxDialer !== 'undefined') return AinvoxDialer;
  const w = window as unknown as { AinvoxDialer?: new (options: { iframeUrl: string }) => AinvoxDialerInstance };
  return w.AinvoxDialer ?? null;
}

/**
 * Open the pre-authenticated dialer and place a call. The iframe URL (with
 * tokens) is only fetched on the first call — once the widget is mounted it
 * stays authenticated and refreshes its own tokens.
 */
export async function placeBrowserCall(getIframeUrl: () => Promise<string>, e164Number: string): Promise<void> {
  await loadSdk();
  const Ctor = resolveCtor();
  if (!Ctor) throw new Error('Dialer is unavailable.');
  if (!instance) {
    const iframeUrl = await getIframeUrl();
    instance = new Ctor({ iframeUrl });
  }
  await instance.open();
  await instance.call(e164Number, true);
}
