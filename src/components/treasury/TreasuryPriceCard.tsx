import type { TgjuDisplayPrices } from '../../services/tgjuCurrency'
import type { VaultAsset } from '../../types'
import { getCurrency } from '../../utils/formatMoney'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { formHintClass } from '../ui/formStyles'
import {
  treasuryPriceCardClass,
  treasuryPriceGridClass,
  treasuryPriceHeaderClass,
  treasuryPriceItemClass,
  treasuryPriceTitleClass
} from '../ui/treasuryReceivableStyles'

type TreasuryPriceCardProps = {
  prices: TgjuDisplayPrices
  /** tgju-priced assets to list (the selected class). */
  assets: VaultAsset[]
  priceLoading: boolean
  onRefresh: () => void
}

export default function TreasuryPriceCard({
  prices,
  assets,
  priceLoading,
  onRefresh
}: TreasuryPriceCardProps) {
  const shownInToman = prices.currency !== getCurrency()

  // A missing or non-numeric tgju quote is stored as 0 — skip it rather than show «۰» or NaN.
  const options = assets.filter(asset => prices.prices[asset.id] > 0)

  if (!options.length) return null

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
          loading={priceLoading}
          style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
        >
          بروزرسانی
        </Button>
      </div>
      <div className={treasuryPriceGridClass}>
        {options.map(asset => (
          <div key={asset.id} className={treasuryPriceItemClass}>
            <span>
              {asset.name}
              {asset.unit === 'گرم' && ` (${asset.unit})`}
            </span>
            <span>
              <MoneyText amount={prices.prices[asset.id]} currency={prices.currency} />
            </span>
          </div>
        ))}
      </div>
      {shownInToman && (
        <p className={formHintClass}>
          نرخ تبدیل به واحد پول انتخابی در دسترس نبود؛ قیمت‌ها به تومان نمایش داده شده‌اند و در
          مجموع دارایی‌ها لحاظ نمی‌شوند.
        </p>
      )}
    </Card>
  )
}
