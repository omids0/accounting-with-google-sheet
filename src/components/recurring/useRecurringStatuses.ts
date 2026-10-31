import { useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import type { RecurringStatus } from '../../services/recurringStatus'
import { getSettings } from '../../services/settings'
import type { RecurringItem } from '../../types'

const NONE: ReadonlyMap<string, RecurringStatus> = new Map()

/**
 * What «ثبت همه» would do with each item, read from the records (archives included). Loaded on
 * demand and tolerant: records that cannot be read leave every item «ثبت می‌شود».
 */
export function useRecurringStatuses(
  items: readonly RecurringItem[],
  todayIso: string
): ReadonlyMap<string, RecurringStatus> {
  const revision = useDataRefresh()
  const [statuses, setStatuses] = useState(NONE)

  useEffect(() => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !items.length) return

    let live = true

    void Promise.all([
      import('../../services/recordLedger'),
      import('../../services/recurringStatus')
    ])
      .then(async ([ledgerModule, statusModule]) => {
        const ledger = await ledgerModule.loadRecordLedger(settings)

        if (live) setStatuses(statusModule.recurringStatuses(items, ledger, todayIso))
      })
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [items, todayIso, revision])

  return statuses
}
