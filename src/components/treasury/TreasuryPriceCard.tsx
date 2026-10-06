import { VAULT_ASSET_OPTIONS } from '../../services/tgju'
import type { TgjuDisplayPrices } from '../../services/tgjuCurrency'
import { formatMoney, getCurrency } from '../../utils/formatMoney'
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
  priceLoading: boolean
  onRefresh: () => void
}

export default function TreasuryPriceCard({
  prices,
  priceLoading,
  onRefresh
}: TreasuryPriceCardProps) {
  const shownInToman = prices.currency !== getCurrency()

  // A missing or non-numeric tgju quote is stored as 0 — skip it rather than show «۰» or NaN.
  const options = VAULT_ASSET_OPTIONS.filter(opt => prices.prices[opt.value] > 0)

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
        {options.map(opt => (
          <div key={opt.value} className={treasuryPriceItemClass}>
            <span>
              {opt.label}
              {opt.unit !== 'عدد' && opt.unit !== 'دلار' && ` (${opt.unit})`}
            </span>
            <span dir="ltr">{formatMoney(prices.prices[opt.value], prices.currency)}</span>
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
