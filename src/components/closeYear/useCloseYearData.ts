import { useCallback, useEffect, useMemo, useState } from 'react'

import { useBackupState } from '../../hooks/useBackupState'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { deriveCloseYearSteps, type CloseYearAccount } from '../../services/closeYear'
import { loadCloseYearAccounts } from '../../services/closeYearAccounts'
import {
  countYearArchiveRows,
  readOpeningMonths,
  yearArchiveTabs,
  type OpeningMonths,
  type YearArchiveTab
} from '../../services/closeYearActions'
import {
  getCloseYearState,
  subscribeCloseYearState,
  type CloseYearState
} from '../../services/closeYearStore'
import { getSettings } from '../../services/settings'
import { handleSheetError } from '../../utils/sheetError'

function useCloseYearState(spreadsheetId: string, year: number): CloseYearState {
  const [state, setState] = useState(() => getCloseYearState(spreadsheetId, year))

  useEffect(() => {
    const read = () => setState(getCloseYearState(spreadsheetId, year))

    read()

    return subscribeCloseYearState(read)
  }, [spreadsheetId, year])

  return state
}

/** What the four steps of «بستن سال <year>» show, re-read whenever the spreadsheet changes. */
export function useCloseYearData(year: number) {
  const [settings] = useState(() => getSettings())
  const spreadsheetId = settings?.spreadsheetId ?? ''
  const forms = useMemo(() => settings?.forms ?? [], [settings])
  const [accounts, setAccounts] = useState<CloseYearAccount[] | null>(null)
  const [opening, setOpening] = useState<OpeningMonths | null>(null)
  const [archive, setArchive] = useState<YearArchiveTab[] | null>(null)
  const closeState = useCloseYearState(spreadsheetId, year)
  const backupState = useBackupState(spreadsheetId)
  const dataRevision = useDataRefresh()

  const reloadOpening = useCallback(async () => {
    if (!spreadsheetId) return
    try {
      setOpening(await readOpeningMonths(spreadsheetId))
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در خواندن موجودی ماهانه' })
    }
  }, [spreadsheetId])

  const reloadArchive = useCallback(async () => {
    if (!spreadsheetId) return
    setArchive(await countYearArchiveRows(spreadsheetId, forms, year))
  }, [spreadsheetId, forms, year])

  useEffect(() => {
    if (!spreadsheetId) return
    loadCloseYearAccounts(spreadsheetId)
      .then(setAccounts)
      .catch(err => {
        setAccounts([])
        handleSheetError(err, { fallbackMessage: 'خطا در خواندن حساب‌ها' })
      })
    void reloadOpening()
    void reloadArchive()
  }, [spreadsheetId, reloadOpening, reloadArchive, dataRevision])

  const pendingArchiveRows = archive ? archive.reduce((sum, tab) => sum + tab.rows, 0) : null

  const status = useMemo(
    () =>
      deriveCloseYearSteps({
        year,
        accounts,
        cashConfirmed: !!closeState.cashConfirmed,
        openingMonthKeys: opening?.monthKeys ?? null,
        anchorMonthKey: opening?.anchorMonthKey,
        pendingArchiveRows,
        archivedAt: closeState.archivedAt,
        lastBackupAt: backupState.lastBackupAt
      }),
    [year, accounts, closeState, opening, pendingArchiveRows, backupState.lastBackupAt]
  )

  return {
    settings,
    spreadsheetId,
    forms,
    status,
    accountsLoaded: accounts !== null,
    closeState,
    lastBackupAt: backupState.lastBackupAt,
    archive,
    pendingArchiveRows,
    archivedTabs: yearArchiveTabs(spreadsheetId, forms, year),
    reloadOpening,
    reloadArchive
  }
}
