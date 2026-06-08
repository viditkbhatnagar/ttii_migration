import { useEffect, useRef, useState } from 'react';
import { GraduationCap } from 'lucide-react';

import styles from './StudentLoader.module.css';

/**
 * Interactive branded loader for the student portal.
 *
 * Loads can take a moment, so this gives students something alive to watch:
 * an "EduPulse" pulse-ring badge that gently leans toward the cursor (parallax),
 * a rotating line of encouragement, and an indeterminate progress shimmer.
 * All motion is compositor-friendly (transform/opacity) and disabled under
 * prefers-reduced-motion.
 */

const TIPS: readonly string[] = [
  '💡 Small steps every day lead to big results.',
  'Great teachers never stop learning.',
  '🌱 Every lesson plants a seed.',
  'Consistency beats intensity — keep showing up.',
  "✨ You're one class closer to your goal.",
];

interface StudentLoaderProps {
  label?: string;
}

export function StudentLoader({ label = 'Getting things ready…' }: StudentLoaderProps) {
  const [tip, setTip] = useState(0);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Rotate the encouragement line on a gentle cadence.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setTip((current) => (current + 1) % TIPS.length), 2800);
    return () => window.clearInterval(id);
  }, []);

  // Interactive parallax — the badge leans toward the pointer.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (event: MouseEvent): void => {
      const el = badgeRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / 260));
      const dy = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / 260));
      el.style.setProperty('--ttx', `${dx * 10}px`);
      el.style.setProperty('--tty', `${dy * 10}px`);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div ref={badgeRef} className={styles.badge}>
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.glyph} aria-hidden="true">
          <GraduationCap className={styles.icon} />
        </span>
      </div>

      <p className={styles.label}>{label}</p>
      <p key={tip} className={styles.tip}>
        {TIPS[tip] ?? ''}
      </p>

      <div className={styles.bar} aria-hidden="true">
        <span className={styles.barFill} />
      </div>

      <span className="sr-only">Loading, please wait…</span>
    </div>
  );
}
