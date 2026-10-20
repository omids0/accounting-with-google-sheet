import { SMS_RANGE_OPTIONS } from '../../services/bankSmsRange'
import { formatPersianNumber } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import { smsStatusNoteClass, smsStatusRangeClass, smsStatusRowClass } from '../ui/bankSmsStyles'

type BankSmsStatusRowProps = {
  count: number
  days: number
  onOpenSettings: () => void
  /** Building queue: the fund cards that route here, and that personal cards stay elsewhere. */
  routing?: { cards: string[]; note: string }
}

/** Top of the page: «۳ پیامک در انتظار بررسی» and the range («۷ روز اخیر ▾» opens ⚙). */
export default function BankSmsStatusRow({
  count,
  days,
  onOpenSettings,
  routing
}: BankSmsStatusRowProps) {
  const range = SMS_RANGE_OPTIONS.find(option => option.id === String(days))?.label ?? ''

  return (
    <div className={smsStatusRowClass} role="status">
      <span>
        {count ? `${formatPersianNumber(count)} پیامک در انتظار بررسی` : 'صف پیامک‌ها خالی است'}
        {routing?.cards.length ? (
          <>
            {' · کارت '}
            <bdi dir="ltr">{routing.cards.join(' · ')}</bdi>
          </>
        ) : null}
        {routing ? <small className={smsStatusNoteClass}>{routing.note}</small> : null}
      </span>
      <button type="button" className={smsStatusRangeClass} onClick={onOpenSettings}>
        {range}
        <AppIcon name="chevron-down" size={14} />
      </button>
    </div>
  )
}
