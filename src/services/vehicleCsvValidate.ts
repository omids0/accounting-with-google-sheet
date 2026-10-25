import { moneyCell, optionalDateCell, requiredTextCell, withCells } from './importCellValidate'
import { VALID_INTERVALS } from './vehicleProfiles'

const isBlank = (cell: string | undefined) => !String(cell ?? '').trim()

/** A build year: Jalali (1300–1500) or Gregorian (1900–2100), as 4 digits. */
function buildYearCell(cell: string | undefined): string {
  if (isBlank(cell)) return ''

  const year = moneyCell(cell, 'سال ساخت', 'nonNegative')

  const jalali = year >= 1300 && year <= 1500

  const gregorian = year >= 1900 && year <= 2100

  if (!Number.isInteger(year) || !(jalali || gregorian)) throw new Error('سال ساخت معتبر نیست')

  return String(year)
}

/**
 * A vehicles CSV row the sheet can take: a title and a mileage from zero up are required (as in
 * the form); the build year, when given, a real year, the mileage reminder one of the app's
 * intervals and the last mileage update a real date (it comes back as ISO). Throws an Error whose
 * message is the reason shown in the import preview.
 */
export function validateVehicleCsvCells(cells: string[]): string[] {
  const interval = String(cells[8] ?? '').trim()

  if (interval && !VALID_INTERVALS.has(interval as never)) {
    throw new Error('یادآوری کارکرد نامعتبر است')
  }

  return withCells(cells, {
    2: requiredTextCell(cells[2], 'عنوان'),
    3: String(moneyCell(cells[3], 'کارکرد', 'nonNegative')),
    5: buildYearCell(cells[5]),
    9: optionalDateCell(cells[9], 'آخرین بروز کارکرد')
  })
}
