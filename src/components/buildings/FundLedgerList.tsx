import type { LedgerEntry } from '../../services/walletLedger'
import { calmEmptyClass } from '../ui/calmListStyles'
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
  if (!entries.length) return <p className={calmEmptyClass}>هنوز گردشی ثبت نشده</p>

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, index) => (
        <WalletLedgerItem
          key={entry.id}
          entry={entry}
          index={index}
          accountTitle={accountTitles?.get(entry.accountId)}
        />
      ))}
    </div>
  )
}
