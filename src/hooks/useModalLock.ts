import { useEffect, useRef } from 'react'

import { useRegisterOverlay } from './useRegisterOverlay'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const FIELD_SELECTOR = 'input, select, textarea'

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => element.tabIndex !== -1 && element.offsetParent !== null
  )
}

/** First field, else the first control that is not ✕, else the panel itself. */
function getInitialFocus(panel: HTMLElement): HTMLElement {
  const explicit = panel.querySelector<HTMLElement>('[data-modal-initial-focus]')
  if (explicit) return explicit

  const focusable = getFocusableElements(panel)
  const target =
    focusable.find(element => element.matches(FIELD_SELECTOR)) ??
    focusable.find(element => !element.hasAttribute('data-modal-close'))
  if (target) return target

  if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1

  return panel
}

interface UseModalLockOptions {
  open: boolean
  onClose: () => void
  /** When true, Escape and back are ignored (e.g. while saving). */
  blocked?: boolean
}

/** Escape goes through the overlay stack, so only the top modal closes. */
export function useModalLock({ open, onClose, blocked = false }: UseModalLockOptions) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useRegisterOverlay(open, onClose, blocked)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (panelRef.current) getInitialFocus(panelRef.current).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = getFocusableElements(panelRef.current)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          event.preventDefault()
          last.focus()
        }

        return
      }

      if (active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus({ preventScroll: true })
    }
  }, [open])

  return { panelRef }
}
