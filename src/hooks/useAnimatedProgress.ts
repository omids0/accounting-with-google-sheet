import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useChartTheme';

export function useAnimatedProgress(value: number, duration = 750): number {
  const clamped = Math.max(0, Math.min(100, value));
  const reducedMotion = prefersReducedMotion();
  const [display, setDisplay] = useState(() => (reducedMotion ? clamped : 0));
  const fromRef = useRef(reducedMotion ? clamped : 0);

  useEffect(() => {
    if (reducedMotion) {
      fromRef.current = clamped;
      setDisplay(clamped);
      return;
    }

    const from = fromRef.current;
    const delta = clamped - from;
    if (delta === 0) return;

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + delta * eased;
      setDisplay(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = clamped;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clamped, duration, reducedMotion]);

  return display;
}
