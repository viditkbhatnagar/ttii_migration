import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type UiTheme = 'light' | 'dark';

export interface ShellCardProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
  theme?: UiTheme;
}

export function ShellCard({ title, subtitle, children, theme = 'light' }: ShellCardProps) {
  return (
    <section
      className={clsx(
        'rounded-2xl border p-4 shadow-sm',
        theme === 'dark'
          ? 'bg-gray-800 border-gray-600 text-gray-100'
          : 'bg-white/90 border-gray-300',
      )}
      aria-label={title}
    >
      <header>
        <h2 className="font-semibold mb-1">{title}</h2>
        <p className={clsx('leading-snug', theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
          {subtitle}
        </p>
      </header>
      {children ? (
        <div className="mt-3 [&_ul]:m-0 [&_ul]:pl-4 [&_ul]:grid [&_ul]:gap-1.5">{children}</div>
      ) : null}
    </section>
  );
}
