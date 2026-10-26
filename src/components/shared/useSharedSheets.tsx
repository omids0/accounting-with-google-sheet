import { useMemo, useState } from 'react'

import SharedAddSheet from './SharedAddSheet'
import SharedRecordSheet from './SharedRecordSheet'
import SharedSettleSheet from './SharedSettleSheet'
import type { SharedRecords } from './useSharedRecords'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import type { StoredRecord } from '../records/recordsUtils'
import {
  speedDialActionExpenseClass,
  speedDialActionIncomeClass,
  speedDialTypeIconExpenseClass,
  speedDialTypeIconIncomeClass
} from '../ui/speedDialStyles'

type AddType = 'income' | 'expense'

/**
 * The sheets of a shared page (record, add, settle) and its add button: the page speed dial with
 * «هزینه» and «درآمد», registered only for whoever holds `record` (a viewer gets no «+»).
 */
export function useSharedSheets(shared: SharedRecords, { withAdd = true } = {}) {
  const [recordId, setRecordId] = useState('')
  const [adding, setAdding] = useState<AddType | null>(null)
  const [settling, setSettling] = useState(false)

  const canAdd = withAdd && shared.access.canRecord

  const speedDial = useMemo(
    () =>
      canAdd
        ? {
            ariaLabel: 'ثبت در حساب مشترک',
            actions: [
              {
                id: 'income',
                label: 'درآمد',
                headerLabel: '+ درآمد',
                icon: <span className={speedDialTypeIconIncomeClass}>+</span>,
                className: speedDialActionIncomeClass,
                onClick: () => setAdding('income')
              },
              {
                id: 'expense',
                label: 'هزینه',
                headerLabel: '− هزینه',
                icon: <span className={speedDialTypeIconExpenseClass}>−</span>,
                className: speedDialActionExpenseClass,
                onClick: () => setAdding('expense')
              }
            ]
          }
        : null,
    [canAdd]
  )

  useRegisterPageSpeedDial(speedDial)

  const record =
    [...shared.entries, ...shared.settlements.map(item => item.record)].find(
      item => item.id === recordId
    ) ?? null

  const overlays = (
    <>
      {record ? (
        <SharedRecordSheet
          key={record.id}
          record={record}
          shared={shared}
          onClose={() => setRecordId('')}
        />
      ) : null}
      {adding ? (
        <SharedAddSheet shared={shared} initialType={adding} onClose={() => setAdding(null)} />
      ) : null}
      {settling ? <SharedSettleSheet shared={shared} onClose={() => setSettling(false)} /> : null}
    </>
  )

  return {
    openRecord: (item: StoredRecord) => setRecordId(item.id),
    openSettle: shared.access.canSettle ? () => setSettling(true) : null,
    overlays
  }
}
