import { type RefObject, useEffect } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const FIELD_SELECTOR = 'input, select, textarea'

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => element.tabIndex !== -1 && element.offsetParent !== null
  )
}

const DEFAULT_INITIAL_FOCUS = '[data-modal-initial-focus]'

/** The preferred element, else the first field, else the first control that is not ✕, else the container. */
function getInitialFocus(container: HTMLElement, preferred: string): HTMLElement {
  const explicit = container.querySelector<HTMLElement>(preferred)
  if (explicit) return explicit

  const focusable = getFocusableElements(container)
  const target =
    focusable.find(element => element.matches(FIELD_SELECTOR)) ??
    focusable.find(element => !element.hasAttribute('data-modal-close'))
  if (target) return target

  if (!container.hasAttribute('tabindex')) container.tabIndex = -1

  return container
}

/** Open traps, newest last: only the top one handles Tab (a picker over a form). */
const openTraps: RefObject<HTMLElement>[] = []

/**
 * While `open`: focus moves into the container (first field), Tab cycles inside
 * it, and on close focus returns to whatever opened it (the trigger, ☰ …).
 */
export function useFocusTrap(
  open: boolean,
  containerRef: RefObject<HTMLElement>,
  /** Selector of the element to focus first (the drawer's current page link). */
  initialFocus = DEFAULT_INITIAL_FOCUS
) {
  useEffect(() => {
    if (!open) return

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    openTraps.push(containerRef)
    if (containerRef.current) getInitialFocus(containerRef.current, initialFocus).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current

      if (event.key !== 'Tab' || !container || openTraps[openTraps.length - 1] !== containerRef)
        return

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const outside = !container.contains(active)

      if (event.shiftKey ? active === first || outside : active === last || outside) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openTraps.splice(openTraps.indexOf(containerRef), 1)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [open, containerRef, initialFocus])
}
