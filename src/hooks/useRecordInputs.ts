import { useEffect, useState } from 'react'

import { useDataRefresh } from './useDataRefresh'
import { loadRecordInputs, type RecordInput } from '../services/recordInputs'
import { getSettings } from '../services/settings'

/** Income/expense records of the active spreadsheet, reloaded when its data changes. */
export function useRecordInputs(enabled = true): RecordInput[] {
  const revision = useDataRefresh()
  const [records, setRecords] = useState<RecordInput[]>([])

  useEffect(() => {
    const settings = getSettings()

    if (!enabled || !settings?.spreadsheetId) return

    let live = true

    void loadRecordInputs(settings)
      .then(next => live && setRecords(next))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [enabled, revision])

  return records
}
