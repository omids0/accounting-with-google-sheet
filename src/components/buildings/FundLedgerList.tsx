import type { LedgerEntry } from '../../services/walletLedger'
import IncrementalCardList from '../IncrementalCardList'
import { buildingEmptyClass } from '../ui/buildingStyles'
import WalletLedgerItem from '../wallet/WalletLedgerItem'

/** Balance changes, newest first: the app's account history, with the account named on each line. */
export default function FundLedgerList({
  entries,
  accountTitles
}: {
  entries: LedgerEntry[]
  /** Account id to its name; omit when every entry is of one account. */
  accountTitles?: ReadonlyMap<string, string>
}) {
  if (!entries.length) return <p className={buildingEmptyClass}>هنوز گردشی ثبت نشده</p>

  // A years-old fund has thousands of lines: 50 at a time (the balances keep reading all).
  return (
    <IncrementalCardList
      items={entries}
      getId={entry => entry.id}
      resetKey=""
      unit="ردیف"
      className="flex flex-col gap-2"
      renderItem={(entry, index) => (
        <WalletLedgerItem
          key={entry.id}
          entry={entry}
          index={index}
          accountTitle={accountTitles?.get(entry.accountId)}
        />
      )}
    />
  )
}
