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
  // Layout config the SDK stores on the instance (defaults: 20 / 50 / 300 / 350).
  right?: number;
  bottom?: number;
  expandedWidth?: number;
  expandedHeight?: number;
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

const CLOSE_BTN_ID = 'ttii-dialer-close-btn';
const AINVOX_ORIGIN = 'https://app.ainvox.com';

// The dialer iframe is fixed bottom-right and only changes SIZE between states
// (collapsed ~35px ↔ expanded ~300×350, anchored at right/bottom). Read the
// instance's layout config (SDK defaults: right 20, bottom 50, height 350) to
// park our close pill just above the expanded panel, right-aligned to it.
function positionCloseButton(btn: HTMLElement, dialer: AinvoxDialerInstance): void {
  const right = dialer.right ?? 20;
  const bottom = (dialer.bottom ?? 50) + (dialer.expandedHeight ?? 350) + 8;
  Object.assign(btn.style, {
    top: 'auto',
    left: 'auto',
    right: `${right}px`,
    bottom: `${bottom}px`,
  });
}

function removeCloseButton(): void {
  document.getElementById(CLOSE_BTN_ID)?.remove();
}

// Ainvox's dialer has no obvious "close" on every stage, so we render our own
// dismiss pill that calls ainvox.close() (per Ainvox's guidance), pinned just
// above the expanded panel. Their themable/customisable widget (placement +
// colour options) is due ~mid-July 2026 — revisit then.
function showCloseButton(dialer: AinvoxDialerInstance): void {
  if (document.getElementById(CLOSE_BTN_ID)) return;
  const btn = document.createElement('button');
  btn.id = CLOSE_BTN_ID;
  btn.type = 'button';
  btn.textContent = '✕ Close dialer';
  Object.assign(btn.style, {
    position: 'fixed',
    zIndex: '2147483647',
    padding: '8px 14px',
    borderRadius: '9999px',
    border: 'none',
    background: '#0f172a',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
  });
  positionCloseButton(btn, dialer);
  btn.addEventListener('click', () => {
    void Promise.resolve(dialer.close()).catch(() => undefined);
    removeCloseButton();
  });
  document.body.appendChild(btn);
}

// Keep the close pill in lockstep with the dialer's REAL open state. The iframe
// posts {command:'open'|'close'|'ready'} to the parent on every state change —
// including when the admin reopens it via the widget's own green button — so
// listening here covers every path, not just our Call button. Attached once.
let wired = false;
function wireCloseButton(dialer: AinvoxDialerInstance): void {
  if (wired) return;
  wired = true;
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== AINVOX_ORIGIN) return;
    const data = event.data as { command?: string } | null;
    if (!data || typeof data !== 'object') return;
    if (data.command === 'open') showCloseButton(dialer);
    else if (data.command === 'close' || data.command === 'ready') removeCloseButton();
  });
}

let dialerWarmed = false;

/**
 * Open the dialer and dial a number (E.164), placing the call immediately.
 * Recording is handled by the Ainvox account, not by this call. The "Close
 * dialer" pill is kept in sync with the widget (via its postMessages) so the
 * admin can dismiss it however it was opened.
 */
export async function placeBrowserCall(e164Number: string): Promise<void> {
  await loadSdk();
  const dialer = getDialer();
  wireCloseButton(dialer);
  // The freshly-mounted iframe needs a beat to become interactive. Wait BEFORE
  // open()/call() (longer on the first, cold call) so the widget actually
  // expands and the number pre-fills instead of staying collapsed/blank.
  await new Promise((resolve) => setTimeout(resolve, dialerWarmed ? 300 : 2000));
  dialerWarmed = true;
  await dialer.open();
  await dialer.call(e164Number, true);
  showCloseButton(dialer);
}
