import type { ReactNode } from 'react'

import { fundAccountMeta } from './fundRows'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import MoneyText from '../MoneyText'
import {
  buildingRowTitleClass,
  buildingRowSubClass,
  buildingRowEndClass,
  buildingDayBadgeClass
} from '../ui/buildingStyles'
import { calmRowClass, calmRowMainClass } from '../ui/calmListStyles'
import type { WalletAccountWithRow } from '../wallet/types'

/**
 * One fund account: its balance, the card, and under it the round-7 line that compares the
 * balance with the newest bank SMS. Tapping the row opens the account's sheet.
 */
export default function FundAccountRow({
  account,
  status,
  onOpen
}: {
  account: WalletAccountWithRow
  /** The reconcile status block (`WalletSmsReconcileStatus`), when the account can have one. */
  status?: ReactNode
  onOpen: () => void
}) {
  return (
    <li className="flex flex-col border-t border-border first:border-t-0">
      <button
        type="button"
        className={cn(
          calmRowClass,
          'w-full cursor-pointer border-0 bg-transparent text-start first:border-t-0'
        )}
        aria-label={`حساب ${account.title}`}
        onClick={onOpen}
      >
        <span className={buildingDayBadgeClass}>
          <AppIcon name="wallet" size={16} />
        </span>
        <span className={calmRowMainClass}>
          <span className={buildingRowTitleClass}>{account.title}</span>
          <span className={buildingRowSubClass}>{fundAccountMeta(account)}</span>
        </span>
        <span className={buildingRowEndClass}>
          <MoneyText amount={account.balance} />
        </span>
      </button>
      {status}
    </li>
  )
}
