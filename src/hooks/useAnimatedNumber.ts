import { useEffect, useRef, useState } from 'react'

import { prefersReducedMotion } from './useChartTheme'

export function useAnimatedNumber(value: number, duration = 650, enabled = true): number {
  const [display, setDisplay] = useState(value)

  const fromRef = useRef(value)

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      fromRef.current = value
      setDisplay(value)

      return
    }

    const from = fromRef.current

    const delta = value - from

    if (delta === 0) return

    const start = performance.now()

    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)

      const eased = 1 - Math.pow(1 - progress, 3)

      const next = from + delta * eased

      setDisplay(next)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }

    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [value, duration, enabled])

  return display
}
