import { useCallback, useEffect, useMemo, useState } from 'react'

import { buildUnitRows } from './unitRows'
import { useBuildingSetupData } from './useBuildingSetupData'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { buildBuildingReport } from '../../services/buildingAssembly'
import { loadFlowRecords, managerCreditorNames } from '../../services/buildingDashboard'
import { getManagedList, MANAGER_PAYER } from '../../services/buildingLists'
import { ledgerFromRows, periodWindow, type ReportPeriod } from '../../services/buildingReports'
import { fetchDangs } from '../../services/dang'
import { getSettings } from '../../services/settings'
import { WALLET_LEDGER_SHEET } from '../../services/sheetNames'
import { fetchSheetRows } from '../../services/sheets'
import type { Dang } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'

type Flows = Awaited<ReturnType<typeof loadFlowRecords>>

interface ReportSheets {
  flows: Flows
  dangs: Dang[]
  ledger: ReturnType<typeof ledgerFromRows>
}

/**
 * What the reports page reads from the active building: its units, stays, people, receivables and
 * accounts (the setup data), plus the income and expense records, the debts and the wallet
 * ledger, folded into one `BuildingReport` for the chosen period.
 */
export function useBuildingReport(period: ReportPeriod) {
  const { loaded, units, stays, persons, receivables, accounts, profile } = useBuildingSetupData()
  const revision = useDataRefresh()
  const [sheets, setSheets] = useState<ReportSheets | null>(null)

  const load = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    try {
      const [flows, dangs, ledgerRows] = await Promise.all([
        loadFlowRecords(settings),
        fetchDangs(settings.spreadsheetId).catch(() => []),
        fetchSheetRows(settings.spreadsheetId, WALLET_LEDGER_SHEET).catch(() => [])
      ])

      setSheets({ flows, dangs, ledger: ledgerFromRows(ledgerRows) })
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری گزارش‌ها' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, revision])

  const report = useMemo(() => {
    if (!sheets || !loaded) return null

    const payers = getManagedList('EXPENSE_PAYERS')

    return buildBuildingReport({
      window: periodWindow(period, getTodayIso()),
      income: sheets.flows.income,
      expense: sheets.flows.expense,
      kinds: getManagedList('EXPENSE_KINDS'),
      payers,
      receivables,
      unitRows: buildUnitRows({
        units,
        stays,
        persons,
        receivables,
        profile
      }),
      accounts,
      ledger: sheets.ledger,
      dangs: sheets.dangs,
      managerNames: managerCreditorNames(
        payers.find(item => item.value === MANAGER_PAYER)?.label ?? '',
        persons
      )
    })
  }, [period, sheets, loaded, units, stays, persons, receivables, accounts, profile])

  return { report, loading: report === null }
}
