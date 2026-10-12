import { useEffect, useState } from 'react'

import { getSettings } from '../services/settings'
import { handleSheetError } from '../utils/sheetError'

/**
 * Loads one record for a detail route by id. Pass a module-level `fetchAll` that imports
 * its service on demand, so the feature's service ships with the lazy page, not the main chunk.
 */
export function useRouteRecord<T extends { id: string }>(
  id: string | undefined,
  fetchAll: (spreadsheetId: string) => Promise<T[]>
): { record: T | null; loading: boolean } {
  const [record, setRecord] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const settings = getSettings()

      if (!settings?.spreadsheetId || !id) {
        if (!cancelled) setLoading(false)

        return
      }

      try {
        const items = await fetchAll(settings.spreadsheetId)

        if (!cancelled) {
          setRecord(items.find(item => item.id === id) ?? null)
          setLoading(false)
        }
      } catch (error) {
        handleSheetError(error)

        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id, fetchAll])

  return { record, loading }
}
