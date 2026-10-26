import BankSmsCardHead from './BankSmsCardHead'
import type { ConfirmableSms } from '../../services/bankSmsApply'
import MoneyText from '../MoneyText'
import {
  smsActionsRowClass,
  smsBadgeClass,
  smsHintClass,
  smsQueueCardClass
} from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import type { WalletAccountWithRow } from '../wallet/types'

type BankSmsTransferCardProps = {
  debit: ConfirmableSms
  credit: ConfirmableSms
  accounts: WalletAccountWithRow[]
  busy: boolean
  /** The legs the user already recorded by hand (same direction and amount on that account). */
  duplicateLegs: { debit: unknown; credit: unknown }
  onConfirm: () => void
  /** Both legs are recorded: leave the list, change nothing. */
  onAlreadyRecorded: () => void
  onSplit: () => void
}

/** A debit and a credit of the same amount in two own accounts, a few minutes apart. */
export default function BankSmsTransferCard({
  debit,
  credit,
  accounts,
  busy,
  duplicateLegs,
  onConfirm,
  onAlreadyRecorded,
  onSplit
}: BankSmsTransferCardProps) {
  const titleOf = (id: string) => accounts.find(account => account.id === id)?.title ?? 'حساب'
  const from = titleOf(debit.result.accountId)
  const to = titleOf(credit.result.accountId)
  const bothRecorded = Boolean(duplicateLegs.debit && duplicateLegs.credit)
  const duplicate = bothRecorded || Boolean(duplicateLegs.debit || duplicateLegs.credit)

  return (
    <Card className={smsQueueCardClass}>
      <BankSmsCardHead
        entry={debit}
        badge={
          <span className={smsBadgeClass}>
            {duplicate ? 'انتقال داخلی · تکراری؟' : 'انتقال داخلی'}
          </span>
        }
      />
      {duplicate ? (
        <p className={smsHintClass}>
          {bothRecorded
            ? `برداشت از «${from}» و واریز به «${to}» را قبلاً خودت ثبت کرده‌ای. تأیید انتقال هر دو موجودی را یک بار دیگر عوض می‌کرد؛ اگر همان است «قبلاً ثبت شده» را بزن.`
            : `${
                duplicateLegs.debit ? `برداشت از «${from}»` : `واریز به «${to}»`
              } را قبلاً خودت ثبت کرده‌ای. تأیید انتقال همان موجودی را دوباره عوض می‌کرد؛ «جدا کن» را بزن تا هر پیامک جدا بررسی شود.`}
        </p>
      ) : (
        <p className={smsHintClass}>
          <MoneyText amount={debit.amount} /> از «{from}» برداشت و به «{to}» واریز شده است. با
          تأیید، فقط موجودی هر دو حساب به‌روز می‌شود و درآمد یا هزینه‌ای ثبت نمی‌شود.
        </p>
      )}
      <div className={smsActionsRowClass}>
        {duplicate ? (
          bothRecorded && (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              loading={busy}
              onClick={onAlreadyRecorded}
            >
              قبلاً ثبت شده
            </Button>
          )
        ) : (
          <Button type="button" size="sm" disabled={busy} loading={busy} onClick={onConfirm}>
            تأیید انتقال
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={duplicate && !bothRecorded ? 'primary' : 'secondary'}
          disabled={busy}
          onClick={onSplit}
        >
          انتقال نیست، جدا کن
        </Button>
      </div>
    </Card>
  )
}
