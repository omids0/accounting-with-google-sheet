import { useEffect, useRef } from 'react'
import type { DefaultValues, FieldValues, UseFormReset } from 'react-hook-form'

export type UseModalFormResetOptions = {
  /** When false, skip auto-reset (e.g. closed modal). Default true. */
  active?: boolean
  /** When this changes and `active` is true, values reset to latest `initialValues`. */
  resetKey?: string | number | boolean | null
}

export function useModalFormReset<T extends FieldValues>(
  reset: UseFormReset<T>,
  initialValues: T,
  { active = true, resetKey }: UseModalFormResetOptions = {}
) {
  const valuesRef = useRef(initialValues)
  valuesRef.current = initialValues

  useEffect(() => {
    if (active) {
      reset(valuesRef.current as DefaultValues<T>)
    }
  }, [active, resetKey, reset])
}
