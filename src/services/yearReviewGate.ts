import { getItem, setItem } from './storage'
import { isoToJalali } from '../utils/jalaliDate'

/** Per spreadsheet: `{ [spreadsheetId]: { dismissed: number[] } }`; wiped with the account. */
export const YEAR_REVIEW_STORAGE_KEY = 'accounting_year_review_v1'

/** The dashboard card shows from 25 Esfand to 15 Farvardin. */
export const YEAR_REVIEW_FROM_ESFAND_DAY = 25
export const YEAR_REVIEW_TO_FARVARDIN_DAY = 15

interface YearReviewState {
  dismissed?: number[]
}

type YearReviewStore = Record<string, YearReviewState>

/**
 * The Jalali year «در یک نگاه» reviews on `todayIso`: the ending year from
 * 25 Esfand, the year just ended until 15 Farvardin; null outside that window.
 */
export function yearReviewWindowYear(todayIso: string): number | null {
  const { year, month, day } = isoToJalali(todayIso)

  if (month === 12 && day >= YEAR_REVIEW_FROM_ESFAND_DAY) return year
  if (month === 1 && day <= YEAR_REVIEW_TO_FARVARDIN_DAY) return year - 1

  return null
}

export function dismissedReviewYears(spreadsheetId: string): number[] {
  return (getItem<YearReviewStore>(YEAR_REVIEW_STORAGE_KEY) ?? {})[spreadsheetId]?.dismissed ?? []
}

/** The year the dashboard card shows today, unless ✕ closed it for this spreadsheet. */
export function yearReviewDue(spreadsheetId: string, todayIso: string): number | null {
  const year = yearReviewWindowYear(todayIso)

  if (year == null || dismissedReviewYears(spreadsheetId).includes(year)) return null

  return year
}

export function dismissYearReview(spreadsheetId: string, year: number): void {
  const store = getItem<YearReviewStore>(YEAR_REVIEW_STORAGE_KEY) ?? {}
  const dismissed = new Set(store[spreadsheetId]?.dismissed ?? [])

  dismissed.add(year)
  try {
    setItem(YEAR_REVIEW_STORAGE_KEY, {
      ...store,
      [spreadsheetId]: { dismissed: [...dismissed].sort() }
    })
  } catch {
    // Private mode: the card may show again next open; harmless.
  }
}

/**
 * Years the Reports page lists, newest first: every year from the first one with
 * records up to the last finished one, plus the ending year once its window opens.
 */
export function reviewableYears(firstYear: number | null, todayIso: string): number[] {
  if (firstYear == null) return []

  const { year: currentYear } = isoToJalali(todayIso)
  const last = yearReviewWindowYear(todayIso) === currentYear ? currentYear : currentYear - 1
  const years: number[] = []

  for (let year = last; year >= firstYear; year--) years.push(year)

  return years
}
