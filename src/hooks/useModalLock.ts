import { useEffect, useRef } from 'react'

import { useFocusTrap } from './useFocusTrap'
import { useRegisterOverlay } from './useRegisterOverlay'

interface UseModalLockOptions {
  open: boolean
  onClose: () => void
  /** When true, Escape and back are ignored (e.g. while saving). */
  blocked?: boolean
}

/** Escape goes through the overlay stack, so only the top modal closes. */
export function useModalLock({ open, onClose, blocked = false }: UseModalLockOptions) {
  const panelRef = useRef<HTMLDivElement>(null)

  useRegisterOverlay(open, onClose, blocked)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useFocusTrap(open, panelRef)

  return { panelRef }
}
