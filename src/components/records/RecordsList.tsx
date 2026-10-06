import { useMemo, useState } from 'react'

import RecordsListRow from './RecordsListRow'
import type { StoredRecord } from './recordsUtils'
import type { CustomForm } from '../../types'
import { formatPersianNumber } from '../../utils/formatMoney'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  recordsListCardClass,
  recordsListCountClass,
  recordsListHeaderClass,
  recordsListTypeClass
} from '../ui/recordsStyles'

/** Rows rendered per step; long histories grow with «نمایش بیشتر» instead of all at once. */
const RECORDS_PAGE_SIZE = 100

interface RecordsListProps {
  forms: CustomForm[]
  activeForm?: CustomForm
  isAllForms: boolean
  filteredRecords: StoredRecord[]
  onEdit: (record: StoredRecord) => void
  onDelete: (record: StoredRecord) => void
}

export default function RecordsList({
  forms,
  activeForm,
  isAllForms,
  filteredRecords,
  onEdit,
  onDelete
}: RecordsListProps) {
  const [visibleCount, setVisibleCount] = useState(RECORDS_PAGE_SIZE)

  const formsById = useMemo(() => new Map(forms.map(form => [form.id, form])), [forms])

  const visibleRecords = useMemo(
    () => filteredRecords.slice(0, visibleCount),
    [filteredRecords, visibleCount]
  )

  const remaining = filteredRecords.length - visibleRecords.length

  return (
    <Card className={recordsListCardClass}>
      <div className={recordsListHeaderClass}>
        <span className={recordsListCountClass}>
          {filteredRecords.length.toLocaleString('fa-IR')} مورد
        </span>
        {forms.length === 1 && activeForm && (
          <span className={recordsListTypeClass(activeForm.type as 'income' | 'expense')}>
            {activeForm.name}
          </span>
        )}
      </div>
      {visibleRecords.map((record, index) => {
        const form = formsById.get(record.formId)

        if (!form) return null

        return (
          <RecordsListRow
            key={`${record.formId}-${record.id}`}
            record={record}
            form={form}
            isAllForms={isAllForms}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )
      })}
      {remaining > 0 ? (
        <div className="flex justify-center py-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setVisibleCount(count => count + RECORDS_PAGE_SIZE)}
          >
            نمایش بیشتر ({formatPersianNumber(remaining)} مورد دیگر)
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
