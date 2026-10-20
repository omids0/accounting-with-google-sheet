import BankSmsReview from './BankSmsReview'
import { useBuildingSetupData } from '../buildings/useBuildingSetupData'
import EmptyState from '../EmptyState'

/**
 * The bank SMS queue of a building workspace (round 11, Step 6): the same page, with the units,
 * residents and receivables loaded so a deposit can be matched to the unit that paid.
 */
export default function BuildingBankSmsReview() {
  const building = useBuildingSetupData()

  return building.loaded ? (
    <BankSmsReview building={building} />
  ) : (
    <EmptyState icon="empty-inbox" message="در حال بارگذاری ساختمان…" />
  )
}
