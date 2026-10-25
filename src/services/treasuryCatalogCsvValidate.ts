import { intCell, optionalMoneyCell, requiredTextCell, withCells } from './importCellValidate'
import { MAX_QUANTITY_DECIMALS, VAULT_ASSET_CLASSES } from './treasuryCatalog'

const PRICE_SOURCES = ['manual', 'tgju']

const isBlank = (cell: string | undefined) => !String(cell ?? '').trim()

/**
 * A vault asset CSV row the sheet can take: the name is required (as in the form); the class,
 * when given, must be one of the app's classes (id or Persian label), the price source manual or
 * tgju, the decimals a whole number 0–8 and the manual price a number from zero up. Empty cells
 * keep the built-in defaults. Throws an Error whose message is the reason shown in the import
 * preview.
 */
export function validateVaultAssetCsvCells(cells: string[]): string[] {
  const assetClass = String(cells[1] ?? '').trim()

  if (assetClass && !VAULT_ASSET_CLASSES.some(item => [item.id, item.label].includes(assetClass))) {
    throw new Error('کلاس دارایی نامعتبر است')
  }

  const source = String(cells[6] ?? '').trim()

  if (source && !PRICE_SOURCES.includes(source)) throw new Error('منبع قیمت نامعتبر است')

  const price = optionalMoneyCell(cells[8], 'قیمت دستی', 'nonNegative', 0)

  return withCells(cells, {
    3: requiredTextCell(cells[3], 'نام'),
    5: isBlank(cells[5]) ? '' : String(intCell(cells[5], 'اعشار', 0, MAX_QUANTITY_DECIMALS)),
    8: price ? String(price) : ''
  })
}
