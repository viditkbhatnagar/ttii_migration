/**
 * CreditCardForm — Razorpay launcher with the 21st.dev flip-card visual.
 *
 * IMPORTANT (PCI-DSS): We intentionally do NOT capture card number or CVV
 * on our side. Those are entered by the student inside Razorpay Checkout's
 * hosted iframe, which is the PCI-compliant path. This component captures
 * only:
 *   - Card holder name (non-sensitive — also used as prefill for Razorpay)
 *   - Expiry month/year (non-sensitive cosmetic — Razorpay re-asks anyway)
 *
 * The card-number and CVV inputs are disabled with helper text directing
 * the student to the secure entry step.
 *
 * Design credit: rahil1202 on 21st.dev. Adapted to Vite (styled-jsx →
 * CSS module) and brand palette for Naji UAT 2026-05-11.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
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

type FocusField = null | 'holder' | 'expire';

interface CreditCardFormProps {
  defaultHolder?: string;
  defaultMonth?: string;
  defaultYear?: string;
  /** Override card gradient accent rings. */
  ring1?: string;
  ring2?: string;
  /** Submit button label (defaults to "Pay Now"). */
  submitLabel?: string;
  /** Whether the submit button is busy (caller manages async). */
  submitting?: boolean;
  /** Show the submit button (default true). */
  showSubmit?: boolean;
  /** Display amount shown on the card (e.g. "₹25,000"). */
  amountDisplay?: string;
  /** Display merchant / course name shown on the card. */
  merchantLabel?: string;
  onChange?: (state: CardConfirmState, validity: CardConfirmValidity) => void;
  onSubmit?: (state: CardConfirmState) => void;
  className?: string;
}

export function CreditCardForm({
  defaultHolder = 'John Doe',
  defaultMonth = '',
  defaultYear = '',
  ring1 = '#ff6be7',
  ring2 = '#7288ff',
  submitLabel = 'Pay Now',
  submitting = false,
  showSubmit = true,
  amountDisplay,
  merchantLabel = "Teachers' Training Institute of India",
  onChange,
  onSubmit,
  className = '',
}: CreditCardFormProps): ReactElement {
  const [holder, setHolder] = useState(defaultHolder.toUpperCase());
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [focusField, setFocusField] = useState<FocusField>(null);

  const years = useMemo(() => {
    const start = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => String(start + i));
  }, []);

  const validity = useMemo<CardConfirmValidity>(() => {
    const holderValid = holder.trim().length >= 2;
    const monthValid = !!month && Number(month) >= 1 && Number(month) <= 12;
    const yearValid = !!year && Number(year) >= new Date().getFullYear();
    return {
      holder: holderValid,
      month: monthValid,
      year: yearValid,
      allValid: holderValid && monthValid && yearValid,
    };
  }, [holder, month, year]);

  useEffect(() => {
    onChange?.({ holder, month, year }, validity);
  }, [holder, month, year, validity, onChange]);

  // 16-slot card number display — fixed mask. Real card entry happens
  // inside Razorpay's iframe, so we just show a decorative placeholder.
  const displayedSlots = useMemo(() => {
    const arr: { textTop: string; filed: boolean }[] = [];
    for (let i = 0; i < 16; i++) {
      arr.push({ textTop: '*', filed: true });
    }
    return arr;
  }, []);

  const highlightClass = (() => {
    switch (focusField) {
      case 'holder':
        return styles.highlightHolder;
      case 'expire':
        return styles.highlightExpire;
      default:
        return styles.highlightHidden;
    }
  })();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!validity.allValid) return;
    onSubmit?.({ holder, month, year });
  };

  const cardStyle = {
    ['--ccp-ring1' as string]: ring1,
    ['--ccp-ring2' as string]: ring2,
  } as React.CSSProperties;

  return (
    <section className={`${styles.ccp} ${className}`}>
      <div className={styles.wrap}>
        {/* CARD */}
        <section className={styles.card}>
          <div className={`${styles.highlight} ${highlightClass}`} />

          {/* FRONT */}
          <section className={styles.cardFront} style={cardStyle}>
            <div className={styles.cardHeader}>
              <div>{amountDisplay ?? merchantLabel}</div>
              <svg xmlns="http://www.w3.org/2000/svg" height="40" width="60" viewBox="-96 -98.908 832 593.448">
                <path fill="#ff5f00" d="M224.833 42.298h190.416v311.005H224.833z" />
                <path
                  d="M244.446 197.828a197.448 197.448 0 0175.54-155.475 197.777 197.777 0 100 311.004 197.448 197.448 0 01-75.54-155.53z"
                  fill="#eb001b"
                />
                <path
                  d="M621.101 320.394v-6.372h2.747v-1.319h-6.537v1.319h2.582v6.373zm12.691 0v-7.69h-1.978l-2.307 5.493-2.308-5.494h-1.977v7.691h1.428v-5.823l2.143 5h1.483l2.143-5v5.823z"
                  fill="#f79e1b"
                />
                <path
                  d="M640 197.828a197.777 197.777 0 01-320.015 155.474 197.777 197.777 0 000-311.004A197.777 197.777 0 01640 197.773z"
                  fill="#f79e1b"
                />
              </svg>
            </div>

            <div className={styles.cardNumber} aria-label="Card number placeholder">
              {displayedSlots.map((slot, idx) => (
                <span key={idx} className={styles.slot}>
                  <span className={`${styles.digit} ${slot.filed ? styles.digitFiled : ''}`}>
                    <span className={`${styles.row}`}>#</span>
                    <span className={`${styles.row}`}>{slot.textTop}</span>
                  </span>
                </span>
              ))}
            </div>

            <div className={styles.cardFooter}>
              <div className={styles.cardHolder}>
                <div className={styles.cardSectionTitle}>Card Holder</div>
                <div>{holder || 'NAME ON CARD'}</div>
              </div>
              <div>
                <div className={styles.cardSectionTitle}>Expires</div>
                <span>{month || 'MM'}</span>/<span>{year ? year.slice(-2) : 'YY'}</span>
              </div>
            </div>
          </section>

          {/* BACK — kept for the flip animation but not currently used since
              CVV is captured inside Razorpay. */}
          <section className={styles.cardBack} style={cardStyle}>
            <div className={styles.cardHideLine} />
            <div className={styles.cardCvv}>
              <span>CVV</span>
              <div className={styles.cardCvvField}>***</div>
            </div>
          </section>
        </section>

        {/* FORM */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="ccp-holder">Card Holder</label>
            <input
              id="ccp-holder"
              type="text"
              autoComplete="cc-name"
              placeholder="JOHN DOE"
              value={holder}
              onChange={(e) => setHolder(e.target.value.toUpperCase())}
              onFocus={() => setFocusField('holder')}
              onBlur={() => setFocusField(null)}
              aria-invalid={!validity.holder}
            />
          </div>

          <div className={styles.filedGroup}>
            <div>
              <label>Expiration Date</label>
              <div className={styles.filedDate}>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  onFocus={() => setFocusField('expire')}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.month}
                  aria-label="Expiration month"
                >
                  <option value="" disabled>Month</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  onFocus={() => setFocusField('expire')}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.year}
                  aria-label="Expiration year"
                >
                  <option value="" disabled>Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ccp-cvv-disabled">CVV</label>
              <input
                id="ccp-cvv-disabled"
                type="text"
                value=""
                placeholder="•••"
                disabled
                aria-label="CVV captured on secure Razorpay step"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ccp-number-disabled">Card Number</label>
            <input
              id="ccp-number-disabled"
              type="text"
              value=""
              placeholder="•••• •••• •••• ••••"
              disabled
              aria-label="Card number captured on secure Razorpay step"
            />
            <p className={styles.helper}>
              <span className={styles.helperLock}>Secure</span> — Card number and CVV are entered on the next step inside Razorpay's PCI-compliant checkout window. We never see or store your card details.
            </p>
          </div>

          {showSubmit ? (
            <button
              className={styles.submit}
              type="submit"
              disabled={!validity.allValid || submitting}
              aria-disabled={!validity.allValid || submitting}
            >
              {submitting
                ? 'Opening secure checkout…'
                : validity.allValid
                  ? submitLabel
                  : 'Fill name and expiry to continue'}
            </button>
          ) : null}
        </form>
      </div>
    </section>
  );
}
