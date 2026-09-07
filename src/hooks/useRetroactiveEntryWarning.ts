import { useCallback, useState } from 'react'

import { formatJalaliMonthLabel, getDateRange, getJalaliMonthKey } from '../utils/dateRange'
import { normalizeSheetDate } from '../utils/sheetValues'

export type RetroactiveAction = 'create' | 'edit' | 'delete'

interface PendingEntry {
  monthLabel: string
  action: RetroactiveAction
  run: () => Promise<void>
}

const COPY: Record<RetroactiveAction, { title: string; confirmLabel: string; body: string }> = {
  create: {
    title: 'ثبت برای ماه گذشته',
    confirmLabel: 'ثبت کن',
    body: 'ثبت می‌شود'
  },
  edit: {
    title: 'ویرایش ماه گذشته',
    confirmLabel: 'ویرایش کن',
    body: 'ویرایش می‌شود'
  },
  delete: {
    title: 'حذف از ماه گذشته',
    confirmLabel: 'حذف کن',
    body: 'حذف می‌شود'
  }
}

export function isRetroactiveDate(dateIso: string): boolean {
  const normalized = normalizeSheetDate(dateIso)

  if (!normalized) return false

  return getJalaliMonthKey(normalized) < getJalaliMonthKey(getDateRange('month-to-date').start)
}

/** Jalali month label when the date falls in a past month, otherwise empty. */
export function retroactiveMonthLabel(dateIso: string): string {
  if (!isRetroactiveDate(dateIso)) return ''

  return formatJalaliMonthLabel(getJalaliMonthKey(normalizeSheetDate(dateIso)))
}

/**
 * Earliest affected past month across the given dates. An edit that moves a
 * record between months touches both, and the earlier one bounds how far the
 * derived opening balances shift.
 */
function earliestRetroactiveMonth(dates: string[]): string {
  return (
    dates
      .filter(isRetroactiveDate)
      .map(date => getJalaliMonthKey(normalizeSheetDate(date)))
      .sort()[0] ?? ''
  )
}

/**
 * Records dated before the current month shift the derived opening balance of
 * every later month. The warning is informational only: derived values stay
 * correct whether or not the user goes ahead.
 */
export function useRetroactiveEntryWarning() {
  const [pending, setPending] = useState<PendingEntry | null>(null)

  const [confirming, setConfirming] = useState(false)

  const guard = useCallback(
    (
      dateIso: string | string[],
      run: () => Promise<void>,
      action: RetroactiveAction = 'create'
    ): boolean => {
      const monthKey = earliestRetroactiveMonth(Array.isArray(dateIso) ? dateIso : [dateIso])

      if (!monthKey) return false

      setPending({ monthLabel: formatJalaliMonthLabel(monthKey), action, run })

      return true
    },
    []
  )

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

  const copy = COPY[pending?.action ?? 'create']

  return {
    open: pending !== null,
    confirming,
    title: copy.title,
    confirmLabel: copy.confirmLabel,
    message: pending
      ? `این مورد برای ${pending.monthLabel} ${copy.body}. با این کار موجودی اول دوره ماه‌های بعد از آن به‌صورت خودکار به‌روز می‌شود. ادامه می‌دهید؟`
      : '',
    guard,
    confirm,
    cancel
  }
}
