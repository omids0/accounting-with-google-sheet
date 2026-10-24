import { parseImportDate } from './importDateCell'
import { parseMoneyText, parseNumericStrict } from '../utils/parseNumeric'

/**
 * Cell checks shared by the CSV importers. Each throws an Error whose message is the reason
 * shown in the import preview (see `ImportRowTransform`), «<label> …», and returns the clean value.
 */

export type MoneyRule = 'positive' | 'nonNegative' | 'any'

const faNumber = (value: number) => value.toLocaleString('fa-IR', { useGrouping: false })

const isBlank = (cell: string | undefined) => !String(cell ?? '').trim()

/** A cell the sheet cannot do without. */
export function requiredTextCell(cell: string | undefined, label: string): string {
  const text = String(cell ?? '').trim()

  if (!text) throw new Error(`${label} خالی است`)

  return text
}

/** An amount, read the way the app prints it («۲٬۵۰۰ تومان»); empty counts as «not a number». */
export function moneyCell(cell: string | undefined, label: string, rule: MoneyRule = 'positive') {
  const amount = parseMoneyText(cell)

  if (amount === null) throw new Error(`${label} عدد نیست`)
  if (rule === 'positive' && amount <= 0) throw new Error(`${label} باید بیشتر از صفر باشد`)
  if (rule === 'nonNegative' && amount < 0) throw new Error(`${label} نباید منفی باشد`)

  return amount
}

/** Like {@link moneyCell}, but an empty cell is `fallback`. */
export function optionalMoneyCell(
  cell: string | undefined,
  label: string,
  rule: MoneyRule = 'nonNegative',
  fallback = 0
): number {
  return isBlank(cell) ? fallback : moneyCell(cell, label, rule)
}

/** A whole number within `min`…`max`. */
export function intCell(cell: string | undefined, label: string, min: number, max: number) {
  const value = parseNumericStrict(cell)

  if (value === null) throw new Error(`${label} عدد نیست`)

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} باید عدد صحیح بین ${faNumber(min)} تا ${faNumber(max)} باشد`)
  }

  return value
}

/** Like {@link intCell}, but an empty cell is `fallback`. */
export function optionalIntCell(
  cell: string | undefined,
  label: string,
  min: number,
  max: number,
  fallback: number
): number {
  return isBlank(cell) ? fallback : intCell(cell, label, min, max)
}

/** A date as ISO; Jalali and Persian digits are read (see `parseImportDate`). */
export function dateCell(cell: string | undefined, label: string): string {
  const text = String(cell ?? '').trim()

  if (!text) throw new Error(`${label} خالی است`)

  const iso = parseImportDate(text)

  if (!iso) throw new Error(`${label} معتبر نیست`)

  return iso
}

/** Like {@link dateCell}, but an empty cell stays empty. */
export function optionalDateCell(cell: string | undefined, label: string): string {
  return isBlank(cell) ? '' : dateCell(cell, label)
}

/** One of `allowed`; an empty cell is `fallback`, any other word is refused. */
export function choiceCell<T extends string>(
  cell: string | undefined,
  label: string,
  allowed: readonly T[],
  fallback: T
): T {
  const text = String(cell ?? '').trim()

  if (!text) return fallback
  if (!(allowed as readonly string[]).includes(text)) throw new Error(`${label} نامعتبر است`)

  return text as T
}
