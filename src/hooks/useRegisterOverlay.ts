import { useEffect, useRef } from 'react'

import { pushOverlay } from './overlayStack'

/** Puts an open overlay on the back-button stack; `blocked` makes back a no-op (e.g. saving). */
export function useRegisterOverlay(open: boolean, onClose: () => void, blocked = false) {
  const onCloseRef = useRef(onClose)
  const blockedRef = useRef(blocked)

  onCloseRef.current = onClose
  blockedRef.current = blocked

  useEffect(() => {
    if (!open) return

    return pushOverlay(() => {
      if (blockedRef.current) return false
      onCloseRef.current()

      return true
    })
  }, [open])
}
