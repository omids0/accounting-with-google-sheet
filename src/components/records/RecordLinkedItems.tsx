import { useMemo } from 'react'

import { findLinkedItems } from '../../services/recordLinks'
import { getSettings } from '../../services/settings'
import type { CustomForm } from '../../types'
import { recordDetailHintClass } from '../ui/recordDetailStyles'

/** «وصل به بدهی «x»»: the debt or receivable a settlement record is the payment of (local, no network). */
export default function RecordLinkedItems({
  recordId,
  type
}: {
  recordId: string
  type: CustomForm['type']
}) {
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  const items = useMemo(
    () => (spreadsheetId ? findLinkedItems(spreadsheetId, recordId, type) : []),
    [spreadsheetId, recordId, type]
  )

  if (!items.length) return null

  return (
    <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
      {items.map(item => (
        <li key={`${item.kind}:${item.itemId}`} className={`${recordDetailHintClass} ms-0`}>
          {`وصل به ${item.noun} «${item.title}»`}
        </li>
      ))}
    </ul>
  )
}
