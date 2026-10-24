import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { getBuildingProfile } from '../../services/buildingProfile'
import { fetchStays, type StayWithRow } from '../../services/buildingResidents'
import type { BuildingProfile } from '../../services/buildingTemplate'
import { activeUnits, fetchUnits, type UnitWithRow } from '../../services/buildingUnits'
import { fetchCounterparties } from '../../services/counterparties'
import { fetchReceivables } from '../../services/receivablesCrud'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import { getWorkspaceType } from '../../services/workspace'
import type { Counterparty, Receivable, WalletAccount } from '../../types'
import { handleSheetError } from '../../utils/sheetError'

export interface BuildingSetupData {
  loaded: boolean
  profile: BuildingProfile | null
  /** The active units: what charges, splits, counts and SMS matching work on. */
  units: UnitWithRow[]
  /** Archived units: out of every count, their history stays readable. */
  archivedUnits: UnitWithRow[]
  /** Active and archived (number lookups, the unit page). */
  allUnits: UnitWithRow[]
  stays: StayWithRow[]
  persons: (Counterparty & { rowNumber: number })[]
  receivables: (Receivable & { rowNumber: number })[]
  accounts: WalletAccount[]
  /** Loads again; resolves with the fresh data so a sheet can continue from it. */
  reload: () => Promise<void>
}

const EMPTY: Omit<BuildingSetupData, 'reload'> = {
  loaded: false,
  profile: null,
  units: [],
  archivedUnits: [],
  allUnits: [],
  stays: [],
  persons: [],
  receivables: [],
  accounts: []
}

/**
 * What the setup journey and its checklist read from the active building: units, stays,
 * people, receivables, accounts. Read again after every change of the spreadsheet.
 */
export function useBuildingSetupData(): BuildingSetupData {
  const [data, setData] = useState(EMPTY)
  const revision = useDataRefresh()

  const reload = useCallback(async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    // The sheet flips to the personal one a moment before this page unmounts.
    if (!spreadsheetId || getWorkspaceType(spreadsheetId) !== 'building') return

    try {
      const [allUnits, stays, persons, receivables, accounts] = await Promise.all([
        fetchUnits(spreadsheetId),
        fetchStays(spreadsheetId),
        fetchCounterparties(spreadsheetId),
        fetchReceivables(spreadsheetId),
        fetchWalletAccounts(spreadsheetId)
      ])

      setData({
        loaded: true,
        profile: getBuildingProfile(spreadsheetId),
        units: activeUnits(allUnits),
        archivedUnits: allUnits.filter(unit => !unit.active),
        allUnits,
        stays,
        persons,
        receivables,
        accounts
      })
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری ساختمان' })
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, revision])

  return { ...data, reload }
}
