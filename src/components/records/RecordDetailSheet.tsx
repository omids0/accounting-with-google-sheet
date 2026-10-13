import RecordDetailAttachments from './RecordDetailAttachments'
import RecordDetailFields from './RecordDetailFields'
import { recordLineItems } from './recordsFilterPredicates'
import { getFormField, type StoredRecord } from './recordsUtils'
import type { CustomForm } from '../../types'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import { parseNumeric } from '../../utils/parseNumeric'
import LineItemsList from '../dataEntry/LineItemsList'
import { SUBCATEGORY_FIELD_ID } from '../form/fieldUtils'
import FormModal from '../FormModal'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import {
  recordDetailActionsClass,
  recordDetailAmountClass,
  recordDetailSectionClass,
  recordDetailSectionTitleClass
} from '../ui/recordDetailStyles'
import { amountExpenseClass, amountIncomeClass } from '../ui/recordsStyles'

interface RecordDetailSheetProps {
  record: StoredRecord
  form: CustomForm
  onClose: () => void
  onEdit: (record: StoredRecord) => void
  onDelete: (record: StoredRecord) => void
}

/** What a tap on a record row opens: its fields, receipts and items, with edit / repeat / delete. */
export default function RecordDetailSheet({
  record,
  form,
  onClose,
  onEdit,
  onDelete
}: RecordDetailSheetProps) {
  const { values } = record
  const titleField = getFormField(form, 'title')
  const amountField = getFormField(form, 'amount')
  const category = values.category ?? ''
  const subCategory = values[SUBCATEGORY_FIELD_ID] ?? ''
  const title =
    (titleField && values[titleField.id]) || [category, subCategory].filter(Boolean).join(' · ')
  const rawAmount = amountField ? values[amountField.id] : ''
  const isIncome = form.type === 'income'
  const isExpense = form.type === 'expense'
  const items = recordLineItems(record)
  const edit = () => onEdit(record)

  return (
    <FormModal
      open
      variant="panel"
      title={title || form.name}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        edit()
      }}
      saveLabel="ویرایش"
      cancelLabel="بستن"
    >
      {rawAmount ? (
        <div
          className={cn(
            recordDetailAmountClass,
            isIncome ? amountIncomeClass : isExpense ? amountExpenseClass : ''
          )}
        >
          <MoneyText
            amount={isExpense ? -Math.abs(parseNumeric(rawAmount)) : parseNumeric(rawAmount)}
            signed={isIncome ? 'plus' : true}
          />
        </div>
      ) : null}

      <RecordDetailFields record={record} form={form} />

      <RecordDetailAttachments
        sheetName={record.sheetName ?? form.sheetName}
        entityId={record.id}
        fileIds={record.attachments}
        title={title}
        onAdd={edit}
      />

      {items.length ? (
        <div className={recordDetailSectionClass}>
          <h3 className={recordDetailSectionTitleClass}>
            {`ریز اقلام · ${formatPersianNumber(items.length)}`}
          </h3>
          <LineItemsList items={items} label="ریز اقلام" />
        </div>
      ) : null}

      <div className={recordDetailActionsClass}>
        {isIncome || isExpense ? (
          <Button type="button" variant="secondary" size="sm" onClick={edit}>
            تکرار ماهانه
          </Button>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={() => onDelete(record)}>
          حذف
        </Button>
      </div>
    </FormModal>
  )
}
