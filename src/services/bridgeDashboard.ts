import { isJourneyUnfinished } from './buildingJourney'
import { monthKeyOf, type BuildingSummary } from './buildingSummary'
import { JALALI_MONTHS, getJalaliParts } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'

/**
 * The line of the personal dashboard's building card: «ساختمان نرگس: ۳ واحد بدهکار · شارژ مهر صادر
 * نشده». Null when there is nothing to do (no debtor, this month issued) or the building is not set
 * up yet (its own checklist covers that).
 */
export function buildingCardText(
  name: string,
  summary: BuildingSummary | null,
  date = new Date()
): string | null {
  if (!summary?.isBuilding || isJourneyUnfinished(summary.journey)) return null

  const parts: string[] = []

  if (summary.debtorUnits > 0) {
    parts.push(`${toPersianDigits(String(summary.debtorUnits))} واحد بدهکار`)
  }

  const { day, month } = getJalaliParts(date)

  if (!summary.charge && day >= summary.issueDay) {
    parts.push(`شارژ ${JALALI_MONTHS[month - 1] ?? ''} صادر نشده`)
  }

  return parts.length ? `${name}: ${parts.join(' · ')}` : null
}

type Dismissed = Record<string, string>

/** Dismissing the card hides it for the rest of this Jalali month. */
export const isCardDismissed = (dismissed: Dismissed, buildingId: string, date = new Date()) =>
  dismissed[buildingId] === monthKeyOf(date)

export const dismissCardMonth = (
  dismissed: Dismissed,
  buildingId: string,
  date = new Date()
): Dismissed => ({ ...dismissed, [buildingId]: monthKeyOf(date) })
