// Shared Apache ECharts wrapper.
//
// Why a custom wrapper instead of `echarts-for-react`:
//   - Avoids the React 18 peerDep warning the wrapper still emits on React 19.
//   - One init/teardown/resize hook, no surprise re-renders on option churn.
//
// Usage:
//   import { EChart } from '@/components/EChart';
//   <EChart option={myOption} className="h-56 w-full" />
//
// Pass a memoised `option` if you compute it inline — the wrapper deep-applies
// it on every change via setOption(option, true), which replaces (not merges).
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, EChartsType } from 'echarts';

export interface EChartProps {
  /** ECharts option object. Re-applied via setOption(opt, true) whenever it changes by reference. */
  option: EChartsOption;
  /** Tailwind / inline styles for the container. ECharts needs a sized parent — give it height + width. */
  className?: string;
  /** Style override if you'd rather not use className for sizing. */
  style?: React.CSSProperties;
  /** ECharts theme name. We don't ship custom themes today; leave undefined for default. */
  theme?: string | object;
  /** Pass through ECharts init opts (renderer, devicePixelRatio, locale, etc.). */
  initOpts?: Parameters<typeof echarts.init>[2];
  /** Imperative escape hatch — receives the chart instance once initialised. */
  onInit?: (instance: EChartsType) => void;
  /** Cursor for the chart container — defaults to default. Useful for clickable charts. */
  ariaLabel?: string;
}

export function EChart({
  option,
  className,
  style,
  theme,
  initOpts,
  onInit,
  ariaLabel,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);

  // Initialise once when the container mounts. Tear down on unmount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const instance = echarts.init(el, theme, initOpts);
    chartRef.current = instance;
    onInit?.(instance);

    const handleResize = () => instance.resize();
    window.addEventListener('resize', handleResize);

    // Observe container size too — many TTII chart containers live in flex/grid
    // layouts that change size without a window resize event.
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => instance.resize());
      resizeObserver.observe(el);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      instance.dispose();
      chartRef.current = null;
    };
    // theme + initOpts shouldn't change at runtime; if they do, a remount is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply option whenever the reference changes. Use `notMerge=true` so callers
  // get predictable replace-semantics instead of accidental merges.
  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
