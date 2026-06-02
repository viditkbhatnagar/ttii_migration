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

const CLOSE_BTN_ID = 'ttii-dialer-close-btn';

// Locate the Ainvox dialer panel in the DOM so we can pin our close pill to it.
// The widget is right-anchored but shifts vertically between states, so we
// track it instead of guessing a fixed corner. Returns the largest plausible
// candidate sitting on the right half of the viewport, or null for the fallback.
function findDialerPanel(): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    'iframe[src*="ainvox"], ainvox-dialer, [data-ainvox], [class*="ainvox" i]',
  );
  let best: HTMLElement | null = null;
  let bestArea = 0;
  nodes.forEach((el) => {
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    const onRight = r.right > window.innerWidth * 0.5;
    if (r.width > 120 && r.height > 120 && onRight && area > bestArea) {
      best = el;
      bestArea = area;
    }
  });
  return best;
}

// Park the pill just above the panel's top-right corner; if the panel hugs the
// top of the screen (no room above), tuck it just left of the panel instead so
// it never overlaps the widget's own controls. Falls back to the top-right.
function positionCloseButton(btn: HTMLElement): void {
  btn.style.bottom = 'auto';
  btn.style.left = 'auto';
  const panel = findDialerPanel();
  if (!panel) {
    btn.style.top = '16px';
    btn.style.right = '24px';
    return;
  }
  const r = panel.getBoundingClientRect();
  const gap = (btn.offsetHeight || 34) + 6;
  if (r.top >= gap + 8) {
    btn.style.top = `${r.top - gap}px`;
    btn.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  } else {
    btn.style.top = `${Math.max(8, r.top + 6)}px`;
    btn.style.right = `${Math.max(8, window.innerWidth - r.left + 8)}px`;
  }
}

// Ainvox's dialer has no obvious "close" on every stage, so we render our own
// dismiss pill that calls ainvox.close() (per Ainvox's guidance) and keep it
// pinned just above the dialer panel. Their themable/customisable widget
// (placement + colour options) is due ~mid-July 2026 — revisit then.
function showCloseButton(dialer: AinvoxDialerInstance): void {
  if (document.getElementById(CLOSE_BTN_ID)) return;
  const btn = document.createElement('button');
  btn.id = CLOSE_BTN_ID;
  btn.type = 'button';
  btn.textContent = '✕ Close dialer';
  Object.assign(btn.style, {
    position: 'fixed',
    top: '16px',
    right: '24px',
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
  document.body.appendChild(btn);
  positionCloseButton(btn);

  // The panel moves between states, so keep re-aligning until the pill is gone.
  const reposition = (): void => positionCloseButton(btn);
  const timer = window.setInterval(() => {
    if (!document.getElementById(CLOSE_BTN_ID)) {
      window.clearInterval(timer);
      window.removeEventListener('resize', reposition);
      return;
    }
    positionCloseButton(btn);
  }, 600);
  window.addEventListener('resize', reposition);

  btn.addEventListener('click', () => {
    void Promise.resolve(dialer.close()).catch(() => undefined);
    window.clearInterval(timer);
    window.removeEventListener('resize', reposition);
    btn.remove();
  });
}

let dialerWarmed = false;

/**
 * Open the dialer and dial a number (E.164), placing the call immediately.
 * Recording is handled by the Ainvox account, not by this call. A "Close
 * dialer" pill is shown so the admin can dismiss the widget on demand.
 */
export async function placeBrowserCall(e164Number: string): Promise<void> {
  await loadSdk();
  const dialer = getDialer();
  // The freshly-mounted iframe needs a beat to become interactive. Wait BEFORE
  // open()/call() (longer on the first, cold call) so the widget actually
  // expands and the number pre-fills instead of staying collapsed/blank.
  await new Promise((resolve) => setTimeout(resolve, dialerWarmed ? 300 : 2000));
  dialerWarmed = true;
  await dialer.open();
  await dialer.call(e164Number, true);
  showCloseButton(dialer);
}
