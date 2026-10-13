import { useCallback, useEffect, useRef, useState } from 'react'

import { useAmountsHiddenStore } from '../stores/amountsHiddenStore'
import { createRevealTimer, maskedText } from '../utils/amountMask'
import { haptic } from '../utils/haptics'

/** «حالت مخفی ارقام»: one switch read by every amount, chart and balance. */
export function useAmountsHidden(): {
  hidden: boolean
  setHidden: (hidden: boolean) => void
  toggle: () => void
} {
  const hidden = useAmountsHiddenStore(state => state.hidden)
  const setHidden = useAmountsHiddenStore(state => state.setHidden)
  const toggle = useAmountsHiddenStore(state => state.toggle)

  return { hidden, setHidden, toggle }
}

/** Just the flag, for render paths that only need to know whether to mask. */
export function useIsAmountsHidden(): boolean {
  return useAmountsHiddenStore(state => state.hidden)
}

/**
 * For strings that carry an amount outside the DOM text (`title`,
 * `aria-label`, tooltip rows): «مبلغ مخفی» while the mode is on.
 */
export function useMaskedText(): (text: string) => string {
  const hidden = useIsAmountsHidden()

  return useCallback((text: string) => maskedText(hidden, text), [hidden])
}

/** One masked amount shown for five seconds after a tap, then hidden again. */
export function useAmountReveal(): { revealed: boolean; reveal: () => void } {
  const [revealed, setRevealed] = useState(false)
  const timer = useRef<ReturnType<typeof createRevealTimer> | null>(null)

  useEffect(() => () => timer.current?.dispose(), [])

  const reveal = useCallback(() => {
    timer.current ??= createRevealTimer(setRevealed)
    haptic('selection')
    timer.current.reveal()
  }, [])

  return { revealed, reveal }
}
