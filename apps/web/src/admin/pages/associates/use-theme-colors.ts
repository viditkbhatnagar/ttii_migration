import { useLayoutEffect, useState, type RefObject } from 'react';

// ECharts draws on a canvas, which cannot read `var(--primary)`. This resolves
// the admin theme's colour tokens (as computed under the chart's own element,
// so `.admin-theme` and dark mode apply) into plain rgb() strings the canvas
// understands. Tokens may be hex or oklch(); a 1x1 canvas normalises both.

export type ThemeColorName = 'primary' | 'muted-foreground' | 'border' | 'card' | 'foreground';
export type ThemeColors = Partial<Record<ThemeColorName, string>>;

const NAMES: ThemeColorName[] = ['primary', 'muted-foreground', 'border', 'card', 'foreground'];

function toRgb(css: string, ctx: CanvasRenderingContext2D | null): string {
  if (!css || !ctx) return '';
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (a === undefined || a === 0) return '';
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

export function useThemeColors(ref: RefObject<HTMLElement | null>): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>({});
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof document === 'undefined') return;
    const style = getComputedStyle(el);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = canvas.getContext('2d', { willReadFrequently: true }); } catch { ctx = null; }
    const out: ThemeColors = {};
    for (const name of NAMES) {
      const rgb = toRgb(style.getPropertyValue(`--${name}`).trim(), ctx);
      if (rgb) out[name] = rgb;
    }
    setColors(out);
  }, [ref]);
  return colors;
}
