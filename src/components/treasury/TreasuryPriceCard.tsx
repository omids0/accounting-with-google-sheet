import { VAULT_ASSET_OPTIONS } from '../../services/tgju'
import type { VaultAssetType } from '../../types'
import { formatMoney } from '../../utils/formatMoney'

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
    <div className="card treasury-price-card">
      <div className="treasury-price-header">
        <span className="treasury-price-title">قیمت لحظه‌ای (tgju.org)</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={priceLoading}
          style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
        >
          {priceLoading ? '...' : 'بروزرسانی'}
        </button>
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
    </div>
  )
}
