import type { TransactionWithRow } from './types'
import { formatQuantity } from './utils'
import { getAssetUnit } from '../../services/tgju'
import type { VaultTransaction } from '../../types'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import {
  treasuryTxEditClass,
  treasuryTxItemClass as treasuryTxPositionClass
} from '../ui/displayStyles'
import { cardActionButtonsClass, installmentDueClass } from '../ui/featureCardStyles'
import {
  treasuryTxBadgeClass,
  treasuryTxDetailsClass,
  treasuryTxInteractiveClass,
  treasuryTxItemClass,
  treasuryTxMainClass
} from '../ui/treasuryReceivableStyles'

type TreasuryTransactionItemProps = {
  tx: VaultTransaction
  onEdit: (tx: TransactionWithRow) => void
  onDelete: (tx: TransactionWithRow) => void
}

export default function TreasuryTransactionItem({
  tx,
  onEdit,
  onDelete
}: TreasuryTransactionItemProps) {
  const txWithRow = tx as TransactionWithRow

  return (
    <div className={cn(treasuryTxItemClass, treasuryTxInteractiveClass, treasuryTxPositionClass)}>
      {tx.action === 'buy' && 'rowNumber' in tx && (
        <div className={treasuryTxEditClass}>
          <div className={cardActionButtonsClass}>
            <CardEditButton onClick={() => onEdit(txWithRow)} />
            <CardDeleteButton onClick={() => onDelete(txWithRow)} />
          </div>
        </div>
      )}
      <div className={treasuryTxMainClass}>
        <span className={treasuryTxBadgeClass(tx.action)}>
          {tx.action === 'buy' ? 'خرید' : 'فروش'}
        </span>
        <span>{formatQuantity(tx.quantity, tx.assetType)}</span>
      </div>
      <div className={treasuryTxDetailsClass}>
        <span dir="ltr">
          {formatMoney(tx.unitPrice)} / {getAssetUnit(tx.assetType)}
        </span>
        <span className={installmentDueClass}>{formatIsoDatePersian(tx.transactionDate)}</span>
        {tx.note && <span className={installmentDueClass}>{tx.note}</span>}
      </div>
    </div>
  )
}
