import AppIcon from '../AppIcon'
import TreasuryManualPrice from './TreasuryManualPrice'
import TreasurySellForm from './TreasurySellForm'
import TreasuryTransactionItem from './TreasuryTransactionItem'
import type { TransactionWithRow, VaultFormState } from './types'
import { formatQuantity } from './utils'
import { getAssetClassLabel } from '../../services/treasuryCatalog'
import type { VaultAsset, VaultAssetType, VaultHolding } from '../../types'
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
  treasuryClassTagClass,
  treasuryHoldingCardClass,
  treasuryHoldingValueClass,
  treasuryManualRowClass
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
  /** ✎ on a manual price: edit the catalog asset. */
  onEditAsset: (asset: VaultAsset) => void
  /** Only the details (desktop table detail row); the row itself shows the summary. */
  bodyOnly?: boolean
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
  onSell,
  onEditAsset,
  bodyOnly = false
}: TreasuryHoldingCardProps) {
  const showSellForm = activeSellAsset === holding.assetType
  const { asset } = holding
  const classTag = [getAssetClassLabel(asset.assetClass), asset.symbol].filter(Boolean).join(' · ')

  return (
    <div
      className={
        bodyOnly ? undefined : cn(installmentCardClass({ expanded }), treasuryHoldingCardClass)
      }
    >
      {!bodyOnly && (
        <button type="button" className={installmentHeaderClass(expanded)} onClick={onToggle}>
          <div>
            <div className={treasuryClassTagClass}>{classTag}</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{asset.name}</div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginTop: '0.25rem'
              }}
            >
              {formatQuantity(holding.netQuantity, holding.assetType)}
              {' · '}
              {asset.priceSource === 'manual' ? 'قیمت' : 'قیمت روز'}:{' '}
              {formatMoney(holding.currentUnitPrice)}
            </div>
            <div className={treasuryHoldingValueClass}>
              ارزش کل: {formatMoney(holding.totalValue)}
            </div>
          </div>
          <span className={installmentChevronClass} aria-hidden>
            <AppIcon name="chevron-down" size={14} />
          </span>
        </button>
      )}

      {asset.priceSource === 'manual' && (
        <div className={bodyOnly ? undefined : treasuryManualRowClass}>
          <TreasuryManualPrice asset={asset} onEdit={onEditAsset} />
        </div>
      )}

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
