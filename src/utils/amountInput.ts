import { normalizeDigits } from './normalizeDigits'

/** The most a money field takes: 10 trillion toman («۱۰ هزار میلیارد»). */
export const MAX_AMOUNT = 10_000_000_000_000

export const AMOUNT_INTEGER_ONLY_HINT = 'فقط عدد صحیح به تومان'

export const AMOUNT_MAX_MESSAGE = 'حداکثر مبلغ ۱۰ هزار میلیارد تومان است'

export interface AmountInputResult {
  /** Plain ASCII digits that were accepted; empty when none. */
  digits: string
  /** A decimal separator and everything after it was dropped. */
  cutDecimal: boolean
  /** The digits pass `max`; the caller keeps its previous value. */
  overMax: boolean
}

/** «۱٬۲۳۴» or «1,234»: a comma-like mark followed by exactly three digits is grouping. */
function isGrouping(text: string, index: number): boolean {
  const run = /^\d*/.exec(text.slice(index + 1))?.[0] ?? ''

  return run.length === 3
}

/**
 * Digits of typed or pasted amount text. Letters are ignored, grouping marks («1,234»,
 * «۱٬۲۳۴») are removed, and a decimal separator ends the number: «12.5» is 12, never 125.
 */
export function parseAmountInput(raw: string, max = MAX_AMOUNT): AmountInputResult {
  const text = normalizeDigits(raw).replace(/[^\d.,٫٬،]/g, '')

  let digits = ''
  let cutDecimal = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (/\d/.test(char)) {
      digits += char
    } else if (char === '.' || char === '٫' || !isGrouping(text, i)) {
      cutDecimal = true
      break
    }
  }

  digits = digits.replace(/^0+(?=\d)/, '')

  return { digits, cutDecimal, overMax: digits !== '' && Number(digits) > max }
}
