import { useMemo } from 'react';

// Chart colours from the admin theme tokens (--primary, --color-success, ...),
// resolved to rgb once per mount so the ECharts charts follow a theme recolour.
// Shared by the Team / Group profile charts and the Centre Dashboard.

export interface ChartColors { primary: string; success: string; muted: string; border: string; card: string; foreground: string }

/** Neutral fallbacks for when the tokens cannot be read (no DOM / no canvas). */
const FALLBACK: ChartColors = {
  primary: 'rgb(71, 85, 105)', success: 'rgb(16, 185, 129)', muted: 'rgb(100, 116, 139)',
  border: 'rgb(226, 232, 240)', card: 'rgb(255, 255, 255)', foreground: 'rgb(15, 23, 42)',
};

/**
 * Reads a CSS custom property from the admin theme and converts it to rgb()
 * through a 1px canvas: the tokens are oklch(), which ECharts cannot parse.
 */
function resolveToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const host = document.querySelector('.admin-theme') ?? document.documentElement;
  const raw = getComputedStyle(host).getPropertyValue(name).trim();
  if (!raw) return fallback;
  try {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.fillStyle = fallback;
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r ?? 0}, ${g ?? 0}, ${b ?? 0})`;
  } catch {
    return fallback;
  }
}

export function useChartColors(): ChartColors {
  return useMemo(() => ({
    primary: resolveToken('--primary', FALLBACK.primary),
    success: resolveToken('--color-success', FALLBACK.success),
    muted: resolveToken('--muted-foreground', FALLBACK.muted),
    border: resolveToken('--border', FALLBACK.border),
    card: resolveToken('--card', FALLBACK.card),
    foreground: resolveToken('--foreground', FALLBACK.foreground),
  }), []);
}
