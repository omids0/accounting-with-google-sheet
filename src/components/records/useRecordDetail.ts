import { useCallback, useEffect, useState } from 'react'

import type { StoredRecord } from './recordsUtils'

/**
 * Which record's detail sheet is open. It keeps the id, not the object, so a reload after an
 * edit shows fresh values and a deleted record closes the sheet. `autoOpenId`: open that
 * record once it loads (`/records?record=<id>&open=1`).
 */
export function useRecordDetail(records: StoredRecord[], autoOpenId?: string) {
  const [openId, setOpenId] = useState('')
  const [pendingId, setPendingId] = useState(autoOpenId ?? '')

  useEffect(() => setPendingId(autoOpenId ?? ''), [autoOpenId])

  useEffect(() => {
    if (!pendingId || !records.some(record => record.id === pendingId)) return
    setOpenId(pendingId)
    setPendingId('')
  }, [pendingId, records])

  const open = useCallback((record: StoredRecord) => setOpenId(record.id), [])
  const close = useCallback(() => setOpenId(''), [])

  return { record: records.find(item => item.id === openId) ?? null, open, close }
}
