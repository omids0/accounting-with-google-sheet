import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => element.tabIndex !== -1 && element.offsetParent !== null
  )
}

interface UseModalLockOptions {
  open: boolean
  onClose: () => void
  /** When true, Escape and backdrop dismiss are blocked (e.g. while saving). */
  blocked?: boolean
}

export function useModalLock({ open, onClose, blocked = false }: UseModalLockOptions) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    if (panel) {
      const closeButton = panel.querySelector<HTMLElement>('[data-modal-close]')
      const focusable = getFocusableElements(panel)
      ;(closeButton ?? focusable[0])?.focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !blocked) {
        event.preventDefault()
        onClose()

        return
      }

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
  }, [open, blocked, onClose])

  return { panelRef }
}
