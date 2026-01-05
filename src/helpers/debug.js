import { useRef, useEffect } from 'react';

const renderMetrics = new Map();

export function useRenderTime(label) {
  const startTime = useRef(null);
  const renderCount = useRef(0);
  const rafRef = useRef(null);

  const enabled =
    typeof window !== 'undefined' && window.__RENDER_METRICS_ENABLED__;

  if (startTime.current === null) {
    startTime.current = performance.now();
  }
  renderCount.current++;

  useEffect(() => {
    if (!enabled) return;

    cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const metric = {
        label,
        time: performance.now() - startTime.current,
        renders: renderCount.current,
        timestamp: Date.now(),
      };

      renderMetrics.set(label, metric);

      window.dispatchEvent(
        new CustomEvent('render-metric', { detail: metric }),
      );
    });

    return () => cancelAnimationFrame(rafRef.current);
  });
}
