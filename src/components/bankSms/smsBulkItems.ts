import type { SmsChoice } from './useBankSmsReview'
import {
  isConfirmable,
  type BankSmsReviewItem,
  type ConfirmableSms
} from '../../services/bankSmsQueue'
import { bulkAction, type SmsUnitInput, type SmsUnitMatch } from '../../services/buildingSmsMatch'
import { isVehicleExpenseCategory } from '../../utils/vehicleExpenseUtils'

/** What «ثبت همه شناخته‌شده‌ها» will save for one card. */
export type SmsBulkItem =
  | { kind: 'record'; entry: ConfirmableSms; choice: SmsChoice }
  | { kind: 'unit'; entry: ConfirmableSms; unit: SmsUnitInput }

/**
 * Recognised, single-account, not a probable duplicate: «ثبت همه». A deposit is taken when the
 * payer's card is a unit's (its payment), or when no unit is in question and it has a category.
 * An amount-only unit match is never taken: it needs a tap on a unit.
 */
export function smsBulkItems(
  items: BankSmsReviewItem[],
  matchFor: (entry: ConfirmableSms) => SmsUnitMatch | null,
  choiceFor: (entry: ConfirmableSms) => SmsChoice | null
): SmsBulkItem[] {
  return items.flatMap((item): SmsBulkItem[] => {
    if (item.kind !== 'single' || item.probableDuplicate || !isConfirmable(item.entry)) return []

    const { entry } = item
    const match = matchFor(entry)
    const action = bulkAction(match)

    if (action === 'never') return []
    if (action === 'unit' && match?.kind === 'card') {
      return [{ kind: 'unit', entry, unit: match.candidate.unit }]
    }

    const choice = choiceFor(entry)

    // A vehicle expense needs its vehicle, type and mileage, which only the form asks for.
    return choice && !isVehicleExpenseCategory(choice.category)
      ? [{ kind: 'record', entry, choice }]
      : []
  })
}
