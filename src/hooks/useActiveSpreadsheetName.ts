import { useMemo } from 'react'

import { getSettings } from '../services/settings'
import { getSpreadsheetLabel } from '../services/spreadsheetCatalog'
import { useAppStore } from '../stores/appStore'

/** Label of the active spreadsheet; read again whenever the active sheet changes. */
export function useActiveSpreadsheetName(): string {
  const spreadsheetKey = useAppStore(state => state.spreadsheetKey)

  return useMemo(() => {
    const settings = getSettings()
    const entry = settings?.spreadsheets?.find(sheet => sheet.id === settings.spreadsheetId)

    return entry ? getSpreadsheetLabel(entry.name) : ''
    // `spreadsheetKey` is bumped on every switch; settings themselves are not reactive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheetKey])
}
