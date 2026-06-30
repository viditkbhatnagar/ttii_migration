// Naji 2026-05-07 — animated bar-chart loader used on every dashboard's
// initial fetch state. Replaces the old generic Skeleton blocks. The
// bars pulse with staggered delays so the chart "breathes" while data
// loads. Brand-tinted (TTII purple) by default.

interface DashboardLoaderProps {
  /** What's loading — fills the "Loading {label}..." line. */
  label?: string;
  /** Tone — primary uses the TTII purple; muted is greyscale for in-page
   * sections; theme follows the surrounding portal's --primary CSS var (e.g.
   * orange inside .counsellor-theme) so the loader matches that portal's UI. */
  tone?: 'primary' | 'muted' | 'theme';
  /** Visual size; default is full-page. */
  size?: 'page' | 'inline';
}

export function DashboardLoader({
  label = 'dashboard data',
  tone = 'primary',
  size = 'page',
}: DashboardLoaderProps) {
  const heights = [70, 90, 80, 50, 30, 25, 35, 55, 75]; // pre-set bar heights
  const colourClass =
    tone === 'primary'
      ? ['bg-[#8F2774]', 'bg-[#a13d8a]/85', 'bg-[#a13d8a]/70', 'bg-[#a13d8a]/55', 'bg-[#a13d8a]/40']
      : tone === 'theme'
        ? [
            'bg-[var(--primary)]',
            'bg-[var(--primary)]/85',
            'bg-[var(--primary)]/70',
            'bg-[var(--primary)]/55',
            'bg-[var(--primary)]/40',
          ]
        : ['bg-slate-400', 'bg-slate-400/85', 'bg-slate-400/70', 'bg-slate-400/55', 'bg-slate-400/40'];
  const textClass = tone === 'muted' ? 'text-slate-500' : 'text-slate-600';
  const wrapperClass =
    size === 'page'
      ? 'flex min-h-[60vh] flex-col items-center justify-center gap-5'
      : 'flex flex-col items-center justify-center gap-4 py-12';

  return (
    <div role="status" aria-live="polite" className={wrapperClass}>
      <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
        {heights.map((h, i) => (
          <span
            key={i}
            className={`block w-3 rounded-t-md ${colourClass[i % colourClass.length]} animate-[dashboardBarPulse_1200ms_ease-in-out_infinite]`}
            style={{
              height: `${h}%`,
              animationDelay: `${i * 90}ms`,
            }}
          />
        ))}
      </div>
      <p className={`text-sm font-medium ${textClass}`}>
        Loading {label}<span className="ml-0.5 inline-block animate-pulse">...</span>
      </p>

      <style>{`
        @keyframes dashboardBarPulse {
          0%, 100% { transform: scaleY(0.5); opacity: 0.7; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
