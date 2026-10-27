import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from './useDataRefresh'
import { getSettings } from '../services/settings'
import { handleSheetError } from '../utils/sheetError'

/**
 * Loads one record for a detail route by id. Pass a module-level `fetchAll` that imports
 * its service on demand, so the feature's service ships with the lazy page, not the main chunk.
 *
 * `error` is true when the read failed (not when the id is unknown: then `record` is null and
 * `error` false), so a page can offer a retry instead of claiming the record does not exist.
 * `enabled: false` skips the read. `refreshOnDataChange` reads the record again, without the
 * loading state, whenever the sheet's data changes (a balance moved from this very page).
 */
export function useRouteRecord<T extends { id: string }>(
  id: string | undefined,
  fetchAll: (spreadsheetId: string) => Promise<T[]>,
  enabled = true,
  refreshOnDataChange = false
): { record: T | null; loading: boolean; error: boolean; retry: () => void } {
  const [record, setRecord] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const revision = useDataRefresh()
  const dataStamp = refreshOnDataChange ? revision : 0

  const retry = useCallback(() => {
    setLoading(true)
    setError(false)
    setAttempt(count => count + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const settings = getSettings()

      if (!enabled || !settings?.spreadsheetId || !id) {
        if (!cancelled) setLoading(false)

        return
      }

      try {
        const items = await fetchAll(settings.spreadsheetId)

        if (!cancelled) {
          setRecord(items.find(item => item.id === id) ?? null)
          setLoading(false)
        }
      } catch (err) {
        handleSheetError(err)

        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id, fetchAll, enabled, attempt, dataStamp])

  return { record, loading, error, retry }
}
