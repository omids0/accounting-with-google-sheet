import type { CustomForm } from '../../types'
import RecordsList from '../records/RecordsList'
import type { StoredRecord } from '../records/recordsUtils'

export const NON_FLOW_TITLE = 'انتقال و اصلاح (در هزینه حساب نمی‌شود)'

/**
 * The month's transfers, balance corrections and SMS reconciles, under the expense list: the same
 * rows and the same edit/delete as the list above, each tagged «حساب نمی‌شود». Hidden (not
 * mounted) while collapsed; the hero line is its toggle.
 */
export default function NonFlowRecords({
  id,
  open,
  records,
  forms,
  readOnly,
  onEdit,
  onDelete,
  onOpen
}: {
  id: string
  open: boolean
  records: StoredRecord[]
  forms: CustomForm[]
  readOnly: boolean
  onEdit: (record: StoredRecord) => void
  onDelete: (record: StoredRecord) => void
  onOpen: (record: StoredRecord) => void
}) {
  return (
    <section id={id} hidden={!open} aria-label={NON_FLOW_TITLE}>
      {open ? (
        <>
          <h2 className="px-1 pb-2 text-sm font-semibold text-muted">{NON_FLOW_TITLE}</h2>
          <RecordsList
            forms={forms}
            isAllForms
            filteredRecords={records}
            readOnly={readOnly}
            badge="حساب نمی‌شود"
            onEdit={onEdit}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        </>
      ) : null}
    </section>
  )
}
