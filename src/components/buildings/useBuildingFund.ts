import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { loadFlowRecords } from '../../services/buildingDashboard'
import { fetchFundLedger, monthlyFlowSeries } from '../../services/buildingFund'
import { monthKeyOfIso, recentMonthKeys } from '../../services/buildingMonths'
import { getSettings } from '../../services/settings'
import { ensureWalletSheet, fetchWalletAccounts } from '../../services/wallet'
import type { LedgerEntry } from '../../services/walletLedger'
import type { MonthlyFlow } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import type { WalletAccountWithRow } from '../wallet/types'

/** How many months the trend shows, and how many ledger lines the page lists. */
export const TREND_MONTHS = 6

export const LEDGER_LINES = 15

interface FundData {
  accounts: WalletAccountWithRow[]
  /** Oldest month first; the last one is this month. */
  trend: MonthlyFlow[]
  ledger: LedgerEntry[]
}

const EMPTY: FundData = { accounts: [], trend: [], ledger: [] }

/**
 * What the fund page shows: every wallet account of the building, the last months of
 * وصول − هزینه (transfers and corrections left out) and the newest balance changes.
 */
export function useBuildingFund() {
  const revision = useDataRefresh()
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    try {
      await ensureWalletSheet(settings.spreadsheetId)

      const [accounts, flows, ledger] = await Promise.all([
        fetchWalletAccounts(settings.spreadsheetId),
        loadFlowRecords(settings),
        fetchFundLedger(settings.spreadsheetId, LEDGER_LINES)
      ])

      setData({
        accounts,
        trend: monthlyFlowSeries(
          flows.income,
          flows.expense,
          recentMonthKeys(monthKeyOfIso(getTodayIso()), TREND_MONTHS)
        ),
        ledger
      })
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری صندوق' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, revision])

  return { ...data, loading, reload }
}
