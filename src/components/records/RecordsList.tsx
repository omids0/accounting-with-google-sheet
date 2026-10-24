import { useMemo } from 'react'

import RecordsListRow from './RecordsListRow'
import type { StoredRecord } from './recordsUtils'
import { useIncrementalList } from '../../hooks/useIncrementalList'
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

interface RecordsListProps {
  forms: CustomForm[]
  activeForm?: CustomForm
  isAllForms: boolean
  filteredRecords: StoredRecord[]
  readOnly?: boolean
  onEdit: (record: StoredRecord) => void
  onDelete: (record: StoredRecord) => void
  onOpen: (record: StoredRecord) => void
}

export default function RecordsList({
  forms,
  activeForm,
  isAllForms,
  filteredRecords,
  readOnly,
  onEdit,
  onDelete,
  onOpen
}: RecordsListProps) {
  // The page keys this list by its filters, so a new filter shows the first 50 again.
  const {
    visible: visibleRecords,
    remaining,
    nextStep,
    showMore
  } = useIncrementalList(filteredRecords)

  const formsById = useMemo(() => new Map(forms.map(form => [form.id, form])), [forms])

  return (
    <Card className={recordsListCardClass}>
      <div className={recordsListHeaderClass}>
        <span className={recordsListCountClass}>
          {remaining > 0
            ? `${visibleRecords.length.toLocaleString(
                'fa-IR'
              )} از ${filteredRecords.length.toLocaleString('fa-IR')} مورد`
            : `${filteredRecords.length.toLocaleString('fa-IR')} مورد`}
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
            readOnly={readOnly}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        )
      })}
      {remaining > 0 ? (
        <div className="flex justify-center py-3">
          <Button type="button" variant="secondary" size="sm" onClick={showMore}>
            نمایش بیشتر ({formatPersianNumber(nextStep)} مورد دیگر)
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
