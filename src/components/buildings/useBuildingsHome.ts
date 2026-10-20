import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  cachedBuildingSummary,
  loadBuildingSummary,
  type BuildingSummary
} from '../../services/buildingSummary'
import { getSpreadsheets } from '../../services/settings'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import { syncSpreadsheetsFromDrive } from '../../services/spreadsheetSetup'
import { isBuildingEntry } from '../../services/workspace'
import type { SpreadsheetEntry } from '../../types'

/** The title of a building spreadsheet is «حسابداری · ساختمان <name>». */
export const BUILDING_LABEL_PREFIX = 'ساختمان '

/**
 * The «مدیر ساختمان» home: the buildings registered on this device (with the numbers for their
 * cards, read without switching to them) and the Drive sheets named like a building that are not
 * registered yet («اتصال به شیت موجود»).
 */
export function useBuildingsHome() {
  const [entries, setEntries] = useState<SpreadsheetEntry[]>(getSpreadsheets)
  const [summaries, setSummaries] = useState<Record<string, BuildingSummary | null>>({})
  const [syncing, setSyncing] = useState(false)

  const buildings = useMemo(() => entries.filter(isBuildingEntry), [entries])

  const connectable = useMemo(
    () =>
      entries.filter(
        entry =>
          !isBuildingEntry(entry) &&
          getSpreadsheetLabel(entry.name).startsWith(BUILDING_LABEL_PREFIX)
      ),
    [entries]
  )

  const buildingIds = buildings.map(entry => entry.id).join(',')

  useEffect(() => {
    let cancelled = false

    for (const id of buildingIds.split(',').filter(Boolean)) {
      setSummaries(prev => ({ ...prev, [id]: prev[id] ?? cachedBuildingSummary(id) }))
      void loadBuildingSummary(id).then(summary => {
        if (!cancelled) setSummaries(prev => ({ ...prev, [id]: summary }))
      })
    }

    return () => {
      cancelled = true
    }
  }, [buildingIds])

  /** Re-reads the Drive list (a sheet shared with this account shows up) and the card numbers. */
  const refresh = useCallback(async () => {
    setSyncing(true)
    try {
      setEntries(await syncSpreadsheetsFromDrive())
    } catch {
      // Offline: the registered buildings and their cached numbers stay on screen.
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** The list again from settings, after a connection registered a new building. */
  const reloadEntries = useCallback(() => setEntries(getSpreadsheets()), [])

  return { buildings, connectable, summaries, syncing, refresh, reloadEntries }
}
