import { useCallback, useState } from 'react'

import type { CounterpartyWithRow } from './types'

export function useCounterpartyDetail() {
  const [viewingItem, setViewingItem] = useState<CounterpartyWithRow | null>(null)

  const openDetail = useCallback((item: CounterpartyWithRow) => {
    setViewingItem(item)
  }, [])

  const closeDetail = useCallback(() => {
    setViewingItem(null)
  }, [])

  return {
    viewingItem,
    openDetail,
    closeDetail
  }
}
