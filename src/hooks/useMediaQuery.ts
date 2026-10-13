import { useEffect, useState } from 'react'

/**
 * Subscribes to a CSS media query and updates on viewport resize.
 * Returns `false` during SSR / before first paint.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false

    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)

    setMatches(media.matches)
    media.addEventListener('change', onChange)

    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind `md`: tablet and up — icon rail, no bottom nav, two-column grids. */
export const TABLET_MEDIA_QUERY = '(min-width: 768px)'

/** Tailwind `xl`: desktop — sidebar, header actions, table views, side panels. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 1280px)'

export function useIsTablet(): boolean {
  return useMediaQuery(TABLET_MEDIA_QUERY)
}

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_MEDIA_QUERY)
}
