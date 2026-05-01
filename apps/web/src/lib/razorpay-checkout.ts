/**
 * Razorpay Checkout JS loader + popup wrapper.
 *
 * Razorpay's checkout is a third-party JS bundle hosted at
 * https://checkout.razorpay.com/v1/checkout.js. We lazy-load it on first use
 * so the script tag is not added to index.html (keeps initial page weight
 * down — most students never reach the payments page in a session).
 *
 * Usage:
 *   const result = await openRazorpayCheckout({ orderId, amount, currency, keyId, ... });
 *   if (result.status === 'success') { ... call backend complete_order ... }
 */

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on?: (event: string, callback: (resp: { error: { description?: string } }) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay can only load in a browser.'));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay checkout script.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load Razorpay checkout script.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface OpenCheckoutInput {
  /** From /payment/create_order — `data.order_id`. */
  orderId: string;
  /** Smallest currency unit (paise for INR). From /payment/create_order. */
  amount: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** Razorpay public key id. From /payment/create_order — `data.key`. */
  keyId: string;
  /** Merchant display name shown on the popup. */
  name: string;
  /** Item / package name shown under the merchant name. */
  description?: string;
  /** Logo URL — square, 200x200 recommended. */
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  /** TTII brand color. Falls back to a sensible default. */
  themeColor?: string;
  /** Free-form metadata echoed back via webhook. */
  notes?: Record<string, string>;
}

export type CheckoutResult =
  | { status: 'success'; orderId: string; paymentId: string; signature: string }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

/**
 * Opens the Razorpay popup and resolves when the user finishes (success,
 * cancellation via modal close, or hard payment failure). Throws only if the
 * checkout script itself can't load.
 */
export async function openRazorpayCheckout(input: OpenCheckoutInput): Promise<CheckoutResult> {
  await loadRazorpayScript();
  const Ctor = window.Razorpay;
  if (!Ctor) throw new Error('Razorpay checkout did not initialise.');

  return new Promise<CheckoutResult>((resolve) => {
    let resolved = false;
    const finish = (result: CheckoutResult) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    const options: RazorpayCheckoutOptions = {
      key: input.keyId,
      order_id: input.orderId,
      amount: input.amount,
      currency: input.currency,
      name: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
      ...(input.prefill !== undefined ? { prefill: input.prefill } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      theme: { color: input.themeColor ?? '#8F2774' },
      handler: (response) => {
        finish({
          status: 'success',
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => finish({ status: 'cancelled' }),
      },
    };

    const rzp = new Ctor(options);
    rzp.on?.('payment.failed', (resp) => {
      finish({ status: 'failed', message: resp.error?.description ?? 'Payment failed.' });
    });
    rzp.open();
  });
}
