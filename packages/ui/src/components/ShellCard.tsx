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
    <section className={`shell-card shell-card--${theme}`} aria-label={title}>
      <header>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </header>
      {children ? <div className="shell-card__content">{children}</div> : null}
    </section>
  );
}
