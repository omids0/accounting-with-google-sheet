import { VAULT_ASSET_OPTIONS } from '../../services/tgju'
import type { VaultAssetType } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import Button from '../ui/Button'
import Card from '../ui/Card'

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
    <Card className="treasury-price-card">
      <div className="treasury-price-header">
        <span className="treasury-price-title">قیمت لحظه‌ای (tgju.org)</span>
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
      <div className="treasury-price-grid">
        {VAULT_ASSET_OPTIONS.map(opt => (
          <div key={opt.value} className="treasury-price-item">
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
