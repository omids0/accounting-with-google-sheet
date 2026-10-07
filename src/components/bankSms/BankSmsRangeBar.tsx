import { SMS_RANGE_OPTIONS } from '../../services/bankSmsRange'
import ToggleChipGroup from '../ToggleChipGroup'
import { smsCardClass, smsHintClass } from '../ui/bankSmsStyles'
import Card from '../ui/Card'

type BankSmsRangeBarProps = {
  days: number
  onChange: (days: number) => void
}

/** Which SMS the list shows; picking a range also reads that range from the inbox. */
export default function BankSmsRangeBar({ days, onChange }: BankSmsRangeBarProps) {
  return (
    <Card className={smsCardClass}>
      <p className={smsHintClass}>نمایش پیامک‌های:</p>
      <ToggleChipGroup
        ariaLabel="بازه پیامک‌ها"
        options={SMS_RANGE_OPTIONS}
        selected={{ [String(days)]: true }}
        onToggle={id => onChange(Number(id))}
      />
    </Card>
  )
}
