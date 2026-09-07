import { useCallback, useState } from 'react'

import { formatJalaliMonthLabel, getDateRange, getJalaliMonthKey } from '../utils/dateRange'
import { normalizeSheetDate } from '../utils/sheetValues'

interface PendingEntry {
  monthLabel: string
  run: () => Promise<void>
}

export function isRetroactiveDate(dateIso: string): boolean {
  const normalized = normalizeSheetDate(dateIso)

  if (!normalized) return false

  return getJalaliMonthKey(normalized) < getJalaliMonthKey(getDateRange('month-to-date').start)
}

/**
 * Records dated before the current month shift the derived opening balance of
 * every later month. The warning is informational only: derived values stay
 * correct whether or not the user goes ahead.
 */
export function useRetroactiveEntryWarning() {
  const [pending, setPending] = useState<PendingEntry | null>(null)

  const [confirming, setConfirming] = useState(false)

  const guard = useCallback((dateIso: string, run: () => Promise<void>): boolean => {
    if (!isRetroactiveDate(dateIso)) return false

    const monthKey = getJalaliMonthKey(normalizeSheetDate(dateIso))

    setPending({ monthLabel: formatJalaliMonthLabel(monthKey), run })

    return true
  }, [])

  const confirm = useCallback(async () => {
    if (!pending) return

    setConfirming(true)
    try {
      await pending.run()
      setPending(null)
    } finally {
      setConfirming(false)
    }
  }, [pending])

  const cancel = useCallback(() => {
    if (confirming) return
    setPending(null)
  }, [confirming])

  return {
    open: pending !== null,
    confirming,
    title: 'ثبت برای ماه گذشته',
    message: pending
      ? `این مورد برای ${pending.monthLabel} ثبت می‌شود. با این کار موجودی اول دوره ماه‌های بعد از آن به‌صورت خودکار به‌روز می‌شود. ادامه می‌دهید؟`
      : '',
    guard,
    confirm,
    cancel
  }
}
