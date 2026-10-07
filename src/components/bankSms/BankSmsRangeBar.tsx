import { SMS_RANGE_OPTIONS } from '../../services/bankSmsRange'
import { formatPersianNumber } from '../../utils/formatMoney'
import ToggleChipGroup from '../ToggleChipGroup'
import { smsCardClass, smsHintClass } from '../ui/bankSmsStyles'
import Card from '../ui/Card'

type BankSmsRangeBarProps = {
  days: number
  /** Queued SMS older than the range, kept but not shown. */
  hiddenCount: number
  onChange: (days: number) => void
}

/** Which SMS the list shows; picking a range also reads that range from the inbox. */
export default function BankSmsRangeBar({ days, hiddenCount, onChange }: BankSmsRangeBarProps) {
  return (
    <Card className={smsCardClass}>
      <p className={smsHintClass}>نمایش پیامک‌های (همراه امروز):</p>
      <ToggleChipGroup
        ariaLabel="بازه پیامک‌ها"
        options={SMS_RANGE_OPTIONS}
        selected={{ [String(days)]: true }}
        onToggle={id => onChange(Number(id))}
      />
      {hiddenCount > 0 && (
        <p className={smsHintClass}>
          {formatPersianNumber(hiddenCount)} پیامک قدیمی‌تر در صف هست که در این بازه نشان داده
          نمی‌شود.
        </p>
      )}
    </Card>
  )
}
