import { smsDuplicateStatus, smsSplitLine } from './smsLabels'
import type { BankSmsReviewItem } from '../../services/bankSmsQueue'
import AppIcon from '../AppIcon'
import { smsBadgeClass, smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'

export type SingleSmsItem = Extract<BankSmsReviewItem, { kind: 'single' }>

/** «تکراری؟ · رکورد …» or «پرداخت بدهی «x» ثبت شده»: what the queued SMS probably is. */
export function BankSmsDuplicateBadge({ item }: { item: SingleSmsItem }) {
  return <span className={smsBadgeClass}>{smsDuplicateStatus(item)}</span>
}

/** What closing the SMS does to the account balance, for a card with a probable duplicate. */
export function BankSmsDuplicateHint({ item }: { item: SingleSmsItem }) {
  const { duplicatePayment, duplicateMovedBalance, duplicateOf, splitUncovered } = item

  if (!duplicatePayment) {
    return duplicateMovedBalance ? (
      <p className={smsHintClass}>
        رکورد مشابه موجودی همین حساب را هم تغییر داده؛ اگر همان است «⋯ ← قبلاً ثبت شده».
      </p>
    ) : null
  }

  const balance = duplicateMovedBalance
    ? 'موجودی همین حساب با همان پرداخت عوض شده؛ با بستن پیامک دوباره عوض نمی‌شود.'
    : 'آن پرداخت موجودی این حساب را عوض نکرده؛ پیامک را ببند و اگر موجودی حساب هم باید با پیامک هماهنگ شود «فقط موجودی» را بزن.'

  if (splitUncovered !== null && duplicateOf) {
    return <p className={smsHintClass}>{`${smsSplitLine(item)} ${balance}`}</p>
  }

  return (
    <p className={smsHintClass}>
      {duplicateMovedBalance
        ? 'موجودی همین حساب با همان پرداخت عوض شده؛ با بستن پیامک دوباره عوض نمی‌شود.'
        : 'آن پرداخت موجودی این حساب را عوض نکرده؛ پیامک را ببند و اگر موجودی حساب هم باید با پیامک هماهنگ شود «فقط موجودی» را بزن.'}
    </p>
  )
}

/** The main action of a card whose payment is already recorded: leave the list, change nothing. */
export function BankSmsSameButton({
  item,
  busy,
  loading = false,
  onClick
}: {
  item: SingleSmsItem
  /** Some action of this SMS is running: disabled. */
  busy: boolean
  /** It is this button's action that is running: spinner. */
  loading?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="primary"
      disabled={busy}
      loading={loading}
      onClick={onClick}
    >
      <AppIcon name="check" size={16} />
      {item.splitUncovered === null ? 'همان است، پیامک را ببند' : 'بله، بخشی از آن است — ببند'}
    </Button>
  )
}
