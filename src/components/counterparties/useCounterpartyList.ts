import { useEffect, useState } from 'react'

import type { CounterpartyWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { fetchCounterparties } from '../../services/counterparties'
import { getSettings } from '../../services/settings'

/**
 * The counterparty list for pickers inside other forms: a plain read of the
 * local mirror, without the page's delete/import machinery. A new name added
 * from the picker is kept through the returned setter until the next refresh.
 */
export function useCounterpartyList() {
  const revision = useDataRefresh()
  const [items, setItems] = useState<CounterpartyWithRow[]>([])

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    let live = true

    void fetchCounterparties(spreadsheetId)
      .then(next => live && setItems(next))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [revision])

  return [items, setItems] as const
}
