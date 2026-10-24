import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  busyOverlayBarClass,
  busyOverlayCardClass,
  busyOverlayHintClass,
  busyOverlayMessageClass,
  busyOverlayRootClass,
  busyOverlayScrimShownClass
} from './busyStyles'
import Spinner from './Spinner'
import { useRegisterOverlay } from '../../hooks/useRegisterOverlay'
import { useBusyOverlayStore } from '../../stores/busyOverlayStore'
import { cn } from '../../utils/cn'
import ProgressBar from '../ProgressBar'

/** A switch quicker than this never shows the card, so a fast tap does not flash a screen. */
export const BUSY_SHOW_DELAY_MS = 150

export const BUSY_HINT = 'ممکن است چند ثانیه طول بکشد.'

interface BusyOverlayViewProps {
  message: string
  progress?: number | null
  /** The card and scrim are visible; before that the overlay only blocks taps. */
  shown?: boolean
}

/**
 * Full-screen wait: a centered card with a large spinner and what is happening. It is a polite
 * live region, takes focus (Tab stays on it) and swallows every tap behind it.
 */
export function BusyOverlayView({ message, progress = null, shown = true }: BusyOverlayViewProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null

    // Tab must not walk to the page behind the overlay.
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      event.preventDefault()
      rootRef.current?.focus({ preventScroll: true })
    }

    rootRef.current?.focus({ preventScroll: true })
    document.addEventListener('keydown', keepFocus, true)

    return () => {
      document.removeEventListener('keydown', keepFocus, true)
      if (before?.isConnected) before.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={cn(busyOverlayRootClass, shown && busyOverlayScrimShownClass)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      tabIndex={-1}
    >
      <div className={cn(busyOverlayCardClass, shown ? 'opacity-100' : 'opacity-0')}>
        <Spinner size="lg" decorative className="text-primary" />
        <p className={busyOverlayMessageClass}>{message}</p>
        {progress !== null && (
          <ProgressBar
            value={progress}
            showLabel={false}
            aria-label={message}
            className={busyOverlayBarClass}
          />
        )}
        <p className={busyOverlayHintClass}>{BUSY_HINT}</p>
      </div>
    </div>
  )
}

/**
 * The one busy overlay of the app, driven by `busyOverlayStore` (`showBusy`/`hideBusy`). Mounted
 * once in the layout; it goes to `document.body` so it sits above the drawer and every sheet.
 */
export default function BusyOverlay() {
  const message = useBusyOverlayStore(state => state.message)
  const progress = useBusyOverlayStore(state => state.progress)
  const [shown, setShown] = useState(false)
  const busy = message !== null

  // Back and Escape do nothing while it is up: the switch cannot be taken back half way.
  useRegisterOverlay(busy, () => undefined, true)

  useEffect(() => {
    if (!busy) return

    const timer = window.setTimeout(() => setShown(true), BUSY_SHOW_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      setShown(false)
    }
  }, [busy])

  if (message === null) return null

  return createPortal(
    <BusyOverlayView message={message} progress={progress} shown={shown} />,
    document.body
  )
}
