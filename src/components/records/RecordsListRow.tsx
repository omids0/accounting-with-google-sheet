import { memo } from 'react'

import {
  recordCounterparty,
  recordLineItems,
  recordWalletState,
  type RecordWalletState
} from './recordsFilterPredicates'
import { getFormField, type StoredRecord } from './recordsUtils'
import { describeBuildingExpense } from '../../services/buildingExpenseMeta'
import { isBuildingExpenseValues } from '../../services/buildingExpenseSplit'
import type { CustomForm } from '../../types'
import { cn } from '../../utils/cn'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { describeLineItems } from '../../utils/lineItems'
import { parseNumeric } from '../../utils/parseNumeric'
import AppIcon from '../AppIcon'
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
import WriterAvatar from '../WriterAvatar'

const WALLET_STATE_LABEL: Record<RecordWalletState, string> = {
  applied: 'روی موجودی حساب اثر گذاشت',
  skipped: 'حساب دارد ولی روی موجودی اثر نگذاشت',
  none: 'بدون حساب؛ روی موجودی اثر ندارد'
}

interface RecordsListRowProps {
  record: StoredRecord
  form: CustomForm
  isAllForms: boolean
  index: number
  /** No edit and delete buttons (a building member without the `record` permission). */
  readOnly?: boolean
  onEdit: (record: StoredRecord) => void
  onDelete: (record: StoredRecord) => void
  onOpen: (record: StoredRecord) => void
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
  readOnly = false,
  onEdit,
  onDelete,
  onOpen
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

  const walletState = recordWalletState(record)

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
          {isIncome || isExpense ? (
            <span
              className={cn(
                lineItemsBadgeClass,
                walletState === 'applied' ? 'text-primary' : 'opacity-60'
              )}
              role="img"
              aria-label={WALLET_STATE_LABEL[walletState]}
              title={WALLET_STATE_LABEL[walletState]}
            >
              <AppIcon name="wallet" size={13} />
              {walletState === 'applied' ? <AppIcon name="check" size={13} /> : '—'}
            </span>
          ) : null}
          {items.length ? (
            <span className={lineItemsBadgeClass} aria-label={`${items.length} قلم`}>
              {`☰ ${items.length.toLocaleString('fa-IR')}`}
            </span>
          ) : null}
        </>
      }
      meta={
        <>
          <WriterAvatar email={record.writer} withName />
          {isAllForms && `${record.formName} · `}
          {date ? formatIsoDatePersian(date) : record.createdAt}
          {category && ` · ${category}`}
          {subCategory && ` › ${subCategory}`}
          {isExpense && isBuildingExpenseValues(record.values)
            ? ` · ${describeBuildingExpense(record.values)}`
            : null}
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
      onOpen={() => onOpen(record)}
      openLabel={`جزئیات ${String(title)}`}
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
        {readOnly ? null : (
          <div className={cn(cardActionButtonsClass, 'relative z-[1]')}>
            <CardEditButton itemLabel={String(title)} onClick={() => onEdit(record)} />
            <CardDeleteButton itemLabel={String(title)} onClick={() => onDelete(record)} />
          </div>
        )}
      </div>
    </TransactionListItem>
  )
}

export default memo(RecordsListRow)
