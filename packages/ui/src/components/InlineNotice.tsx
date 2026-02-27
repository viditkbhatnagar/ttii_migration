import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export interface InlineNoticeProps {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
}

const toneStyles: Record<NoticeTone, string> = {
  info: 'bg-blue-50 border-blue-300',
  success: 'bg-green-50 border-green-300',
  warning: 'bg-amber-50 border-amber-300',
  danger: 'bg-red-50 border-red-300',
};

export function InlineNotice({ tone = 'info', title, children }: InlineNoticeProps) {
  return (
    <section
      className={clsx('rounded-xl border p-3.5 grid gap-2', toneStyles[tone])}
      role="status"
    >
      {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
      <div className="text-gray-800 leading-relaxed">{children}</div>
    </section>
  );
}
