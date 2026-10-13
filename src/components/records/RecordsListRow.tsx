import { memo } from 'react'

import { recordCounterparty, recordLineItems } from './recordsFilterPredicates'
import { getFormField, type StoredRecord } from './recordsUtils'
import type { CustomForm } from '../../types'
import { cn } from '../../utils/cn'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { describeLineItems } from '../../utils/lineItems'
import { parseNumeric } from '../../utils/parseNumeric'
import AttachmentBadge from '../attachments/AttachmentBadge'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import { SUBCATEGORY_FIELD_ID } from '../form/fieldUtils'
import MoneyText from '../MoneyText'
import TransactionListItem from '../TransactionListItem'
import { cardActionButtonsClass } from '../ui/featureCardStyles'
import {
  lineItemsBadgeClass,
  recordCounterpartyChipClass,
  recordItemsSummaryClass
} from '../ui/lineItemStyles'
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

  const counterparty = recordCounterparty(record)

  const items = recordLineItems(record)

  const isIncome = form.type === 'income'

  const isExpense = form.type === 'expense'

  return (
    <TransactionListItem
      title={String(title)}
      titleAddon={
        <>
          <AttachmentBadge
            sheetName={record.sheetName ?? form.sheetName}
            entityId={record.id}
            fileIds={record.attachments}
            title={String(title)}
          />
          {items.length ? (
            <span className={lineItemsBadgeClass} aria-label={`${items.length} قلم`}>
              {`☰ ${items.length.toLocaleString('fa-IR')}`}
            </span>
          ) : null}
        </>
      }
      meta={
        <>
          {isAllForms && `${record.formName} · `}
          {date ? formatIsoDatePersian(date) : record.createdAt}
          {category && ` · ${category}`}
          {subCategory && ` › ${subCategory}`}
          {counterparty ? (
            <>
              {' '}
              <span className={recordCounterpartyChipClass}>{counterparty}</span>
            </>
          ) : null}
        </>
      }
      detail={
        items.length ? (
          <div className={recordItemsSummaryClass}>{describeLineItems(items)}</div>
        ) : null
      }
      tone={isIncome ? 'income' : isExpense ? 'expense' : 'neutral'}
      index={index}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {amount && (
          <div className={cn(isIncome ? amountIncomeClass : isExpense ? amountExpenseClass : '')}>
            <MoneyText
              amount={isExpense ? -Math.abs(parseNumeric(amount)) : parseNumeric(amount)}
              signed={isIncome ? 'plus' : true}
            />
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
