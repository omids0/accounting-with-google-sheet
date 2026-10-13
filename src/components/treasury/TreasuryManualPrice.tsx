import { isManualPriceStale } from '../../services/treasuryCatalog'
import type { VaultAsset } from '../../types'
import { formatDayBadge } from '../../utils/periodLabel'
import CardEditButton from '../CardEditButton'
import MoneyText from '../MoneyText'
import { treasuryManualPriceClass, treasuryStaleHintClass } from '../ui/treasuryReceivableStyles'

/** «قیمت دستی · ۱۲ مهر ✎», with an amber nudge once the price is over 30 days old. */
export default function TreasuryManualPrice({
  asset,
  onEdit
}: {
  asset: VaultAsset
  onEdit: (asset: VaultAsset) => void
}) {
  if (asset.priceSource !== 'manual') return null

  const badge = asset.manualPriceAt ? formatDayBadge(asset.manualPriceAt) : null

  return (
    <div className={treasuryManualPriceClass}>
      <span>
        قیمت دستی{badge ? ` · ${badge.day} ${badge.month}` : ''}
        {asset.manualPrice > 0 ? (
          <>
            {' · '}
            <MoneyText amount={asset.manualPrice} />
          </>
        ) : null}
      </span>
      <CardEditButton onClick={() => onEdit(asset)} ariaLabel={`به‌روزرسانی قیمت ${asset.name}`} />
      {isManualPriceStale(asset) && (
        <span className={treasuryStaleHintClass}>قیمت را به‌روز کن</span>
      )}
    </div>
  )
}
