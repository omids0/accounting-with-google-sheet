import BankSmsEntryCard from './BankSmsEntryCard'
import BankSmsTransferCard from './BankSmsTransferCard'
import BankSmsUnknownCard from './BankSmsUnknownCard'
import type { BankSmsReview } from './useBankSmsReview'
import type { BankSmsReviewItem } from '../../services/bankSmsQueue'

/** One queue entry as its card: own-account transfer, unknown SMS or recognised SMS. */
export default function BankSmsQueueItem({
  item,
  review
}: {
  item: BankSmsReviewItem
  review: BankSmsReview
}) {
  if (item.kind === 'transfer') {
    return (
      <BankSmsTransferCard
        debit={item.debit}
        credit={item.credit}
        accounts={review.accounts}
        busy={review.busyKey === item.key}
        onConfirm={() => void review.confirmTransfer(item.key, item.debit, item.credit)}
        onSplit={() => review.splitTransfer([item.debit.sms.id, item.credit.sms.id])}
      />
    )
  }

  return item.entry.result.kind === 'unknown' ? (
    <BankSmsUnknownCard item={item} review={review} />
  ) : (
    <BankSmsEntryCard item={item} review={review} />
  )
}
