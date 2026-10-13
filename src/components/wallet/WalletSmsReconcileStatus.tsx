import { smsDayLabel, smsMomentLabel, type AccountReconcile } from '../../services/bankSmsReconcile'
import MoneyText from '../MoneyText'
import { alertClassName } from '../ui/Alert'
import Button from '../ui/Button'

const lineClass = 'm-0 mt-1.5 px-1 text-[0.75rem]'

/**
 * Under a wallet account card: the newest bank SMS «مانده» against the app balance.
 * `null` result = no recognised SMS. No toast, no modal: the block is the whole alert.
 */
export default function WalletSmsReconcileStatus({
  result,
  hidden,
  onFind,
  onIgnore
}: {
  result: AccountReconcile | null
  /** «نادیده» of this exact difference. */
  hidden: boolean
  onFind: () => void
  onIgnore: () => void
}) {
  if (!result) return <p className={`${lineClass} text-muted`}>پیامک ندارد</p>

  if (result.difference === 0) {
    return (
      <p className={`${lineClass} text-success`}>✓ با پیامک {smsDayLabel(result.smsAt)} یکی است</p>
    )
  }

  if (hidden) return null

  return (
    <div className={alertClassName('error', 'mb-0 mt-2 text-[0.78rem] leading-[1.7]')}>
      <strong>با پیامک بانک نمی‌خواند</strong>
      <p className="m-0">
        آخرین پیامک ({smsMomentLabel(result.smsAt)}): موجودی{' '}
        <MoneyText amount={result.smsBalance} /> · اختلاف{' '}
        <MoneyText amount={Math.abs(result.difference)} />{' '}
        {result.difference > 0 ? 'بیشتر' : 'کمتر'} در اپ
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onFind}>
          پیدا کردن اختلاف
        </Button>
        <button
          type="button"
          className="min-h-touch-min cursor-pointer border-0 bg-transparent px-2 text-[0.78rem] text-muted underline"
          onClick={onIgnore}
        >
          نادیده
        </button>
      </div>
    </div>
  )
}
