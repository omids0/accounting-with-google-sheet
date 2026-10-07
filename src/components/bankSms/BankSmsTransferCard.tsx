import BankSmsCardHead from './BankSmsCardHead'
import type { ConfirmableSms } from '../../services/bankSmsApply'
import { formatMoney } from '../../utils/formatMoney'
import { smsActionsRowClass, smsCardClass, smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import type { WalletAccountWithRow } from '../wallet/types'

type BankSmsTransferCardProps = {
  debit: ConfirmableSms
  credit: ConfirmableSms
  accounts: WalletAccountWithRow[]
  busy: boolean
  onConfirm: () => void
  onSplit: () => void
}

/** A debit and a credit of the same amount in two own accounts, a few minutes apart. */
export default function BankSmsTransferCard({
  debit,
  credit,
  accounts,
  busy,
  onConfirm,
  onSplit
}: BankSmsTransferCardProps) {
  const titleOf = (id: string) => accounts.find(account => account.id === id)?.title ?? 'حساب'
  const from = titleOf(debit.result.accountId)
  const to = titleOf(credit.result.accountId)

  return (
    <Card className={smsCardClass}>
      <BankSmsCardHead entry={debit} accountTitle={`انتقال داخلی: ${from} ← ${to}`} />
      <p className={smsHintClass}>
        {formatMoney(debit.amount)} از «{from}» برداشت و به «{to}» واریز شده است. با تأیید، فقط
        موجودی هر دو حساب به‌روز می‌شود و درآمد یا هزینه‌ای ثبت نمی‌شود.
      </p>
      <div className={smsActionsRowClass}>
        <Button type="button" size="sm" disabled={busy} loading={busy} onClick={onConfirm}>
          تأیید انتقال
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onSplit}>
          انتقال نیست، جدا کن
        </Button>
      </div>
    </Card>
  )
}
