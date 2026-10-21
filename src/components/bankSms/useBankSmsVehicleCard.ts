import { useRef } from 'react'

import type { BankSmsReview, SmsChoice } from './useBankSmsReview'
import { useVehicleExpenseEntry } from '../../hooks/useVehicleExpenseEntry'
import type { ConfirmableSms } from '../../services/bankSmsApply'
import { showError } from '../../utils/toast'
import { isVehicleExpenseCategory } from '../../utils/vehicleExpenseUtils'

type VehicleCardOptions = {
  /** The SMS with the card's account resolved; null until it is. */
  entry: ConfirmableSms | null
  choice: SmsChoice | null
  type: 'income' | 'expense'
  /** A building unit offer or a probable duplicate: the card keeps its own flow. */
  skip: boolean
  review: BankSmsReview
}

/**
 * «خودرو» on an SMS card behaves like the manual expense form: the vehicle, expense type, fuel
 * price and mileage are asked on the card, validated the same way and saved through the same
 * service. Anything else returns `active: false` and the card does what it always did.
 */
export function useBankSmsVehicleCard({ entry, choice, type, skip, review }: VehicleCardOptions) {
  const category = choice?.category ?? ''
  // A building workspace has no vehicles: its «خودرو» keeps the plain card.
  const active =
    !skip && !review.building && type === 'expense' && isVehicleExpenseCategory(category)
  const vehicle = useVehicleExpenseEntry(active, true)
  const rootRef = useRef<HTMLDivElement>(null)

  const save = () => {
    if (!entry || !active) return

    const errors = vehicle.validateVehicleExpense(category, entry.amount)

    if (errors) {
      showError(Object.values(errors).find(Boolean) ?? 'فیلدهای خودرو را کامل کنید')
      // The field with the message can sit below the fold: bring it into view and focus it.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          // FormField renders the message as role="alert" next to its control.
          const alert = rootRef.current?.querySelector<HTMLElement>('[role="alert"]')
          const control = alert?.parentElement?.querySelector<HTMLElement>('input, button, select')

          ;(control ?? alert)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          control?.focus({ preventScroll: true })
        })
      )

      return
    }
    void review.saveVehicle(entry, {
      ...vehicle.vehicleValues,
      renewServiceId: vehicle.renewing ? vehicle.renewableService?.id : undefined
    })
  }

  // Until the vehicles are read the form would fall back to «سایر» and save without a vehicle.
  return { active, vehicle, save, rootRef, ready: !active || !vehicle.loading }
}
