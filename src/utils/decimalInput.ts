import { normalizeDigits } from './normalizeDigits'
import { parseNumericStrict } from './parseNumeric'

/**
 * What a decimal text field keeps of typed text: Persian/Arabic digits become ASCII, «٫» becomes
 * the point, one optional leading minus and one point stay, everything else goes.
 */
export function sanitizeDecimalInput(value: string): string {
  const text = normalizeDigits(value).replace(/٫/g, '.').replace(/−/g, '-')

  const negative = text.trimStart().startsWith('-')

  const digits = text.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')

  return negative ? `-${digits}` : digits
}

/**
 * The text a number field shows. While the user types, the draft («1.», «-») stays as typed as
 * long as it still stands for the stored value; otherwise the stored value is shown.
 */
export function decimalFieldText(draft: string | null, value: string | number): string {
  const stored = value === '' || value === undefined ? null : parseNumericStrict(value)

  if (draft !== null && parseNumericStrict(draft) === stored) return draft

  return stored === null ? '' : String(value)
}

/** The stored value for typed text: '' while empty or not yet a number («-», «.»). */
export function decimalFieldValue(text: string): number | '' {
  return parseNumericStrict(text) ?? ''
}
