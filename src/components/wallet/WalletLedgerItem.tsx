import { useNavigate } from 'react-router'

import { getPathForTab } from '../../routes/paths'
import { ledgerSourceLabel, type LedgerEntry } from '../../services/walletLedger'
import { cn } from '../../utils/cn'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import MoneyDisplay from '../MoneyDisplay'
import TransactionListItem from '../TransactionListItem'

export default function WalletLedgerItem({
  entry,
  index,
  accountTitle
}: {
  entry: LedgerEntry
  index: number
  /** Names the account when the list mixes several (a building's fund). */
  accountTitle?: string
}) {
  const navigate = useNavigate()
  const isTransfer = entry.source === 'transfer'
  const tone = !entry.applied ? 'neutral' : entry.delta < 0 ? 'expense' : 'income'
  const meta = [
    entry.date ? formatIsoDatePersian(entry.date) : '',
    accountTitle,
    ledgerSourceLabel(entry.source),
    entry.applied ? '' : 'بدون اثر'
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <TransactionListItem
      title={entry.title}
      meta={meta}
      tone={tone}
      index={index}
      className={cn(!entry.applied && 'opacity-60')}
      // A transfer row opens the list of transfers, where it can be seen whole and deleted.
      onOpen={isTransfer ? () => navigate(getPathForTab('wallet-transfers')) : undefined}
      openLabel={isTransfer ? 'باز کردن لیست انتقال‌ها' : undefined}
    >
      <div className="flex flex-col items-end gap-0.5">
        <MoneyDisplay
          amount={entry.delta}
          size="record"
          tone={tone === 'neutral' ? 'default' : tone}
          signed
        />
        <span className="text-[0.75rem] text-muted">
          موجودی بعد: <MoneyDisplay amount={entry.balanceAfter} size="record" />
        </span>
      </div>
    </TransactionListItem>
  )
}
