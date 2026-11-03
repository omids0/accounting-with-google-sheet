import { splitLabel } from './sharedViewModel'
import type { SharedRecords } from './useSharedRecords'
import { cn } from '../../utils/cn'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { parseNumeric } from '../../utils/parseNumeric'
import { isEditedByOther } from '../../utils/sharedWriterRows'
import {
  parseSplit,
  SHARED_CREATOR_FIELD_ID,
  SHARED_PAYER_FIELD_ID,
  SHARED_SPLIT_FIELD_ID
} from '../form/sharedFields'
import MoneyText from '../MoneyText'
import type { StoredRecord } from '../records/recordsUtils'
import TransactionListItem from '../TransactionListItem'
import { lineItemsBadgeClass } from '../ui/lineItemStyles'
import { amountExpenseClass, amountIncomeClass } from '../ui/recordsStyles'
import { writerAvatarClass } from '../ui/writerStyles'

interface SharedRecordRowProps {
  record: StoredRecord
  shared: Pick<SharedRecords, 'me' | 'names' | 'nameOf'>
  index?: number
  onOpen: (record: StoredRecord) => void
}

/**
 * One shared record in a list: the payer's avatar, the title, «دسته · تقسیم · تاریخ» and the
 * amount (an income names who recorded it and has no split). A «ویرایش‌شده» chip marks a record whose
 * last writer is not its creator. A tap opens the record sheet.
 */
export default function SharedRecordRow({
  record,
  shared,
  index = 0,
  onOpen
}: SharedRecordRowProps) {
  const { values } = record
  const income = record.formType === 'income'
  const person = String(values[income ? SHARED_CREATOR_FIELD_ID : SHARED_PAYER_FIELD_ID] ?? '')
  const name = person ? shared.nameOf(person) : '؟'
  const email = person.trim().toLowerCase()
  const isMe = !!email && email === shared.me
  // The avatar shows the person's own initial, «ش» of «شما» would say nothing.
  const initial = Array.from(shared.names[email] || email || '؟')[0]?.toUpperCase()
  const title = String(values.title || values.category || record.formName)
  const amount = parseNumeric(values.amount)
  const split = income
    ? 'درآمد'
    : splitLabel(parseSplit(String(values[SHARED_SPLIT_FIELD_ID] ?? '')), shared.me, shared.names)
  const meta = [values.category, split, values.date ? formatIsoDatePersian(values.date) : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <TransactionListItem
      title={title}
      titleAddon={
        isEditedByOther(values[SHARED_CREATOR_FIELD_ID], record.writer) ? (
          <span className={lineItemsBadgeClass}>ویرایش‌شده</span>
        ) : null
      }
      meta={
        <span className="inline-flex items-center gap-1.5">
          <span className={writerAvatarClass(isMe)} role="img" aria-label={name}>
            {initial}
          </span>
          <span>{meta}</span>
        </span>
      }
      tone={income ? 'income' : 'expense'}
      index={index}
      onOpen={() => onOpen(record)}
      openLabel={`جزئیات ${title}`}
    >
      <div className={cn('shrink-0', income ? amountIncomeClass : amountExpenseClass)}>
        <MoneyText amount={income ? amount : -Math.abs(amount)} signed={income ? 'plus' : true} />
      </div>
    </TransactionListItem>
  )
}
