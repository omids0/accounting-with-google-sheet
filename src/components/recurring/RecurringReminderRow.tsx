import { useNavigate } from 'react-router'

import { recordFocusPath } from '../../routes/paths'
import type { RecurringStatus } from '../../services/recurringStatus'
import type { RecurringItem } from '../../types'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import MoneyText from '../MoneyText'
import { duplicateChipClass } from '../ui/entryAssistStyles'
import {
  recurringCheckboxClass,
  recurringRowAmountClass,
  recurringRowClass,
  recurringRowDayClass,
  recurringRowLinkClass,
  recurringRowMetaClass,
  recurringRowTextClass,
  recurringRowTitleClass
} from '../ui/recurringStyles'

const TYPE_LABEL = { income: 'درآمد', expense: 'هزینه' } as const

/** The status chip text of one item: what «ثبت همه» does with it as it is ticked now. */
export function recurringStatusLabel(status: RecurringStatus, ticked: boolean): string {
  if (status.kind === 'registered') {
    return `قبلاً ثبت شده (${formatIsoDatePersian(status.record.date)})`
  }
  if (status.kind === 'probable') return 'احتمال تکراری'

  return ticked ? 'ثبت می‌شود' : 'این ماه رد می‌شود'
}

/** One tick row of the «ثبت تکرارهای …» card, with its status and a way to see the matching record. */
export default function RecurringReminderRow({
  item,
  day,
  account,
  status,
  ticked,
  disabled,
  onToggle
}: {
  item: RecurringItem
  day: number
  account?: string
  status: RecurringStatus
  ticked: boolean
  disabled: boolean
  onToggle: (checked: boolean) => void
}) {
  const navigate = useNavigate()
  const record = status.kind === 'new' ? null : status.record

  return (
    <label className={recurringRowClass}>
      <span className={recurringRowDayClass}>{day.toLocaleString('fa-IR')}</span>
      <span className={recurringRowTextClass}>
        <span className={recurringRowTitleClass}>{item.title || item.category}</span>
        <span className={recurringRowMetaClass}>
          {[TYPE_LABEL[item.type], account].filter(Boolean).join(' · ')}
        </span>
        <span className={duplicateChipClass(status.kind)}>
          <bdi>{recurringStatusLabel(status, ticked)}</bdi>
        </span>
        {record?.id && (
          <>
            {ticked && status.kind !== 'new' && (
              <span className={recurringRowMetaClass}>با این تیک، یک رکورد دوم ثبت می‌شود</span>
            )}
            <button
              type="button"
              className={recurringRowLinkClass}
              onClick={() => navigate(recordFocusPath(item.type, record.id!))}
            >
              دیدن آن رکورد
            </button>
          </>
        )}
      </span>
      <span className={recurringRowAmountClass}>
        <MoneyText amount={item.amount} />
      </span>
      <input
        type="checkbox"
        className={recurringCheckboxClass}
        checked={ticked}
        disabled={disabled}
        aria-label={`ثبت ${item.title || item.category}`}
        onChange={event => onToggle(event.target.checked)}
      />
    </label>
  )
}
