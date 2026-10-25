import type { VaultAction } from '../types'
import { choiceCell, dateCell, moneyCell, optionalMoneyCell } from './importCellValidate'
import { normalizeAssetId } from './treasuryCatalog'

const ACTIONS = ['buy', 'sell'] as const

export interface ValidTreasuryCsvCells {
  assetType: string
  action: VaultAction
  quantity: number
  unitPrice: number
  transactionDate: string
}

/**
 * The cells of a vault transaction CSV row the sheet cannot do without: an asset of the catalog
 * (`knownIds`, by id or a legacy id or name), the action buy or sell, a quantity above zero, a
 * unit price from zero up when given, and a real date (it comes back as ISO). Throws an Error
 * whose message is the reason shown in the import preview.
 */
export function validateTreasuryCsvCells(
  cells: string[],
  knownIds: ReadonlySet<string>
): ValidTreasuryCsvCells {
  const assetType = normalizeAssetId(cells[2])

  if (!assetType) throw new Error('نوع دارایی خالی است')
  if (!knownIds.has(assetType)) throw new Error('نوع دارایی در صندوقچه نیست')
  if (!String(cells[3] ?? '').trim()) throw new Error('عملیات خالی است')

  return {
    assetType,
    action: choiceCell(cells[3], 'عملیات', ACTIONS, 'buy'),
    quantity: moneyCell(cells[4], 'مقدار'),
    unitPrice: optionalMoneyCell(cells[5], 'قیمت واحد'),
    transactionDate: dateCell(cells[6], 'تاریخ')
  }
}
