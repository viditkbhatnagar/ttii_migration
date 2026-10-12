// Tone classes for the admin design kit (see ui-kit.tsx). `primary` is the
// theme's brand colour (app.css --primary); the rest are semantic and fixed.

export type Tone = 'primary' | 'emerald' | 'rose' | 'amber' | 'blue' | 'slate';

export const TONE: Record<Tone, { tile: string; text: string; pill: string }> = {
  primary: { tile: 'bg-primary/10 text-primary', text: 'text-primary', pill: 'border-primary/20 bg-primary/5 text-primary' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700', pill: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  rose: { tile: 'bg-rose-50 text-rose-600', text: 'text-rose-700', pill: 'border-rose-200 bg-rose-50 text-rose-700' },
  amber: { tile: 'bg-amber-50 text-amber-600', text: 'text-amber-700', pill: 'border-amber-200 bg-amber-50 text-amber-700' },
  blue: { tile: 'bg-sky-50 text-sky-600', text: 'text-sky-700', pill: 'border-sky-200 bg-sky-50 text-sky-700' },
  slate: { tile: 'bg-slate-100 text-slate-600', text: 'text-slate-700', pill: 'border-slate-200 bg-slate-50 text-slate-600' },
};
