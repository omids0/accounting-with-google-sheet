import { useEffect, useState } from 'react'

import { useDataRefresh } from './useDataRefresh'
import { loadRecordInputs, type RecordInput } from '../services/recordInputs'
import { getSettings } from '../services/settings'

/** Income/expense records of the active spreadsheet, reloaded when its data changes. */
export function useRecordInputsState(enabled = true): { records: RecordInput[]; loaded: boolean } {
  const revision = useDataRefresh()
  const [state, setState] = useState<{ records: RecordInput[]; loaded: boolean }>({
    records: [],
    loaded: false
  })

  useEffect(() => {
    const settings = getSettings()

    if (!enabled || !settings?.spreadsheetId) return

    let live = true

    void loadRecordInputs(settings)
      .then(records => live && setState({ records, loaded: true }))
      .catch(() => live && setState(current => ({ ...current, loaded: true })))

    return () => {
      live = false
    }
  }, [enabled, revision])

  return state
}

export function useRecordInputs(enabled = true): RecordInput[] {
  return useRecordInputsState(enabled).records
}
