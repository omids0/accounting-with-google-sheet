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

const TEXT_FIELD_SELECTOR =
  'textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"])'

/**
 * On a touch screen a focused text field raises the keyboard while the sheet is still sliding in:
 * the WebView resizes under it and the sheet jumps. The user taps the field they want instead.
 */
function opensKeyboardOnTouch(element: HTMLElement) {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    element.matches(TEXT_FIELD_SELECTOR)
  )
}

/** The preferred element, else the first field, else the first control that is not ✕, else the container. */
function getInitialFocus(container: HTMLElement, preferred: string): HTMLElement {
  const explicit = container.querySelector<HTMLElement>(preferred)
  if (explicit) return explicit

  const focusable = getFocusableElements(container)
  const field = focusable.find(element => element.matches(FIELD_SELECTOR))
  if (field && !opensKeyboardOnTouch(field)) return field

  if (!field) {
    const control = focusable.find(element => !element.hasAttribute('data-modal-close'))
    if (control) return control
  }

  if (!container.hasAttribute('tabindex')) container.tabIndex = -1

  return container
}

/** Open traps, newest last: only the top one handles Tab (a picker over a form). */
const openTraps: RefObject<HTMLElement>[] = []

/** Popups portalled out of a trap (an open dropdown list) still count as inside it. */
const trapPortals: HTMLElement[] = []

export function registerTrapPortal(element: HTMLElement) {
  trapPortals.push(element)
}

export function unregisterTrapPortal(element: HTMLElement) {
  const index = trapPortals.indexOf(element)

  if (index >= 0) trapPortals.splice(index, 1)
}

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
    // preventScroll: the panel is still sliding in; scrolling it into view makes it jump.
    if (containerRef.current)
      getInitialFocus(containerRef.current, initialFocus).focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current

      if (event.key !== 'Tab' || !container || openTraps[openTraps.length - 1] !== containerRef)
        return

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const outside =
        !container.contains(active) && !trapPortals.some(portal => portal.contains(active))

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
