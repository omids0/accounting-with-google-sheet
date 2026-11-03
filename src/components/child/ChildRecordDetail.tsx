import type { ChildEntry } from './childViewModel'
import type { CustomForm } from '../../types'
import RecordDetailSheet from '../records/RecordDetailSheet'

interface ChildRecordDetailProps {
  entry: ChildEntry | null
  forms: CustomForm[]
  onClose: () => void
}

/**
 * The record sheet of a child's record: the shared detail sheet in its `readOnly` mode (no edit,
 * repeat or delete). `extra={null}` drops the dead «ویرایش» button beside «بستن».
 */
export default function ChildRecordDetail({ entry, forms, onClose }: ChildRecordDetailProps) {
  const form = entry ? forms.find(item => item.id === entry.record.formId) : undefined

  if (!entry || !form) return null

  return (
    <RecordDetailSheet
      record={entry.record}
      form={form}
      readOnly
      extra={null}
      onClose={onClose}
      onEdit={onClose}
      onDelete={onClose}
    />
  )
}
