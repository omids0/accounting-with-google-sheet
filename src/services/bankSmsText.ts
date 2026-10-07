import { normalizeDigits } from '../utils/normalizeDigits'

/** ZWNJ/ZWJ, bidi marks and isolates, BOM — invisible but they break literal matching. */
const INVISIBLE_CHARS = /[\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g

/**
 * Bring an SMS into one canonical shape before tokenising or matching:
 * ASCII digits, Persian «ی»/«ک», no invisible marks, single spaces.
 */
export function normalizeSmsText(text: string): string {
  return normalizeDigits(text)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(INVISIBLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type SmsNumberKind = 'date' | 'time' | 'ref' | 'amount'

export type SmsToken =
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: string; numberKind: SmsNumberKind }

/** Order matters: the first alternative that matches at a position wins. */
const NUMBER_PATTERNS: [SmsNumberKind, string][] = [
  ['date', String.raw`\d{2,4}[/-]\d{1,2}[/-]\d{1,2}`],
  ['time', String.raw`\d{1,2}:\d{2}(?::\d{2})?`],
  // Masked or dotted references: 6104***1234, 1234...5678, ***1234, 205.8000.1234567.1
  ['ref', String.raw`(?:[*xX]+|\.{2,})?\d+(?:(?:[*xX]+|\.+|-)\d+)+|(?:[*xX]+|\.{2,})\d+`],
  ['amount', String.raw`\d+(?:[,،٬]\d{3})*`]
]

const NUMBER_RE = new RegExp(NUMBER_PATTERNS.map(([, source]) => `(${source})`).join('|'), 'g')

/** Split already-normalised text into literal text and number tokens. */
export function tokenizeSms(normalized: string): SmsToken[] {
  const tokens: SmsToken[] = []
  let last = 0

  for (const match of normalized.matchAll(NUMBER_RE)) {
    const index = match.index ?? 0

    if (index > last) tokens.push({ kind: 'text', value: normalized.slice(last, index) })

    const group = match.slice(1).findIndex(value => value !== undefined)

    tokens.push({ kind: 'number', value: match[0], numberKind: NUMBER_PATTERNS[group][0] })
    last = index + match[0].length
  }

  if (last < normalized.length) tokens.push({ kind: 'text', value: normalized.slice(last) })

  return tokens
}

/** Keep equal to BANK_SMS_KEYWORDS in the native BankSmsReceiver (step 3 adds a test). */
export const BANK_SMS_KEYWORDS = [
  'مبلغ',
  'ریال',
  'تومان',
  'مانده',
  'موجودی',
  'برداشت',
  'واریز',
  'خرید',
  'انتقال'
]

/** Cheap prefilter: three or more digits plus one money keyword. */
export function isBankLike(raw: string): boolean {
  const text = normalizeSmsText(raw)

  return (
    /\d{3,}/.test(text.replace(/[,،٬]/g, '')) && BANK_SMS_KEYWORDS.some(word => text.includes(word))
  )
}
