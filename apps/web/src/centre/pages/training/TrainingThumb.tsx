import { cn } from '@/lib/utils';
import type { TrainingVideo } from './training-model.js';

const GRADIENTS = [
  'from-indigo-500 via-purple-500 to-pink-500',
  'from-sky-500 via-cyan-500 to-emerald-500',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-fuchsia-500 via-pink-500 to-rose-500',
  'from-blue-600 via-indigo-600 to-violet-700',
] as const;

/** A stable gradient per video id, shown behind (or instead of) the thumbnail. */
function gradientFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length] ?? GRADIENTS[0];
}

export function Thumb({ v, className, children }: { v: TrainingVideo; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-gradient-to-br', gradientFor(v.id), className)}>
      {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
      {children}
    </div>
  );
}

