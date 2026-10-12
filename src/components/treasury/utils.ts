import { resolveVaultAsset } from '../../services/treasuryCatalog'
import { formatQuantityValue } from '../../services/treasuryQuantity'

/** «۲٫۵ گرم» with the asset's catalog decimals and unit. */
export function formatQuantity(qty: number, assetType: string): string {
  const asset = resolveVaultAsset(assetType)

  return `${formatQuantityValue(qty, asset.decimals)} ${asset.unit}`.trim()
}
