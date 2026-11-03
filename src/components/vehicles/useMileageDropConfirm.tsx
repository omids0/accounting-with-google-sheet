import { useState, type ReactNode } from 'react'

import { isLargeMileageDrop, largeMileageDropMessage } from './utils'
import ConfirmActionModal from '../ConfirmActionModal'

/**
 * A typo like «۱۰۰» for «۱۴۰۲۲۰» is saved as a correction (or as an old record), so a big fall of
 * the typed mileage below the vehicle's current one asks first: «اشتباه تایپی نیست؟».
 * `submit(values, mileage)` sends the form on, or opens the question; `check: false` skips it.
 */
export function useMileageDropConfirm<T>(
  currentMileage: number,
  onSubmit: (values: T) => void | Promise<void>
): {
  submit: (values: T, mileage: number, check?: boolean) => void | Promise<void>
  confirmModal: ReactNode
} {
  const [pending, setPending] = useState<{ values: T; mileage: number } | null>(null)

  const submit = (values: T, mileage: number, check = true) => {
    if (check && isLargeMileageDrop(currentMileage, mileage)) {
      setPending({ values, mileage })

      return
    }

    return onSubmit(values)
  }

  const confirmModal = (
    <ConfirmActionModal
      open={pending !== null}
      title="کارکرد کمتر از قبل"
      message={pending ? largeMileageDropMessage(currentMileage, pending.mileage) : ''}
      confirmLabel="ثبت همین عدد"
      cancelLabel="اصلاح عدد"
      onClose={() => setPending(null)}
      onConfirm={() => {
        const values = pending?.values

        setPending(null)
        if (pending) void onSubmit(values as T)
      }}
    />
  )

  return { submit, confirmModal }
}
