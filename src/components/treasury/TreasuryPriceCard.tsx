import { VAULT_ASSET_OPTIONS } from '../../services/tgju'
import type { VaultAssetType } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  treasuryPriceCardClass,
  treasuryPriceGridClass,
  treasuryPriceHeaderClass,
  treasuryPriceItemClass,
  treasuryPriceTitleClass
} from '../ui/treasuryReceivableStyles'

type TreasuryPriceCardProps = {
  prices: Record<VaultAssetType, number>
  priceLoading: boolean
  onRefresh: () => void
}

export default function TreasuryPriceCard({
  prices,
  priceLoading,
  onRefresh
}: TreasuryPriceCardProps) {
  return (
    <Card className={treasuryPriceCardClass}>
      <div className={treasuryPriceHeaderClass}>
        <span className={treasuryPriceTitleClass}>قیمت لحظه‌ای (tgju.org)</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={priceLoading}
          style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
        >
          {priceLoading ? '...' : 'بروزرسانی'}
        </Button>
      </div>
      <div className={treasuryPriceGridClass}>
        {VAULT_ASSET_OPTIONS.map(opt => (
          <div key={opt.value} className={treasuryPriceItemClass}>
            <span>
              {opt.label}
              {opt.unit !== 'عدد' && opt.unit !== 'دلار' && ` (${opt.unit})`}
            </span>
            <span dir="ltr">{formatMoney(prices[opt.value])}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
