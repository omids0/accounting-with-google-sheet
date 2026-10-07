import { formatSmsTime } from './smsLabels'
import type { ReviewedSms } from '../../services/bankSmsQueue'
import { formatMoney } from '../../utils/formatMoney'
import {
  smsAmountClass,
  smsCardHeadClass,
  smsCardTitleClass,
  smsMetaClass,
  smsRawClass
} from '../ui/bankSmsStyles'

type BankSmsCardHeadProps = {
  entry: ReviewedSms
  accountTitle?: string
}

/** Account, amount, balance, time and the raw SMS text of one queue entry. */
export default function BankSmsCardHead({ entry, accountTitle }: BankSmsCardHeadProps) {
  const { result } = entry
  const direction =
    result.kind === 'matched' || result.kind === 'ambiguous' ? result.direction : null

  return (
    <>
      <div className={smsCardHeadClass}>
        <h3 className={smsCardTitleClass}>{accountTitle ?? 'پیامک بانکی'}</h3>
        {direction && entry.amount !== null && (
          <span className={smsAmountClass(direction)}>
            {direction === 'debit' ? '−' : '+'}
            {formatMoney(entry.amount)}
          </span>
        )}
      </div>
      <p className={smsMetaClass}>
        <span>{formatSmsTime(entry.sms.receivedAt)}</span>
        {entry.balance !== null && <span>مانده: {formatMoney(entry.balance)}</span>}
        {entry.sms.sender && <span dir="ltr">{entry.sms.sender}</span>}
      </p>
      <details className={smsRawClass}>
        <summary>متن پیامک</summary>
        <p className="m-0 whitespace-pre-line">{entry.sms.body}</p>
      </details>
    </>
  )
}
