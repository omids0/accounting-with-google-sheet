import { useRef } from 'react'

import type { BankSmsReview, SmsChoice } from './useBankSmsReview'
import { useLinkTarget } from '../../hooks/useLinkTarget'
import type { ConfirmableSms } from '../../services/bankSmsApply'
import { showError, showInfo } from '../../utils/toast'

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

  const rootRef = useRef<HTMLDivElement>(null)

  /**
   * Swipe-right is a quick save, and a quick save of «بدهی»/«طلب»/«چک»/«قسط» must not skip the
   * question: with open items and no pick it saves nothing, brings the picker into view and focuses
   * it (the way the «خودرو» card does for its fields). The main button stays an explicit choice
   * (it saves a plain record when «هیچ‌کدوم» is left). With nothing open there is nothing to ask.
   */
  const quickSave = () => {
    if (!entry || !choice || !active) return
    if (link.selectedId || !link.options.length) return save()

    showInfo(`اول به «${link.kind?.fieldLabel ?? ''}» جواب بده؛ یا با دکمهٔ ثبت بدون وصل ذخیره کن.`)
    requestAnimationFrame(() => {
      const control = rootRef.current?.querySelector<HTMLElement>(
        `button[aria-label^="${link.kind?.fieldLabel ?? ''}"]`
      )

      control?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      control?.focus({ preventScroll: true })
    })
  }

  // Until the open items are read a tap would save with «هیچ‌کدوم» before the user could pick.
  return { active, link, save, quickSave, rootRef, ready: !active || !link.loading }
}
