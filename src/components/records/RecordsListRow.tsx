import { memo } from 'react'

import { getFormField, type StoredRecord } from './recordsUtils'
import type { CustomForm } from '../../types'
import { cn } from '../../utils/cn'
import { formatSignedMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { parseNumeric } from '../../utils/parseNumeric'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import { SUBCATEGORY_FIELD_ID } from '../form/fieldUtils'
import TransactionListItem from '../TransactionListItem'
import { cardActionButtonsClass } from '../ui/featureCardStyles'
import { amountExpenseClass, amountIncomeClass } from '../ui/recordsStyles'

interface RecordsListRowProps {
  record: StoredRecord
  form: CustomForm
  isAllForms: boolean
  index: number
  onEdit: (record: StoredRecord) => void
  onDelete: (record: StoredRecord) => void
}

/**
 * One record row. Memoized on stable props (record, form, callbacks) so
 * re-rendering the records page doesn't rebuild every row in the list.
 */
function RecordsListRow({
  record,
  form,
  isAllForms,
  index,
  onEdit,
  onDelete
}: RecordsListRowProps) {
  const recordAmountField = getFormField(form, 'amount')

  const recordTitleField = getFormField(form, 'title')

  const recordCategoryField = getFormField(form, 'category')

  const recordDateField = getFormField(form, 'date')

  const amount = recordAmountField ? record.values[recordAmountField.id] : ''

  const title = recordTitleField
    ? record.values[recordTitleField.id]
    : Object.values(record.values)[0] ?? ''

  const category = recordCategoryField ? record.values[recordCategoryField.id] : ''

  const date = recordDateField ? record.values[recordDateField.id] : ''

  const subCategory = record.values[SUBCATEGORY_FIELD_ID] ?? ''

  const isIncome = form.type === 'income'

  const isExpense = form.type === 'expense'

  return (
    <TransactionListItem
      title={String(title)}
      meta={
        <>
          {isAllForms && `${record.formName} · `}
          {date ? formatIsoDatePersian(date) : record.createdAt}
          {category && ` · ${category}`}
          {subCategory && ` › ${subCategory}`}
        </>
      }
      tone={isIncome ? 'income' : isExpense ? 'expense' : 'neutral'}
      index={index}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {amount && (
          <div
            className={cn(isIncome ? amountIncomeClass : isExpense ? amountExpenseClass : '')}
            dir="ltr"
          >
            {formatSignedMoney(isExpense ? -Math.abs(parseNumeric(amount)) : parseNumeric(amount), {
              showPlus: isIncome
            })}
          </div>
        )}
        <div className={cardActionButtonsClass}>
          <CardEditButton onClick={() => onEdit(record)} />
          <CardDeleteButton onClick={() => onDelete(record)} />
        </div>
      </div>
    </TransactionListItem>
  )
}

export default memo(RecordsListRow)
