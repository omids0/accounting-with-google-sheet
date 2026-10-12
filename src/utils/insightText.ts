import { formatPersianNumber } from './formatMoney'
import type { MonthComparison } from '../types'

/** Arabic letter mark: keeps «٪» on the left of the digits inside RTL text. */
const ALM = '؜'

export function formatPercentFa(percent: number): string {
  return `${formatPersianNumber(percent, { useGrouping: false })}${ALM}٪`
}

const WORD_UNITS = [
  { value: 1_000_000_000, word: 'میلیارد' },
  { value: 1_000_000, word: 'میلیون' },
  { value: 1_000, word: 'هزار' }
]

/** «۹۰ هزار», «۱٫۲ میلیون»; below a thousand the plain number. */
export function formatAmountWords(amount: number): string {
  const abs = Math.abs(amount)
  const unit = WORD_UNITS.find(item => abs >= item.value)

  if (!unit) return formatPersianNumber(abs)

  return `${formatPersianNumber(abs / unit.value, { maximumFractionDigits: 1 })} ${unit.word}`
}

/** Next to a category: «↑ ۳۰٪ از شهریور», «↓ ۱۵٪», «= مثل شهریور». */
export function categoryComparisonText(comparison: MonthComparison, monthName: string): string {
  if (comparison.trend === 'same') return `= مثل ${monthName}`
  if (comparison.trend === 'down') return `↓ ${formatPercentFa(comparison.percent)}`

  return `↑ ${formatPercentFa(comparison.percent)} از ${monthName}`
}

/** The same comparison as a sentence (title / screen readers): «۱۵٪ کمتر از شهریور». */
export function comparisonSentence(comparison: MonthComparison, monthName: string): string {
  if (comparison.trend === 'same') return `مثل ${monthName}`

  const direction = comparison.trend === 'up' ? 'بیشتر' : 'کمتر'

  return `${formatPercentFa(comparison.percent)} ${direction} از ${monthName}`
}

/** Hero strip: «هزینه ماه ۱۲٪ کمتر از شهریور». */
export function heroExpenseComparisonText(
  comparison: MonthComparison,
  monthName: string,
  periodNoun = 'ماه'
): string {
  return `هزینه ${periodNoun} ${comparisonSentence(comparison, monthName)}`
}

/** «۸۹۰٬۰۰۰ از بودجه ۸۰۰٬۰۰۰ · ۹۰ هزار بیشتر» over budget, «۴۸۰٬۰۰۰ از ۵۰۰٬۰۰۰» within. */
export function budgetLineText(spent: number, budget: number): string {
  if (spent > budget) {
    return `${formatPersianNumber(spent)} از بودجه ${formatPersianNumber(
      budget
    )} · ${formatAmountWords(spent - budget)} بیشتر`
  }

  return `${formatPersianNumber(spent)} از ${formatPersianNumber(budget)}`
}
