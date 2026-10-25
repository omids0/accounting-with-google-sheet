import { useState } from 'react'

import SharedRecordPanel from './SharedRecordPanel'
import type { SharedRecords } from './useSharedRecords'
import { settlementOf } from '../../services/sharedSettlement'
import { parseNumeric } from '../../utils/parseNumeric'
import RecordDetailSheet from '../records/RecordDetailSheet'
import type { StoredRecord } from '../records/recordsUtils'

interface SharedRecordSheetProps {
  record: StoredRecord
  shared: SharedRecords
  onClose: () => void
}

/**
 * A tap on a shared record: the app's record sheet plus the shared block. Whoever may change it
 * (`record`, and an own record unless `editOthers`) edits the amount and deletes it; anyone else
 * reads it with the lock note. The write re-checks the right.
 */
export default function SharedRecordSheet({ record, shared, onClose }: SharedRecordSheetProps) {
  const current = Math.round(parseNumeric(record.values.amount))
  const [amount, setAmount] = useState<number | ''>(current || '')
  const form = shared.forms.find(item => item.id === record.formId)

  if (!form) return null

  const editable = shared.editable(record)
  const next = Number(amount) || 0

  return (
    <RecordDetailSheet
      record={record}
      form={form}
      readOnly={!editable}
      neutralAmount={record.formType === 'expense' && settlementOf(record.values) !== null}
      onClose={onClose}
      onEdit={() => undefined}
      onDelete={item => {
        onClose()
        shared.remove(item)
      }}
      save={
        editable
          ? {
              label: 'ذخیرهٔ مبلغ',
              disabled: !(next > 0) || next === current,
              onSave: async () => {
                if (await shared.saveAmount(record, next)) onClose()
              }
            }
          : undefined
      }
      extra={
        <SharedRecordPanel
          record={record}
          shared={shared}
          edit={editable ? { amount, onAmount: setAmount } : null}
        />
      }
    />
  )
}
