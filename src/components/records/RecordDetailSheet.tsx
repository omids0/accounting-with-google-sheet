import { lazy, Suspense } from 'react'

import RecordDetailAttachments from './RecordDetailAttachments'
import RecordDetailFields from './RecordDetailFields'
import { recordLineItems } from './recordsFilterPredicates'
import { getFormField, type StoredRecord } from './recordsUtils'
import { isBuildingExpenseValues } from '../../services/buildingExpenseSplit'
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

// Building-only: the kind, payer and unit shares of an expense load when such a record opens.
const BuildingExpenseDetail = lazy(() => import('../buildings/BuildingExpenseDetail'))

interface RecordDetailSheetProps {
  record: StoredRecord
  form: CustomForm
  /** Only looking: no edit, repeat or delete. */
  readOnly?: boolean
  onClose: () => void
  onEdit: (record: StoredRecord) => void
  onDelete: (record: StoredRecord) => void
}

/** What a tap on a record row opens: its fields, receipts and items, with edit / repeat / delete. */
export default function RecordDetailSheet({
  record,
  form,
  readOnly = false,
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
      saveDisabled={readOnly}
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

      {isExpense && isBuildingExpenseValues(values) ? (
        <Suspense fallback={null}>
          <BuildingExpenseDetail record={record} />
        </Suspense>
      ) : null}

      <RecordDetailAttachments
        sheetName={record.sheetName ?? form.sheetName}
        entityId={record.id}
        fileIds={record.attachments}
        title={title}
        onAdd={readOnly ? undefined : edit}
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
        {readOnly ? null : isIncome || isExpense ? (
          <Button type="button" variant="secondary" size="sm" onClick={edit}>
            تکرار ماهانه
          </Button>
        ) : null}
        {readOnly ? null : (
          <Button type="button" variant="secondary" size="sm" onClick={() => onDelete(record)}>
            حذف
          </Button>
        )}
      </div>
    </FormModal>
  )
}
