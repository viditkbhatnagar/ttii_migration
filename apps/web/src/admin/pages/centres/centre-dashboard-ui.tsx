import { cn } from '@/lib/utils';

// Card chrome of the Centre Dashboard (the prototype's Card / Title).

export function DashCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function DashTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
      {aside}
    </div>
  );
}
