import { useCallback, useEffect, useMemo, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import {
  computeForecast,
  forecastEndIso,
  spendingSliderRange,
  type ForecastView
} from '../../services/cashForecast'
import { buildForecastEvents } from '../../services/cashForecastEvents'
import {
  loadCashForecastData,
  readExcludedAccountIds,
  writeExcludedAccountIds,
  type CashForecastData
} from '../../services/cashForecastLoad'
import { assessPurchase } from '../../services/cashForecastPurchase'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth } from '../../utils/authGuard'
import { diffIsoDays, getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'

/** «اگر چک‌های دریافتی دیر وصول شوند»: how many days late they are assumed to arrive. */
export const LATE_CHECK_DAYS = 7

export type ForecastViewId = 'month' | '30' | '60'

const VIEW_OF_ID: Record<ForecastViewId, ForecastView> = { month: 'month', '30': 30, '60': 60 }

/** State and results of the cash-forecast screen; the numbers come from the pure services. */
export function useCashForecast() {
  const dataRevision = useDataRefresh()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const [data, setData] = useState<CashForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ForecastViewId>('month')
  const [dailySpending, setDailySpending] = useState(0)
  const [lateChecks, setLateChecks] = useState(false)
  const [excluded, setExcluded] = useState(() => readExcludedAccountIds(spreadsheetId))
  const [purchaseAmount, setPurchaseAmount] = useState<number | ''>('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const todayIso = getTodayIso()

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth() || !spreadsheetId) return

    setLoading(true)
    try {
      setData(await loadCashForecastData(spreadsheetId))
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری برآورد' })) return
    } finally {
      setLoading(false)
    }
  }, [spreadsheetId])

  useEffect(() => {
    void load()
  }, [load, dataRevision])

  const toggleAccount = useCallback(
    (id: string) => {
      setExcluded(current => {
        const next = new Set(current)

        if (!next.delete(id)) next.add(id)
        writeExcludedAccountIds(spreadsheetId, next)

        return next
      })
    },
    [spreadsheetId]
  )

  const endIso = forecastEndIso(todayIso, VIEW_OF_ID[view])

  const computed = useMemo(() => {
    if (!data) return null

    const { events, leftOut } = buildForecastEvents(data.sources, todayIso, endIso)

    const input = {
      todayIso,
      endIso,
      accounts: data.accounts,
      excludedAccountIds: excluded,
      events,
      dailySpending,
      incomingCheckDelayDays: lateChecks ? LATE_CHECK_DAYS : 0
    }

    const forecast = computeForecast(input)
    const purchase = assessPurchase(input, {
      amount: purchaseAmount === '' ? 0 : purchaseAmount,
      date: purchaseDate || undefined
    })
    const slider = spendingSliderRange(forecast.startBalance, diffIsoDays(todayIso, endIso))

    return { forecast, purchase, slider, leftOut, events }
  }, [data, todayIso, endIso, excluded, dailySpending, lateChecks, purchaseAmount, purchaseDate])

  return {
    todayIso,
    endIso,
    loading,
    data,
    computed,
    reload: load,
    view,
    setView,
    dailySpending,
    setDailySpending,
    lateChecks,
    setLateChecks,
    excluded,
    toggleAccount,
    purchaseAmount,
    setPurchaseAmount,
    purchaseDate,
    setPurchaseDate
  }
}
