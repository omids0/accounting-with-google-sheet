import { useEffect, useRef, useState } from 'react'

import { prefersReducedMotion } from './useChartTheme'
import { isNativePlatform } from '../services/googleAuthNative'

/**
 * Count-ups re-render their component every frame. Past this many at once
 * (a list or grid of cards updating together) the rest just jump to the value.
 */
const MAX_CONCURRENT_ANIMATIONS = 6

let activeAnimations = 0

function shouldSkipAnimation(enabled: boolean): boolean {
  return (
    !enabled ||
    isNativePlatform() ||
    prefersReducedMotion() ||
    (typeof document !== 'undefined' && document.visibilityState === 'hidden') ||
    activeAnimations >= MAX_CONCURRENT_ANIMATIONS
  )
}

export function useAnimatedNumber(value: number, duration = 650, enabled = true): number {
  const [display, setDisplay] = useState(value)

  const fromRef = useRef(value)

  useEffect(() => {
    const from = fromRef.current

    const delta = value - from

    if (delta === 0) return

    // Counting up re-renders every money value for ~650ms, which the WebView feels.
    if (shouldSkipAnimation(enabled)) {
      fromRef.current = value
      setDisplay(value)

      return
    }

    // Whole amounts stay whole, so frames that round to the same number bail out of rendering.
    const wholeNumbers = Number.isInteger(from) && Number.isInteger(value)

    const start = performance.now()

    let frame = 0

    let finished = false

    activeAnimations += 1

    const finish = () => {
      if (finished) return
      finished = true
      activeAnimations -= 1
    }

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)

      const eased = 1 - Math.pow(1 - progress, 3)

      const raw = from + delta * eased

      const next = progress >= 1 ? value : wholeNumbers ? Math.round(raw) : raw

      // Track what is on screen so an interrupted count continues from there.
      fromRef.current = next
      setDisplay(next)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        finish()
      }
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      finish()
    }
  }, [value, duration, enabled])

  return display
}
