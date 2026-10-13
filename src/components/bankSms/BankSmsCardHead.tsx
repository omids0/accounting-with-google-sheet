import type { ReactNode } from 'react'

import { formatSmsWhen } from './smsLabels'
import type { ReviewedSms } from '../../services/bankSmsQueue'
import { formatMoneyParts } from '../../utils/formatMoney'
import MoneyText from '../MoneyText'
import {
  smsAccountLineClass,
  smsAmountRowClass,
  smsBigAmountClass,
  smsCardHeadClass,
  smsMetaClass,
  smsRawClass,
  smsRawTextClass
} from '../ui/bankSmsStyles'

type BankSmsCardHeadProps = {
  entry: ReviewedSms
  /** «از بانک ملت» / «به بانک ملت» after the amount, or the card title. */
  accountTitle?: string
  /** Badge at the end of the time row («تکراری؟ …», «ناشناخته»). */
  badge?: ReactNode
  /** Controlled raw text (⋯ «متن کامل»); without it a «متن کامل» disclosure is shown. */
  rawOpen?: boolean
}

/** Time, signed amount (app currency), account and the collapsed SMS text of one card. */
export default function BankSmsCardHead({
  entry,
  accountTitle,
  badge,
  rawOpen
}: BankSmsCardHeadProps) {
  const { result } = entry
  const direction =
    result.kind === 'matched' || result.kind === 'ambiguous' ? result.direction : null
  const money = entry.amount === null ? null : formatMoneyParts(entry.amount)

  return (
    <>
      <div className={smsCardHeadClass}>
        <p className={smsMetaClass}>
          <span>{formatSmsWhen(entry.sms.receivedAt)}</span>
          {entry.sms.sender && <span dir="ltr">{entry.sms.sender}</span>}
        </p>
        {badge}
      </div>
      {direction && money ? (
        <div className={smsAmountRowClass}>
          <span className={smsBigAmountClass(direction)}>
            <bdi dir="ltr">
              {direction === 'debit' ? '−' : '+'}
              {money.number}
            </bdi>
            <small className="ms-1 text-[0.75rem] font-normal text-muted">{money.symbol}</small>
          </span>
          {accountTitle && (
            <span className={smsAccountLineClass}>
              {direction === 'debit' ? 'از' : 'به'} {accountTitle}
            </span>
          )}
        </div>
      ) : (
        accountTitle && <span className={smsAccountLineClass}>{accountTitle}</span>
      )}
      {entry.balance !== null && (
        <p className={smsMetaClass}>
          مانده: <MoneyText amount={entry.balance} />
        </p>
      )}
      {rawOpen === undefined ? (
        <details className={smsRawClass}>
          <summary>متن کامل</summary>
          <p className="m-0 whitespace-pre-line">{entry.sms.body}</p>
        </details>
      ) : (
        rawOpen && <p className={smsRawTextClass}>{entry.sms.body}</p>
      )}
    </>
  )
}
