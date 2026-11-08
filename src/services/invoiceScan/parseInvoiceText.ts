import type { CurrencyUnit, SmsAmountUnit } from '../../types'
import type { LineItem } from '../../utils/lineItems'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { toAppCurrency } from '../bankSmsAmount'
import { jalaliToIsoSafe } from '../bankSmsDate'

/** A proposed item; `uncertain` marks a row whose numbers did not add up (quantity × price ≠ amount). */
export interface ParsedItem extends LineItem {
  uncertain?: boolean
}

export interface ParsedInvoice {
  items: ParsedItem[]
  /** Grand total printed on the invoice, in the app currency; null when none was found. */
  total: number | null
  /** `YYYY-MM-DD`; null when the invoice has no plausible Jalali date. */
  date: string | null
  /** Unit the invoice prints; null when it names none (amounts stay as printed). */
  unit: SmsAmountUnit | null
}

/** Rows that carry a number but are never an item: sums, taxes, ids, contact lines. */
const SKIP_ROW =
  /جمع|مالیات|ارزش\s*افزوده|عوارض|تخفیف|تلفن|تماس|شماره|کد\s|کارت|پی[گک]یری|مرجع|پایانه|مانده|ردیف|نام\s*کالا|شرح\s*کالا|فاکتور|رسید|ساعت|تاریخ|آدرس|نشانی|صندوق/

/**
 * Total rows, strongest first: what is payable beats a plain «جمع کل» (tax or discount may still
 * change it). The recognizer often writes «پرداخت» as «برداخت», so both are allowed.
 */
const TOTAL_ROWS: { pattern: RegExp; rank: number }[] = [
  { pattern: /قابل\s*[پب]رداخت|مبلغ\s*نهایی|جمع\s*نهایی|[پب]رداختی/, rank: 2 },
  { pattern: /جمع\s*کل|مبلغ\s*کل|جمع\s*فاکتور/, rank: 1 }
]

/** A row number in front of the name («۳ شکر سفید …»): not a quantity. */
const ROW_INDEX = /^\d{1,3}\s+(?=\D)/

const DATE_IN_TEXT = /(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})/

const NUMBER = /\d{1,3}(?:[,٬،]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g

const MIN_NAME_LETTERS = 2

/** The smallest printed unit price that can be told from a quantity. */
const MIN_UNIT_PRICE = 100

const MAX_QUANTITY = 999

/** A guessed total may exceed the item sum by tax and fees, but not by more than this factor. */
const MAX_TAX_FACTOR = 1.3

/** An amount below this (as printed) is a misread digit, not a price. */
const MIN_ITEM_AMOUNT = 10

/** Drops the stray glyphs OCR leaves in a Persian name: short Latin tokens and one-letter edge words. */
function tidyName(name: string): string {
  const persian = countLetters(name) >= MIN_NAME_LETTERS
  const words = name.split(' ').filter(word => !(persian && /^[A-Za-z]{1,2}$/.test(word)))
  const edgeIsStray = (word: string | undefined) => word !== undefined && word.length === 1

  while (words.length > 1 && edgeIsStray(words[0])) words.shift()
  while (words.length > 1 && edgeIsStray(words[words.length - 1])) words.pop()

  return words.join(' ') || name
}

/** Longest number an item may have: past it the token is a phone, card or reference number. */
const MAX_AMOUNT_DIGITS = 12

function cleanLine(raw: string): string {
  return normalizeDigits(raw)
    .replace(/[‌‎‏‪-‮⁦-⁩]/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ى/g, 'ی')
    .replace(/[|_=~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The words of a row: its text without numbers, symbols and the currency word; '' when too short. */
function lettersOf(line: string): string {
  const name = line
    .replace(new RegExp(NUMBER.source, 'g'), ' ')
    .replace(/[^؀-ۿA-Za-z\s]/g, ' ')
    .replace(/ریال|تومان/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return countLetters(name) < MIN_NAME_LETTERS && !/[A-Za-z]{3,}/.test(name) ? '' : name
}

function countLetters(text: string): number {
  return (text.match(/[؀-ۿ]/g) ?? []).length
}

function numbersOf(text: string): number[] {
  const withoutDates = text.replace(new RegExp(DATE_IN_TEXT, 'g'), ' ')

  return Array.from(withoutDates.matchAll(NUMBER), match => match[0])
    .filter(token => token.replace(/\D/g, '').length <= MAX_AMOUNT_DIGITS)
    .filter(token => !/^0\d{6,}/.test(token))
    .map(token => Number(token.replace(/[,٬،]/g, '')))
    .filter(value => Number.isFinite(value) && value > 0)
}

/** The printed unit: «ریال» or «تومان», whichever the invoice names more often. */
export function detectInvoiceUnit(lines: string[]): SmsAmountUnit | null {
  const text = lines.map(cleanLine).join(' ')
  const rial = (text.match(/ریال|\brials?\b/gi) ?? []).length
  const toman = (text.match(/تومان|تومن|\btomans?\b/gi) ?? []).length

  if (rial === toman) return null

  return rial > toman ? 'rial' : 'toman'
}

/** First Jalali date on the invoice; an old invoice is fine, so no drift window. */
export function detectInvoiceDate(lines: string[]): string | null {
  for (const line of lines) {
    const match = DATE_IN_TEXT.exec(cleanLine(line))
    const iso = match ? jalaliToIsoSafe(match[1], match[2], match[3]) : null

    if (iso) return iso
  }

  return null
}

/** `small` is `big` with some digits lost (the recognizer drops digits, it rarely invents them). */
function isDigitSubsequence(small: string, big: string): boolean {
  if (small.length >= big.length) return false

  let matched = 0

  for (const digit of big) if (digit === small[matched]) matched += 1

  return matched === small.length
}

/**
 * A row of exactly three numbers (quantity, unit price, amount in reading order) whose amount lost
 * digits: when the amount is a digit-subsequence of quantity × price, the product is the amount.
 */
function repairDroppedDigits(
  values: number[]
): Pick<LineItem, 'amount' | 'unitPrice' | 'quantity'> | null {
  if (values.length !== 3) return null

  const quantity = Math.min(...values)

  if (quantity > MAX_QUANTITY) return null

  const rest = values.filter((_, index) => index !== values.indexOf(quantity))

  for (const [price, read] of [
    [rest[0], rest[1]],
    [rest[1], rest[0]]
  ]) {
    const product = quantity * price

    if (price >= MIN_UNIT_PRICE && isDigitSubsequence(String(read), String(product))) {
      return { amount: product, unitPrice: price, quantity }
    }
  }

  return null
}

/**
 * Quantity, unit price and amount of a row with three or more numbers: the triple where
 * quantity × unit price matches the amount. Falls back to the largest number as the amount.
 */
function readRowNumbers(
  values: number[]
): Pick<LineItem, 'amount' | 'unitPrice' | 'quantity'> & { certain: boolean } {
  const sorted = [...values].sort((a, b) => b - a)
  const amount = sorted[0]

  for (const price of sorted.slice(1)) {
    for (const quantity of sorted.slice(1)) {
      if (quantity === price && sorted.filter(v => v === price).length < 2) continue
      if (quantity > price) continue
      // Exact: a printed row multiplies out to the digit, so a near miss is a misread digit.
      if (quantity * price === amount) {
        return { amount, unitPrice: price, quantity, certain: true }
      }
    }
  }

  // The amount lost digits and the product fills them back in; the row stays flagged to be checked.
  const repaired = repairDroppedDigits(values)

  if (repaired) return { ...repaired, certain: false }

  if (values.length === 2) {
    const price = sorted[1]

    // Unit price and amount with the quantity digit lost: the amount is a whole multiple of the
    // price, so the quantity is implied. A small first number stays unsure (quantity or price?).
    if (price >= MIN_UNIT_PRICE && amount % price === 0 && amount / price <= MAX_QUANTITY) {
      return { amount, unitPrice: price, quantity: amount / price, certain: true }
    }
  }

  // A lone number is the amount. Two or more that do not multiply out: one of them was misread.
  return { amount, certain: values.length === 1 }
}

function toAppAmount(value: number, unit: SmsAmountUnit | null, app: CurrencyUnit): number {
  if (!unit) return value

  const converted = toAppCurrency(value, unit, app)

  return converted === null ? value : Math.round(converted)
}

/**
 * Turns OCR lines (reading order, one string per text line) into a proposal for the entry form.
 * Everything is a guess: the form shows it for review and never saves it by itself.
 */
export function parseInvoiceText(lines: string[], appCurrency: CurrencyUnit): ParsedInvoice {
  const unit = detectInvoiceUnit(lines)
  const items: ParsedItem[] = []
  let total: number | null = null
  let totalRank = 0
  /** A thermal receipt prints the name on one line and its numbers on the next. */
  let pendingName = ''
  let rawItemSum = 0
  let largestSeen = 0

  for (const raw of lines) {
    const line = cleanLine(raw)
    const values = numbersOf(line.replace(ROW_INDEX, ''))

    const before = pendingName

    pendingName = ''

    if (!line || !values.length) {
      if (line && !SKIP_ROW.test(line) && countLetters(line) >= MIN_NAME_LETTERS) pendingName = line
      continue
    }

    const totalRow = TOTAL_ROWS.find(({ pattern }) => pattern.test(line))

    if (totalRow) {
      // A payable total beats «جمع کل»; among equals the later row wins.
      if (totalRow.rank >= totalRank) {
        total = Math.max(...values)
        totalRank = totalRow.rank
      }
      continue
    }

    if (SKIP_ROW.test(line)) continue

    largestSeen = Math.max(largestSeen, ...values)

    const name = lettersOf(line) || lettersOf(before)

    if (!name) continue

    const { amount, unitPrice, quantity, certain } = readRowNumbers(values)

    // Single digits left over by a misread are noise, not a price.
    if (amount < MIN_ITEM_AMOUNT) continue

    rawItemSum += amount

    items.push({
      name: tidyName(name),
      amount: toAppAmount(amount, unit, appCurrency),
      ...(unitPrice ? { unitPrice: toAppAmount(unitPrice, unit, appCurrency) } : {}),
      ...(quantity ? { quantity, note: String(quantity) } : {}),
      ...(certain ? {} : { uncertain: true })
    })
  }

  // No «جمع کل» row survived (a rotated photo splits label and number): the biggest number that is
  // the item sum or a little above it (tax) is the best guess; the review shows it for checking.
  if (total === null && rawItemSum > 0 && largestSeen >= rawItemSum) {
    if (largestSeen <= rawItemSum * MAX_TAX_FACTOR) total = largestSeen
  }

  return {
    items,
    total: total === null ? null : toAppAmount(total, unit, appCurrency),
    date: detectInvoiceDate(lines),
    unit
  }
}
