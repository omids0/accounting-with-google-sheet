import { useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import type { RecurringStatus } from '../../services/recurringStatus'
import { getSettings } from '../../services/settings'
import type { RecurringItem } from '../../types'

interface Computed {
  items: readonly RecurringItem[]
  statuses: ReadonlyMap<string, RecurringStatus>
}

/**
 * What «ثبت همه» would do with each item, read from the records (archives included). Loaded on
 * demand and tolerant: records that cannot be read leave every item «ثبت می‌شود».
 * `null` while the answer for the current items is still on its way.
 */
export function useRecurringStatuses(
  items: readonly RecurringItem[],
  todayIso: string
): ReadonlyMap<string, RecurringStatus> | null {
  const revision = useDataRefresh()
  const [computed, setComputed] = useState<Computed | null>(null)

  useEffect(() => {
    const settings = getSettings()

    if (!items.length) return

    let live = true
    const done = (statuses: ReadonlyMap<string, RecurringStatus>) =>
      live && setComputed({ items, statuses })

    if (!settings?.spreadsheetId) {
      done(new Map())

      return
    }

    void Promise.all([
      import('../../services/recordLedger'),
      import('../../services/recurringStatus')
    ])
      .then(async ([ledgerModule, statusModule]) => {
        const ledger = await ledgerModule.loadRecordLedger(settings)

        done(statusModule.recurringStatuses(items, ledger, todayIso))
      })
      .catch(() => done(new Map()))

    return () => {
      live = false
    }
  }, [items, todayIso, revision])

  return computed?.items === items ? computed.statuses : null
}
