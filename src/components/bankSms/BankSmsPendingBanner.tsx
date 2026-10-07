import { isBankSmsAvailable } from '../../services/bankSmsNative'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { smsRangeStart } from '../../services/bankSmsRange'
import { useBankSmsStore } from '../../stores/bankSmsStore'
import { useNavigationStore } from '../../stores/navigationStore'
import { formatPersianNumber } from '../../utils/formatMoney'
import Alert from '../ui/Alert'
import { smsCardHeadClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'

/** «N پیامک بانکی در انتظار بررسی» on the dashboard and wallet pages. */
export default function BankSmsPendingBanner() {
  // Same range as the «پیامک‌های بانکی» page; older SMS stay queued but are not listed there.
  const sinceMs = smsRangeStart(getBankSmsPrefs().viewDays)
  const count = useBankSmsStore(
    state => state.pending.filter(sms => sms.receivedAt >= sinceMs).length
  )
  const onTabChange = useNavigationStore(state => state.onTabChange)

  if (!count || !isBankSmsAvailable() || !getBankSmsPrefs().enabled) return null

  return (
    <Alert variant="info" className={smsCardHeadClass}>
      <span>{formatPersianNumber(count)} پیامک بانکی در انتظار بررسی است</span>
      <Button type="button" size="sm" onClick={() => onTabChange('bank-sms')}>
        بررسی
      </Button>
    </Alert>
  )
}
