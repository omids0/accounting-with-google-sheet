import { useMemo, useState } from 'react'

import BankSmsCardHead from './BankSmsCardHead'
import type { ConfirmableSms } from '../../services/bankSmsApply'
import type { ReviewedSms } from '../../services/bankSmsQueue'
import ToggleChipGroup from '../ToggleChipGroup'
import Alert from '../ui/Alert'
import { smsActionsRowClass, smsBadgeClass, smsCardClass, smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import type { WalletAccountWithRow } from '../wallet/types'

type BankSmsEntryCardProps = {
  entry: ReviewedSms
  probableDuplicate: boolean
  /** A matching record already moved this account's balance: «balance only» would count it twice. */
  duplicateMovedBalance: boolean
  accounts: WalletAccountWithRow[]
  busy: boolean
  /** Opens the normal income/expense form pre-filled from this SMS. */
  onOpenEntry: (entry: ConfirmableSms, accountTitle: string) => void
  /** Record already exists: only move the balance. */
  onBalanceOnly: (entry: ConfirmableSms) => void
  onDismiss: () => void
  /** Already entered by hand (record and balance): just drop it from the list. */
  onAlreadyRecorded: () => void
}

/** Pin an SMS that fits several accounts to one of them. */
function resolveEntry(entry: ReviewedSms, accountId: string): ConfirmableSms | null {
  const { result, amount } = entry

  if (amount === null) return null
  if (result.kind === 'matched') return { ...entry, result, amount }
  if (result.kind !== 'ambiguous') return null

  const candidate = result.candidates.find(item => item.accountId === accountId)

  if (!candidate) return null

  const { direction, unit, balance, ref } = result

  return {
    ...entry,
    amount,
    result: { kind: 'matched', ...candidate, direction, unit, amount: result.amount, balance, ref }
  }
}

/** A recognised SMS waiting to be recorded. The detected account is preselected. */
export default function BankSmsEntryCard({
  entry,
  probableDuplicate,
  duplicateMovedBalance,
  accounts,
  busy,
  onOpenEntry,
  onBalanceOnly,
  onDismiss,
  onAlreadyRecorded
}: BankSmsEntryCardProps) {
  const { result } = entry
  const candidates = result.kind === 'ambiguous' ? result.candidates : []
  const [accountId, setAccountId] = useState(
    result.kind === 'matched' ? result.accountId : candidates[0]?.accountId ?? ''
  )
  const resolved = useMemo(() => resolveEntry(entry, accountId), [entry, accountId])
  const direction = resolved?.result.direction ?? 'debit'
  const titleOf = (id: string) => accounts.find(item => item.id === id)?.title ?? 'حساب'
  const accountTitle = titleOf(accountId)

  return (
    <Card className={smsCardClass}>
      <BankSmsCardHead entry={entry} accountTitle={accountTitle} />

      {entry.amount === null && (
        <Alert variant="warning">واحد پول اپ ریال یا تومان نیست؛ این پیامک قابل ثبت نیست.</Alert>
      )}

      {probableDuplicate && (
        <span className={smsBadgeClass}>
          {duplicateMovedBalance
            ? 'احتمالاً قبلاً ثبت شده و موجودی حساب هم به‌روز شده — «قبلاً ثبت شده» را بزنید'
            : 'احتمالاً تکراری — رکوردی با همین مبلغ و تاریخ هست'}
        </span>
      )}

      {candidates.length > 1 && (
        <ToggleChipGroup
          ariaLabel="حساب این پیامک"
          options={candidates.map(candidate => ({
            id: candidate.accountId,
            label: titleOf(candidate.accountId)
          }))}
          selected={{ [accountId]: true }}
          onToggle={setAccountId}
        />
      )}
      {result.kind === 'ambiguous' && (
        <p className={smsHintClass}>
          حساب را از روی پیامک حدس زدیم؛ اگر درست نیست، در فرم ثبت عوضش کنید.
        </p>
      )}

      <div className={smsActionsRowClass}>
        <Button
          type="button"
          size="sm"
          variant={direction === 'debit' ? 'outflow' : 'inflow'}
          disabled={!resolved || busy}
          onClick={() => resolved && onOpenEntry(resolved, accountTitle)}
        >
          {direction === 'debit' ? 'ثبت هزینه' : 'ثبت درآمد'}
        </Button>
        {resolved && !duplicateMovedBalance && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            loading={busy}
            onClick={() => onBalanceOnly(resolved)}
          >
            فقط به‌روزرسانی موجودی
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={onAlreadyRecorded}
        >
          قبلاً ثبت شده
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onDismiss}>
          نادیده
        </Button>
      </div>
    </Card>
  )
}
