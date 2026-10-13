import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

import { getOverlayCount } from '../../hooks/overlayStack'

/**
 * Moves focus to `main` after every route change, so keyboard and screen-reader
 * users start at the new page instead of the link they left (round 5, F2). A page
 * that already focused one of its own fields keeps it; an open overlay keeps focus.
 */
export function useMainFocus() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const firstRenderRef = useRef(true)

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false

      return
    }

    const main = mainRef.current
    const active = document.activeElement

    if (!main || getOverlayCount() > 0) return
    if (active && active !== main && main.contains(active)) return
    main.focus({ preventScroll: true })
  }, [pathname])

  const focusMain = () => mainRef.current?.focus()

  return { mainRef, focusMain }
}
