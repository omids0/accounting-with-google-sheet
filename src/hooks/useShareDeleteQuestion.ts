import { useCallback, useRef, useState } from 'react'

import { toPersianDigits } from '../utils/normalizeDigits'

/**
 * «حذف هزینه؟» before a building expense with unpaid unit shares is deleted: the unpaid shares go
 * with it and the paid ones stay. `ask` resolves true to go on, false when the manager backs out.
 */
export function useShareDeleteQuestion() {
  const [count, setCount] = useState(0)
  const resolver = useRef<((go: boolean) => void) | null>(null)

  const ask = useCallback((unpaidShares: number) => {
    if (unpaidShares <= 0) return Promise.resolve(true)

    resolver.current?.(false)

    return new Promise<boolean>(resolve => {
      resolver.current = resolve
      setCount(unpaidShares)
    })
  }, [])

  const answer = (go: boolean) => {
    resolver.current?.(go)
    resolver.current = null
    setCount(0)
  }

  return {
    ask,
    /** Spread into `ConfirmActionModal`. «انصراف» (the safe answer) is the bright button. */
    modalProps: {
      open: count > 0,
      tone: 'danger' as const,
      title: 'حذف هزینه؟',
      message: `${toPersianDigits(
        String(count)
      )} سهم پرداخت‌نشده حذف می‌شود؛ سهم‌های پرداخت‌شده می‌مانند.`,
      confirmLabel: 'بله، حذف شود',
      cancelLabel: 'انصراف',
      onConfirm: () => answer(true),
      onCancel: () => answer(false),
      onClose: () => answer(false)
    }
  }
}
