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

/** Tailwind `lg` breakpoint — primary desktop layout switch. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_MEDIA_QUERY)
}
