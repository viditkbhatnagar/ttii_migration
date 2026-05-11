/**
 * Payment launcher component used by the student Payments page.
 *
 * IMPORTANT (PCI-DSS): We don't capture card / CVV / UPI ID on our side.
 * Razorpay Checkout opens its own iframe and handles all method entry
 * (Cards, UPI ID, UPI Intent, UPI QR, Netbanking, Wallets, EMI). Our
 * dialog is a payment summary + CTA, not a card form.
 *
 * Earlier iterations had a fake card-data form with disabled inputs
 * (Naji UAT 2026-05-11 round 1). That confused students — they tried to
 * type into the disabled fields. This version drops the form entirely:
 * card visual on the left (decorative, shows amount + course), payment
 * method icons on the right, single Pay CTA, single helper line.
 */
import { type ReactElement } from 'react';
import styles from './CreditCardForm.module.css';

export type CardConfirmState = {
  holder: string;
  month: string;
  year: string;
};

export type CardConfirmValidity = {
  holder: boolean;
  month: boolean;
  year: boolean;
  allValid: boolean;
};

interface CreditCardFormProps {
  /** Override card gradient accent rings. */
  ring1?: string;
  ring2?: string;
  /** Submit button label (defaults to "Pay Now"). */
  submitLabel?: string;
  /** Whether the submit button is busy (caller manages async). */
  submitting?: boolean;
  /** Display amount shown on the card (e.g. "₹25,000"). */
  amountDisplay?: string;
  /** Display merchant / course name shown on the card. */
  merchantLabel?: string;
  /** Course / item description shown below the amount. */
  itemDescription?: string;
  onSubmit?: (state: CardConfirmState) => void;
  className?: string;
}

export function CreditCardForm({
  ring1 = '#ff6be7',
  ring2 = '#7288ff',
  submitLabel = 'Pay Now',
  submitting = false,
  amountDisplay,
  merchantLabel = "Teachers' Training Institute of India",
  itemDescription,
  onSubmit,
  className = '',
}: CreditCardFormProps): ReactElement {
  const cardStyle = {
    ['--ccp-ring1' as string]: ring1,
    ['--ccp-ring2' as string]: ring2,
  } as React.CSSProperties;

  const handlePay = (): void => {
    // We don't collect anything here — Razorpay does. Pass empty state so
    // existing onSubmit signatures keep working.
    onSubmit?.({ holder: '', month: '', year: '' });
  };

  return (
    <section className={`${styles.ccp} ${className}`}>
      <div className={styles.wrap}>
        {/* CARD VISUAL — decorative payment summary. Shows amount + course. */}
        <section className={styles.card}>
          <section className={styles.cardFront} style={cardStyle}>
            <div className={styles.cardHeader}>
              <div className={styles.cardAmount}>{amountDisplay ?? merchantLabel}</div>
              <svg xmlns="http://www.w3.org/2000/svg" height="40" width="60" viewBox="-96 -98.908 832 593.448" aria-hidden="true">
                <path fill="#ff5f00" d="M224.833 42.298h190.416v311.005H224.833z" />
                <path
                  d="M244.446 197.828a197.448 197.448 0 0175.54-155.475 197.777 197.777 0 100 311.004 197.448 197.448 0 01-75.54-155.53z"
                  fill="#eb001b"
                />
                <path
                  d="M640 197.828a197.777 197.777 0 01-320.015 155.474 197.777 197.777 0 000-311.004A197.777 197.777 0 01640 197.773z"
                  fill="#f79e1b"
                />
              </svg>
            </div>

            <div className={styles.cardCourse}>
              {itemDescription ?? 'Course payment'}
            </div>

            <div className={styles.cardFooter}>
              <div className={styles.cardHolder}>
                <div className={styles.cardSectionTitle}>Pay To</div>
                <div>TTII LMS</div>
              </div>
              <div>
                <div className={styles.cardSectionTitle}>Secure</div>
                <span className={styles.cardSecure}>Razorpay</span>
              </div>
            </div>
          </section>
        </section>

        {/* PANEL — payment method preview + single CTA. */}
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>How would you like to pay?</h3>
          <p className={styles.panelSub}>
            All payment methods supported. Pick on the next screen.
          </p>

          <ul className={styles.methods}>
            <li className={styles.method}>
              <span className={styles.methodIcon} aria-hidden="true">💳</span>
              <div>
                <div className={styles.methodTitle}>Cards</div>
                <div className={styles.methodMeta}>Visa, Mastercard, RuPay, Amex</div>
              </div>
            </li>
            <li className={styles.method}>
              <span className={styles.methodIcon} aria-hidden="true">📱</span>
              <div>
                <div className={styles.methodTitle}>UPI</div>
                <div className={styles.methodMeta}>UPI ID, GPay, PhonePe, QR code</div>
              </div>
            </li>
            <li className={styles.method}>
              <span className={styles.methodIcon} aria-hidden="true">🏦</span>
              <div>
                <div className={styles.methodTitle}>Netbanking</div>
                <div className={styles.methodMeta}>All major Indian banks</div>
              </div>
            </li>
            <li className={styles.method}>
              <span className={styles.methodIcon} aria-hidden="true">👛</span>
              <div>
                <div className={styles.methodTitle}>Wallets &amp; EMI</div>
                <div className={styles.methodMeta}>Paytm, Mobikwik, EMI options</div>
              </div>
            </li>
          </ul>

          <button
            type="button"
            className={styles.submit}
            onClick={handlePay}
            disabled={submitting}
            aria-disabled={submitting}
          >
            {submitting ? 'Opening secure checkout…' : submitLabel}
          </button>

          <p className={styles.helper}>
            <span className={styles.helperLock}>Secure</span> — Payment details are
            entered on Razorpay's PCI-compliant page. We never see or store your
            card, UPI ID, or bank info.
          </p>
        </div>
      </div>
    </section>
  );
}
