import { useMemo } from 'react'

import RecordsListRow from './RecordsListRow'
import type { StoredRecord } from './recordsUtils'
import { useIncrementalList } from '../../hooks/useIncrementalList'
import type { CustomForm } from '../../types'
import { listCountLabel } from '../../utils/listCountLabel'
import ShowMoreFooter from '../ShowMoreFooter'
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
  /** Tag shown on every row (see `RecordsListRow`). */
  badge?: string
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
  badge,
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
          {listCountLabel(visibleRecords.length, filteredRecords.length, 'مورد')}
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
            badge={badge}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        )
      })}
      <ShowMoreFooter remaining={remaining} nextStep={nextStep} onShowMore={showMore} />
    </Card>
  )
}
