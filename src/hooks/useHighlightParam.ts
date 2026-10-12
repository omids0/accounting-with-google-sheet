import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

import { HIGHLIGHT_PARAM } from '../routes/paths'

/** How long to wait for the item to render (lazy page, mirror load). */
const FIND_TIMEOUT_MS = 6000

const FLASH_MS = 2600

/** Second look once late sections (goals, prices) have rendered above the item. */
const RECENTER_MS = 700

function findTarget(id: string): HTMLElement | null {
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id

  return document.querySelector<HTMLElement>(`[data-highlight-id="${escaped}"]`)
}

/**
 * The item a link asked a module page to show (`?highlight=<id>`, used by the
 * global search). Once an element with `data-highlight-id=<id>` renders, it is
 * scrolled into view and flashed; `onFound` runs first so the page can expand it.
 * Returns the id so pages can lift filters that would hide the item.
 */
export function useHighlightParam(onFound?: (id: string) => void): string | null {
  const [searchParams] = useSearchParams()
  const id = searchParams.get(HIGHLIGHT_PARAM)
  const onFoundRef = useRef(onFound)

  onFoundRef.current = onFound

  useEffect(() => {
    if (!id) return

    let element: HTMLElement | null = null
    let clearTimer = 0
    let recenterTimer = 0

    const reveal = (target: HTMLElement) => {
      element = target
      onFoundRef.current?.(id)
      // After the expand re-render, so the scroll lands on the final layout. Instant,
      // not smooth: sections above may still be loading and would shift a smooth scroll.
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'center' })
        target.setAttribute('data-highlighted', '')
        clearTimer = window.setTimeout(() => target.removeAttribute('data-highlighted'), FLASH_MS)
        recenterTimer = window.setTimeout(() => {
          const rect = target.getBoundingClientRect()

          if (rect.bottom < 0 || rect.top > window.innerHeight) {
            target.scrollIntoView({ block: 'center' })
          }
        }, RECENTER_MS)
      })
    }

    const found = findTarget(id)

    if (found) {
      reveal(found)

      return () => {
        window.clearTimeout(clearTimer)
        window.clearTimeout(recenterTimer)
      }
    }

    const observer = new MutationObserver(() => {
      const target = findTarget(id)

      if (!target) return
      observer.disconnect()
      reveal(target)
    })
    const giveUp = window.setTimeout(() => observer.disconnect(), FIND_TIMEOUT_MS)

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      window.clearTimeout(giveUp)
      window.clearTimeout(clearTimer)
      window.clearTimeout(recenterTimer)
      element?.removeAttribute('data-highlighted')
    }
  }, [id])

  return id
}
