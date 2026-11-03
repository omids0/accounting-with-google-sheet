import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

import { getOverlayCount } from '../../hooks/overlayStack'

/**
 * Moves focus to `main` after every route change, so keyboard and screen-reader
 * users start at the new page instead of the link they left (round 5, F2). A page
 * that already focused one of its own fields keeps it; an open overlay keeps focus.
 *
 * It also scrolls the new page to the top (the window on phones, `main` where it is the
 * scroller), except for back/forward (the browser's place is kept), a `?highlight=` deep
 * link and a `#hash` (the page scrolls to its target itself, and its effect runs first).
 */
export function useMainFocus() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname, search, hash } = useLocation()
  const navigationType = useNavigationType()
  const firstRenderRef = useRef(true)

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false

      return
    }

    const main = mainRef.current
    const deepLink = hash !== '' || new URLSearchParams(search).has('highlight')

    if (navigationType !== 'POP' && !deepLink) {
      window.scrollTo(0, 0)
      main?.scrollTo?.(0, 0)
    }

    const active = document.activeElement

    if (!main || getOverlayCount() > 0) return
    if (active && active !== main && main.contains(active)) return
    main.focus({ preventScroll: true })
    // Only a new path counts as a route change; the query and hash are read as they are then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const focusMain = () => mainRef.current?.focus()

  return { mainRef, focusMain }
}
