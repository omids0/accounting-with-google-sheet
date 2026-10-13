import type { YearReview } from './yearReview'
import { formatJalaliYear } from '../utils/dateRange'
import { formatPersianNumber, formatSignedNumber } from '../utils/formatMoney'
import { JALALI_MONTHS } from '../utils/jalaliDate'
import type { StatCardImage } from '../utils/statCardPng'

const UNITS: { value: number; label: string }[] = [
  { value: 1_000_000_000, label: 'میلیارد' },
  { value: 1_000_000, label: 'میلیون' },
  { value: 1_000, label: 'هزار' }
]

/** Headline form of an amount: «۳۱۰ میلیون», «۲۹٫۸ میلیون», «−۴ میلیون». */
export function headlineAmount(n: number, options?: { showPlus?: boolean }): string {
  const abs = Math.abs(n)
  const unit = UNITS.find(item => abs >= item.value)
  const scaled = unit ? abs / unit.value : abs
  const digits = formatPersianNumber(scaled, { maximumFractionDigits: scaled < 100 ? 1 : 0 })
  const sign = n < 0 ? '−' : n > 0 && options?.showPlus ? '+' : ''
  const number = sign ? `⁦${sign}${digits}⁩` : digits

  return unit ? `${number} ${unit.label}` : number
}

/** «۲۰٪», «−۵٪» */
export function percentText(value: number): string {
  return `${formatSignedNumber(value)}٪`
}

export function yearTitle(year: number): string {
  return `${formatJalaliYear(year)} در یک نگاه`
}

export function monthName(month: number | null): string | null {
  return month ? JALALI_MONTHS[month - 1] ?? null : null
}

/** The count facts of the footer line (amounts are rendered by the caller). */
export function yearCountFacts(review: YearReview): string[] {
  const facts: string[] = []

  if (review.installmentsPaid) {
    facts.push(`${formatPersianNumber(review.installmentsPaid)} قسط پرداخت شد`)
  }
  if (review.checksCleared) facts.push(`${formatPersianNumber(review.checksCleared)} چک پاس شد`)
  for (const title of review.goalsReached) facts.push(`هدف «${title}» ✓`)

  return facts
}

/** «دارایی خالص از ۱۸ به ۲۹٫۸ میلیون رسید», or null without both ends. */
export function netWorthSpanText(review: YearReview): string | null {
  if (review.netWorthFrom == null || review.netWorthTo == null) return null

  return `دارایی خالص از ${headlineAmount(review.netWorthFrom)} به ${headlineAmount(
    review.netWorthTo
  )} رسید`
}

/** «سال ۱۴۰۵ تمام شد»; from 25 Esfand, before Nowruz, «رو به پایان است». */
export function yearKicker(year: number, ended = true): string {
  return `سال ${formatJalaliYear(year)} ${ended ? 'تمام شد' : 'رو به پایان است'}`
}

/** The six headline cells, in card order (amounts already in headline form). */
export function yearHeadlineStats(review: YearReview): { label: string; value: string }[] {
  return [
    { label: 'درآمد', value: headlineAmount(review.income) },
    { label: 'هزینه', value: headlineAmount(review.expense) },
    { label: 'پس‌انداز', value: headlineAmount(review.savings, { showPlus: true }) },
    { label: 'بزرگ‌ترین هزینه', value: review.topExpenseCategory ?? '—' },
    { label: 'گران‌ترین ماه', value: monthName(review.topExpenseMonth) ?? '—' },
    {
      label: 'نرخ پس‌انداز',
      value: review.savingsRate == null ? '—' : percentText(review.savingsRate)
    }
  ]
}

/** What «اشتراک کارت» draws: only the headline numbers. */
export function yearReviewImage(review: YearReview, ended = true): StatCardImage {
  const footer = [netWorthSpanText(review), ...yearCountFacts(review)].filter(Boolean).join(' · ')

  return {
    kicker: yearKicker(review.year, ended),
    title: yearTitle(review.year),
    stats: yearHeadlineStats(review),
    footer: footer || undefined
  }
}
