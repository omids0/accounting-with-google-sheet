import { parseMoneyText } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

export interface ValidChecksCsvCells {
  counterparty: string
  amount: number
  creationDate: string
  dueDate: string
}

/**
 * The cells of a checks CSV row the sheet cannot do without. Throws an Error whose message is
 * the reason shown in the import preview (see `ImportRowTransform`). Dates come back as ISO.
 */
export function validateChecksCsvCells(cells: string[]): ValidChecksCsvCells {
  const counterparty = (cells[3] ?? '').trim()

  if (!counterparty) throw new Error('طرف حساب خالی است')

  const amount = parseMoneyText(cells[4])

  if (amount === null) throw new Error('مبلغ عدد نیست')
  if (amount <= 0) throw new Error('مبلغ باید بیشتر از صفر باشد')

  const creationText = (cells[5] ?? '').trim()

  const creationDate = normalizeSheetDate(creationText)

  if (creationText && !creationDate) throw new Error('تاریخ صدور معتبر نیست')

  const dueText = (cells[6] ?? '').trim()

  const dueDate = normalizeSheetDate(dueText)

  if (!dueDate) throw new Error(dueText ? 'تاریخ سررسید معتبر نیست' : 'تاریخ سررسید خالی است')

  return { counterparty, amount, creationDate, dueDate }
}
