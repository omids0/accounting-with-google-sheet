import { useNavigate } from 'react-router'

import { recordFocusPath } from '../../routes/paths'
import type { RecurringStatus } from '../../services/recurringStatus'
import type { RecurringItem } from '../../types'
import { isoToJalali, JALALI_MONTHS } from '../../utils/jalaliDate'
import MoneyText from '../MoneyText'
import { duplicateChipClass } from '../ui/entryAssistStyles'
import {
  recurringCheckboxClass,
  recurringRowAmountClass,
  recurringRowClass,
  recurringRowDayClass,
  recurringRowLinkClass,
  recurringRowMetaClass,
  recurringRowNoteClass,
  recurringRowStatusClass,
  recurringRowTextClass,
  recurringRowTitleClass
} from '../ui/recurringStyles'

const TYPE_LABEL = { income: 'درآمد', expense: 'هزینه' } as const

/** The status chip text of one item: what «ثبت همه» does with it as it is ticked now. */
export function recurringStatusLabel(status: RecurringStatus | null, ticked: boolean): string {
  if (!status) return 'در حال بررسی'
  if (status.kind === 'registered') {
    const { day, month } = isoToJalali(status.record.date)

    // Short on purpose: the pill stays one line in the narrow text column.
    return `ثبت شده ${day.toLocaleString('fa-IR')} ${JALALI_MONTHS[month - 1]}`
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
  /** `null`: the records are still being read. */
  status: RecurringStatus | null
  ticked: boolean
  disabled: boolean
  onToggle: (checked: boolean) => void
}) {
  const navigate = useNavigate()
  const record = !status || status.kind === 'new' ? null : status.record

  return (
    <label className={recurringRowClass}>
      <span className={recurringRowDayClass}>{day.toLocaleString('fa-IR')}</span>
      <span className={recurringRowTextClass}>
        <span className={recurringRowTitleClass}>{item.title || item.category}</span>
        <span className={recurringRowMetaClass}>
          {[TYPE_LABEL[item.type], account].filter(Boolean).join(' · ')}
        </span>
        <span className={recurringRowStatusClass}>
          <span className={duplicateChipClass(status?.kind ?? 'pending')}>
            <bdi>{recurringStatusLabel(status, ticked)}</bdi>
          </span>
          {record?.id && (
            <button
              type="button"
              className={recurringRowLinkClass}
              onClick={() => navigate(recordFocusPath(item.type, record.id!))}
            >
              دیدن آن رکورد
            </button>
          )}
        </span>
        {record && ticked && (
          <span className={recurringRowNoteClass}>با این تیک، یک رکورد دوم ثبت می‌شود</span>
        )}
      </span>
      <span className={recurringRowAmountClass}>
        <MoneyText amount={item.amount} />
      </span>
      <input
        type="checkbox"
        className={recurringCheckboxClass}
        checked={ticked}
        disabled={disabled || !status}
        aria-label={`ثبت ${item.title || item.category}`}
        onChange={event => onToggle(event.target.checked)}
      />
    </label>
  )
}
