import type { BankSmsReview, SmsChoice } from './useBankSmsReview'
import { useLinkTarget } from '../../hooks/useLinkTarget'
import type { ConfirmableSms } from '../../services/bankSmsApply'
import { showError } from '../../utils/toast'

type LinkCardOptions = {
  /** The SMS with the card's account resolved; null until it is. */
  entry: ConfirmableSms | null
  choice: SmsChoice | null
  type: 'income' | 'expense'
  /** A building unit offer or a probable duplicate: the card keeps its own flow. */
  skip: boolean
  review: BankSmsReview
}

/**
 * «بدهی» (expense) and «طلب» (income) on an SMS card ask the same question the manual entry form
 * asks (the shared `useLinkTarget`): which open debt or receivable this record pays. The card then
 * saves the record and adds the payment to it. Any other category returns `active: false` and the
 * card does what it always did.
 */
export function useBankSmsLinkCard({ entry, choice, type, skip, review }: LinkCardOptions) {
  const link = useLinkTarget({
    type,
    category: choice?.category ?? '',
    subCategory: choice?.subCategory ?? '',
    amount: entry?.amount ?? 0,
    enabled: !skip && !review.building
  })
  const active = link.kind !== null

  const save = () => {
    if (!entry || !choice || !active) return

    if (link.error) return showError(link.error)
    void review.saveLinked(entry, choice, link.attach)
  }

  // Until the open items are read a tap would save with «هیچ‌کدوم» before the user could pick.
  return { active, link, save, ready: !active || !link.loading }
}
