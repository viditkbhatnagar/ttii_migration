import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export interface InlineNoticeProps {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
}

export function InlineNotice({ tone = 'info', title, children }: InlineNoticeProps) {
  return (
    <section className={`inline-notice inline-notice--${tone}`} role="status">
      {title ? <h2 className="inline-notice__title">{title}</h2> : null}
      <div className="inline-notice__body">{children}</div>
    </section>
  );
}
