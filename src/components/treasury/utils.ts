import { getAssetUnit } from '../../services/tgju'
import type { VaultAssetType } from '../../types'
import { normalizeDigits } from '../../utils/normalizeDigits'

export function formatQuantity(qty: number, assetType: VaultAssetType): string {
  const formatted =
    assetType === 'geram18'
      ? qty.toLocaleString('fa-IR', { maximumFractionDigits: 2 })
      : qty.toLocaleString('fa-IR', { maximumFractionDigits: 0 })

  return `${formatted} ${getAssetUnit(assetType)}`
}

export function parseQuantityInput(value: string, allowDecimal: boolean): number | '' {
  const normalized = normalizeDigits(value).replace(/[^\d.]/g, '')

  if (!normalized) return ''

  const num = allowDecimal ? Number(normalized) : Math.trunc(Number(normalized))

  return Number.isFinite(num) && num > 0 ? num : ''
}
