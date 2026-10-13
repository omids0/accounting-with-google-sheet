import { SMS_RANGE_OPTIONS } from '../../services/bankSmsRange'
import { formatPersianNumber } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'
import { smsStatusRangeClass, smsStatusRowClass } from '../ui/bankSmsStyles'

type BankSmsStatusRowProps = {
  count: number
  days: number
  onOpenSettings: () => void
}

/** Top of the page: «۳ پیامک در انتظار بررسی» and the range («۷ روز اخیر ▾» opens ⚙). */
export default function BankSmsStatusRow({ count, days, onOpenSettings }: BankSmsStatusRowProps) {
  const range = SMS_RANGE_OPTIONS.find(option => option.id === String(days))?.label ?? ''

  return (
    <div className={smsStatusRowClass} role="status">
      <span>
        {count ? `${formatPersianNumber(count)} پیامک در انتظار بررسی` : 'صف پیامک‌ها خالی است'}
      </span>
      <button type="button" className={smsStatusRangeClass} onClick={onOpenSettings}>
        {range}
        <AppIcon name="chevron-down" size={14} />
      </button>
    </div>
  )
}
