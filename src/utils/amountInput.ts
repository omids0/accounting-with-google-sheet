import { normalizeDigits } from './normalizeDigits'

/** The most a money field takes: 10 trillion toman («۱۰ هزار میلیارد»). */
export const MAX_AMOUNT = 10_000_000_000_000

/** «فقط عدد صحیح به تومان»; a plain number field (km) has no money unit: «فقط عدد صحیح». */
export function amountIntegerHint(currency?: string): string {
  return currency ? `فقط عدد صحیح به ${currency}` : 'فقط عدد صحیح'
}

/** The max as money in the field's currency; a plain number field says it generically. */
export function amountMaxMessage(currency?: string): string {
  return currency ? `حداکثر مبلغ ۱۰ هزار میلیارد ${currency} است` : 'عدد خیلی بزرگ است'
}

export const AMOUNT_INTEGER_ONLY_HINT = amountIntegerHint('تومان')

export const AMOUNT_MAX_MESSAGE = amountMaxMessage('تومان')

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

const KEEP = /[^\d.,٫٬،/]/g

/**
 * Digits of typed or pasted amount text. Letters are ignored, grouping marks («1,234»,
 * «۱٬۲۳۴») are removed, and a decimal separator ends the number: «12.5» is 12, never 125.
 *
 * `previous` is the text the field showed before this change. Its grouping marks are the
 * field's own formatting («۱٬۲۳۴» + a typed «۵» is «۱٬۲۳۴۵»), so they never count as a decimal
 * point; only a mark the user added does.
 */
export function parseAmountInput(
  raw: string,
  options: { previous?: string; max?: number } = {}
): AmountInputResult {
  const { previous = '', max = MAX_AMOUNT } = options
  const text = normalizeDigits(raw).replace(KEEP, '')
  const known: Record<string, number> = {}

  for (const char of normalizeDigits(previous).replace(KEEP, '')) {
    if (!/\d/.test(char)) known[char] = (known[char] ?? 0) + 1
  }

  const seen: Record<string, number> = {}

  let digits = ''
  let cutDecimal = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (/\d/.test(char)) {
      digits += char
      continue
    }

    seen[char] = (seen[char] ?? 0) + 1

    // «٫» and «/» (the Persian keyboard's decimal mark) are always decimal points. A dot is
    // grouping only in a chain like «1.234.567»; a comma-like mark in «1,234».
    const isDecimalMark = char === '٫' || char === '/'
    const isGroupingDot = char === '.' && text.split('.').length > 2 && isGrouping(text, i)
    const isFieldFormatting = !isDecimalMark && char !== '.' && seen[char] <= (known[char] ?? 0)
    const isGroupingMark = char !== '.' && !isDecimalMark && isGrouping(text, i)

    if (isFieldFormatting || isGroupingMark || isGroupingDot) continue

    cutDecimal = true
    break
  }

  digits = digits.replace(/^0+(?=\d)/, '')

  return { digits, cutDecimal, overMax: digits !== '' && Number(digits) > max }
}
