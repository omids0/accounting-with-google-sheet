import { describeTransfer, type Transfer, type TransferLegInfo } from '../../../services/transfers'
import type { WalletAccount } from '../../../types'
import CardDeleteButton from '../../CardDeleteButton'
import TransactionListItem from '../../TransactionListItem'
import { lineItemsBadgeClass } from '../../ui/lineItemStyles'

/**
 * One transfer in «انتقال‌ها»: «انتقال از «A» به «B»», then amount · date · note, and delete.
 * «ناتمام» marks a transfer whose save was cut off (fewer than two balance moves in the history).
 */
export default function TransferListItem({
  transfer,
  accounts,
  legs,
  index,
  deleting,
  onDelete
}: {
  transfer: Transfer
  accounts: WalletAccount[]
  /** Which balance moves of the transfer exist; unknown while the history is not read. */
  legs?: TransferLegInfo
  index: number
  deleting: boolean
  onDelete: (transfer: Transfer) => void
}) {
  const { title, subtitle } = describeTransfer(transfer, accounts)

  return (
    <TransactionListItem
      title={title}
      meta={subtitle}
      index={index}
      wrapTitle
      titleAddon={
        legs && legs.state < 2 ? (
          <span className={`${lineItemsBadgeClass} text-danger`}>ناتمام</span>
        ) : undefined
      }
    >
      <CardDeleteButton itemLabel={title} disabled={deleting} onClick={() => onDelete(transfer)} />
    </TransactionListItem>
  )
}
