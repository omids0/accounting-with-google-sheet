import TreasurySellForm from './TreasurySellForm'
import TreasuryTransactionItem from './TreasuryTransactionItem'
import type { TransactionWithRow, VaultFormState } from './types'
import { formatQuantity } from './utils'
import { getAssetLabel } from '../../services/tgju'
import type { VaultAssetType, VaultHolding } from '../../types'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'
import Button from '../ui/Button'
import {
  installmentChevronClass,
  installmentHeaderClass,
  installmentPaymentsClass,
  installmentCardClass
} from '../ui/featureCardStyles'
import {
  receivableAddPaymentClass,
  receivablePaymentListTitleClass,
  treasuryHoldingCardClass,
  treasuryHoldingValueClass
} from '../ui/treasuryReceivableStyles'

type TreasuryHoldingCardProps = {
  holding: VaultHolding
  expanded: boolean
  activeSellAsset: VaultAssetType | null
  sellingAsset: VaultAssetType | null
  onToggle: () => void
  onEdit: (tx: TransactionWithRow) => void
  onDelete: (tx: TransactionWithRow) => void
  onOpenSellForm: (assetType: VaultAssetType) => void
  onCloseSellForm: () => void
  onSell: (assetType: VaultAssetType, available: number, values: VaultFormState) => void
}

export default function TreasuryHoldingCard({
  holding,
  expanded,
  activeSellAsset,
  sellingAsset,
  onToggle,
  onEdit,
  onDelete,
  onOpenSellForm,
  onCloseSellForm,
  onSell
}: TreasuryHoldingCardProps) {
  const showSellForm = activeSellAsset === holding.assetType

  return (
    <div className={cn(installmentCardClass({ expanded }), treasuryHoldingCardClass)}>
      <button type="button" className={installmentHeaderClass(expanded)} onClick={onToggle}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {getAssetLabel(holding.assetType)}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.25rem'
            }}
          >
            {formatQuantity(holding.netQuantity, holding.assetType)}
            {' · '}
            قیمت روز: {formatMoney(holding.currentUnitPrice)}
          </div>
          <div className={treasuryHoldingValueClass}>
            ارزش کل: {formatMoney(holding.totalValue)}
          </div>
        </div>
        <span className={installmentChevronClass}>▼</span>
      </button>

      <AccordionCollapse open={expanded}>
        <div className={installmentPaymentsClass}>
          <div className={receivablePaymentListTitleClass}>سوابق خرید و فروش</div>
          {holding.transactions.map(tx => (
            <TreasuryTransactionItem key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
          ))}

          <div className={receivableAddPaymentClass}>
            {showSellForm ? (
              <TreasurySellForm
                assetType={holding.assetType}
                selling={sellingAsset === holding.assetType}
                onSell={values => onSell(holding.assetType, holding.netQuantity, values)}
                onCancel={onCloseSellForm}
              />
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenSellForm(holding.assetType)}
              >
                + ثبت فروش
              </Button>
            )}
          </div>
        </div>
      </AccordionCollapse>
    </div>
  )
}
